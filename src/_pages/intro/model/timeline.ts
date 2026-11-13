import { createMonotoneCurve } from './curve';
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
  { at: 0.44, azimuth: 11, elevation: 19, distance: 15, look: [0, 3.1, 0] },
  // 우주: 카메라가 크게 물러나 태양 앞의 작은 불사조를 보여 줍니다. 날개를 다 올려도 가운데 문구 위에 머뭅니다.
  { at: 0.51, azimuth: 13, elevation: 20, distance: 24, look: [0, -2.7, 0] },
  { at: 0.575, azimuth: 16, elevation: 19, distance: 23, look: [0, -2.55, 0] },
  // 전쟁: 글이 아래로 내려가면 다시 다가갑니다. 날개 끝까지 화면 안에 들어오게 둡니다.
  { at: 0.65, azimuth: 18, elevation: 13, distance: 20, look: [0, -0.9, 0] },
  { at: 0.76, azimuth: -22, elevation: 10, distance: 19, look: [0, -1.05, 0] },
  { at: 0.88, azimuth: -6, elevation: 16, distance: 14, look: [0, 3, 0] },
  { at: 1, azimuth: 0, elevation: 20, distance: 15, look: [0, 4, 0] },
];

const keyTimes = KEYS.map((key) => key.at);
const curveOf = (pick: (key: Key) => number) => createMonotoneCurve(keyTimes, KEYS.map(pick));
const azimuthCurve = curveOf((key) => key.azimuth);
const elevationCurve = curveOf((key) => key.elevation);
const distanceCurve = curveOf((key) => key.distance);
const lookCurves = [0, 1, 2].map((axis) => curveOf((key) => key.look[axis]));

/** 날갯짓 빠르기(모델 애니메이션 배속): 처음엔 느긋하게, 우주에서는 활공하듯, 전쟁과 돌진에서는 거칠게. */
const flapRate = createMonotoneCurve([0, 0.3, 0.5, 0.7, 0.82, 0.88], [0.48, 0.62, 0.5, 0.9, 1, 1.3]);

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
  /** 날갯짓 배속. */
  flapRate: number;
  /** 폭발 순간 화면이 흔들리는 세기(0~1). */
  shake: number;
  /** 불사조 뒤로 흩날리는 불티 꼬리의 세기(0~1). */
  trail: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const DEG = Math.PI / 180;

export function createSceneState(): SceneState {
  return {
    camera: [0, 0, 0],
    look: [0, 0, 0],
    azimuth: 0,
    burn: 0,
    sun: 0,
    sunSize: 0,
    flight: 0,
    exit: 0,
    dissolve: 0,
    fall: 0,
    nova: 0,
    logo: 0,
    cosmos: 0,
    war: 0,
    flapRate: 0,
    shake: 0,
    trail: 0,
  };
}

/**
 * 스크롤 진행도(0~1)에서 그 순간의 장면 값을 계산합니다. 세로 화면은 날개가 잘리지 않게 카메라를 물립니다.
 * 매 프레임 부르므로 `out`을 넘기면 새 객체를 만들지 않고 그 안에 씁니다.
 */
export function sampleTimeline(progress: number, aspect = 16 / 10, out: SceneState = createSceneState()): SceneState {
  const p = Math.min(1, Math.max(0, progress));
  const azimuth = azimuthCurve(p) * DEG;
  const elevation = elevationCurve(p) * DEG;
  const reach = smoothstep(0.1, 0.34, p);
  // 세로 화면은 카메라와 바라보는 점을 함께 물려, 불사조가 작아지되 화면 속 위치(글과의 관계)는 그대로 둡니다.
  const fit = lerp(1, Math.max(1, 1.2 / aspect), reach);
  const distance = distanceCurve(p) * fit;
  const look = out.look;
  look[0] = lookCurves[0](p) * fit;
  look[1] = lookCurves[1](p) * fit;
  look[2] = lookCurves[2](p) * fit;

  out.camera[0] = look[0] + Math.sin(azimuth) * Math.cos(elevation) * distance;
  out.camera[1] = look[1] + Math.sin(elevation) * distance;
  out.camera[2] = look[2] + Math.cos(azimuth) * Math.cos(elevation) * distance;
  out.azimuth = azimuth;
  out.burn = smoothstep(0.42, 0.56, p);
  // 태양은 중간에 사라지지 않고, 가까워질수록 커집니다.
  out.sun = smoothstep(0.02, 0.16, p);
  out.sunSize = smoothstep(0.08, 0.9, p);
  out.flight = smoothstep(0.03, 0.14, p) * (1 - smoothstep(0.9, 0.95, p));
  out.exit = smoothstep(0.8, 0.9, p);
  out.dissolve = smoothstep(0.88, 0.92, p);
  out.nova = smoothstep(0.885, 0.94, p);
  out.fall = smoothstep(0.895, 0.978, p);
  out.logo = smoothstep(0.978, 1, p);
  out.cosmos = smoothstep(0.38, 0.54, p);
  out.war = smoothstep(0.6, 0.74, p);
  out.flapRate = flapRate(p);
  const blast = Math.sin(out.nova * Math.PI);
  out.shake = blast * blast;
  out.trail = out.flight * lerp(0.25, 1, out.burn) * (1 - out.dissolve);
  return out;
}
