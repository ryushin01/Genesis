import {
  AdditiveBlending,
  AnimationMixer,
  Box3,
  Color,
  BufferAttribute,
  BufferGeometry,
  type Object3D,
  ConeGeometry,
  DoubleSide,
  DirectionalLight,
  Group,
  HemisphereLight,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  LinearSRGBColorSpace,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
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
import {
  backgroundFragment,
  backgroundVertex,
  birdAlbedo,
  birdEmissive,
  birdFragmentHead,
  birdOutput,
  emberFragment,
  emberVertex,
  featherFragment,
  featherVertex,
  fleetFragment,
  fleetVertex,
} from './shaders';

export interface PhoenixScene {
  setProgress(progress: number): void;
  setPointer(x: number, y: number): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

/** "Phoenix" by NORBERTO-3D (CC BY 4.0). 색을 바꾸고 목의 장식을 뺀 모델입니다. */
const MODEL_URL = '/models/phoenix.glb';
/** “Feathers” by victorberdugo1, “Phoenix Logo” by Suraj-456tyu (모두 CC BY 4.0). */
const FEATHERS_URL = '/models/feathers.glb';
const LOGO_URL = '/models/phoenix-logo.glb';
const WINGSPAN = 7;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 깃털 모델에서 이름이 같은 부품을 한 덩어리로 합칩니다. 면이 화면을 보도록 돌리고 밑동을 원점, 길이를 1로 맞춥니다. */
function extractFeather(root: Object3D, prefix: string) {
  root.updateMatrixWorld(true);
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const point = new Vector3();
  const direction = new Vector3();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || !mesh.name.startsWith(prefix)) return;
    const position = mesh.geometry.getAttribute('position');
    const normal = mesh.geometry.getAttribute('normal');
    const index = mesh.geometry.getIndex();
    const offset = positions.length / 3;
    for (let i = 0; i < position.count; i += 1) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      direction.fromBufferAttribute(normal, i).transformDirection(mesh.matrixWorld);
      positions.push(point.z, point.y, -point.x);
      normals.push(direction.z, direction.y, -direction.x);
    }
    if (index) for (let i = 0; i < index.count; i += 1) indices.push(index.getX(i) + offset);
  });
  let minY = Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  let sumZ = 0;
  for (let i = 0; i < positions.length; i += 3) {
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
    sumX += positions[i];
    sumZ += positions[i + 2];
  }
  const count = positions.length / 3;
  const length = maxY - minY || 1;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] - sumX / count) / length;
    positions[i + 1] = (positions[i + 1] - minY) / length;
    positions[i + 2] = (positions[i + 2] - sumZ / count) / length;
  }
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setIndex(indices);
  return geometry;
}

export async function createPhoenixScene(
  canvas: HTMLCanvasElement,
  onProgress?: (ratio: number) => void,
): Promise<PhoenixScene> {
  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const ratios = [0, 0, 0];
  const track = (index: number) => (event: ProgressEvent) => {
    if (event.total > 0) ratios[index] = event.loaded / event.total;
    onProgress?.(ratios[0] * 0.9 + ratios[1] * 0.03 + ratios[2] * 0.07);
  };
  const [gltf, featherGltf, logoGltf] = await Promise.all([
    loader.loadAsync(MODEL_URL, track(0)),
    loader.loadAsync(FEATHERS_URL, track(1)),
    loader.loadAsync(LOGO_URL, track(2)),
  ]);
  onProgress?.(1);

  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.autoClear = false;
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
  const skyLight = new HemisphereLight(0xff8c7a, 0x3a0000, 1.9);
  scene.add(skyLight);
  const sunLight = new DirectionalLight(0xffd2c4, 2.4);
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

  // 깃털: 모델의 두 깃털을 번갈아 씁니다. 첫 번째(큰 깃털)는 마지막 문구 위에 떠 있습니다.
  const featherCount = compact ? 26 : 44;
  const featherUniforms = {
    uTime: shared.uTime,
    uFall: { value: 0 },
    uNova: { value: 0 },
    uSun: { value: new Vector2(0, 2) },
    uNovaAt: { value: new Vector2(0, 1.5) },
    uAspect: { value: 1 },
  };
  const featherMaterial = new ShaderMaterial({
    uniforms: featherUniforms,
    vertexShader: featherVertex,
    fragmentShader: featherFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
  });
  const featherGeometries = ['feather_a', 'feather_b'].map((prefix, variant) => {
    const geometry = extractFeather(featherGltf.scene, prefix);
    const seeds: number[] = [];
    const hero: number[] = [];
    for (let i = variant; i < featherCount; i += 2) {
      seeds.push((i * 0.61803398875) % 1);
      hero.push(i === 0 ? 1 : 0);
    }
    geometry.setAttribute('aSeed', new InstancedBufferAttribute(new Float32Array(seeds), 1));
    geometry.setAttribute('aHero', new InstancedBufferAttribute(new Float32Array(hero), 1));
    geometry.instanceCount = seeds.length;
    return geometry;
  });
  const feathers = featherGeometries.map((geometry) => {
    const mesh = new Mesh(geometry, featherMaterial);
    mesh.frustumCulled = false;
    mesh.renderOrder = 3;
    return mesh;
  });

  // 로고: 정면으로 돌리고 높이를 맞춥니다. 색은 #8B0000 계열로 옮깁니다.
  const logoModel = logoGltf.scene;
  const logoBox = new Box3().setFromObject(logoModel);
  const logoSize = logoBox.getSize(new Vector3());
  logoModel.position.copy(logoBox.getCenter(new Vector3())).multiplyScalar(-1);
  const logoMaterials: MeshBasicMaterial[] = [];
  logoModel.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.material as MeshStandardMaterial;
    const lum = Math.min(1, (source.color.r * 0.3 + source.color.g * 0.59 + source.color.b * 0.11) / 0.32);
    const material = new MeshBasicMaterial({ transparent: true, depthWrite: false });
    material.color.setRGB(lerp(0.3, 0.86, lum), lerp(0, 0.08, lum), lerp(0, 0.05, lum));
    mesh.material = material;
    mesh.frustumCulled = false;
    logoMaterials.push(material);
  });
  const logoPivot = new Group();
  logoPivot.add(logoModel);
  const logo = new Group();
  logo.add(logoPivot);
  const logoScale = 2.8 / Math.max(logoSize.y, 1e-6);
  logo.renderOrder = 4;

  embers.renderOrder = 2;
  fxScene.add(fleet, embers, ...feathers, logo);

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
    uBurn: shared.uBurn,
    uNova: { value: 0 },
    uLogo: { value: 0 },
    uNovaAt: { value: new Vector2(0, 0) },
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
    emberUniforms.uScale.value = height * dpr * 0.42;
    featherUniforms.uAspect.value = Math.min(1.6, width / height);
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
  const sunTarget = new Vector3();

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
    // 장면의 빛을 불사조에도 입힙니다: 태양 앞에서는 붉은 역광과 대기, 우주에서는 어둠에 가깝게.
    shared.uRim.value = 0.25 + s.sun * 0.85 + s.burn * 0.35;
    shared.uHaze.value.setRGB(lerp(0.5, 0.05, s.cosmos), lerp(0.02, 0, s.cosmos), lerp(0.02, 0.01, s.cosmos));
    shared.uHazeAmount.value = 0.28 * s.sun + 0.12 * s.cosmos * (1 - s.sun);
    skyLight.color.setRGB(1, lerp(0.55, 0.35, s.cosmos), lerp(0.48, 0.32, s.cosmos));
    backgroundUniforms.uSun.value = s.sun;
    backgroundUniforms.uSunSize.value = s.sunSize;
    backgroundUniforms.uSunX.value = Math.sin(s.azimuth) * -0.35;
    backgroundUniforms.uCosmos.value = s.cosmos;
    backgroundUniforms.uWar.value = s.war;
    fleetUniforms.uWar.value = s.war;
    emberUniforms.uHeat.value = s.burn;
    emberUniforms.uFlight.value = s.flight;

    // 비행 중에는 몸이 좌우로 기울고 위아래로 흔들립니다.
    bird.rotation.z = Math.sin(time * 0.55) * 0.12 * s.flight;
    bird.position.set(0, Math.sin(time * 1.1) * 0.12 * s.flight, 0);
    camera.position.set(s.camera[0] + easedX * 0.6, s.camera[1] - easedY * 0.4, s.camera[2]);
    look.set(s.look[0], s.look[1], s.look[2]);
    camera.lookAt(look);
    camera.updateMatrixWorld();
    fillLight.position.copy(camera.position);
    // 다시 나타난 태양을 향해 날아올라 그 속에서 흩어집니다.
    const sunX = Math.sin(s.azimuth) * -0.35;
    sunTarget.set((2 * sunX) / (width / height), 0.48, 0.5).unproject(camera).sub(camera.position).normalize();
    bird.position.addScaledVector(sunTarget, s.exit * 40);
    shared.uDissolve.value = s.dissolve;
    featherUniforms.uFall.value = s.fall;
    featherUniforms.uNova.value = s.nova;
    backgroundUniforms.uNova.value = s.nova;
    backgroundUniforms.uLogo.value = s.logo;
    // 로고는 터진 자리에서 돌며 커지고, 다 나타난 뒤에는 천천히 흔들립니다.
    const appear = s.logo * s.logo * (3 - 2 * s.logo);
    logo.visible = appear > 0.001;
    logo.scale.setScalar(logoScale * (0.4 + appear * 0.6));
    logo.position.set(0, featherUniforms.uNovaAt.value.y + 0.1, 0);
    logo.rotation.y = (1 - appear) * 2.4 + Math.sin(time * 0.4) * 0.12;
    logoMaterials.forEach((material) => {
      material.opacity = appear;
    });
    const halfHeight = Math.tan((fxCamera.fov * Math.PI) / 360) * fxCamera.position.z;
    featherUniforms.uSun.value.set(sunX * 2 * halfHeight, 0.48 * halfHeight);
    // 터지는 점(큰 깃털이 머무는 곳)을 배경 셰이더 좌표로도 넘깁니다.
    backgroundUniforms.uNovaAt.value.set(0, featherUniforms.uNovaAt.value.y / (2 * halfHeight));
    projected.copy(bird.position).project(camera);
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
      fleetGeometry.dispose();
      fleet.material.dispose();
      emberGeometry.dispose();
      featherGeometries.forEach((geometry) => geometry.dispose());
      featherMaterial.dispose();
      logoMaterials.forEach((material) => material.dispose());
      logoModel.traverse((object) => {
        const mesh = object as Mesh;
        if (mesh.isMesh) mesh.geometry.dispose();
      });
      embers.material.dispose();
      backgroundGeometry.dispose();
      backgroundMaterial.dispose();
      mask.dispose();
      renderer.dispose();
    },
  };
}
