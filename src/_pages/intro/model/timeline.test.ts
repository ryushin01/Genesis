import { describe, expect, it } from 'vitest';
import { FLIGHT_END, SCROLL_SCREENS, flightTime, sampleTimeline } from './timeline';

describe('flightTime', () => {
  it('스크롤 처음은 타임라인 0초, 끝은 마지막 시각이다', () => {
    expect(flightTime(0)).toBe(0);
    expect(flightTime(1)).toBe(FLIGHT_END);
  });

  it('범위를 벗어난 값은 양 끝으로 맞춘다', () => {
    expect(flightTime(-1)).toBe(0);
    expect(flightTime(2)).toBe(FLIGHT_END);
  });

  it('스크롤할수록 시각이 줄지 않는다', () => {
    let previous = -1;
    for (let p = 0; p <= 1.0001; p += 0.01) {
      const time = flightTime(p);
      expect(time).toBeGreaterThanOrEqual(previous);
      previous = time;
    }
  });

  it('결말 장에 들어서야 태양에 닿는 시각(10초)을 지난다', () => {
    // 장 길이(svh): 표제 200 + 신화 260 + 얽힘 280 + 우주 300 + 전쟁 340 = 1380, 끝까지 스크롤하는 거리 = 전체 - 100
    const finaleStart = 1380 / (SCROLL_SCREENS * 100);
    expect(flightTime(finaleStart - 0.01)).toBeLessThan(10);
    expect(flightTime(finaleStart)).toBeCloseTo(10);
  });
});

describe('sampleTimeline', () => {
  it('처음에는 불타지 않고 터지지 않는다', () => {
    const state = sampleTimeline(0);
    expect(state.burn).toBe(0);
    expect(state.nova).toBe(0);
    expect(state.logo).toBe(0);
  });

  it('끝에서는 불사조가 흩어지고 로고가 다 나타난다', () => {
    const state = sampleTimeline(FLIGHT_END);
    expect(state.burn).toBe(1);
    expect(state.nova).toBe(1);
    expect(state.dissolve).toBe(1);
    expect(state.fall).toBe(1);
    expect(state.logo).toBe(1);
    expect(state.trail).toBe(0);
  });

  it('태양에 닿기 → 터짐 → 흩어짐 → 깃털 → 로고 순서로 이어진다', () => {
    const firstAbove = (pick: (s: ReturnType<typeof sampleTimeline>) => number) => {
      for (let t = 0; t <= FLIGHT_END; t += 0.01) if (pick(sampleTimeline(t)) > 0.5) return t;
      return Infinity;
    };
    const burn = firstAbove((s) => s.burn);
    const nova = firstAbove((s) => s.nova);
    const dissolve = firstAbove((s) => s.dissolve);
    const feather = firstAbove((s) => s.featherGlow);
    const logo = firstAbove((s) => s.logo);
    expect(burn).toBeLessThan(nova);
    expect(nova).toBeLessThan(dissolve);
    expect(dissolve).toBeLessThan(feather);
    expect(feather).toBeLessThan(logo);
  });

  it('폭발이 가장 셀 때 화면이 가장 크게 흔들린다', () => {
    expect(sampleTimeline(9).shake).toBe(0);
    const peak = Math.max(...[10.3, 10.4, 10.5, 10.6, 10.7].map((t) => sampleTimeline(t).shake));
    expect(peak).toBeGreaterThan(0.8);
    expect(sampleTimeline(FLIGHT_END).shake).toBeCloseTo(0);
  });

  it('유성우는 전쟁 장면에만 쏟아진다', () => {
    expect(sampleTimeline(5).war).toBe(0);
    expect(sampleTimeline(9).war).toBe(1);
    expect(sampleTimeline(11).war).toBe(0);
  });

  it('장면 흐름에 따라 색 보정이 바뀐다', () => {
    const myth = sampleTimeline(0).grade;
    const war = sampleTimeline(9).grade;
    expect(war.saturation).toBeGreaterThan(myth.saturation);
    expect(war.highlight[0]).toBeGreaterThan(war.highlight[2]);
  });

  it('넘겨 준 객체에 값을 채워 다시 쓴다', () => {
    const out = sampleTimeline(0);
    const again = sampleTimeline(6, out);
    expect(again).toBe(out);
    expect(again.cosmos).toBeGreaterThan(0);
  });
});
