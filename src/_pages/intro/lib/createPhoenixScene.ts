import {
  AdditiveBlending,
  AnimationMixer,
  Box3,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  ConeGeometry,
  CustomBlending,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  MeshStandardMaterial,
  OneFactor,
  OneMinusSrcAlphaFactor,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { sampleTimeline } from '../model/timeline';
import { drawRingArt } from './drawPhoenixArt';
import {
  backgroundFragment,
  backgroundVertex,
  birdAlbedo,
  birdEmissive,
  birdFragmentHead,
  birdOutput,
  emberFragment,
  emberVertex,
  fleetFragment,
  fleetVertex,
  ringFragment,
  ringVertex,
} from './shaders';

export interface PhoenixScene {
  setProgress(progress: number): void;
  setPointer(x: number, y: number): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

/** "Phoenix" by NORBERTO-3D (CC BY 4.0). 색을 바꾸고 목의 장식을 뺀 모델입니다. */
const MODEL_URL = '/models/phoenix.glb';
const WINGSPAN = 7;

function createArtTexture(size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D 캔버스를 만들 수 없습니다.');
  draw(context, size);
  const texture = new CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return texture;
}

export async function createPhoenixScene(canvas: HTMLCanvasElement): Promise<PhoenixScene> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(MODEL_URL);

  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.autoClear = false;
  const compact = window.innerWidth < 768;
  const maxDpr = compact ? 1.5 : 1.75;

  const shared = {
    uTime: { value: 0 },
    uBurn: { value: 0 },
    uMorph: { value: 0 },
    uMask: { value: 0 },
  };

  // 불사조: 크기를 맞추고 머리가 화면 안쪽(-z)을 향하게 돌립니다.
  const model = gltf.scene;
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = WINGSPAN / Math.max(size.x, size.z);
  model.scale.setScalar(scale);
  model.position.copy(center).multiplyScalar(-scale);
  const bird = new Group();
  bird.add(model);
  bird.rotation.y = Math.PI;

  const materials: MeshStandardMaterial[] = [];
  model.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.frustumCulled = false;
    const material = mesh.material as MeshStandardMaterial;
    material.transparent = false;
    material.alphaTest = 0.35;
    material.depthWrite = true;
    material.metalness = 0;
    material.roughness = 0.7;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, shared);
      shader.fragmentShader = birdFragmentHead + shader.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>\n${birdAlbedo}`)
        .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${birdEmissive}`)
        .replace('#include <dithering_fragment>', `#include <dithering_fragment>\n${birdOutput}`);
    };
    material.customProgramCacheKey = () => 'phoenix-crimson';
    material.needsUpdate = true;
    materials.push(material);
  });

  const mixer = new AnimationMixer(model);
  gltf.animations.forEach((clip) => mixer.clipAction(clip).setEffectiveTimeScale(0.62).play());

  const scene = new Scene();
  scene.add(new HemisphereLight(0xffffff, 0x2a0000, 1.9));
  const sunLight = new DirectionalLight(0xffffff, 2.4);
  sunLight.position.set(0, 6, -10);
  // 카메라 쪽에서 비추는 보조광. 카메라를 따라 움직입니다.
  const fillLight = new DirectionalLight(0xffffff, 1.7);
  scene.add(sunLight, fillLight, bird);
  const maskScene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 200);

  // 함대와 불티는 고정된 카메라로 그려 화면 전체를 채웁니다.
  const fxScene = new Scene();
  const fxCamera = new PerspectiveCamera(40, 1, 0.1, 100);
  fxCamera.position.set(0, 0, 12);

  const fleetUniforms = { uTime: shared.uTime, uWar: { value: 0 } };
  const fleetCount = compact ? 40 : 76;
  const cone = new ConeGeometry(0.09, 0.55, 3).rotateZ(-Math.PI / 2);
  const fleetGeometry = new InstancedBufferGeometry();
  fleetGeometry.setIndex(cone.getIndex());
  fleetGeometry.setAttribute('position', cone.getAttribute('position'));
  const offsets = new Float32Array(fleetCount * 3);
  const fleetSeeds = new Float32Array(fleetCount);
  for (let i = 0; i < fleetCount; i += 1) {
    const flank = i % 2 === 0 ? 1 : -1;
    offsets.set([Math.random() * 60 - 30, flank * (2.6 + Math.random() * 5.5), -9 - Math.random() * 15], i * 3);
    fleetSeeds[i] = Math.random();
  }
  fleetGeometry.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 3));
  fleetGeometry.setAttribute('aSeed', new InstancedBufferAttribute(fleetSeeds, 1));
  fleetGeometry.instanceCount = fleetCount;
  const fleet = new Mesh(
    fleetGeometry,
    new ShaderMaterial({ uniforms: fleetUniforms, vertexShader: fleetVertex, fragmentShader: fleetFragment }),
  );
  fleet.frustumCulled = false;

  const emberUniforms = { uTime: shared.uTime, uHeat: { value: 0 }, uScale: { value: 300 }, uFlight: { value: 0 } };
  const emberCount = compact ? 400 : 900;
  const emberPositions = new Float32Array(emberCount * 3);
  const emberSeeds = new Float32Array(emberCount);
  for (let i = 0; i < emberCount; i += 1) {
    emberPositions.set([Math.random() * 26 - 13, Math.random() * 12 - 6, Math.random() * 12 - 7], i * 3);
    emberSeeds[i] = Math.random();
  }
  const emberGeometry = new BufferGeometry();
  emberGeometry.setAttribute('position', new BufferAttribute(emberPositions, 3));
  emberGeometry.setAttribute('aSeed', new BufferAttribute(emberSeeds, 1));
  const embers = new Points(
    emberGeometry,
    new ShaderMaterial({
      uniforms: emberUniforms,
      vertexShader: emberVertex,
      fragmentShader: emberFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    }),
  );
  embers.frustumCulled = false;

  const ringTexture = createArtTexture(compact ? 1024 : 2048, drawRingArt);
  const ringUniforms = {
    uRingArt: { value: ringTexture },
    uRes: { value: new Vector2(1, 1) },
    uZoom: { value: 1 },
    uTime: shared.uTime,
    uMorph: shared.uMorph,
  };
  const ringGeometry = new PlaneGeometry(2, 2);
  const ringMaterial = new ShaderMaterial({
    uniforms: ringUniforms,
    vertexShader: ringVertex,
    fragmentShader: ringFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // 빛 번짐이 형상 밖으로 나가도록 미리 곱한 알파로 합성합니다.
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
  });
  const ring = new Mesh(ringGeometry, ringMaterial);
  ring.frustumCulled = false;
  ring.renderOrder = 3;
  embers.renderOrder = 2;
  fxScene.add(fleet, embers, ring);

  const mask = new WebGLRenderTarget(4, 4);
  const backgroundUniforms = {
    uMaskTex: { value: mask.texture },
    uRes: { value: new Vector2(1, 1) },
    uBird: { value: new Vector2(0.5, 0.5) },
    uTime: shared.uTime,
    uSun: { value: 0 },
    uSunSize: { value: 0 },
    uSunX: { value: 0 },
    uCosmos: { value: 0 },
    uWar: { value: 0 },
    uRing: { value: 0 },
    uBurn: shared.uBurn,
  };
  const backgroundScene = new Scene();
  const backgroundGeometry = new PlaneGeometry(2, 2);
  const backgroundMaterial = new ShaderMaterial({
    uniforms: backgroundUniforms,
    vertexShader: backgroundVertex,
    fragmentShader: backgroundFragment,
    depthTest: false,
    depthWrite: false,
  });
  const backgroundMesh = new Mesh(backgroundGeometry, backgroundMaterial);
  backgroundMesh.frustumCulled = false;
  backgroundScene.add(backgroundMesh);
  const backgroundCamera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);

  let width = 0;
  let height = 0;
  let quality = 1;
  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * quality;
    renderer.setPixelRatio(dpr);
    renderer.setSize(width, height, false);
    mask.setSize(Math.ceil(width / 3), Math.ceil(height / 3));
    backgroundUniforms.uRes.value.set(width * dpr, height * dpr);
    ringUniforms.uRes.value.set(width * dpr, height * dpr);
    emberUniforms.uScale.value = height * dpr * 0.42;
    for (const view of [camera, fxCamera]) {
      view.aspect = width / height;
      view.updateProjectionMatrix();
    }
  };
  resize();
  window.addEventListener('resize', resize);

  let targetProgress = 0;
  let progress = 0;
  let paused = false;
  let time = 0;
  let previous = performance.now();
  let frame = 0;
  let pointerX = 0;
  let pointerY = 0;
  let easedX = 0;
  let easedY = 0;
  let sampledFrames = 0;
  let sampledTime = 0;
  const look = new Vector3();
  const projected = new Vector3();

  const render = (now: number) => {
    const delta = Math.min(0.05, (now - previous) / 1000);
    previous = now;

    // 프레임이 계속 밀리는 기기에서는 해상도를 낮춰 스크롤 반응을 지킵니다.
    sampledFrames += 1;
    sampledTime += delta;
    if (sampledFrames === 45) {
      if (sampledTime / sampledFrames > 1 / 34 && quality > 0.4) {
        quality *= 0.75;
        resize();
      }
      sampledFrames = 0;
      sampledTime = 0;
    }

    if (!paused) {
      time += delta;
      mixer.update(delta);
    }
    progress += (targetProgress - progress) * (1 - Math.exp(-delta * 4.2));
    easedX += (pointerX - easedX) * (1 - Math.exp(-delta * 3));
    easedY += (pointerY - easedY) * (1 - Math.exp(-delta * 3));

    const s = sampleTimeline(progress, width / height);
    shared.uTime.value = time;
    shared.uBurn.value = s.burn;
    shared.uMorph.value = s.morph;
    ringUniforms.uZoom.value = s.ringZoom;
    backgroundUniforms.uSun.value = s.sun;
    backgroundUniforms.uSunSize.value = s.sunSize;
    backgroundUniforms.uSunX.value = Math.sin(s.azimuth) * -0.35;
    backgroundUniforms.uCosmos.value = s.cosmos;
    backgroundUniforms.uWar.value = s.war;
    backgroundUniforms.uRing.value = s.ring;
    fleetUniforms.uWar.value = s.war * (1 - s.ring);
    emberUniforms.uHeat.value = s.burn;
    emberUniforms.uFlight.value = s.flight;

    // 비행 중에는 몸이 좌우로 기울고 위아래로 흔들립니다.
    bird.rotation.z = Math.sin(time * 0.55) * 0.12 * s.flight;
    bird.position.y = Math.sin(time * 1.1) * 0.12 * s.flight;
    camera.position.set(s.camera[0] + easedX * 0.6, s.camera[1] - easedY * 0.4, s.camera[2]);
    look.set(s.look[0], s.look[1], s.look[2]);
    camera.lookAt(look);
    fillLight.position.copy(camera.position);
    projected.set(0, 0, 0).project(camera);
    backgroundUniforms.uBird.value.set(projected.x * 0.5 + 0.5, projected.y * 0.5 + 0.5);

    maskScene.add(bird);
    shared.uMask.value = 1;
    renderer.setRenderTarget(mask);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(maskScene, camera);
    scene.add(bird);
    shared.uMask.value = 0;

    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);
    renderer.clearDepth();
    renderer.render(fxScene, fxCamera);
    frame = requestAnimationFrame(render);
  };
  frame = requestAnimationFrame(render);

  return {
    setProgress(value) {
      targetProgress = value;
    },
    setPointer(x, y) {
      pointerX = x;
      pointerY = y;
    },
    setPaused(value) {
      paused = value;
    },
    dispose() {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      mixer.stopAllAction();
      model.traverse((object) => {
        const mesh = object as Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
      });
      materials.forEach((material) => {
        material.map?.dispose();
        material.emissiveMap?.dispose();
        material.normalMap?.dispose();
        material.dispose();
      });
      ringGeometry.dispose();
      ringMaterial.dispose();
      ringTexture.dispose();
      fleetGeometry.dispose();
      fleet.material.dispose();
      emberGeometry.dispose();
      embers.material.dispose();
      backgroundGeometry.dispose();
      backgroundMaterial.dispose();
      mask.dispose();
      renderer.dispose();
    },
  };
}
