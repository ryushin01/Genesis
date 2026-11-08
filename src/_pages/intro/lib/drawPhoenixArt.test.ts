import { describe, expect, it } from 'vitest';
import { bladePoints } from './drawPhoenixArt';

describe('bladePoints', () => {
  const base = { x: 0, y: 0, angle: 0, length: 1, width: 0.2, segments: 10 };

  it('양쪽 외곽선 좌표를 만든다', () => {
    expect(bladePoints(base)).toHaveLength(22);
  });

  it('끝점은 길이만큼 떨어진 곳에서 뾰족하게 모인다', () => {
    const points = bladePoints(base);
    const tipLeft = points[10];
    const tipRight = points[11];
    expect(tipLeft[0]).toBeCloseTo(1);
    expect(Math.abs(tipLeft[1] - tipRight[1])).toBeLessThan(0.01);
  });

  it('가운데의 폭은 지정한 너비를 넘지 않는다', () => {
    const points = bladePoints(base);
    const spread = Math.max(...points.map(([, y]) => y)) - Math.min(...points.map(([, y]) => y));
    expect(spread).toBeLessThanOrEqual(0.2001);
    expect(spread).toBeGreaterThan(0.15);
  });

  it('휘게 하면 끝이 옆으로 이동한다', () => {
    expect(bladePoints({ ...base, bend: 0.3 })[10][1]).toBeCloseTo(0.3);
  });
});
