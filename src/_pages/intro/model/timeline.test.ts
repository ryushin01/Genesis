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
    expect(state.nova).toBe(1);
    expect(state.logo).toBe(1);
  });

  it('범위를 벗어난 값은 양 끝으로 맞춘다', () => {
    expect(sampleTimeline(-1)).toEqual(sampleTimeline(0));
    expect(sampleTimeline(2)).toEqual(sampleTimeline(1));
  });

  it('세로 화면에서는 전신 장면의 카메라를 더 물린다', () => {
    const far = (s: ReturnType<typeof sampleTimeline>) => Math.hypot(s.camera[0] - s.look[0], s.camera[1] - s.look[1], s.camera[2] - s.look[2]);
    expect(far(sampleTimeline(0.34, 0.5))).toBeGreaterThan(far(sampleTimeline(0.34, 1.6)));
  });
  it('키에서 카메라가 멈추지 않는다', () => {
    // 같은 방향으로 도는 구간(0 → 0.16 → 0.34)의 가운데 키에서도 카메라 각도가 계속 변합니다.
    const before = sampleTimeline(0.16 - 1e-3).azimuth;
    const after = sampleTimeline(0.16 + 1e-3).azimuth;
    expect(after - before).toBeGreaterThan(1e-4);
  });

  it('넘겨 준 객체에 값을 채워 다시 쓴다', () => {
    const out = sampleTimeline(0);
    const again = sampleTimeline(0.5, 16 / 10, out);
    expect(again).toBe(out);
    expect(again.cosmos).toBeGreaterThan(0);
  });

  it('폭발이 가장 셀 때 화면이 가장 크게 흔들린다', () => {
    expect(sampleTimeline(0.8).shake).toBe(0);
    const peak = Math.max(...[0.9, 0.905, 0.91, 0.915, 0.92].map((p) => sampleTimeline(p).shake));
    expect(peak).toBeGreaterThan(0.8);
    expect(sampleTimeline(1).shake).toBeCloseTo(0);
  });

  it('돌진할수록 날갯짓이 빨라진다', () => {
    expect(sampleTimeline(0.88).flapRate).toBeGreaterThan(sampleTimeline(0.3).flapRate);
  });
});

