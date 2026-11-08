import { smoothstep } from './reveal';

interface Key {
  at: number;
  /** 화면 가운데에 둘 그림 위 지점(-0.5~0.5). */
  focus: readonly [number, number];
  /** 그림 한 변이 화면 높이의 몇 배로 보이는지. */
  zoom: number;
  /** 날아오르는 자세의 기울기(도). */
  tilt: number;
  /** 카메라 각도: 0 왼쪽, 1 정면 뒤, 2 오른쪽. */
  view: number;
}

/** 스크롤 전체 진행도에 대한 2D 카메라: 뒷모습 근접 → 태양을 향해 비행 → 우주 → 전쟁 → 고리. */
const KEYS: readonly Key[] = [
  { at: 0, focus: [-0.14, -0.08], zoom: 1.7, tilt: -8, view: 0.1 },
  { at: 0.16, focus: [0.04, 0.12], zoom: 1.5, tilt: -4, view: 0.6 },
  { at: 0.34, focus: [0, 0.14], zoom: 1.02, tilt: 0, view: 1 },
  { at: 0.5, focus: [0, 0.1], zoom: 0.66, tilt: -14, view: 1.6 },
  { at: 0.6, focus: [0, -0.18], zoom: 0.72, tilt: -20, view: 2 },
  { at: 0.76, focus: [0, -0.08], zoom: 1.3, tilt: -10, view: 0.8 },
  { at: 1, focus: [0, 0], zoom: 1.15, tilt: 0, view: 1 },
];

export interface SceneState {
  focus: [number, number];
  zoom: number;
  /** 라디안. */
  tilt: number;
  view: number;
  flap: number;
  burn: number;
  morph: number;
  sun: number;
  /** 태양이 다가오며 커지는 정도. */
  sunSize: number;
  /** 앞으로 날아가는 속도감. */
  flight: number;
  cosmos: number;
  war: number;
  ring: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 스크롤 진행도(0~1)에서 그 순간의 장면 값을 계산합니다. 세로 화면은 날개가 잘리지 않게 그림을 줄입니다. */
export function sampleTimeline(progress: number, aspect = 16 / 10): SceneState {
  const p = Math.min(1, Math.max(0, progress));
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i += 1;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smoothstep(a.at, b.at, p);

  const reach = smoothstep(0.1, 0.34, p);
  const bird = lerp(1, Math.min(1, aspect * 0.9), reach);
  const fit = lerp(bird, Math.min(1, aspect * 1.1), smoothstep(0.86, 1, p));

  return {
    focus: [lerp(a.focus[0], b.focus[0], t), lerp(a.focus[1], b.focus[1], t)],
    zoom: lerp(a.zoom, b.zoom, t) * fit,
    tilt: (lerp(a.tilt, b.tilt, t) * Math.PI) / 180,
    view: lerp(a.view, b.view, t),
    flap: lerp(0.35, 1, smoothstep(0, 0.3, p)) * (1 - smoothstep(0.8, 0.9, p)),
    burn: smoothstep(0.42, 0.56, p),
    morph: smoothstep(0.8, 0.93, p),
    sun: smoothstep(0.02, 0.16, p) * (1 - smoothstep(0.46, 0.58, p)),
    sunSize: smoothstep(0.1, 0.5, p),
    flight: smoothstep(0.03, 0.14, p) * (1 - smoothstep(0.62, 0.74, p)),
    cosmos: smoothstep(0.38, 0.54, p),
    war: smoothstep(0.6, 0.74, p),
    ring: smoothstep(0.86, 1, p),
  };
}
