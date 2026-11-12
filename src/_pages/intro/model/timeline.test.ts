import { describe, expect, it } from 'vitest';
import { sampleTimeline } from './timeline';

describe('sampleTimeline', () => {
  it('처음에는 불타지 않고 우주로 넘어가지 않는다', () => {
    const state = sampleTimeline(0);
    expect(state.burn).toBe(0);
    expect(state.cosmos).toBe(0);
  });

  it('끝에서는 불사조가 태양 속에서 흩어지고 깃털이 내려온다', () => {
    const state = sampleTimeline(1);
    expect(state.burn).toBe(1);
    expect(state.exit).toBe(1);
    expect(state.dissolve).toBe(1);
    expect(state.fall).toBe(1);
    expect(state.sun).toBe(1);
  });

  it('범위를 벗어난 값은 양 끝으로 맞춘다', () => {
    expect(sampleTimeline(-1)).toEqual(sampleTimeline(0));
    expect(sampleTimeline(2)).toEqual(sampleTimeline(1));
  });

  it('세로 화면에서는 전신 장면의 카메라를 더 물린다', () => {
    const far = (s: ReturnType<typeof sampleTimeline>) => Math.hypot(s.camera[0] - s.look[0], s.camera[1] - s.look[1], s.camera[2] - s.look[2]);
    expect(far(sampleTimeline(0.34, 0.5))).toBeGreaterThan(far(sampleTimeline(0.34, 1.6)));
  });
});
