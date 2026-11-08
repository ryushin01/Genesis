import { describe, expect, it } from 'vitest';
import { chapterReveal, stickyProgress } from './reveal';

describe('chapterReveal', () => {
  it('중간 구간에서는 완전히 보인다', () => {
    expect(chapterReveal(0.5)).toBe(1);
  });

  it('구간의 시작과 끝에서는 사라진다', () => {
    expect(chapterReveal(0)).toBe(0);
    expect(chapterReveal(1)).toBe(0);
  });

  it('첫 구간은 처음부터 보이고 마지막 구간은 끝까지 남는다', () => {
    expect(chapterReveal(0, { first: true })).toBe(1);
    expect(chapterReveal(1, { last: true })).toBe(1);
  });
});

describe('stickyProgress', () => {
  it('요소 위치를 0~1로 바꾼다', () => {
    expect(stickyProgress(0, 2000, 1000)).toBe(0);
    expect(stickyProgress(-500, 2000, 1000)).toBe(0.5);
    expect(stickyProgress(-3000, 2000, 1000)).toBe(1);
  });

  it('요소가 화면보다 작으면 끝난 것으로 본다', () => {
    expect(stickyProgress(0, 500, 1000)).toBe(1);
  });
});
