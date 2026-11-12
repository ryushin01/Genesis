import { smoothstep } from './reveal';

type Vec3 = readonly [number, number, number];

interface Key {
  at: number;
  /** 불사조를 도는 카메라 각도(도). 0은 바로 뒤, 180은 정면입니다. */
  azimuth: number;
  /** 카메라 높이 각도(도). */
  elevation: number;
  /** 불사조까지의 거리(날개 폭 7 기준). */
  distance: number;
  /** 카메라가 바라보는 점. 불사조를 화면 어디에 둘지 정합니다. */
  look: Vec3;
}

/** 스크롤 전체 진행도에 대한 카메라 경로: 처음부터 끝까지 불사조의 뒷모습을 따라 태양으로 날아갑니다. */
const KEYS: readonly Key[] = [
  { at: 0, azimuth: -38, elevation: 6, distance: 4.4, look: [1.7, 0.5, 0] },
  { at: 0.16, azimuth: -16, elevation: 12, distance: 7.5, look: [0.4, 1.6, 0] },
  { at: 0.34, azimuth: 0, elevation: 15, distance: 11, look: [0, 2.6, 0] },
  { at: 0.5, azimuth: 16, elevation: 20, distance: 17, look: [0, 3.2, 0] },
  { at: 0.6, azimuth: 18, elevation: 14, distance: 15, look: [0, -3.4, 0] },
  { at: 0.76, azimuth: -22, elevation: 10, distance: 12, look: [0, -1.6, 0] },
  { at: 0.88, azimuth: -6, elevation: 16, distance: 14, look: [0, 3, 0] },
  { at: 1, azimuth: 0, elevation: 20, distance: 15, look: [0, 4, 0] },
];

export interface SceneState {
  camera: [number, number, number];
  look: [number, number, number];
  /** 카메라가 도는 각도(라디안). 태양 위치에 씁니다. */
  azimuth: number;
  burn: number;
  sun: number;
  /** 태양이 다가오며 커지는 정도. */
  sunSize: number;
  /** 앞으로 날아가는 속도감. */
  flight: number;
  /** 불사조가 태양 속으로 날아드는 정도. */
  exit: number;
  /** 태양 속에서 불사조가 흩어지는 정도. */
  dissolve: number;
  /** 깃털이 흩어지고 큰 깃털이 가운데로 내려오는 정도. */
  fall: number;
  /** 불사조가 태양에 닿아 초신성처럼 터지는 정도. */
  nova: number;
  /** 깃털이 내려앉은 자리에 로고가 나타나는 정도. */
  logo: number;
  cosmos: number;
  war: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const DEG = Math.PI / 180;

/** 스크롤 진행도(0~1)에서 그 순간의 장면 값을 계산합니다. 세로 화면은 날개가 잘리지 않게 카메라를 물립니다. */
export function sampleTimeline(progress: number, aspect = 16 / 10): SceneState {
  const p = Math.min(1, Math.max(0, progress));
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i += 1;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smoothstep(a.at, b.at, p);

  const azimuth = lerp(a.azimuth, b.azimuth, t) * DEG;
  const elevation = lerp(a.elevation, b.elevation, t) * DEG;
  const reach = smoothstep(0.1, 0.34, p);
  const distance = lerp(a.distance, b.distance, t) * lerp(1, Math.max(1, 1.2 / aspect), reach);
  const look: [number, number, number] = [lerp(a.look[0], b.look[0], t), lerp(a.look[1], b.look[1], t), lerp(a.look[2], b.look[2], t)];

  return {
    camera: [
      look[0] + Math.sin(azimuth) * Math.cos(elevation) * distance,
      look[1] + Math.sin(elevation) * distance,
      look[2] + Math.cos(azimuth) * Math.cos(elevation) * distance,
    ],
    look,
    azimuth,
    burn: smoothstep(0.42, 0.56, p),
    // 태양은 중간에 사라지지 않고, 가까워질수록 커집니다.
    sun: smoothstep(0.02, 0.16, p),
    sunSize: smoothstep(0.08, 0.9, p),
    flight: smoothstep(0.03, 0.14, p) * (1 - smoothstep(0.9, 0.95, p)),
    exit: smoothstep(0.8, 0.9, p),
    dissolve: smoothstep(0.88, 0.92, p),
    nova: smoothstep(0.885, 0.94, p),
    fall: smoothstep(0.895, 0.978, p),
    logo: smoothstep(0.978, 1, p),
    cosmos: smoothstep(0.38, 0.54, p),
    war: smoothstep(0.6, 0.74, p),
  };
}
