import { describe, expect, it } from 'vitest';
import { createFollower } from './follow';

describe('createFollower', () => {
  it('목표로 다가가 멈춘다', () => {
    const follower = createFollower(8);
    for (let i = 0; i < 240; i += 1) follower.step(1, 1 / 60);
    expect(follower.value).toBeCloseTo(1, 6);
    expect(follower.settled(1, 1e-4)).toBe(true);
  });

  it('목표가 갑자기 바뀌어도 속도가 튀지 않는다(1차 감쇠는 튐)', () => {
    const dt = 1 / 120;
    const follower = createFollower(8);
    const velocities: number[] = [];
    let previous = follower.value;
    // 휠 한 칸처럼 목표가 계단으로 바뀝니다.
    for (let i = 0; i < 60; i += 1) {
      const target = i < 30 ? 0.2 : 0.4;
      follower.step(target, dt);
      velocities.push((follower.value - previous) / dt);
      previous = follower.value;
    }
    const jumps = velocities.slice(1).map((v, i) => Math.abs(v - velocities[i]));
    // 1차 감쇠라면 계단 순간에 속도가 rate×0.2 ≈ 1.6만큼 한 번에 뜁니다.
    expect(Math.max(...jumps)).toBeLessThan(0.15);
  });

  it('프레임 간격이 달라도 같은 궤적을 그린다', () => {
    const coarse = createFollower(8);
    const fine = createFollower(8);
    coarse.step(1, 1 / 30);
    fine.step(1, 1 / 60);
    fine.step(1, 1 / 60);
    expect(fine.value).toBeCloseTo(coarse.value, 12);
  });
});
