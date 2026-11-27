import { clamp01, smoothstep } from './math';

/**
 * 스티키 구간의 진행도(0~1)를 글자 불투명도로 바꿉니다. 첫 구간은 처음부터 보이고, 마지막 구간은 사라지지 않습니다.
 * 마지막 구간(결말)은 불사조가 태양에 닿고 깃털이 내려앉아 로고가 될 때까지 글을 숨겼다가, 로고와 함께 보입니다.
 */
export function chapterReveal(progress: number, { first = false, last = false } = {}) {
  const fadeIn = first ? 1 : last ? smoothstep(0.78, 0.95, progress) : smoothstep(0.04, 0.28, progress);
  const fadeOut = last ? 1 : 1 - smoothstep(0.76, 0.96, progress);
  return fadeIn * fadeOut;
}

/** 요소의 위치와 현재 스크롤로 스티키 구간의 진행도를 구합니다. */
export function stickyProgress(top: number, height: number, viewport: number) {
  const distance = height - viewport;
  return distance <= 0 ? 1 : clamp01(-top / distance);
}
