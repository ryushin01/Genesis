import { smoothstep } from './reveal';

type Vec3 = readonly [number, number, number];

interface Key {
  at: number;
  camera: Vec3;
  target: Vec3;
  fov: number;
}

/** 스크롤 전체 진행도에 대한 카메라 경로: 깃털 근접 → 전신 → 우주 → 전쟁 → 고리. */
const KEYS: readonly Key[] = [
  { at: 0, camera: [2.5, 0.7, 2.7], target: [2.3, 0.2, 0], fov: 46 },
  { at: 0.16, camera: [1.5, 0.9, 5.2], target: [1.5, 0.5, 0], fov: 44 },
  { at: 0.34, camera: [0, 0.2, 12.2], target: [0, 0.1, 0], fov: 40 },
  { at: 0.54, camera: [-5, 2.2, 21], target: [0.8, 0, 0], fov: 40 },
  { at: 0.76, camera: [0, -0.5, 13], target: [0, 0.1, 0], fov: 42 },
  { at: 1, camera: [0, 0, 11.5], target: [0, 0, 0], fov: 40 },
];

export interface SceneState {
  camera: [number, number, number];
  target: [number, number, number];
  fov: number;
  flap: number;
  burn: number;
  morph: number;
  sun: number;
  cosmos: number;
  war: number;
  ring: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp3 = (a: Vec3, b: Vec3, t: number): [number, number, number] => [
  lerp(a[0], b[0], t),
  lerp(a[1], b[1], t),
  lerp(a[2], b[2], t),
];

/** 스크롤 진행도(0~1)에서 그 순간의 장면 값을 계산합니다. 세로 화면은 날개가 잘리지 않게 카메라를 물립니다. */
export function sampleTimeline(progress: number, aspect = 16 / 10): SceneState {
  const p = Math.min(1, Math.max(0, progress));
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i += 1;
  const a = KEYS[i];
  const b = KEYS[i + 1];
  const t = smoothstep(a.at, b.at, p);

  const camera = lerp3(a.camera, b.camera, t);
  const target = lerp3(a.target, b.target, t);
  const reach = smoothstep(0.1, 0.34, p);
  const pull = 1 + (Math.max(1, 1.25 / aspect) - 1) * reach;
  camera[0] = target[0] + (camera[0] - target[0]) * pull;
  camera[1] = target[1] + (camera[1] - target[1]) * pull;
  camera[2] = target[2] + (camera[2] - target[2]) * pull;

  return {
    camera,
    target,
    fov: lerp(a.fov, b.fov, t),
    flap: lerp(0.35, 1, smoothstep(0, 0.3, p)) * (1 - smoothstep(0.84, 0.94, p)),
    burn: smoothstep(0.58, 0.74, p),
    morph: smoothstep(0.82, 0.98, p),
    sun: smoothstep(0.14, 0.3, p) * (1 - smoothstep(0.42, 0.54, p)),
    cosmos: smoothstep(0.38, 0.54, p),
    war: smoothstep(0.6, 0.74, p),
    ring: smoothstep(0.86, 1, p),
  };
}
