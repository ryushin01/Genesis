/** 장면·타임라인·문구 투명도가 함께 쓰는 작은 수학 함수. */

/** 0~1 밖의 값을 끝으로 자릅니다. */
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** a에서 b로 t(0~1)만큼 나아간 값. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 0~1 사이 값을 양 끝에서 천천히, 가운데에서 빠르게(= smoothstep(0, 1, t)). */
export const ease = (t: number) => t * t * (3 - 2 * t);

/** 구간(edge0~edge1) 안에서 0→1로 부드럽게 오르는 값. 구간 밖은 0 또는 1입니다. */
export function smoothstep(edge0: number, edge1: number, v: number) {
  return ease(clamp01((v - edge0) / (edge1 - edge0)));
}
