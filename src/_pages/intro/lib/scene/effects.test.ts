import { AdditiveBlending, DoubleSide, type InstancedBufferGeometry, type Mesh, type ShaderMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { createMeteorShower } from './effects';

type SkyMesh = Mesh<InstancedBufferGeometry, ShaderMaterial>;
const partsOf = (shower: ReturnType<typeof createMeteorShower>) => shower.group.children as SkyMesh[];

describe('createMeteorShower', () => {
  it('유성과 혜성을 따로 묶고, 전쟁 장면이 오기 전에는 숨겨 둔다', () => {
    const shower = createMeteorShower(12, 3, { value: 0 });
    const [meteors, comets] = partsOf(shower);

    expect(shower.group.visible).toBe(false);
    expect(meteors.geometry.instanceCount).toBe(12);
    expect(comets.geometry.instanceCount).toBe(3);
  });

  it('빛이라 더하기로 섞고, 깊이 대신 그리는 순서로 배경 다음(불사조 뒤)에 그린다', () => {
    for (const mesh of partsOf(createMeteorShower(4, 2, { value: 0 }))) {
      expect(mesh.material.blending).toBe(AdditiveBlending);
      expect(mesh.material.depthTest).toBe(false);
      expect(mesh.material.depthWrite).toBe(false);
      expect(mesh.renderOrder).toBe(1);
      expect(mesh.frustumCulled).toBe(false);
    }
  });

  // 유성은 사각형을 꼬리 쪽으로 뒤집어 펼쳐 감김 방향이 바뀝니다. 뒷면을 지우면 유성이 하나도 그려지지 않습니다.
  it('뒷면도 그린다', () => {
    for (const mesh of partsOf(createMeteorShower(4, 2, { value: 0 }))) {
      expect(mesh.material.side).toBe(DoubleSide);
    }
  });

  it('씨앗을 고르게 나눠 여러 개가 같은 때에 몰리지 않게 한다', () => {
    const [meteors] = partsOf(createMeteorShower(8, 2, { value: 0 }));
    const seeds = Array.from(meteors.geometry.getAttribute('aSeed').array);

    seeds.forEach((seed, i) => {
      expect(seed).toBeGreaterThanOrEqual(i / 8);
      expect(seed).toBeLessThan((i + 1) / 8);
    });
  });

  it('두 묶음이 장면의 시간과 세기·화면 값을 함께 본다', () => {
    const uTime = { value: 0 };
    const shower = createMeteorShower(4, 2, uTime);
    const [meteors, comets] = partsOf(shower);

    expect(meteors.material.uniforms).toBe(comets.material.uniforms);
    expect(shower.uniforms.uTime).toBe(uTime);
  });
});
