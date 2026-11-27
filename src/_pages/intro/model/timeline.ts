import { CHAPTERS, FINALE_LENGTH, HERO_LENGTH } from './chapters';
import { clamp01, lerp, smoothstep } from './math';

/**
 * 스크롤 진행도와 비행 타임라인(레퍼런스의 Blender 타임라인, 초 단위)을 잇습니다.
 *
 * 레퍼런스는 구역 하나를 타임라인 1초로 두고 구역마다 스크롤 길이를 달리합니다. 여기서는 이야기의 장 경계마다
 * 타임라인 시각을 정해(아래 CHAPTER_TIMES) 그 사이를 고르게 잇습니다. 장 길이(chapters.ts)를 바꾸면 경계도 따라갑니다.
 *
 * - 0~1초: 날개를 화면 가득 보여 주는 첫 장면(표제)
 * - 1~10초: 태양을 향해 날아가는 비행(신화 → 얽힘 → 우주 → 전쟁)
 * - 10~11초: 태양에 닿아 터지고 우주가 어두워짐, 불사조가 불길에 싸여 빛 속으로 솟음
 * - 11.2~12.4초: 그 자리에서 깃털 하나가 내려옴
 * - 12.4~13초: 깃털이 로고가 됨
 */
export const FLIGHT_END = 13;

/** 장이 시작할 때의 타임라인 시각(초). 표제·신화·얽힘·우주·전쟁·결말 순서입니다. */
const CHAPTER_TIMES = [0, 1, 3, 5.2, 7.6, 10] as const;

/** 결말 장 안의 키: 장 안에서의 비율 → 시각. 닿고 터지는 순간은 짧게, 깃털이 내려오는 동안은 길게 둡니다. */
const FINALE_KEYS: readonly (readonly [number, number])[] = [
  [0, 10],
  [0.22, 11],
  [0.82, 12.4],
  [1, FLIGHT_END],
];

/** 화면 높이(svh) 단위의 장 길이. 끝까지 스크롤한 거리는 전체 길이에서 화면 하나를 뺀 만큼입니다. */
function scrollKeys(lengths: readonly number[], viewport = 100) {
  const starts: number[] = [];
  let total = 0;
  for (const length of lengths) {
    starts.push(total);
    total += length;
  }
  const max = Math.max(1, total - viewport);
  const finaleStart = starts[starts.length - 1];
  const keys: [number, number][] = starts.slice(0, -1).map((start, i) => [start / max, CHAPTER_TIMES[i]]);
  for (const [ratio, time] of FINALE_KEYS) keys.push([Math.min(1, (finaleStart + (max - finaleStart) * ratio) / max), time]);
  return keys;
}

const LENGTHS = [HERO_LENGTH, ...CHAPTERS.map((chapter) => chapter.length), FINALE_LENGTH];
const KEYS = scrollKeys(LENGTHS);

/** 처음부터 끝까지 스크롤하는 거리(화면 높이 단위). 스크롤 속도를 화면 높이/초로 바꿀 때 씁니다. */
export const SCROLL_SCREENS = Math.max(1, (LENGTHS.reduce((sum, length) => sum + length, 0) - 100) / 100);

/** 스크롤 진행도(0~1) → 타임라인 시각(초). 키 사이는 곧게 잇고, 처음과 끝에서 자릅니다. */
export function flightTime(progress: number) {
  const p = clamp01(progress);
  for (let i = 1; i < KEYS.length; i += 1) {
    const [p1, t1] = KEYS[i];
    if (p <= p1) {
      const [p0, t0] = KEYS[i - 1];
      return p1 > p0 ? lerp(t0, t1, (p - p0) / (p1 - p0)) : t1;
    }
  }
  return FLIGHT_END;
}

/** 장면 색 보정의 단계: 신화(따뜻한 진홍) → 우주(깊은 자줏빛) → 전쟁(뜨겁고 대비 강함) → 결말(어둠 속 진홍). */
export interface Grade {
  /** 어두운 부분에 섞는 색. */
  shadow: [number, number, number];
  /** 밝은 부분에 곱하는 색. */
  highlight: [number, number, number];
  saturation: number;
  exposure: number;
}

const GRADES: readonly (readonly [number, Grade])[] = [
  [0, { shadow: [0.05, 0.004, 0.012], highlight: [1.06, 0.93, 0.86], saturation: 1.05, exposure: 1.05 }],
  [3, { shadow: [0.04, 0.006, 0.03], highlight: [1.04, 0.9, 0.9], saturation: 1.08, exposure: 1 }],
  [5.6, { shadow: [0.02, 0.008, 0.05], highlight: [1, 0.88, 0.95], saturation: 1.12, exposure: 0.98 }],
  [8.2, { shadow: [0.07, 0.004, 0.008], highlight: [1.12, 0.86, 0.8], saturation: 1.18, exposure: 1.04 }],
  [10.6, { shadow: [0.012, 0.004, 0.02], highlight: [1.08, 0.92, 0.9], saturation: 1.1, exposure: 1 }],
];

function sampleGrade(time: number, out: Grade) {
  let i = 1;
  while (i < GRADES.length - 1 && GRADES[i][0] < time) i += 1;
  const [t0, a] = GRADES[i - 1];
  const [t1, b] = GRADES[i];
  const k = smoothstep(t0, t1, time);
  for (let c = 0; c < 3; c += 1) {
    out.shadow[c] = lerp(a.shadow[c], b.shadow[c], k);
    out.highlight[c] = lerp(a.highlight[c], b.highlight[c], k);
  }
  out.saturation = lerp(a.saturation, b.saturation, k);
  out.exposure = lerp(a.exposure, b.exposure, k);
}

export interface SceneState {
  /** 타임라인 시각(초). */
  time: number;
  /** 우주의 깊이: 성운이 짙어지고 은하가 드러나는 정도. */
  cosmos: number;
  /** 전쟁: 유성우가 쏟아지는 정도. */
  war: number;
  /** 태양에 다가가며 불사조에 불이 붙는 정도. */
  burn: number;
  /** 불사조가 태양에 닿아 터지는 정도(섬광·충격파). */
  nova: number;
  /** 폭발 순간 화면이 흔들리는 세기(0~1). */
  shake: number;
  /** 불사조가 빛 속에서 불씨로 흩어지는 정도. */
  dissolve: number;
  /** 작은 깃털이 터진 자리에서 흩어지는 정도. */
  fall: number;
  /** 내려오는 깃털의 빛 무리와 빛줄기. */
  featherGlow: number;
  /** 깃털이 내려앉은 자리에 로고가 나타나는 정도. */
  logo: number;
  /** 불사조 뒤로 흩날리는 불티 꼬리의 세기(0~1). */
  trail: number;
  /** 별·먼지가 스쳐 가는 속도감. */
  flight: number;
  grade: Grade;
}

export function createSceneState(): SceneState {
  return {
    time: 0,
    cosmos: 0,
    war: 0,
    burn: 0,
    nova: 0,
    shake: 0,
    dissolve: 0,
    fall: 0,
    featherGlow: 0,
    logo: 0,
    trail: 0,
    flight: 0,
    grade: { shadow: [0, 0, 0], highlight: [1, 1, 1], saturation: 1, exposure: 1 },
  };
}

/**
 * 타임라인 시각에서 그 순간의 연출 값을 계산합니다. 카메라·불사조·태양·깃털의 위치는 타임라인 파일이 정하고,
 * 여기서는 그 위에 얹는 빛·불길·폭발·색 보정만 정합니다. 매 프레임 부르므로 `out`을 넘기면 그 안에 씁니다.
 */
export function sampleTimeline(time: number, out: SceneState = createSceneState()): SceneState {
  const t = Math.min(FLIGHT_END, Math.max(0, time));
  out.time = t;
  out.cosmos = smoothstep(2.4, 6, t);
  out.war = smoothstep(7.4, 8.4, t) * (1 - smoothstep(9.9, 10.5, t));
  out.burn = smoothstep(8.4, 10.1, t);
  out.nova = smoothstep(10.1, 10.9, t);
  const blast = Math.sin(out.nova * Math.PI);
  out.shake = blast * blast;
  out.dissolve = smoothstep(10.8, 11.35, t);
  out.fall = smoothstep(10.15, 11.7, t);
  out.featherGlow = smoothstep(11.1, 11.6, t) * (1 - smoothstep(12.5, 12.95, t));
  out.logo = smoothstep(12.45, 12.95, t);
  out.flight = smoothstep(0.6, 1.4, t) * (1 - smoothstep(10.6, 11.2, t));
  out.trail = out.flight * lerp(0.3, 1, out.burn) * (1 - out.dissolve);
  sampleGrade(t, out.grade);
  return out;
}
