import { describe, expect, it } from 'vitest';
import { sampleTimeline } from './timeline';

describe('sampleTimeline', () => {
  it('처음에는 불타지 않고 고리도 만들지 않는다', () => {
    const state = sampleTimeline(0);
    expect(state.burn).toBe(0);
    expect(state.morph).toBe(0);
    expect(state.cosmos).toBe(0);
  });

  it('끝에서는 불사조가 고리로 바뀐다', () => {
    const state = sampleTimeline(1);
    expect(state.burn).toBe(1);
    expect(state.morph).toBe(1);
    expect(state.ring).toBe(1);
  });

  it('범위를 벗어난 값은 양 끝으로 맞춘다', () => {
    expect(sampleTimeline(-1)).toEqual(sampleTimeline(0));
    expect(sampleTimeline(2)).toEqual(sampleTimeline(1));
  });

  it('세로 화면에서는 전신 장면의 그림을 더 줄인다', () => {
    expect(sampleTimeline(0.34, 0.5).zoom).toBeLessThan(sampleTimeline(0.34, 1.6).zoom);
  });
});
