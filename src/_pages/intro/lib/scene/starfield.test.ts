import { AdditiveBlending, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createStarfield, seededRandom } from './starfield';

describe('seededRandom', () => {
  it('같은 씨앗이면 같은 수열을 내고, 값은 0~1 사이다', () => {
    const a = seededRandom(7);
    const b = seededRandom(7);
    for (let i = 0; i < 50; i += 1) {
      const value = a();
      expect(value).toBe(b());
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
    expect(seededRandom(8)()).not.toBe(seededRandom(7)());
  });
});

describe('createStarfield', () => {
  const make = () => createStarfield({ near: 30, mid: 20, dust: 10 }, { value: 0 }, { value: new Vector3(1, 1, 1) });

  it('별과 먼지를 한 묶음으로 만들고, 먼지(aKind=1)는 비행 경로 가까이, 별은 멀리 둔다', () => {
    const stars = make();
    const geometry = stars.points.geometry;
    const kinds = geometry.getAttribute('aKind');
    const positions = geometry.getAttribute('position');
    expect(kinds.count).toBe(60);
    let dust = 0;
    for (let i = 0; i < kinds.count; i += 1) {
      const radius = Math.hypot(positions.getY(i), positions.getZ(i));
      if (kinds.getX(i) > 0.5) {
        dust += 1;
        expect(radius).toBeLessThanOrEqual(9.001);
      } else {
        expect(radius).toBeGreaterThanOrEqual(8.999);
      }
    }
    expect(dust).toBe(10);
    stars.dispose();
  });

  it('빛이라 더하기로 섞고 깊이를 쓰지 않으며, 색 보정 값을 장면과 함께 본다', () => {
    const highlight = { value: new Vector3(1, 0.9, 0.8) };
    const stars = createStarfield({ near: 1, mid: 1, dust: 1 }, { value: 0 }, highlight);
    expect(stars.points.material.blending).toBe(AdditiveBlending);
    expect(stars.points.material.depthWrite).toBe(false);
    expect(stars.uniforms.uHighlight).toBe(highlight);
    stars.dispose();
  });

  it('장면을 다시 만들어도 별자리가 같다', () => {
    const a = make().points.geometry.getAttribute('position').array;
    const b = make().points.geometry.getAttribute('position').array;
    expect(Array.from(a)).toEqual(Array.from(b));
  });
});
