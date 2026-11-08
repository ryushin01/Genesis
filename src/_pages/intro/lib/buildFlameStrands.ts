import type { PhoenixData } from './buildPhoenix';

/** 칼깃과 꼬리 끝에서 뻗어 나가는 불길 가닥의 인스턴스 데이터. */
export interface FlameStrands {
  count: number;
  /** 인스턴스마다 시작점 xyz. */
  base: Float32Array;
  /** 인스턴스마다 뻗는 방향 xyz. */
  dir: Float32Array;
  /** 인스턴스마다 [길이, 너비, 난수, 고리 위 각도]. */
  params: Float32Array;
  /** 인스턴스마다 [날개 방향, 날개 끝 쪽 위치]. 날갯짓을 따라가게 합니다. */
  wing: Float32Array;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function buildFlameStrands(phoenix: PhoenixData, perFeather = 3, seed = 11): FlameStrands {
  let state = seed;
  const random = () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };

  const base: number[] = [];
  const dir: number[] = [];
  const params: number[] = [];
  const wing: number[] = [];

  for (let i = 0; i < phoenix.count; i += 1) {
    const side = phoenix.meta[i * 4];
    const span = phoenix.meta[i * 4 + 1];
    const shade = phoenix.shade[i];
    const isPrimary = shade === 0 && side !== 0;
    const isTailTip = Math.abs(shade - 0.3) < 0.01 && span > 0.95;
    if (!isPrimary && !isTailTip) continue;

    const m = i * 16;
    const dx = phoenix.matrices[m + 4];
    const dy = phoenix.matrices[m + 5];
    const dz = phoenix.matrices[m + 6];
    const length = Math.hypot(dx, dy, dz) || 1;

    for (let k = 0; k < perFeather; k += 1) {
      const along = lerp(0.5, 1, random());
      const spreadX = (random() - 0.5) * 0.8;
      const spreadY = (random() - 0.5) * 0.8 + (isPrimary ? span * 0.35 : -0.1);
      const nx = dx / length + spreadX;
      const ny = dy / length + spreadY;
      const norm = Math.hypot(nx, ny) || 1;

      base.push(
        phoenix.matrices[m + 12] + dx * along,
        phoenix.matrices[m + 13] + dy * along,
        phoenix.matrices[m + 14] + dz * along + 0.05,
      );
      dir.push(nx / norm, ny / norm, 0);
      params.push(
        lerp(1, 3.4, random()) * (isPrimary ? 0.65 + span * 0.8 : 0.6),
        lerp(0.14, 0.46, random()),
        random(),
        random() * Math.PI * 2,
      );
      wing.push(side, span);
    }
  }

  return {
    count: base.length / 3,
    base: new Float32Array(base),
    dir: new Float32Array(dir),
    params: new Float32Array(params),
    wing: new Float32Array(wing),
  };
}
