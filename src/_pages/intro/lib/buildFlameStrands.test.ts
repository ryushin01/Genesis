import { describe, expect, it } from 'vitest';
import { buildFlameStrands } from './buildFlameStrands';
import { buildPhoenix } from './buildPhoenix';

describe('buildFlameStrands', () => {
  const phoenix = buildPhoenix(0.5);

  it('가닥 수에 맞는 속성을 만든다', () => {
    const strands = buildFlameStrands(phoenix);
    expect(strands.count).toBeGreaterThan(100);
    expect(strands.base).toHaveLength(strands.count * 3);
    expect(strands.dir).toHaveLength(strands.count * 3);
    expect(strands.params).toHaveLength(strands.count * 4);
    expect(strands.wing).toHaveLength(strands.count * 2);
  });

  it('깃털당 가닥을 늘리면 그만큼 늘어난다', () => {
    expect(buildFlameStrands(phoenix, 2).count).toBe((buildFlameStrands(phoenix, 1).count) * 2);
  });

  it('방향은 단위 벡터다', () => {
    const { dir } = buildFlameStrands(phoenix);
    expect(Math.hypot(dir[0], dir[1], dir[2])).toBeCloseTo(1);
  });
});
