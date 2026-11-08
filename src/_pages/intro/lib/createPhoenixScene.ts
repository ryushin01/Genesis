import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  CanvasTexture,
  CustomBlending,
  OneFactor,
  OneMinusSrcAlphaFactor,
  LinearMipmapLinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three';
import { sampleTimeline } from '../model/timeline';
import { drawRingArt } from './drawPhoenixArt';
import {
  backgroundFragment,
  backgroundVertex,
  emberFragment,
  emberVertex,
  fleetFragment,
  fleetVertex,
  phoenixFragment,
  phoenixVertex,
} from './shaders';

export interface PhoenixScene {
  setProgress(progress: number): void;
  setPointer(x: number, y: number): void;
  setPaused(paused: boolean): void;
  dispose(): void;
}

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

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`이미지를 불러오지 못했습니다: ${src}`));
    image.src = src;
  });
}

export async function createPhoenixScene(canvas: HTMLCanvasElement): Promise<PhoenixScene> {
  const [flightImageA, flightImageB] = await Promise.all([loadImage('/art/phoenix-flight-1.webp'), loadImage('/art/phoenix-flight-2.webp')]);
  const renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = LinearSRGBColorSpace;
  renderer.autoClear = false;
  const compact = window.innerWidth < 768;
  const maxDpr = compact ? 1.5 : 1.75;

  const artSize = compact ? 1024 : 2048;
  // 세 각도의 날갯짓 프레임이 담긴 이미지입니다. 작은 화면에서는 절반 크기로 씁니다.
  const flightSize = compact ? 2048 : 4096;
  const flightTexture = createArtTexture(flightSize, (ctx, size) => ctx.drawImage(flightImageA, 0, 0, size, size));
  const flightTexture2 = createArtTexture(flightSize, (ctx, size) => ctx.drawImage(flightImageB, 0, 0, size, size));
  const ringTexture = createArtTexture(artSize, drawRingArt);

  const uniforms = {
    uTime: { value: 0 },
    uFlap: { value: 0 },
    uMorph: { value: 0 },
    uBurn: { value: 0 },
    uMask: { value: 0 },
    uZoom: { value: 1 },
    uTilt: { value: 0 },
    uFocus: { value: new Vector2(0, 0) },
    uRes: { value: new Vector2(1, 1) },
    uFlight: { value: flightTexture },
    uFlight2: { value: flightTexture2 },
    uView: { value: 1 },
    uRingArt: { value: ringTexture },
  };

  const phoenixGeometry = new PlaneGeometry(2, 2);
  const phoenixMaterial = new ShaderMaterial({
    uniforms,
    vertexShader: phoenixVertex,
    fragmentShader: phoenixFragment,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    // 빛 번짐이 형상 밖으로 나가도록 미리 곱한 알파로 합성합니다.
    blending: CustomBlending,
    blendSrc: OneFactor,
    blendDst: OneMinusSrcAlphaFactor,
  });
  const bird = new Mesh(phoenixGeometry, phoenixMaterial);
  bird.frustumCulled = false;
  bird.renderOrder = 1;

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

  const emberUniforms = { uTime: uniforms.uTime, uHeat: { value: 0 }, uScale: { value: 300 }, uFlight: { value: 0 } };
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
  embers.renderOrder = 2;
  scene.add(fleet, bird, embers);
  const maskScene = new Scene();
  const camera = new PerspectiveCamera(40, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  const mask = new WebGLRenderTarget(4, 4);
  const backgroundUniforms = {
    uMaskTex: { value: mask.texture },
    uRes: { value: new Vector2(1, 1) },
    uTime: uniforms.uTime,
    uSun: { value: 0 },
    uSunSize: { value: 0 },
    uSunX: { value: 0 },
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
    uniforms.uRes.value.set(width * dpr, height * dpr);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
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
    backgroundUniforms.uSunSize.value = s.sunSize;
    backgroundUniforms.uSunX.value = (1 - s.view) * 0.2;
    emberUniforms.uFlight.value = s.flight;
    backgroundUniforms.uCosmos.value = s.cosmos;
    backgroundUniforms.uWar.value = s.war;
    backgroundUniforms.uRing.value = s.ring;
    fleetUniforms.uWar.value = s.war * (1 - s.ring);
    emberUniforms.uHeat.value = s.burn;

    uniforms.uZoom.value = s.zoom;
    uniforms.uView.value = s.view;
    uniforms.uTilt.value = s.tilt + Math.sin(time * 0.55) * 0.07 * s.flight;
    uniforms.uFocus.value.set(s.focus[0] + easedX * 0.012, s.focus[1] - easedY * 0.012 + Math.sin(time * 1.1) * 0.006 * s.flight);

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
      phoenixGeometry.dispose();
      phoenixMaterial.dispose();
      flightTexture.dispose();
      flightTexture2.dispose();
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
