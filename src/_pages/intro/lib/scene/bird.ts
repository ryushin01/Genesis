import {
  type AnimationAction,
  AnimationMixer,
  type Bone,
  Box3,
  type Color,
  Group,
  type Mesh,
  type MeshStandardMaterial,
  type Object3D,
  Vector3,
} from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { birdAlbedo, birdEmissive, birdFragmentHead, birdOutput } from '../shaders';
import { disposeObject } from './disposer';

/** 불사조 날개 폭(장면 단위). 카메라 거리와 불티 꼬리 폭의 기준입니다. */
export const WINGSPAN = 7;

export interface BirdUniforms {
  uTime: { value: number };
  uBurn: { value: number };
  uMask: { value: number };
  uRim: { value: number };
  uHaze: { value: Color };
  uHazeAmount: { value: number };
  uDissolve: { value: number };
}

/**
 * 날개 끝(몸에서 가장 먼 뼈)의 높이를 애니메이션 한 바퀴 동안 재어 -1~1로 맞춥니다.
 * 몸이 실제 날갯짓에 맞춰 오르내리게 할 때 씁니다. 모델이 바뀌어도 다시 맞출 필요가 없습니다.
 */
export function measureWingbeat(model: Object3D, mixer: AnimationMixer, duration: number, samples = 48) {
  if (duration <= 0) return null;
  const bones: Object3D[] = [];
  model.traverse((object) => {
    if ((object as Bone).isBone) bones.push(object);
  });
  const point = new Vector3();
  let tip: Object3D | null = null;
  let reach = 0;
  for (const bone of bones) {
    const x = Math.abs(bone.getWorldPosition(point).x);
    if (x > reach) {
      reach = x;
      tip = bone;
    }
  }
  if (!tip) return null;
  const heights = new Float32Array(samples);
  for (let i = 0; i < samples; i += 1) {
    mixer.setTime((i / samples) * duration);
    heights[i] = tip.getWorldPosition(point).y;
  }
  mixer.setTime(0);
  const min = Math.min(...heights);
  const range = Math.max(...heights) - min;
  if (range < 1e-6) return null;
  return heights.map((height) => ((height - min) / range) * 2 - 1);
}

/** 한 바퀴를 도는 표본 사이를 선형으로 잇습니다. */
export function sampleLoop(values: Float32Array, phase: number) {
  const x = (((phase % 1) + 1) % 1) * values.length;
  const i = Math.floor(x);
  const t = x - i;
  return values[i % values.length] * (1 - t) + values[(i + 1) % values.length] * t;
}

/** 불사조 모델을 맞추고, 재질에 #8B0000 색·불길·소멸·윤곽 셰이더를 끼워 넣습니다. */
export function createBird(gltf: GLTF, uniforms: BirdUniforms) {
  // 크기를 맞추고 머리가 화면 안쪽(-z)을 향하게 돌립니다.
  const model = gltf.scene;
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  const scale = WINGSPAN / Math.max(size.x, size.z);
  model.scale.setScalar(scale);
  model.position.copy(center).multiplyScalar(-scale);
  const group = new Group();
  group.add(model);
  group.rotation.y = Math.PI;

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
      Object.assign(shader.uniforms, uniforms);
      shader.fragmentShader =
        birdFragmentHead +
        shader.fragmentShader
          .replace('#include <map_fragment>', `#include <map_fragment>\n${birdAlbedo}`)
          .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\n${birdEmissive}`)
          .replace('#include <dithering_fragment>', `#include <dithering_fragment>\n${birdOutput}`);
    };
    material.customProgramCacheKey = () => 'phoenix-crimson';
    material.needsUpdate = true;
  });

  const mixer = new AnimationMixer(model);
  const actions: AnimationAction[] = gltf.animations.map((clip) => mixer.clipAction(clip).play());
  const duration = gltf.animations[0]?.duration ?? 0;
  const wingbeat = measureWingbeat(model, mixer, duration);
  let rate = -1;

  const phase = () => (duration > 0 && actions[0] ? actions[0].time / duration : 0);

  return {
    group,
    /** 날갯짓 한 주기에서 지금보다 offset(주기 비율)만큼 뒤의 날개 끝 높이(-1~1). */
    wingLift(offset = 0) {
      return wingbeat ? sampleLoop(wingbeat, phase() - offset) : Math.sin(phase() * Math.PI * 2);
    },
    /** 날갯짓을 rate 배속으로 delta초 진행합니다. */
    update(delta: number, nextRate: number) {
      if (Math.abs(nextRate - rate) > 1e-3) {
        rate = nextRate;
        actions.forEach((action) => action.setEffectiveTimeScale(rate));
      }
      mixer.update(delta);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      disposeObject(model);
    },
  };
}

export type Bird = ReturnType<typeof createBird>;
