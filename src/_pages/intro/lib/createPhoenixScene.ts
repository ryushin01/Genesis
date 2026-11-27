import {
  AmbientLight,
  Color,
  DirectionalLight,
  Group,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  PerspectiveCamera,
  RedFormat,
  Scene,
  Spherical,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CAMERA_FOV, CAMERA_FOV_BOOST, PHOENIX_MODEL } from '../config/phoenix.config';
import { MODEL_URLS } from '../model/assets';
import { createFollower } from '../model/follow';
import { ease, smoothstep } from '../model/math';
import { createSceneState, flightTime, SCROLL_SCREENS, sampleTimeline } from '../model/timeline';
import { type BirdUniforms, createBird } from './scene/bird';
import { createCrystalFeather, type CrystalFeather } from './scene/crystalFeather';
import { createDisposer, disposeObject } from './scene/disposer';
import { createMeteorShower, createTrail } from './scene/effects';
import { createFeathers, type Feathers } from './scene/feathers';
import { createFlight } from './scene/flight';
import { createLogo, type Logo } from './scene/logo';
import { createSky } from './scene/sky';
import { createStarfield } from './scene/starfield';
import { fetchModel } from './fetchModel';

export interface PhoenixScene {
  setProgress(progress: number): void;
  setPointer(x: number, y: number): void;
  setPaused(paused: boolean): void;
  /**
   * 화면을 떠나기 시작할 때 그리기를 멈춥니다. 마지막 그림은 캔버스에 그대로 남고, 자원은 dispose가 놓습니다.
   * GPU 없이 그리는 느린 기기에서는 매 프레임이 메인 스레드를 오래 붙잡아, 멈추지 않으면 다음 화면으로 바뀌는 일이 몇 초씩 밀립니다.
   */
  stop(): void;
  dispose(): void;
}

export interface PhoenixSceneOptions {
  /** 불사조 모델을 받은 비율(0~1). */
  onProgress?: (ratio: number) => void;
  /** 장면을 만들기 전에 화면을 떠나면 받던 모델을 멈춥니다. */
  signal?: AbortSignal;
}

const FX_DISTANCE = 12;
const DEG = Math.PI / 180;
/** 태양의 반지름(장면 단위). 타임라인의 Sun 크기가 곱해집니다. */
const SUN_RADIUS = 0.75;
/** 결말에서 깃털·로고를 화면 가운데보다 조금 위에 두려고 카메라를 내리는 양(장면 단위). */
const FINALE_LIFT = 0.2;

/**
 * 긴 준비 작업 사이에 브라우저가 입력·그리기를 처리할 틈을 줍니다. 컨텍스트 만들기·셰이더 준비가
 * 한 작업(느린 휴대폰에서 150ms 넘게)에 몰리지 않게 나눕니다. scheduler.yield가 있으면 이어서 바로 돌아옵니다.
 */
function yieldToMain() {
  const scheduler: unknown = Reflect.get(globalThis, 'scheduler');
  const next = typeof scheduler === 'object' && scheduler !== null ? Reflect.get(scheduler, 'yield') : undefined;
  if (typeof next === 'function') return Promise.resolve(Reflect.apply(next, scheduler, []));
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

/** 렌더러 이름을 읽는 데 필요한 WebGL 컨텍스트의 일부. */
interface RendererInfoSource {
  getExtension(name: 'WEBGL_debug_renderer_info'): { readonly UNMASKED_RENDERER_WEBGL: number } | null;
  getParameter(pname: number): unknown;
}

/** WebGL이 GPU 없이 소프트웨어로 그리는지(렌더러 이름으로 판단). 이름을 알 수 없으면 false. */
export function isSoftwareRenderer(gl: RendererInfoSource) {
  const info = gl.getExtension('WEBGL_debug_renderer_info');
  const name: unknown = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
  return typeof name === 'string' && /swiftshader|llvmpipe|software|softpipe|basic render/i.test(name);
}

export async function createPhoenixScene(
  canvas: HTMLCanvasElement,
  { onProgress, signal }: PhoenixSceneOptions = {},
): Promise<PhoenixScene> {
  // 장면을 치우거나 만들기 전에 화면을 떠나면 아직 받는 중인 모델도 멈춥니다.
  const abort = new AbortController();
  const forwardAbort = () => abort.abort();
  if (signal?.aborted) abort.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const load = async (url: string, progress?: (ratio: number) => void) =>
    loader.parseAsync(await fetchModel(url, abort.signal, progress), '');

  // 처음 화면에는 불사조와 비행 타임라인만 있으면 됩니다. 깃털과 로고는 장면을 띄운 뒤에 받습니다.
  const loaded = await Promise.all([load(MODEL_URLS.phoenix, onProgress), load(MODEL_URLS.flight), load(MODEL_URLS.flightMobile)]).finally(
    () => {
      signal?.removeEventListener('abort', forwardAbort);
    },
  );
  const [gltf, flightGltf, flightMobileGltf] = loaded;
  if (abort.signal.aborted) {
    loaded.forEach((item) => disposeObject(item.scene));
    throw new DOMException('장면을 만들기 전에 화면을 떠났습니다.', 'AbortError');
  }
  onProgress?.(1);

  const disposer = createDisposer();
  try {
    return await buildScene();
  } catch (error) {
    disposer.dispose();
    disposeObject(gltf.scene);
    throw error;
  }

  async function buildScene(): Promise<PhoenixScene> {
    const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // 가장 먼저 넣어 가장 나중에 풉니다. dispose만으로는 WebGL 컨텍스트가 바로 풀리지 않으므로,
    // 장면을 다시 만들 때 컨텍스트가 쌓여 브라우저 한도(보통 16개)에 닿지 않게 바로 놓아 줍니다.
    disposer.add(() => {
      renderer.dispose();
      renderer.forceContextLoss();
    });
    renderer.outputColorSpace = LinearSRGBColorSpace;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 1);
    const compact = window.innerWidth < 768;
    const maxDpr = compact ? 1.5 : 1.75;

    const shared: BirdUniforms = {
      uTime: { value: 0 },
      uBurn: { value: 0 },
      uMask: { value: 0 },
      uRim: { value: 0 },
      uDissolve: { value: 0 },
      uSunDir: { value: new Vector3(0, 0.3, -1) },
      uGlow: { value: 0 },
      uOpacity: { value: 1 },
      uShadow: { value: new Vector3() },
      uHighlight: { value: new Vector3(1, 1, 1) },
      uSaturation: { value: 1 },
      uExposure: { value: 1 },
      uHaze: { value: new Color(0.05, 0, 0.01) },
      uHazeAmount: { value: 0 },
    };
    // 내려오는 깃털은 불사조와 재질을 함께 쓰되, 윤곽·소멸·달아오름은 따로 둡니다.
    const featherUniforms: BirdUniforms = {
      ...shared,
      uMask: { value: 0 },
      uDissolve: { value: 0 },
      uGlow: { value: 1 },
      uRim: { value: 0.9 },
      uBurn: { value: 0.25 },
    };
    // 화면을 떠났으면 남은 준비를 하지 않습니다(만든 자원은 바깥에서 놓아 줌).
    const leaveIfAborted = () => {
      if (signal?.aborted) throw new DOMException('장면을 만들기 전에 화면을 떠났습니다.', 'AbortError');
    };

    await yieldToMain();
    leaveIfAborted();
    const bird = disposer.track(createBird(gltf, PHOENIX_MODEL, shared));
    const flights = [disposer.track(createFlight(flightGltf)), disposer.track(createFlight(flightMobileGltf))];
    const trail = disposer.track(createTrail(compact ? 220 : 420, shared.uTime, PHOENIX_MODEL.wingspan));
    const stars = disposer.track(
      createStarfield({ near: compact ? 500 : 1100, mid: compact ? 900 : 1800, dust: compact ? 300 : 650 }, shared.uTime, shared.uHighlight),
    );
    const scene = new Scene();
    scene.add(bird.group, trail.points, stars.points);
    const camera = new PerspectiveCamera(CAMERA_FOV, 1, 0.05, 400);

    // 작은 깃털·로고는 고정된 카메라로 그려 화면 전체를 채웁니다.
    const fxScene = new Scene();
    const fxCamera = new PerspectiveCamera(40, 1, 0.1, 100);
    fxCamera.position.set(0, 0, FX_DISTANCE);
    const halfHeight = Math.tan((fxCamera.fov * Math.PI) / 360) * FX_DISTANCE;
    // 로고에만 닿는 빛. 깃털은 빛을 쓰지 않는 셰이더라 영향을 받지 않습니다.
    const logoKey = new DirectionalLight(0xffc8bd, 2.1);
    logoKey.position.set(-2.5, 3, 6);
    fxScene.add(logoKey, new AmbientLight(0xff7466, 0.8));

    // 불사조 윤곽: 배경의 빛 무리·불길·빛줄기에 씁니다. 밉맵을 만들어 넓게 흐린 값도 몇 번만 읽습니다.
    const mask = disposer.track(
      new WebGLRenderTarget(1, 1, {
        format: RedFormat,
        depthBuffer: true,
        generateMipmaps: true,
        minFilter: LinearMipmapLinearFilter,
        magFilter: LinearFilter,
      }),
    );
    const sky = disposer.track(createSky(mask.texture, shared));
    // 유성우는 배경과 함께 그려, 불사조보다 먼저(뒤에) 하늘을 지나가게 합니다.
    const shower = disposer.track(createMeteorShower(compact ? 36 : 72, compact ? 2 : 3, shared.uTime));
    sky.scene.add(shower.group);

    let feathers: Feathers | null = null;
    let logo: Logo | null = null;
    let crystalFeather: CrystalFeather | null = null;
    const state = createSceneState();
    const projected = new Vector3();
    const offset = new Vector3();
    const spherical = new Spherical();
    const target = new Vector3();
    const axis = new Vector3();
    const sunAt = new Vector2();
    const featherAt = new Vector2();
    const drawingBuffer = new Vector2();
    /** 3D 점을 배경 셰이더 좌표(세로 -0.5~0.5, 가로는 화면 비율만큼)로 옮깁니다. 카메라 뒤면 false. */
    const toScreen = (point: Vector3, out: Vector2) => {
      projected.copy(point).project(camera);
      out.set((projected.x * 0.5 * width) / height, projected.y * 0.5);
      return projected.z < 1;
    };

    let width = 0;
    let height = 0;
    let dpr = 0;
    // GPU 없이 소프트웨어로 그리는 환경(SwiftShader·llvmpipe 등)은 처음부터 해상도를 낮춥니다. 배경 셰이더가 화소마다
    // 3D 노이즈를 여러 번 읽어, 전체 해상도로는 한 프레임이 1초 가까이 걸려 자동 조절(45프레임마다)이 따라오지 못합니다.
    let quality = isSoftwareRenderer(renderer.getContext()) ? 0.45 : 1;
    let portrait = false;
    const resize = () => {
      const nextWidth = canvas.clientWidth || window.innerWidth;
      const nextHeight = canvas.clientHeight || window.innerHeight;
      const nextDpr = Math.min(window.devicePixelRatio || 1, maxDpr) * quality;
      if (nextWidth === width && nextHeight === height && nextDpr === dpr) return;
      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;
      // 세로 화면은 레퍼런스의 모바일 카메라 경로를 씁니다.
      portrait = width / height < 1;
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      renderer.getDrawingBufferSize(drawingBuffer);
      const maskWidth = Math.ceil(width / 3);
      const maskHeight = Math.ceil(height / 3);
      mask.setSize(maskWidth, maskHeight);
      sky.uniforms.uMaskSize.value.set(maskWidth, maskHeight);
      sky.uniforms.uRes.value.copy(drawingBuffer);
      shower.uniforms.uAspect.value = width / height;
      // 굵기는 CSS 픽셀로 잽니다. 고해상도 화면에서도 가늘어지지 않고, 해상도를 낮춰도 그대로입니다.
      shower.uniforms.uPixel.value = 1 / height;
      stars.uniforms.uPixelRatio.value = dpr;
      stars.uniforms.uMaxPoint.value = 22 * dpr;
      trail.uniforms.uScale.value = drawingBuffer.y * 0.42 * 1.6;
      trail.uniforms.uMaxPoint.value = 16 * dpr;
      if (feathers) feathers.uniforms.uAspect.value = Math.min(1.6, width / height);
      for (const view of [camera, fxCamera]) {
        view.aspect = width / height;
        view.updateProjectionMatrix();
      }
      warmup = 10;
      wake();
    };

    let targetProgress = 0;
    let progress = 0;
    let lastProgress = 0;
    // 스크롤·포인터를 2차로 따라가 휠 한 칸마다 속도가 튀지 않게 합니다.
    const progressFollower = createFollower(9);
    const pointerXFollower = createFollower(6.5);
    const pointerYFollower = createFollower(6.5);
    // 레퍼런스처럼 스크롤이 빠를수록 시야각을 넓혀 속도감을 냅니다(화면 높이/초 → 도).
    const fovFollower = createFollower(5, CAMERA_FOV);
    let paused = false;
    // 셰이더가 모두 준비되기 전에는 그리지 않습니다. 첫 그리기에서 셰이더 링크를 기다리며 메인 스레드가 멈추지 않게 합니다.
    let ready = false;
    let time = 0;
    let previous = performance.now();
    let frame = 0;
    let contextLost = false;
    let stopped = false;
    let pointerX = 0;
    let pointerY = 0;
    // 셰이더 준비 등으로 느린 첫 프레임들은 빼고 잽니다.
    let warmup = 20;
    let sampledFrames = 0;
    let sampledTime = 0;

    /** 멈춰 있던 그리기를 다시 시작합니다. 이미 돌고 있거나 화면을 떠나는 중(stop)이면 아무것도 하지 않습니다. */
    const wake = () => {
      if (!ready || frame !== 0 || disposer.disposed || contextLost || stopped || document.hidden) return;
      previous = performance.now();
      frame = requestAnimationFrame(render);
    };

    const measure = (delta: number) => {
      // 프레임이 계속 밀리는 기기에서는 해상도를 낮춰 스크롤 반응을 지킵니다.
      if (warmup > 0) {
        warmup -= 1;
        return;
      }
      sampledFrames += 1;
      sampledTime += delta;
      if (sampledFrames < 45) return;
      const slow = sampledTime / sampledFrames > 1 / 34;
      sampledFrames = 0;
      sampledTime = 0;
      if (slow && quality > 0.4) {
        quality *= 0.75;
        resize();
      }
    };

    const render = (now: number) => {
      frame = 0;
      if (disposer.disposed || contextLost || stopped) return;
      const delta = Math.min(0.05, Math.max(0, (now - previous) / 1000));
      previous = now;
      if (!paused) {
        measure(delta);
        time += delta;
      }
      progress = progressFollower.step(targetProgress, delta);
      const speed = delta > 0 ? (Math.abs(progress - lastProgress) / delta) * SCROLL_SCREENS : 0;
      lastProgress = progress;
      const fov = fovFollower.step(CAMERA_FOV + Math.min(speed, CAMERA_FOV_BOOST), delta);
      const easedX = pointerXFollower.step(pointerX, delta);
      const easedY = pointerYFollower.step(pointerY, delta);

      const s = sampleTimeline(flightTime(progress), state);
      const f = flights[portrait ? 1 : 0].seek(s.time);
      shared.uTime.value = time;
      shared.uBurn.value = s.burn;
      shared.uDissolve.value = s.dissolve;
      shared.uRim.value = 0.35 + s.burn * 0.6;
      shared.uGlow.value = 0.4 + s.burn * 0.8;
      shared.uShadow.value.fromArray(s.grade.shadow);
      shared.uHighlight.value.fromArray(s.grade.highlight);
      shared.uSaturation.value = s.grade.saturation;
      shared.uExposure.value = s.grade.exposure;

      // 카메라: 타임라인의 위치에서 바라보는 점을 봅니다. 포인터는 그 점을 중심으로 카메라를 조금 돌립니다(세기는 타임라인).
      const lift = FINALE_LIFT * smoothstep(11, 12.2, s.time);
      target.copy(f.target);
      target.y -= lift;
      offset.copy(f.camera).sub(f.target);
      spherical.setFromVector3(offset);
      spherical.theta += easedX * 2 * f.pointerInfluence * DEG;
      spherical.phi -= easedY * 2 * f.pointerInfluence * DEG;
      spherical.makeSafe();
      camera.position.setFromSpherical(spherical).add(target);
      // 태양이 터지는 순간 화면 전체가 짧게 흔들립니다.
      const shakeX = s.shake > 0 ? (Math.sin(time * 37) + Math.sin(time * 23.7) * 0.6) * 0.5 * s.shake : 0;
      const shakeY = s.shake > 0 ? (Math.cos(time * 33.1) + Math.sin(time * 19.3) * 0.6) * 0.5 * s.shake : 0;
      camera.position.y += shakeY * 0.04;
      camera.position.z += shakeX * 0.04;
      camera.lookAt(target);
      if (Math.abs(camera.fov - fov) > 1e-3) {
        camera.fov = fov;
        camera.updateProjectionMatrix();
      }
      camera.updateMatrixWorld();
      sky.uniforms.uShift.value.set(shakeX * 0.006, shakeY * 0.006);
      fxCamera.position.set(shakeX * 0.05, shakeY * 0.05, FX_DISTANCE);

      // 불사조: 타임라인의 위치·자세에 날갯짓 클립을 얹습니다.
      const birdOn = s.dissolve < 0.999;
      const trailOn = birdOn && s.trail > 0.001;
      bird.group.visible = birdOn;
      trail.points.visible = trailOn;
      if (birdOn) {
        bird.group.position.copy(f.phoenixPosition);
        bird.group.quaternion.copy(f.phoenixQuaternion);
        bird.setClip(f.clipId);
        if (!paused) bird.update(delta);
        bird.group.updateMatrixWorld();
        toScreen(f.phoenixPosition, sunAt);
        sky.uniforms.uBird.value.set(sunAt.x / (width / height) + 0.5, sunAt.y + 0.5);
      }
      if (trailOn) {
        trail.uniforms.uIntensity.value = s.trail;
        trail.uniforms.uOrigin.value.copy(f.phoenixPosition);
        trail.uniforms.uBack.value.set(0, 0.12, -1).applyQuaternion(f.phoenixQuaternion).normalize();
        trail.uniforms.uRight.value.set(1, 0, 0).applyQuaternion(f.phoenixQuaternion);
        trail.uniforms.uUp.value.set(0, 1, 0).applyQuaternion(f.phoenixQuaternion);
      }

      // 태양: 화면에 투영한 자리와 크기. 결정이 받는 빛의 방향도 여기서 정합니다.
      const sunVisible = toScreen(f.sun, sunAt);
      const sunDistance = Math.max(0.1, axis.copy(f.sun).sub(camera.position).length());
      const tanHalf = Math.tan((camera.fov * DEG) / 2);
      shared.uSunDir.value.copy(axis).normalize().transformDirection(camera.matrixWorldInverse);
      // 태양이 꺼질 때는 불사조 쪽으로 오그라들며 사라지고, 그 자리에서 터집니다.
      const sunR = ((SUN_RADIUS * f.sunScale) / (2 * sunDistance * tanHalf)) * (0.35 + 0.65 * f.sunOpacity);
      const su = sky.uniforms;
      su.uSunAt.value.copy(sunAt);
      su.uSunR.value = sunR;
      su.uSunOn.value = sunVisible ? f.sunOpacity : 0;
      su.uNovaAt.value.copy(sunAt);
      su.uCosmos.value = s.cosmos;
      su.uWar.value = s.war;
      su.uNova.value = s.nova;
      su.uDark.value = f.darkness;
      su.uLogo.value = s.logo;
      su.uMaskOn.value = birdOn ? 1 : 0;
      su.uTan.value.set(tanHalf * (width / height), tanHalf);
      su.uCamRot.value.setFromMatrix4(camera.matrixWorld);
      stars.uniforms.uScale.value = drawingBuffer.y / (2 * tanHalf);
      stars.uniforms.uDust.value = 1 - s.logo * 0.7;
      stars.uniforms.uStars.value = 1 - f.darkness * 0.35;


      // 유성우는 전쟁 장면에서 쏟아집니다.
      shower.group.visible = s.war > 0.001;
      shower.uniforms.uIntensity.value = s.war;
      shower.uniforms.uSun.value.copy(sunAt);
      shower.uniforms.uShift.value.copy(su.uShift.value);

      // 터진 자리(태양)에서 작은 깃털이 흩어집니다(고정 카메라 좌표로 옮김).
      if (feathers) {
        feathers.uniforms.uFall.value = s.fall;
        feathers.uniforms.uSun.value.set(sunAt.x * 2 * halfHeight, sunAt.y * 2 * halfHeight);
        feathers.setVisibility(s.fall);
      }

      // 내려오는 결정 깃털: 타임라인의 Feather 노드를 따르고, 로고가 나타나면 빛으로 풀립니다.
      let featherOn = false;
      if (crystalFeather) {
        featherOn = f.featherScale > 0.001 && s.logo < 0.999;
        crystalFeather.group.visible = featherOn;
        if (featherOn) {
          crystalFeather.group.position.copy(f.featherPosition);
          crystalFeather.group.quaternion.copy(f.featherQuaternion);
          crystalFeather.group.scale.setScalar(f.featherScale);
          crystalFeather.update(time);
          featherUniforms.uDissolve.value = smoothstep(0.15, 0.95, s.logo);
        }
      }
      toScreen(f.featherPosition, featherAt);
      su.uFeatherAt.value.set(featherAt.x, featherAt.y - 0.02);
      su.uFeatherGlow.value = featherOn || s.logo > 0 ? s.featherGlow : 0;
      su.uLogoAt.value.copy(featherAt);
      // 로고는 깃털이 내려앉은 자리에서 돌며 커지고, 다 나타난 뒤에는 천천히 흔들립니다.
      logo?.update(ease(s.logo), time, featherAt.x * 2 * halfHeight, featherAt.y * 2 * halfHeight);

      // 불사조가 보일 때만 윤곽을 그립니다(꼬리 불티·별·깃털은 빼고).
      if (birdOn) {
        trail.points.visible = false;
        stars.points.visible = false;
        if (crystalFeather) crystalFeather.group.visible = false;
        shared.uMask.value = 1;
        renderer.setRenderTarget(mask);
        renderer.setClearColor(0x000000, 1);
        renderer.clear();
        renderer.render(scene, camera);
        shared.uMask.value = 0;
        trail.points.visible = trailOn;
        stars.points.visible = true;
        if (crystalFeather) crystalFeather.group.visible = featherOn;
      }
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(sky.scene, sky.camera);
      renderer.clearDepth();
      renderer.render(scene, camera);
      renderer.clearDepth();
      renderer.render(fxScene, fxCamera);

      // 정지 중에는 스크롤·포인터를 따라잡은 뒤 그리기를 멈춥니다. 다음 입력이 오면 다시 깨웁니다.
      const settled =
        paused &&
        progressFollower.settled(targetProgress, 1e-4) &&
        pointerXFollower.settled(pointerX, 1e-3) &&
        pointerYFollower.settled(pointerY, 1e-3) &&
        fovFollower.settled(CAMERA_FOV, 1e-2);
      // 이 프레임 안에서 이미 다음 프레임을 예약했으면(해상도를 낮추며 깨운 경우) 또 예약하지 않습니다.
      // 두 번 예약하면 그리기 루프가 둘로 갈라지고, 장면을 닫아도 하나가 남아 계속 돕니다.
      if (!settled && frame === 0) frame = requestAnimationFrame(render);
    };

    const onContextLost = (event: Event) => {
      // 기본 동작을 막아야 브라우저가 컨텍스트를 되살려 줍니다.
      event.preventDefault();
      contextLost = true;
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const onContextRestored = () => {
      contextLost = false;
      wake();
    };
    // 탭이 숨으면 그리기를 멈추고, 다시 보이면 이어 그립니다(숨은 동안의 시간은 건너뜀).
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else {
        wake();
      }
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    document.addEventListener('visibilitychange', onVisibility);
    // 화면 크기는 캔버스 상자를 따릅니다. 모바일 주소창이 접히고 펼쳐질 때마다 버퍼를 다시 만들지 않습니다.
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    disposer.add(() => {
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      document.removeEventListener('visibilitychange', onVisibility);
    });

    resize();
    // 첫 자세를 잡아 둔 뒤 셰이더를 준비합니다(뼈대 행렬이 있어야 결정 셰이더가 컴파일됨).
    const first = flights[portrait ? 1 : 0].seek(0);
    bird.group.position.copy(first.phoenixPosition);
    bird.group.quaternion.copy(first.phoenixQuaternion);
    bird.setClip(first.clipId);
    bird.update(0);
    await yieldToMain();
    leaveIfAborted();
    // 셰이더를 미리 컴파일해 둡니다. 유성우처럼 나중에 보이는 것이 처음 나타날 때 멈칫하지 않습니다.
    await Promise.all([
      renderer.compileAsync(scene, camera),
      renderer.compileAsync(fxScene, fxCamera),
      renderer.compileAsync(sky.scene, sky.camera),
    ]);
    leaveIfAborted();
    ready = true;
    wake();

    // 끝 장면(깃털·로고)은 불사조를 띄운 뒤에 받습니다. 받지 못해도 나머지 장면은 그대로 보여 줍니다.
    Promise.all([load(MODEL_URLS.feathers), load(MODEL_URLS.logo), load(MODEL_URLS.crystalFeather)])
      .then(([featherGltf, logoGltf, crystalGltf]) => {
        if (disposer.disposed) {
          [featherGltf, logoGltf, crystalGltf].forEach((item) => disposeObject(item.scene));
          return;
        }
        const nextFeathers = disposer.track(createFeathers(featherGltf, { count: compact ? 26 : 44, uTime: shared.uTime }));
        nextFeathers.uniforms.uAspect.value = Math.min(1.6, width / height);
        const nextLogo = disposer.track(createLogo(logoGltf));
        const nextCrystal = disposer.track(createCrystalFeather(crystalGltf, featherUniforms));
        // 셰이더도 장면의 빛에 맞춰 준비된 뒤에 장면에 넣습니다.
        const pending = new Group().add(...nextFeathers.meshes, nextLogo.group);
        return Promise.all([renderer.compileAsync(pending, fxCamera, fxScene), renderer.compileAsync(nextCrystal.group, camera, scene)]).then(
          () => {
            if (disposer.disposed) return;
            fxScene.add(...nextFeathers.meshes, nextLogo.group);
            scene.add(nextCrystal.group);
            feathers = nextFeathers;
            logo = nextLogo;
            crystalFeather = nextCrystal;
            wake();
          },
        );
      })
      .catch(() => {
        // 깃털과 로고 없이도 폭발과 마지막 문구는 보입니다.
      });

    return {
      setProgress(value) {
        targetProgress = value;
        wake();
      },
      setPointer(x, y) {
        pointerX = x;
        pointerY = y;
        wake();
      },
      setPaused(value) {
        paused = value;
        if (!paused) {
          warmup = 5;
          sampledFrames = 0;
          sampledTime = 0;
        }
        wake();
      },
      stop() {
        stopped = true;
        cancelAnimationFrame(frame);
        frame = 0;
      },
      dispose() {
        if (disposer.disposed) return;
        cancelAnimationFrame(frame);
        frame = 0;
        abort.abort();
        disposer.dispose();
      },
    };
  }
}
