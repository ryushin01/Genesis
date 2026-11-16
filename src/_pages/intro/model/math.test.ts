import { describe, expect, it } from 'vitest';
import { clamp01, ease, lerp, smoothstep } from './math';

describe('장면 수학 함수', () => {
  it('clamp01은 0~1 밖의 값을 끝으로 자른다', () => {
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(0.25)).toBe(0.25);
    expect(clamp01(3)).toBe(1);
  });

  it('lerp는 두 값 사이를 비율만큼 잇는다', () => {
    expect(lerp(2, 6, 0)).toBe(2);
    expect(lerp(2, 6, 0.25)).toBe(3);
    expect(lerp(2, 6, 1)).toBe(6);
  });

  it('ease는 양 끝과 가운데를 지나고 가운데에서 가장 빠르다', () => {
    expect(ease(0)).toBe(0);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(1)).toBe(1);
    expect(ease(0.55) - ease(0.45)).toBeGreaterThan(ease(0.1) - ease(0));
  });

  it('smoothstep은 구간 밖에서 0과 1, 안에서는 ease와 같다', () => {
    expect(smoothstep(0.2, 0.6, 0.1)).toBe(0);
    expect(smoothstep(0.2, 0.6, 0.9)).toBe(1);
    expect(smoothstep(0.2, 0.6, 0.4)).toBeCloseTo(ease(0.5));
  });
});
