import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  InstancedMesh,
  LinearSRGBColorSpace,
  Mesh,
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
import { sampleTimeline } from '../model/timeline';
import { buildPhoenix } from './buildPhoenix';
import {
  backgroundFragment,
  backgroundVertex,
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

/** 깃대를 Y축에 둔 V자 단면의 깃털 한 장. */
function createFeatherGeometry() {
  const rows = 12;
  const columns = 4;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const index: number[] = [];

  for (let j = 0; j <= rows; j += 1) {
    const v = j / rows;
    const halfWidth = Math.pow(Math.sin(Math.PI * Math.pow(v, 0.72)), 0.72) * 0.5 + 0.002;
    for (let i = 0; i <= columns; i += 1) {
      const u = i / columns;
      const x = (u - 0.5) * 2 * halfWidth;
      positions.push(x, v, -Math.abs(x) * 0.5 + v * v * 0.1);
      const n = new Vector3(Math.sign(x) * 0.42, 0, 1).normalize();
      normals.push(n.x, n.y, n.z);
      uvs.push(u, v);
    }
  }
  for (let j = 0; j < rows; j += 1) {
    for (let i = 0; i < columns; i += 1) {
      const a = j * (columns + 1) + i;
      const b = a + columns + 1;
      index.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }

  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(index);
  return geometry;
}

export function createPhoenixScene(canvas: HTMLCanvasElement): PhoenixScene {
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.autoClear = false;
  const compact = window.innerWidth < 768;
  const maxDpr = compact ? 1.5 : 1.75;

  const uniforms = {
    uTime: { value: 0 },
    uFlap: { value: 0 },
    uMorph: { value: 0 },
    uBurn: { value: 0 },
    uMask: { value: 0 },
  };

  const phoenix = buildPhoenix(compact ? 0.7 : 1.15);
  const featherGeometry = createFeatherGeometry();
  const featherMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: featherVertex,
    fragmentShader: featherFragment,
    side: DoubleSide,
  });
  const bird = new InstancedMesh(featherGeometry, featherMaterial, phoenix.count);
  bird.instanceMatrix.copyArray(phoenix.matrices);
  bird.instanceMatrix.needsUpdate = true;
  featherGeometry.setAttribute('aMeta', new InstancedBufferAttribute(phoenix.meta, 4));
  bird.frustumCulled = false;

  const fleetUniforms = { uTime: uniforms.uTime, uWar: { value: 0 } };
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

  const emberUniforms = { uTime: uniforms.uTime, uHeat: { value: 0 }, uScale: { value: 300 } };
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

  const scene = new Scene();
  scene.add(fleet, bird, embers);
  const maskScene = new Scene();
  const camera = new PerspectiveCamera(45, 1, 0.1, 100);

  const mask = new WebGLRenderTarget(4, 4);
  const backgroundUniforms = {
    uMaskTex: { value: mask.texture },
    uRes: { value: new Vector2(1, 1) },
    uTime: uniforms.uTime,
    uSun: { value: 0 },
    uCosmos: { value: 0 },
    uWar: { value: 0 },
    uRing: { value: 0 },
    uBurn: uniforms.uBurn,
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
    camera.aspect = width / height;
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
  const look = new Vector3();

  let sampledFrames = 0;
  let sampledTime = 0;

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

    if (!paused) time += delta;
    progress += (targetProgress - progress) * (1 - Math.exp(-delta * 4.2));
    easedX += (pointerX - easedX) * (1 - Math.exp(-delta * 3));
    easedY += (pointerY - easedY) * (1 - Math.exp(-delta * 3));

    const s = sampleTimeline(progress, width / height);
    uniforms.uTime.value = time;
    uniforms.uFlap.value = s.flap;
    uniforms.uMorph.value = s.morph;
    uniforms.uBurn.value = s.burn;
    backgroundUniforms.uSun.value = s.sun;
    backgroundUniforms.uCosmos.value = s.cosmos;
    backgroundUniforms.uWar.value = s.war;
    backgroundUniforms.uRing.value = s.ring;
    fleetUniforms.uWar.value = s.war * (1 - s.ring);
    emberUniforms.uHeat.value = s.burn;

    camera.position.set(s.camera[0] + easedX * 0.35, s.camera[1] - easedY * 0.25, s.camera[2]);
    look.set(s.target[0], s.target[1], s.target[2]);
    camera.lookAt(look);
    camera.fov = s.fov;
    camera.updateProjectionMatrix();

    maskScene.add(bird);
    uniforms.uMask.value = 1;
    renderer.setRenderTarget(mask);
    renderer.setClearColor(0x000000, 1);
    renderer.clear();
    renderer.render(maskScene, camera);
    scene.add(bird);
    uniforms.uMask.value = 0;

    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(backgroundScene, backgroundCamera);
    renderer.clearDepth();
    renderer.render(scene, camera);
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
      featherGeometry.dispose();
      featherMaterial.dispose();
      fleetGeometry.dispose();
      fleet.material.dispose();
      emberGeometry.dispose();
      embers.material.dispose();
      backgroundGeometry.dispose();
      backgroundMaterial.dispose();
      bird.dispose();
      mask.dispose();
      renderer.dispose();
    },
  };
}
