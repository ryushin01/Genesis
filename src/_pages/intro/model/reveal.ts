const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 구간 안에서 0→1로 부드럽게 오르는 값. */
export function smoothstep(edge0: number, edge1: number, v: number) {
  const t = clamp01((v - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/** 스티키 구간의 진행도(0~1)를 글자 불투명도로 바꿉니다. 첫 구간은 처음부터 보이고, 마지막 구간은 사라지지 않습니다. */
export function chapterReveal(progress: number, { first = false, last = false } = {}) {
  const fadeIn = first ? 1 : smoothstep(0.04, 0.28, progress);
  const fadeOut = last ? 1 : 1 - smoothstep(0.76, 0.96, progress);
  return fadeIn * fadeOut;
}

/** 요소의 위치와 현재 스크롤로 스티키 구간의 진행도를 구합니다. */
export function stickyProgress(top: number, height: number, viewport: number) {
  const distance = height - viewport;
  return distance <= 0 ? 1 : clamp01(-top / distance);
}
