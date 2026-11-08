/**
 * 제로 고리를 캔버스에 직접 그립니다.
 * 채널 약속: R = 명도 단계, G = 먹선, B = 형상 마스크. 색은 셰이더가 입힙니다.
 */

type Ctx = CanvasRenderingContext2D;
type Point = readonly [number, number];
type Random = () => number;

export interface BladeOptions {
  x: number;
  y: number;
  angle: number;
  length: number;
  width: number;
  /** 끝으로 갈수록 휘는 정도. */
  bend?: number;
  /** S자로 일렁이는 정도. */
  wiggle?: number;
  segments?: number;
}

/** 끝이 뾰족한 깃털·불꽃 획의 외곽 좌표를 만듭니다. */
export function bladePoints({ x, y, angle, length, width, bend = 0, wiggle = 0, segments = 14 }: BladeOptions): Point[] {
  const dirX = Math.cos(angle);
  const dirY = Math.sin(angle);
  const spine = (t: number): Point => {
    const offset = (bend * t * t + wiggle * Math.sin(t * Math.PI * 2) * t) * length;
    return [x + dirX * length * t - dirY * offset, y + dirY * length * t + dirX * offset];
  };
  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments;
    const [px, py] = spine(t);
    const [ax, ay] = spine(Math.max(0, t - 0.01));
    const [bx, by] = spine(Math.min(1, t + 0.01));
    const tx = bx - ax;
    const ty = by - ay;
    const norm = Math.hypot(tx, ty) || 1;
    const half = (width / 2) * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 0.8);
    left.push([px - (ty / norm) * half, py + (tx / norm) * half]);
    right.push([px + (ty / norm) * half, py - (tx / norm) * half]);
  }
  return [...left, ...right.reverse()];
}

function mulberry32(seed: number): Random {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

class Painter {
  constructor(
    private ctx: Ctx,
    private size: number,
  ) {
    ctx.fillStyle = 'rgb(0,0,0)';
    ctx.fillRect(0, 0, size, size);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
  }

  private px([x, y]: Point): Point {
    const scale = 0.94;
    return [((x * scale + 1) / 2) * this.size, ((1 - y * scale) / 2) * this.size];
  }

  private trace(points: readonly Point[]) {
    this.ctx.beginPath();
    points.forEach((point, index) => {
      const [x, y] = this.px(point);
      if (index === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    });
    this.ctx.closePath();
  }

  /** tone(0~1) 면을 칠하고 ink 두께의 먹선을 두릅니다. */
  shape(points: readonly Point[], tone: number, ink = 0) {
    const r = Math.round(Math.min(1, Math.max(0, tone)) * 255);
    this.trace(points);
    this.ctx.fillStyle = `rgb(${r},0,255)`;
    this.ctx.fill();
    if (ink > 0) {
      this.ctx.strokeStyle = `rgb(${r},255,255)`;
      this.ctx.lineWidth = (ink * this.size) / 2048;
      this.ctx.stroke();
    }
  }

  blade(options: BladeOptions, tone: number, ink = 0) {
    this.shape(bladePoints(options), tone, ink);
  }

}

/** 곧게 뻗는 광선 형태의 불꽃. */
function ray(painter: Painter, random: Random, x: number, y: number, angle: number, length: number, width: number, tone: number) {
  painter.blade({ x, y, angle, length, width, bend: (random() - 0.5) * 0.1, wiggle: (random() - 0.5) * 0.04, segments: 12 }, tone, 0);
}

/** 깃털 띠와 사방으로 뻗는 광선으로 이루어진 제로(0). 인트로의 끝입니다. */
export function drawRingArt(ctx: Ctx, size: number) {
  const painter = new Painter(ctx, size);
  const random = mulberry32(21);
  const radius = 0.68;
  const point = (a: number, r: number): Point => [Math.cos(a) * r, Math.sin(a) * r];

  const outward = [
    { count: 420, length: [0.2, 0.46], width: 0.058, tone: [0.44, 0.62] },
    { count: 380, length: [0.14, 0.32], width: 0.05, tone: [0.62, 0.78] },
    { count: 280, length: [0.06, 0.14], width: 0.044, tone: [0.78, 0.92] },
    { count: 200, length: [0.14, 0.42], width: 0.01, tone: [0.7, 0.88] },
  ];
  for (const layer of outward) {
    for (let i = 0; i < layer.count; i += 1) {
      const a = random() * Math.PI * 2;
      const [x, y] = point(a, radius);
      ray(painter, random, x, y, a + (random() - 0.5) * 0.36, lerp(layer.length[0], layer.length[1], random()), layer.width, lerp(layer.tone[0], layer.tone[1], random()));
    }
  }

  for (let i = 0; i < 150; i += 1) {
    const a = random() * Math.PI * 2;
    const [x, y] = point(a, radius);
    ray(painter, random, x, y, a + Math.PI + (random() - 0.5) * 0.4, lerp(0.05, 0.11, random()), 0.04, lerp(0.62, 0.86, random()));
  }

  // 원을 따라 겹치는 깃털 띠
  for (let i = 0; i < 260; i += 1) {
    const a = (i / 260) * Math.PI * 2;
    const [x, y] = point(a, radius - 0.07 + random() * 0.13);
    painter.blade({ x, y, angle: a + Math.PI / 2 + 0.35, length: lerp(0.16, 0.28, random()), width: 0.06, bend: -0.18 }, lerp(0.54, 0.72, random()), 3);
  }
}
