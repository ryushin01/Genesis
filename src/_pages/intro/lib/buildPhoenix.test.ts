import { describe, expect, it } from 'vitest';
import { buildPhoenix } from './buildPhoenix';

describe('buildPhoenix', () => {
  it('깃털 수에 맞는 행렬과 속성을 만든다', () => {
    const data = buildPhoenix(0.5);
    expect(data.count).toBeGreaterThan(500);
    expect(data.matrices).toHaveLength(data.count * 16);
    expect(data.meta).toHaveLength(data.count * 4);
  });

  it('밀도를 높이면 깃털이 늘어난다', () => {
    expect(buildPhoenix(1).count).toBeGreaterThan(buildPhoenix(0.5).count);
  });

  it('같은 씨앗이면 같은 불사조를 만든다', () => {
    expect(buildPhoenix(0.3, 3).matrices).toEqual(buildPhoenix(0.3, 3).matrices);
  });

  it('좌우 날개의 깃털 수가 같다', () => {
    const { meta, count } = buildPhoenix(0.5);
    let left = 0;
    let right = 0;
    for (let i = 0; i < count; i += 1) {
      if (meta[i * 4] === -1) left += 1;
      if (meta[i * 4] === 1) right += 1;
    }
    expect(left).toBe(right);
    expect(left).toBeGreaterThan(0);
  });
});
