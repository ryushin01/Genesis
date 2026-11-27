import { BufferGeometry, Color, Group, Mesh, MeshBasicMaterial, ShaderMaterial, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { BirdUniforms } from './bird';
import { createCrystalFeather } from './crystalFeather';

const uniforms = (): BirdUniforms => ({
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
});

describe('createCrystalFeather', () => {
  it('깃털을 결정 재질로 바꾸고, 처음에는 숨겨 둔다', () => {
    const scene = new Group().add(new Mesh(new BufferGeometry(), new MeshBasicMaterial()));
    const feather = createCrystalFeather({ scene }, uniforms());
    expect(feather.group.visible).toBe(false);
    const meshes: Mesh[] = [];
    feather.group.traverse((object) => {
      if (object instanceof Mesh) meshes.push(object);
    });
    expect(meshes[0].material).toBeInstanceOf(ShaderMaterial);
    feather.dispose();
  });

  it('레퍼런스처럼 3초에 한 바퀴 돌고 위아래로 흔들린다', () => {
    const feather = createCrystalFeather({ scene: new Group() }, uniforms());
    const [spin] = feather.group.children;
    feather.group.position.set(0, 0, 0);
    feather.update(Math.PI / 2);
    expect(feather.group.position.y).toBeCloseTo(0.1);
    feather.update(1.5);
    expect(spin.rotation.y).toBeCloseTo(Math.PI);
    feather.dispose();
  });
});
