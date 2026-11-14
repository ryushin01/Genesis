import {
  AnimationClip,
  type KeyframeTrack,
  type Object3D,
  PropertyBinding,
  Quaternion,
  QuaternionKeyframeTrack,
  VectorKeyframeTrack,
} from 'three';

/** 이음매를 맞추는 구간(주기 끝부분의 비율). 넓을수록 보정이 고르게 퍼집니다. */
const SEAM_BLEND = 0.35;

const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

function isConstant(track: KeyframeTrack) {
  const size = track.getValueSize();
  const values = track.values;
  for (let i = size; i < values.length; i += 1) {
    if (Math.abs(values[i] - values[i % size]) > 1e-6) return false;
  }
  return true;
}

/** 상수 트랙은 믹서가 매 프레임 같은 값을 쓰기만 하므로, 노드에 한 번 적용하고 트랙은 뺍니다. */
function applyConstant(root: Object3D, track: KeyframeTrack) {
  const { nodeName, propertyName } = PropertyBinding.parseTrackName(track.name);
  const node = PropertyBinding.findNode(root, nodeName) as Object3D | null;
  if (!node) return false;
  const target = (node as unknown as Record<string, { fromArray?: (array: ArrayLike<number>) => void }>)[propertyName];
  if (!target?.fromArray) return false;
  target.fromArray(track.values.slice(0, track.getValueSize()));
  return true;
}

/**
 * 한 바퀴 도는 트랙을 부드럽게 다시 만듭니다.
 * 1. 끝 값이 처음 값과 다르면(이음매에서 튐) 주기 끝부분에서 보정을 서서히 더해 처음 값으로 맞춥니다.
 * 2. 키를 지나는 3차 에르미트 곡선(시간 간격에 맞춘 Catmull-Rom 기울기)으로 이어, 키마다 꺾이지 않게 합니다.
 * 3. 그 곡선을 고른 간격으로 촘촘히 샘플해 새 트랙을 만듭니다(재생은 그대로 선형 보간).
 */
function resampleLoop(track: KeyframeTrack, duration: number, samplesPerSecond: number) {
  const size = track.getValueSize();
  const quaternion = track instanceof QuaternionKeyframeTrack;
  const times = track.times;
  const count = times.length;
  const keys = Float64Array.from(track.values);

  // 1. 이음매: 끝 값 → 처음 값
  if (quaternion) {
    const first = new Quaternion().fromArray(keys, 0);
    const last = new Quaternion().fromArray(keys, (count - 1) * 4);
    const delta = first.clone().multiply(last.clone().invert());
    const identity = new Quaternion();
    const correction = new Quaternion();
    const key = new Quaternion();
    for (let k = 0; k < count; k += 1) {
      const weight = smoothstep(duration * (1 - SEAM_BLEND), duration, times[k]);
      if (weight <= 0) continue;
      correction.slerpQuaternions(identity, delta, weight);
      key.fromArray(keys, k * 4).premultiply(correction).toArray(keys, k * 4);
    }
  } else {
    for (let k = 0; k < count; k += 1) {
      const weight = smoothstep(duration * (1 - SEAM_BLEND), duration, times[k]);
      if (weight <= 0) continue;
      for (let c = 0; c < size; c += 1) keys[k * size + c] += (keys[c] - keys[(count - 1) * size + c]) * weight;
    }
  }

  // 2. 마지막 키(= 처음 키)를 빼고 주기로 다룹니다. 사원수는 이웃 키와 같은 반구로 맞춥니다.
  const loopCount = count - 1;
  if (quaternion) {
    for (let k = 1; k < loopCount; k += 1) {
      let dot = 0;
      for (let c = 0; c < 4; c += 1) dot += keys[k * 4 + c] * keys[(k - 1) * 4 + c];
      if (dot < 0) for (let c = 0; c < 4; c += 1) keys[k * 4 + c] *= -1;
    }
  }
  const timeAt = (k: number) => times[((k % loopCount) + loopCount) % loopCount] + Math.floor(k / loopCount) * duration;
  const valueAt = (k: number, c: number, reference: number) => {
    const index = ((k % loopCount) + loopCount) % loopCount;
    let value = keys[index * size + c];
    // 주기를 넘어 이웃을 볼 때 사원수 부호가 뒤집혀 있으면 맞춥니다.
    if (quaternion && reference < 0) value = -value;
    return value;
  };
  const signAgainst = (k: number, previous: number) => {
    if (!quaternion) return 1;
    const a = ((k % loopCount) + loopCount) % loopCount;
    const b = ((previous % loopCount) + loopCount) % loopCount;
    let dot = 0;
    for (let c = 0; c < 4; c += 1) dot += keys[a * 4 + c] * keys[b * 4 + c];
    return dot < 0 ? -1 : 1;
  };

  // 3. 고른 간격으로 다시 샘플
  const steps = Math.max(2, Math.round(duration * samplesPerSecond));
  const outTimes = new Float32Array(steps + 1);
  const outValues = new Float32Array((steps + 1) * size);
  let segment = 0;
  for (let i = 0; i <= steps; i += 1) {
    const t = (i / steps) * duration;
    outTimes[i] = t;
    while (segment < loopCount - 1 && t >= timeAt(segment + 1)) segment += 1;
    const t0 = timeAt(segment);
    const t1 = timeAt(segment + 1);
    const h = t1 - t0;
    const s = h > 0 ? Math.min(1, Math.max(0, (t - t0) / h)) : 0;
    const s2 = s * s;
    const s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1;
    const h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2;
    const h11 = s3 - s2;
    // 사원수 부호는 바로 옆 키끼리 맞춥니다. 다음다음 키를 구간 시작(p0)에 대 맞추면, p0와 180° 넘게 떨어진 키가
    // 이 구간에서만 뒤집혀 다음 구간과 공유하는 키의 접선이 달라집니다(속도가 끊김). 그래서 p1에 맞춘 부호를 이어 받습니다.
    const sign0 = signAgainst(segment - 1, segment);
    const sign1 = signAgainst(segment + 1, segment);
    const sign2 = sign1 * signAgainst(segment + 2, segment + 1);
    for (let c = 0; c < size; c += 1) {
      const pPrev = valueAt(segment - 1, c, sign0);
      const p0 = valueAt(segment, c, 1);
      const p1 = valueAt(segment + 1, c, sign1);
      const pNext = valueAt(segment + 2, c, sign2);
      const m0 = (p1 - pPrev) / (t1 - timeAt(segment - 1));
      const m1 = (pNext - p0) / (timeAt(segment + 2) - t0);
      outValues[i * size + c] = h00 * p0 + h10 * h * m0 + h01 * p1 + h11 * h * m1;
    }
    if (quaternion) {
      const length = Math.hypot(outValues[i * 4], outValues[i * 4 + 1], outValues[i * 4 + 2], outValues[i * 4 + 3]) || 1;
      // 구간마다 시작 키를 기준으로 계산하므로, 주기를 넘는 구간에서 부호가 바뀌면 앞 샘플과 같은 반구로 돌려 놓습니다.
      let dot = 0;
      if (i > 0) for (let c = 0; c < 4; c += 1) dot += outValues[i * 4 + c] * outValues[(i - 1) * 4 + c];
      const flip = dot < 0 ? -1 : 1;
      for (let c = 0; c < 4; c += 1) outValues[i * 4 + c] *= flip / length;
    }
  }
  // 끝 샘플은 처음 샘플과 같게 둬 반복이 정확히 이어지게 합니다.
  for (let c = 0; c < size; c += 1) outValues[steps * size + c] = outValues[c];

  return quaternion
    ? new QuaternionKeyframeTrack(track.name, outTimes, outValues)
    : new VectorKeyframeTrack(track.name, outTimes, outValues);
}

/**
 * 움직임이 몰린 순간(한 번에 크게 휘두르는 구간)은 천천히, 한가한 구간은 조금 빨리 재생하도록 시간을 다시 매깁니다.
 * 모든 트랙에 같은 시간 왜곡을 걸어 뼈끼리의 협응과 한 주기 길이는 그대로입니다. strength가 0이면 그대로 둡니다.
 * 고른 간격(steps + 1개)으로 다시 샘플한 트랙만 다룹니다.
 */
function retimeStrokes(tracks: KeyframeTrack[], duration: number, steps: number, strength: number) {
  const rotations = tracks.filter(
    (track): track is QuaternionKeyframeTrack => track instanceof QuaternionKeyframeTrack && track.times.length === steps + 1,
  );
  if (strength <= 0 || rotations.length === 0) return tracks;

  // 1. 칸마다 모든 뼈가 돈 각의 합(움직임 양). 이웃과 평균해 들쭉날쭉함을 줄입니다(주기로 감쌈).
  const energy = new Float64Array(steps);
  const a = new Quaternion();
  const b = new Quaternion();
  for (const track of rotations) {
    for (let i = 0; i < steps; i += 1) {
      a.fromArray(track.values, i * 4);
      b.fromArray(track.values, (i + 1) * 4);
      energy[i] += a.angleTo(b);
    }
  }
  const spans = new Float64Array(steps);
  let sum = 0;
  for (let i = 0; i < steps; i += 1) {
    spans[i] = (energy[(i - 1 + steps) % steps] + 2 * energy[i] + energy[(i + 1) % steps]) / 4;
    sum += spans[i];
  }
  const mean = sum / steps || 1;
  // 2. 칸마다 재생에 쓸 시간: 움직임이 많을수록 길게. 누적해 0~1 재생 시각의 경계를 만듭니다.
  const starts = new Float64Array(steps + 1);
  for (let i = 0; i < steps; i += 1) starts[i + 1] = starts[i] + 1 + (strength * spans[i]) / mean;
  for (let i = 1; i <= steps; i += 1) starts[i] /= starts[steps];
  // 3. 고른 재생 시각마다 원래 클립의 어느 칸, 칸 안 어디인지
  const source = new Float64Array(steps + 1);
  let cell = 0;
  for (let j = 0; j <= steps; j += 1) {
    const u = j / steps;
    while (cell < steps - 1 && u >= starts[cell + 1]) cell += 1;
    source[j] = cell + Math.min(1, (u - starts[cell]) / (starts[cell + 1] - starts[cell]));
  }
  // 4. 트랙마다 새 값(칸 사이는 재생할 때처럼 선형·구면 선형 보간)
  const from = new Quaternion();
  const to = new Quaternion();
  return tracks.map((track) => {
    if (track.times.length !== steps + 1) return track;
    const size = track.getValueSize();
    const values = track.values;
    const out = new Float32Array(values.length);
    for (let j = 0; j <= steps; j += 1) {
      const k = Math.min(steps - 1, Math.floor(source[j]));
      const f = source[j] - k;
      if (track instanceof QuaternionKeyframeTrack) {
        from.fromArray(values, k * 4);
        to.fromArray(values, (k + 1) * 4);
        from.slerp(to, f).toArray(out, j * 4);
      } else {
        for (let c = 0; c < size; c += 1) out[j * size + c] = values[k * size + c] * (1 - f) + values[(k + 1) * size + c] * f;
      }
    }
    return track instanceof QuaternionKeyframeTrack
      ? new QuaternionKeyframeTrack(track.name, track.times, out)
      : new VectorKeyframeTrack(track.name, track.times, out);
  });
}

export interface SmoothLoopOptions {
  /** 다시 샘플하는 간격(초당 개수). */
  samplesPerSecond?: number;
  /** 크게 휘두르는 순간을 늦추는 정도. 0이면 원래 시간 그대로. */
  strokeEase?: number;
}

/**
 * 반복 재생하는 클립(날갯짓)을 부드럽게 다시 만듭니다.
 * 모델의 클립은 키가 성기게(주기당 10~22개) 직선으로 이어져 키마다 움직임이 꺾이고,
 * 처음과 끝 자세가 달라 한 바퀴마다 날개가 튀며, 날개를 33ms 만에 95° 휘두르는 순간이 있습니다.
 * 변하지 않는 트랙은 노드에 한 번만 적용하고 뺍니다.
 * 다시 샘플한 곡선도 재생할 때는 직선으로 이으므로, 120Hz 화면과 빠른 날갯짓에서도 꺾임이 보이지 않게 초당 120개로 둡니다.
 */
export function smoothLoopClip(
  clip: AnimationClip,
  root: Object3D,
  { samplesPerSecond = 120, strokeEase = 0.6 }: SmoothLoopOptions = {},
) {
  const tracks: KeyframeTrack[] = [];
  const steps = Math.max(2, Math.round(clip.duration * samplesPerSecond));
  for (const track of clip.tracks) {
    const spansClip = track.times[0] <= 1e-6 && Math.abs(track.times[track.times.length - 1] - clip.duration) <= 1e-4;
    const loopable =
      spansClip &&
      track.times.length >= 3 &&
      (track instanceof QuaternionKeyframeTrack || track instanceof VectorKeyframeTrack);
    if (isConstant(track) && applyConstant(root, track)) continue;
    tracks.push(loopable ? resampleLoop(track, clip.duration, samplesPerSecond) : track);
  }
  return new AnimationClip(clip.name, clip.duration, retimeStrokes(tracks, clip.duration, steps, strokeEase));
}
