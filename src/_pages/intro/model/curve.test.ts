import { describe, expect, it } from 'vitest';
import { createMonotoneCurve } from './curve';

describe('createMonotoneCurve', () => {
  const xs = [0, 0.2, 0.5, 1];
  const ys = [0, 2, 3, 3.5];
  const curve = createMonotoneCurve(xs, ys);

  it('키를 정확히 지난다', () => {
    xs.forEach((x, i) => expect(curve(x)).toBeCloseTo(ys[i]));
  });

  it('범위 밖은 양 끝 값을 쓴다', () => {
    expect(curve(-1)).toBe(0);
    expect(curve(2)).toBe(3.5);
  });

  it('같은 방향으로 이어지는 키에서는 멈추지 않는다', () => {
    const slope = (curve(0.2 + 1e-4) - curve(0.2 - 1e-4)) / 2e-4;
    expect(slope).toBeGreaterThan(1);
  });

  it('키 양쪽의 기울기가 이어진다', () => {
    const left = (curve(0.5) - curve(0.5 - 1e-5)) / 1e-5;
    const right = (curve(0.5 + 1e-5) - curve(0.5)) / 1e-5;
    expect(Math.abs(left - right)).toBeLessThan(1e-2);
  });

  it('값이 이웃한 키의 범위를 넘지 않는다', () => {
    const peak = createMonotoneCurve([0, 1, 2], [0, 10, 0]);
    for (let x = 0; x <= 2; x += 0.01) {
      expect(peak(x)).toBeLessThanOrEqual(10 + 1e-9);
      expect(peak(x)).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('잘못된 키는 받지 않는다', () => {
    expect(() => createMonotoneCurve([0], [0])).toThrow();
    expect(() => createMonotoneCurve([0, 0], [0, 1])).toThrow();
  });
});
