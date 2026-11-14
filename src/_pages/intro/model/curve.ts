/**
 * 단조 3차 에르미트 곡선(Fritsch–Carlson).
 * 키를 지날 때 속도가 끊기지 않아 카메라가 키마다 멈추지 않고, 값이 이웃한 키의 범위를 넘어 튀지 않습니다.
 * 방향이 바뀌는 키(극값)에서만 속도가 0이 됩니다.
 */
export function createMonotoneCurve(xs: readonly number[], ys: readonly number[]) {
  const n = xs.length;
  if (n < 2 || ys.length !== n) throw new Error('키는 두 개 이상이고 x와 y의 개수가 같아야 합니다.');
  const secants: number[] = [];
  for (let k = 0; k < n - 1; k += 1) {
    const h = xs[k + 1] - xs[k];
    if (!(h > 0)) throw new Error('x는 오름차순이어야 합니다.');
    secants.push((ys[k + 1] - ys[k]) / h);
  }
  const tangents = new Array<number>(n);
  tangents[0] = secants[0];
  tangents[n - 1] = secants[n - 2];
  for (let k = 1; k < n - 1; k += 1) {
    tangents[k] = secants[k - 1] * secants[k] > 0 ? (secants[k - 1] + secants[k]) / 2 : 0;
  }
  for (let k = 0; k < n - 1; k += 1) {
    if (secants[k] === 0) {
      tangents[k] = 0;
      tangents[k + 1] = 0;
      continue;
    }
    const a = tangents[k] / secants[k];
    const b = tangents[k + 1] / secants[k];
    const norm = a * a + b * b;
    if (norm > 9) {
      const tau = 3 / Math.sqrt(norm);
      tangents[k] = tau * a * secants[k];
      tangents[k + 1] = tau * b * secants[k];
    }
  }

  return (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let k = 0;
    while (k < n - 2 && x > xs[k + 1]) k += 1;
    const h = xs[k + 1] - xs[k];
    const t = (x - xs[k]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[k] +
      (t3 - 2 * t2 + t) * h * tangents[k] +
      (-2 * t3 + 3 * t2) * ys[k + 1] +
      (t3 - t2) * h * tangents[k + 1]
    );
  };
}
