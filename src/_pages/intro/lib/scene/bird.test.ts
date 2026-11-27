import { AnimationClip, Group, Mesh, MeshStandardMaterial, BoxGeometry, ShaderMaterial, Vector3, Color } from 'three';
import { describe, expect, it } from 'vitest';
import type { PhoenixModelConfig } from '../../config/phoenix.config';
import { clipNameFor, createBird, findClip, type BirdUniforms } from './bird';

const CLIPS = { flying: 'fly', closeUp: 'close', gliding: 'glide' };

function uniforms(): BirdUniforms {
  return {
    uTime: { value: 0 },
    uBurn: { value: 0 },
    uMask: { value: 0 },
    uRim: { value: 0 },
    uDissolve: { value: 0 },
    uSunDir: { value: new Vector3(0, 0, -1) },
    uGlow: { value: 0 },
    uOpacity: { value: 1 },
    uShadow: { value: new Vector3() },
    uHighlight: { value: new Vector3(1, 1, 1) },
    uSaturation: { value: 1 },
    uExposure: { value: 1 },
    uHaze: { value: new Color() },
    uHazeAmount: { value: 0 },
  };
}

/** 날개 폭(x) 2, 길이(z) 1인 상자 하나와 클립 둘을 가진 가짜 모델. */
function fakeGltf() {
  const scene = new Group();
  scene.add(new Mesh(new BoxGeometry(2, 0.5, 1), new MeshStandardMaterial()));
  const animations = [new AnimationClip('fly', 1, []), new AnimationClip('close', 1, [])];
  return { scene, animations };
}

const config = (overrides: Partial<PhoenixModelConfig> = {}): PhoenixModelConfig => ({
  url: '/models/x.glb',
  wingspan: 4,
  rotation: [0, Math.PI / 2, 0],
  offset: [0, 0.5, 0],
  clips: CLIPS,
  material: 'crystal',
  smoothLoop: false,
  hiddenMeshes: [],
  ...overrides,
});

describe('clipNameFor', () => {
  it('타임라인의 클립 번호를 설정의 이름으로 바꾸고, 없는 클립은 평소 날갯짓으로 대신한다', () => {
    expect(clipNameFor(0, CLIPS)).toBe('fly');
    expect(clipNameFor(2, CLIPS)).toBe('close');
    expect(clipNameFor(3, CLIPS)).toBe('glide');
    expect(clipNameFor(1, CLIPS)).toBe('fly');
    expect(clipNameFor(2, { flying: 'fly' })).toBe('fly');
  });
});

describe('findClip', () => {
  it('이름이 없거나 맞지 않으면 첫 클립을 쓴다', () => {
    const clips = [new AnimationClip('a', 1, []), new AnimationClip('b', 1, [])];
    expect(findClip(clips, 'b')?.name).toBe('b');
    expect(findClip(clips, '')?.name).toBe('a');
    expect(findClip([], 'a')).toBeUndefined();
    // 모델에 없는 클립(예: 활공)은 평소 날갯짓으로 대신합니다.
    expect(findClip(clips, 'glide', 'b')?.name).toBe('b');
  });
});

describe('createBird', () => {
  it('설정의 날개 폭에 맞추고 회전·위치 보정을 적용한다', () => {
    const bird = createBird(fakeGltf(), config(), uniforms());
    const [pose] = bird.group.children;
    expect(pose.rotation.y).toBeCloseTo(Math.PI / 2);
    expect(pose.position.y).toBeCloseTo(0.5);
    const [model] = pose.children;
    expect(model.scale.x).toBeCloseTo(2);
    bird.dispose();
  });

  it('결정 재질 모델은 셰이더 재질로 바꾸고, 텍스처 모델은 원래 재질을 고쳐 쓴다', () => {
    const meshOf = (bird: ReturnType<typeof createBird>) => {
      const meshes: Mesh[] = [];
      bird.group.traverse((object) => {
        if (object instanceof Mesh) meshes.push(object);
      });
      return meshes[0];
    };
    const crystal = createBird(fakeGltf(), config(), uniforms());
    expect(meshOf(crystal).material).toBeInstanceOf(ShaderMaterial);
    const textured = createBird(fakeGltf(), config({ material: 'textured' }), uniforms());
    expect(meshOf(textured).material).toBeInstanceOf(MeshStandardMaterial);
    crystal.dispose();
    textured.dispose();
  });

  it('클립 번호가 같으면 다시 시작하지 않는다', () => {
    const bird = createBird(fakeGltf(), config(), uniforms());
    bird.setClip(0);
    bird.update(0.3);
    bird.setClip(0);
    bird.update(0.1);
    expect(() => bird.setClip(2)).not.toThrow();
    bird.dispose();
  });
});
