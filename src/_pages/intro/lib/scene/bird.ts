import {
  type AnimationAction,
  type AnimationClip,
  AnimationMixer,
  Box3,
  type Color,
  Group,
  type Material,
  Mesh,
  MeshStandardMaterial,
  ShaderMaterial,
  type Vector3,
} from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import type { PhoenixClips, PhoenixModelConfig } from '../../config/phoenix.config';
import { birdAlbedo, birdEmissive, birdFragmentHead, birdOutput, crystalFragment, crystalVertex } from '../shaders';
import { disposeObject } from './disposer';
import { smoothLoopClip } from './smoothClip';

/** 결정 재질과 예전 텍스처 재질이 함께 보는 값. 장면이 매 프레임 바꿉니다. */
export interface BirdUniforms {
  uTime: { value: number };
  uBurn: { value: number };
  uMask: { value: number };
  uRim: { value: number };
  uDissolve: { value: number };
  /** 결정을 비추는 태양 방향(카메라 공간). */
  uSunDir: { value: Vector3 };
  /** 얇은 조각이 달아오르는 세기. */
  uGlow: { value: number };
  uOpacity: { value: number };
  uShadow: { value: Vector3 };
  uHighlight: { value: Vector3 };
  uSaturation: { value: number };
  uExposure: { value: number };
  /** 예전 텍스처 재질에서만 씀: 공기의 옅은 막. */
  uHaze: { value: Color };
  uHazeAmount: { value: number };
}

/** 타임라인의 클립 번호(레퍼런스 glassAnimationIdToClipName 순서)를 설정의 클립 이름으로 바꿉니다. */
export function clipNameFor(id: number, clips: PhoenixClips) {
  if (id === 2) return clips.closeUp ?? clips.flying;
  if (id === 3) return clips.gliding ?? clips.flying;
  return clips.flying;
}

/** 이름으로 클립을 찾고, 없으면 평소 날갯짓(fallback), 그것도 없으면(이름이 비었거나 다른 모델) 첫 클립을 씁니다. */
export function findClip(clips: readonly AnimationClip[], name: string, fallback = name) {
  return clips.find((clip) => clip.name === name) ?? clips.find((clip) => clip.name === fallback) ?? clips[0];
}

/** 노멀·UV 없이 결정 조각을 그리는 재질. 같은 셰이더를 내려오는 깃털도 씁니다. */
export function createCrystalMaterial(uniforms: BirdUniforms) {
  return new ShaderMaterial({ uniforms: { ...uniforms }, vertexShader: crystalVertex, fragmentShader: crystalFragment });
}

/** 예전 텍스처 모델: 표준 재질에 진홍 색조·불길·소멸·윤곽 셰이더를 끼워 넣습니다. */
function patchTextured(material: MeshStandardMaterial, uniforms: BirdUniforms) {
  material.transparent = false;
  material.alphaTest = 0.35;
  // 깃털 가장자리(알파로 잘라 내는 부분)를 MSAA 표본으로 부드럽게 해, 날갯짓할 때 계단이 깜빡이지 않게 합니다.
  material.alphaToCoverage = true;
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
}

/**
 * 설정(phoenix.config.ts)의 모델을 타임라인 노드에 얹을 수 있게 맞춥니다.
 * 돌려주는 group에 타임라인의 위치·자세를 넣으면 됩니다. 안쪽의 모델은 설정의 회전·크기·위치 보정을 따릅니다.
 */
export function createBird(gltf: Pick<GLTF, 'scene' | 'animations'>, config: PhoenixModelConfig, uniforms: BirdUniforms) {
  const model = gltf.scene;
  // 크기는 뼈대를 적용하지 않은 원래 형상의 상자로 잽니다. 뼈대를 적용해 재면(SkinnedMesh) 정점마다 뼈 행렬을 곱해
  // 느린 기기에서 한 작업이 100ms를 넘깁니다.
  const box = new Box3();
  const part = new Box3();
  model.updateMatrixWorld(true);
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (!object.geometry.boundingBox) object.geometry.computeBoundingBox();
    const local = object.geometry.boundingBox;
    if (local) box.union(part.copy(local).applyMatrix4(object.matrixWorld));
  });
  const width = Math.max(box.max.x - box.min.x, box.max.z - box.min.z, 1e-6);
  const scale = config.wingspan / width;
  const pose = new Group();
  pose.rotation.set(...config.rotation);
  pose.position.set(...config.offset);
  model.scale.multiplyScalar(scale);
  pose.add(model);
  const group = new Group();
  group.add(pose);

  const replaced: Material[] = [];
  const crystal = config.material === 'crystal' ? createCrystalMaterial(uniforms) : null;
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (config.hiddenMeshes.includes(object.name)) object.visible = false;
    object.frustumCulled = false;
    if (crystal) {
      if (Array.isArray(object.material)) replaced.push(...object.material);
      else replaced.push(object.material);
      object.material = crystal;
    } else if (object.material instanceof MeshStandardMaterial) {
      patchTextured(object.material, uniforms);
    }
  });
  // 결정 재질로 바꾼 원래 재질은 한 번도 그리지 않았으므로 바로 놓아 줍니다.
  replaced.forEach((material) => material.dispose());

  // 성긴 키를 직선으로 잇고 처음·끝 자세가 다른 클립은 이음매를 맞춰 다시 샘플합니다.
  const clips = config.smoothLoop ? gltf.animations.map((clip) => smoothLoopClip(clip, model)) : gltf.animations;
  const mixer = new AnimationMixer(model);
  const actions = new Map<string, AnimationAction>();
  const actionFor = (name: string) => {
    const clip = findClip(clips, name, config.clips.flying);
    if (!clip) return null;
    let action = actions.get(clip.name);
    if (!action) {
      action = mixer.clipAction(clip);
      actions.set(clip.name, action);
    }
    return action;
  };
  let current: AnimationAction | null = null;
  let currentId = -1;

  return {
    group,
    /** 타임라인의 클립 번호로 날갯짓을 고릅니다. 바뀌면 0.4초 동안 이어 붙입니다. */
    setClip(id: number) {
      if (id === currentId) return;
      currentId = id;
      const next = actionFor(clipNameFor(id, config.clips));
      if (!next || next === current) return;
      next.reset().play();
      if (current) current.crossFadeTo(next, 0.4, false);
      current = next;
    },
    /** 날갯짓을 delta초 진행합니다(레퍼런스와 같이 스크롤과 상관없이 제 속도로). */
    update(delta: number) {
      mixer.update(delta);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      crystal?.dispose();
      disposeObject(model);
    },
  };
}

export type Bird = ReturnType<typeof createBird>;
