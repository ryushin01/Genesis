import {
  AmbientLight,
  Color,
  DirectionalLight,
  HemisphereLight,
  LinearFilter,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  PerspectiveCamera,
  RedFormat,
  Scene,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MODEL_URLS } from '../model/assets';
import { createSceneState, sampleTimeline } from '../model/timeline';
import { createBackdrop } from './scene/backdrop';
import { createBird, WINGSPAN } from './scene/bird';
import { createDisposer, disposeObject } from './scene/disposer';
import { createEmbers, createFleet, createTrail } from './scene/effects';
import { createFeathers, type Feathers } from './scene/feathers';
import { createLogo, type Logo } from './scene/logo';

export interface PhoenixScene {
  setProgress(progress: number): void;
  setPointer(x: number, y: number): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

export interface PhoenixSceneOptions {
  /** 불사조 모델을 받은 비율(0~1). */
  onProgress?: (ratio: number) => void;
  /** 장면을 만들기 전에 화면을 떠나면 받던 모델을 멈춥니다. */
  signal?: AbortSignal;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ease = (t: number) => t * t * (3 - 2 * t);
const FX_DISTANCE = 12;
/** 큰 깃털이 진자처럼 흔들리는 빠르기(라디안/초). */
const SWING = 1.1;

/** 모델 파일을 받습니다. 받은 비율을 알리고, 신호가 오면 받기를 멈춥니다. */
async function fetchModel(url: string, signal: AbortSignal, onProgress?: (ratio: number) => void) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  const total = Number(response.headers.get('content-length')) || 0;
  if (!onProgress || !total || !response.body) return response.arrayBuffer();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress(Math.min(1, loaded / total));
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
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

  // 처음 화면에는 불사조만 있으면 됩니다. 깃털과 로고는 장면을 띄운 뒤에 받습니다.
  const gltf = await load(MODEL_URLS.phoenix, onProgress).finally(() => {
    signal?.removeEventListener('abort', forwardAbort);
  });
  if (abort.signal.aborted) {
    disposeObject(gltf.scene);
    throw new DOMException('장면을 만들기 전에 화면을 떠났습니다.', 'AbortError');
  }
  onProgress?.(1);

  const disposer = createDisposer();
  try {
    return buildScene();
  } catch (error) {
    disposer.dispose();
    disposeObject(gltf.scene);
    throw error;
  }

  function buildScene(): PhoenixScene {
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

    const shared = {
      uTime: { value: 0 },
      uBurn: { value: 0 },
      uMask: { value: 0 },
      uRim: { value: 0 },
      uHaze: { value: new Color(0.55, 0.02, 0.02) },
      uHazeAmount: { value: 0 },
      uDissolve: { value: 0 },
    };

    const bird = disposer.track(createBird(gltf, shared));
    const trail = disposer.track(createTrail(compact ? 220 : 420, shared.uTime, WINGSPAN));
    const scene = new Scene();
    const skyLight = new HemisphereLight(0xff8c7a, 0x3a0000, 1.9);
    const sunLight = new DirectionalLight(0xffd2c4, 2.4);
    sunLight.position.set(0, 6, -10);
    // 카메라 쪽에서 비추는 보조광. 카메라를 따라 움직입니다.
    const fillLight = new DirectionalLight(0xffffff, 1.7);
    scene.add(skyLight, sunLight, fillLight, bird.group, trail.points);
    const camera = new PerspectiveCamera(40, 1, 0.1, 200);

    // 함대·불티·깃털·로고는 고정된 카메라로 그려 화면 전체를 채웁니다.
    const fxScene = new Scene();
    const fxCamera = new PerspectiveCamera(40, 1, 0.1, 100);
    fxCamera.position.set(0, 0, FX_DISTANCE);
    const halfHeight = Math.tan((fxCamera.fov * Math.PI) / 360) * FX_DISTANCE;
    const fleet = disposer.track(createFleet(compact ? 40 : 76, shared.uTime));
    const embers = disposer.track(createEmbers(compact ? 400 : 900, shared.uTime));
    // 로고에만 닿는 빛. 깃털·불티는 빛을 쓰지 않는 셰이더라 영향을 받지 않습니다.
    const logoKey = new DirectionalLight(0xffc8bd, 2.1);
    logoKey.position.set(-2.5, 3, 6);
    fxScene.add(fleet.mesh, embers.points, logoKey, new AmbientLight(0xff7466, 0.8));

    // 불사조 윤곽: 배경의 빛 무리·불길·빛줄기에 씁니다. 밉맵을 만들어 넓게 흐린 값도 몇 번만 읽습니다.
    const mask = disposer.track(
      new WebGLRenderTarget(1, 1, {
        format: RedFormat,
        depthBuffer: false,
        generateMipmaps: true,
        minFilter: LinearMipmapLinearFilter,
        magFilter: LinearFilter,
      }),
    );
    const backdrop = disposer.track(createBackdrop(mask.texture, shared));

    let feathers: Feathers | null = null;
    let logo: Logo | null = null;
    const state = createSceneState();
    const look = new Vector3();
    const projected = new Vector3();
    const sunTarget = new Vector3();
    const sunAt = new Vector2();
    const heroAt = new Vector2();
    const logoAt = new Vector2(0, 0.35);
    const drawingBuffer = new Vector2();

    let width = 0;
    let height = 0;
    let dpr = 0;
    let quality = 1;
    const resize = () => {
      const nextWidth = canvas.clientWidth || window.innerWidth;
      const nextHeight = canvas.clientHeight || window.innerHeight;
      const nextDpr = Math.min(window.devicePixelRatio || 1, maxDpr) * quality;
      if (nextWidth === width && nextHeight === height && nextDpr === dpr) return;
      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      renderer.getDrawingBufferSize(drawingBuffer);
      const maskWidth = Math.ceil(width / 3);
      const maskHeight = Math.ceil(height / 3);
      mask.setSize(maskWidth, maskHeight);
      backdrop.uniforms.uMaskSize.value.set(maskWidth, maskHeight);
      backdrop.uniforms.uRes.value.copy(drawingBuffer);
      // 점 크기는 화면 높이에 맞추고, 카메라 바로 앞의 점이 커다란 흐린 원이 되지 않게 묶습니다.
      const pointScale = drawingBuffer.y * 0.42;
      embers.uniforms.uScale.value = pointScale;
      embers.uniforms.uMaxPoint.value = 22 * dpr;
      trail.uniforms.uScale.value = pointScale;
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
    let paused = false;
    let time = 0;
    let previous = performance.now();
    let frame = 0;
    let contextLost = false;
    let pointerX = 0;
    let pointerY = 0;
    let easedX = 0;
    let easedY = 0;
    // 셰이더 준비 등으로 느린 첫 프레임들은 빼고 잽니다.
    let warmup = 20;
    let sampledFrames = 0;
    let sampledTime = 0;

    /** 멈춰 있던 그리기를 다시 시작합니다. 이미 돌고 있으면 아무것도 하지 않습니다. */
    const wake = () => {
      if (frame !== 0 || disposer.disposed || contextLost) return;
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
      const delta = Math.min(0.05, Math.max(0, (now - previous) / 1000));
      previous = now;
      if (!paused) {
        measure(delta);
        time += delta;
      }
      progress += (targetProgress - progress) * (1 - Math.exp(-delta * 4.2));
      easedX += (pointerX - easedX) * (1 - Math.exp(-delta * 3));
      easedY += (pointerY - easedY) * (1 - Math.exp(-delta * 3));

      const s = sampleTimeline(progress, width / height, state);
      shared.uTime.value = time;
      shared.uBurn.value = s.burn;
      shared.uDissolve.value = s.dissolve;
      // 장면의 빛을 불사조에도 입힙니다: 태양 앞에서는 붉은 역광과 대기, 우주에서는 어둠에 가깝게.
      shared.uRim.value = 0.25 + s.sun * 0.85 + s.burn * 0.35;
      shared.uHaze.value.setRGB(lerp(0.5, 0.05, s.cosmos), lerp(0.02, 0, s.cosmos), lerp(0.02, 0.01, s.cosmos));
      shared.uHazeAmount.value = 0.28 * s.sun + 0.12 * s.cosmos * (1 - s.sun);
      skyLight.color.setRGB(1, lerp(0.55, 0.35, s.cosmos), lerp(0.48, 0.32, s.cosmos));

      // 태양이 터지는 순간 화면 전체가 짧게 흔들립니다.
      const shakeX = s.shake > 0 ? (Math.sin(time * 37) + Math.sin(time * 23.7) * 0.6) * 0.5 * s.shake : 0;
      const shakeY = s.shake > 0 ? (Math.cos(time * 33.1) + Math.sin(time * 19.3) * 0.6) * 0.5 * s.shake : 0;
      camera.position.set(s.camera[0] + easedX * 0.6 + shakeX * 0.1, s.camera[1] - easedY * 0.4 + shakeY * 0.1, s.camera[2]);
      look.set(s.look[0] + shakeX * 0.1, s.look[1] + shakeY * 0.1, s.look[2]);
      camera.lookAt(look);
      camera.updateMatrixWorld();
      fillLight.position.copy(camera.position);
      fxCamera.position.set(shakeX * 0.05, shakeY * 0.05, FX_DISTANCE);
      backdrop.uniforms.uShift.value.set((shakeX * 0.05) / (2 * halfHeight), (shakeY * 0.05) / (2 * halfHeight));

      const sunX = Math.sin(s.azimuth) * -0.35;
      const birdOn = s.dissolve < 0.999;
      const trailOn = birdOn && s.trail > 0.001;
      bird.group.visible = birdOn;
      trail.points.visible = trailOn;
      if (birdOn) {
        if (!paused) bird.update(delta, s.flapRate);
        // 날개를 내려칠 때 몸이 떠오르고 고개를 살짝 듭니다. 날개 끝 높이와 반대로, 조금 늦게 움직입니다.
        const bob = -bird.wingLift(0.08) * 0.1 * s.flight;
        bird.group.position.set(0, bob, 0);
        bird.group.rotation.x = bob * 0.35;
        bird.group.rotation.z = Math.sin(time * 0.55) * 0.12 * s.flight;
        // 태양을 향해 날아들어 그 속에서 터집니다.
        sunTarget.set((2 * sunX) / (width / height), 0.48, 0.5).unproject(camera).sub(camera.position).normalize();
        bird.group.position.addScaledVector(sunTarget, s.exit * 40);
        projected.copy(bird.group.position).project(camera);
        backdrop.uniforms.uBird.value.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);
      }
      if (trailOn) {
        trail.uniforms.uIntensity.value = s.trail;
        trail.uniforms.uOrigin.value.copy(bird.group.position);
      }

      embers.uniforms.uHeat.value = s.burn;
      embers.uniforms.uFlight.value = s.flight;
      fleet.mesh.visible = s.war > 0.001;
      fleet.uniforms.uWar.value = s.war;

      // 큰 깃털: 태양에서 화면 가운데(로고 자리)로, 진자처럼 흔들리며 내려옵니다.
      // 흔들리는 끝에서 살짝 떠오르고, 가운데 쪽으로 몸을 기울입니다.
      sunAt.set(sunX * 2 * halfHeight, 0.48 * halfHeight);
      const descend = ease(s.fall);
      const swing = 1 - descend * 0.6;
      const wave = Math.sin(time * SWING);
      heroAt.set(
        lerp(sunAt.x, 0, descend) + wave * 0.22 * swing,
        lerp(sunAt.y - 0.4, logoAt.y - 0.55, descend) + wave * wave * 0.08 * swing,
      );
      if (feathers) {
        feathers.uniforms.uFall.value = s.fall;
        feathers.uniforms.uLogo.value = s.logo;
        feathers.uniforms.uHeroRoll.value = -wave * 0.38 * swing;
        feathers.uniforms.uSun.value.copy(sunAt);
        feathers.uniforms.uHeroAt.value.copy(heroAt);
        feathers.uniforms.uLogoAt.value.copy(logoAt);
        feathers.setVisibility(s.fall, s.logo);
      }
      // 로고는 터진 자리에서 돌며 커지고, 다 나타난 뒤에는 천천히 흔들립니다.
      logo?.update(ease(s.logo), time, logoAt.y + 0.1);

      const bu = backdrop.uniforms;
      bu.uSun.value = s.sun;
      bu.uSunSize.value = s.sunSize;
      bu.uSunX.value = sunX;
      bu.uCosmos.value = s.cosmos;
      bu.uWar.value = s.war;
      bu.uNova.value = s.nova;
      bu.uLogo.value = s.logo;
      // 폭발은 태양 자리에서, 잔광은 로고 자리에서 일어납니다(배경 셰이더 좌표).
      bu.uNovaAt.value.set(sunX, 0.24);
      bu.uLogoAt.value.set(0, logoAt.y / (2 * halfHeight));
      bu.uHeroAt.value.set(heroAt.x / (2 * halfHeight), heroAt.y / (2 * halfHeight));
      bu.uHeroGlow.value = Math.min(1, s.fall * 4) * (1 - s.logo);
      bu.uMaskOn.value = birdOn ? 1 : 0;

      // 불사조가 보일 때만 윤곽을 그립니다(꼬리 불티는 빼고).
      if (birdOn) {
        trail.points.visible = false;
        shared.uMask.value = 1;
        renderer.setRenderTarget(mask);
        renderer.clear();
        renderer.render(scene, camera);
        shared.uMask.value = 0;
        trail.points.visible = trailOn;
      }
      renderer.setRenderTarget(null);
      renderer.clear();
      renderer.render(backdrop.scene, backdrop.camera);
      if (birdOn) {
        renderer.clearDepth();
        renderer.render(scene, camera);
      }
      renderer.clearDepth();
      renderer.render(fxScene, fxCamera);

      // 정지 중에는 스크롤·포인터를 따라잡은 뒤 그리기를 멈춥니다. 다음 입력이 오면 다시 깨웁니다.
      const settled =
        paused &&
        Math.abs(targetProgress - progress) < 1e-4 &&
        Math.abs(pointerX - easedX) < 1e-3 &&
        Math.abs(pointerY - easedY) < 1e-3;
      if (!settled) frame = requestAnimationFrame(render);
    };

    const onContextLost = () => {
      contextLost = true;
      cancelAnimationFrame(frame);
      frame = 0;
    };
    const onContextRestored = () => {
      contextLost = false;
      wake();
    };
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    // 화면 크기는 캔버스 상자를 따릅니다. 모바일 주소창이 접히고 펼쳐질 때마다 버퍼를 다시 만들지 않습니다.
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    disposer.add(() => {
      observer.disconnect();
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
    });

    resize();
    // 셰이더를 미리 컴파일해 둡니다. 함대처럼 나중에 보이는 것이 처음 나타날 때 멈칫하지 않습니다.
    renderer.compile(scene, camera);
    renderer.compile(fxScene, fxCamera);
    renderer.compile(backdrop.scene, backdrop.camera);

    // 끝 장면(깃털·로고)은 불사조를 띄운 뒤에 받습니다. 받지 못해도 나머지 장면은 그대로 보여 줍니다.
    Promise.all([load(MODEL_URLS.feathers), load(MODEL_URLS.logo)])
      .then(([featherGltf, logoGltf]) => {
        if (disposer.disposed) {
          disposeObject(featherGltf.scene);
          disposeObject(logoGltf.scene);
          return;
        }
        const nextFeathers = disposer.track(createFeathers(featherGltf, { count: compact ? 26 : 44, uTime: shared.uTime }));
        nextFeathers.uniforms.uAspect.value = Math.min(1.6, width / height);
        const nextLogo = disposer.track(createLogo(logoGltf));
        fxScene.add(...nextFeathers.meshes, nextLogo.group);
        renderer.compile(fxScene, fxCamera);
        feathers = nextFeathers;
        logo = nextLogo;
        wake();
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
