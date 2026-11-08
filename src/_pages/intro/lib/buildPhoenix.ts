import { CatmullRomCurve3, Vector3 } from 'three';

/** 깃털 하나의 자리와 크기를 담은 인스턴스 데이터. 외부 모델 없이 코드로 불사조를 만듭니다. */
export interface PhoenixData {
  count: number;
  /** 인스턴스마다 4×4 행렬(16개 값). */
  matrices: Float32Array;
  /** 인스턴스마다 [날개 방향, 날개 끝 쪽 위치, 난수, 고리 위 각도]. */
  meta: Float32Array;
  /** 인스턴스마다 깃털 층의 밝기(0~1). 층이 겹쳐 보이게 합니다. */
  shade: Float32Array;
}

type Random = () => number;

function mulberry32(seed: number): Random {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Feather {
  base: Vector3;
  dir: Vector3;
  normal: Vector3;
  width: number;
  length: number;
  side: number;
  span: number;
  shade: number;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function wingFeathers(density: number, random: Random, out: Feather[]) {
  const arm = new CatmullRomCurve3([
    new Vector3(0.2, 0.42, 0.02),
    new Vector3(0.85, 1.42, -0.12),
    new Vector3(1.6, 2.05, 0.04),
    new Vector3(2.9, 2.35, 0),
    new Vector3(3.9, 2.95, -0.05),
  ]);

  const rows = [
    { count: 70, reach: 1, width: 0.31, offset: 0, z: 0, shade: 0 },
    { count: 96, reach: 0.62, width: 0.25, offset: 0.02, z: 0.05, shade: 0.35 },
    { count: 150, reach: 0.38, width: 0.19, offset: 0.03, z: 0.1, shade: 0.6 },
    { count: 270, reach: 0.2, width: 0.13, offset: 0.02, z: 0.15, shade: 0.85 },
  ];

  rows.forEach((row, rowIndex) => {
    const count = Math.round(row.count * density);
    for (let i = 0; i < count; i += 1) {
      const u = rowIndex === 0 ? i / (count - 1) : random();
      const jitter = (random() - 0.5) * (rowIndex === 0 ? 0.05 : 0.2);
      const angle = lerp(-1.82, 0.42, Math.pow(u, 1.32)) + jitter;
      const dir = new Vector3(Math.cos(angle), Math.sin(angle), 0.02 * (random() - 0.5));
      const reach = lerp(1.5, 3.0, Math.sin(Math.min(1, u * 1.18) * Math.PI * 0.5)) * row.reach * lerp(0.92, 1.08, random());
      const point = arm.getPoint(u);
      if (rowIndex > 0) point.y -= (random() * 0.26 * reach) / row.reach / 3;
      point.addScaledVector(dir, row.offset * reach);
      point.z += row.z + (random() - 0.5) * 0.03;
      // 날개 끝의 첫째 칼깃은 가늘게 해서 손가락처럼 벌어지게 합니다.
      const fingers = rowIndex === 0 ? lerp(1, 0.55, Math.max(0, (u - 0.68) / 0.32)) : 1;
      const tilt = (random() - 0.5) * 0.55;
      const normal = new Vector3(tilt, (random() - 0.5) * 0.35, 1).normalize();

      for (const side of [1, -1]) {
        out.push({
          base: new Vector3(point.x * side, point.y, point.z),
          dir: new Vector3(dir.x * side, dir.y, dir.z),
          normal: new Vector3(normal.x * side, normal.y, normal.z),
          width: row.width * lerp(0.85, 1.1, random()) * fingers,
          length: reach,
          side,
          span: u,
          shade: row.shade,
        });
      }
    }
  });
}

function bodyFeathers(density: number, random: Random, out: Feather[]) {
  const spine = new CatmullRomCurve3([
    new Vector3(0, 1.62, 0.34),
    new Vector3(0, 1.25, 0.18),
    new Vector3(0, 0.45, 0.06),
    new Vector3(0, -0.4, 0),
    new Vector3(0, -1.1, -0.06),
  ]);
  const radius = (v: number) =>
    v < 0.1 ? lerp(0.12, 0.17, v / 0.1) : v < 0.26 ? lerp(0.17, 0.13, (v - 0.1) / 0.16) : v < 0.55 ? lerp(0.13, 0.44, (v - 0.26) / 0.29) : lerp(0.44, 0.12, (v - 0.55) / 0.45);

  const count = Math.round(520 * density);
  for (let i = 0; i < count; i += 1) {
    const v = random();
    const phi = (random() - 0.5) * 2.3;
    const center = spine.getPoint(v);
    const tangent = spine.getTangent(v);
    const normal = new Vector3(Math.sin(phi), 0.1, Math.cos(phi)).normalize();
    const r = radius(v);
    const base = center.clone().addScaledVector(normal, r);
    const dir = tangent.clone().addScaledVector(normal, 0.32).normalize();
    out.push({ base, dir, normal, width: 0.12 + r * 0.2, length: 0.22 + r * 0.5, side: 0, span: 0.1, shade: 0.5 });
  }

  // 머리
  const skull = new Vector3(0, 1.6, 0.3);
  for (let i = 0; i < Math.round(90 * density); i += 1) {
    const phi = (random() - 0.5) * 2.6;
    const theta = (random() - 0.5) * 2.4;
    const normal = new Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(theta), Math.cos(phi) * Math.cos(theta));
    const base = skull.clone().addScaledVector(normal, 0.17);
    const dir = new Vector3(normal.x * 0.3, -0.75, normal.z * 0.3 - 0.35).normalize();
    out.push({ base, dir, normal, width: 0.1, length: 0.24, side: 0, span: 0.8, shade: 0.7 });
  }

  // 부리와 볏
  out.push({
    base: new Vector3(0, 1.62, 0.46),
    dir: new Vector3(0, -0.75, 0.66).normalize(),
    normal: new Vector3(0, 0.66, 0.75).normalize(),
    width: 0.12,
    length: 0.38,
    side: 0,
    span: 0.95,
    shade: 1,
  });
  for (let i = 0; i < 7; i += 1) {
    const t = i / 6 - 0.5;
    out.push({
      base: new Vector3(t * 0.12, 1.74, 0.2),
      dir: new Vector3(t * 0.8, 1, -0.75).normalize(),
      normal: new Vector3(0, 0.5, 1).normalize(),
      width: 0.06,
      length: 0.75 + (0.5 - Math.abs(t)) * 0.9,
      side: 0,
      span: 0.9,
      shade: 0.8,
    });
  }
}

function tailFeathers(density: number, random: Random, out: Feather[]) {
  const plumes = 13;
  const segments = Math.round(34 * density);
  for (let i = 0; i < plumes; i += 1) {
    const f = i / (plumes - 1) - 0.5;
    const lengthFactor = 1 - Math.abs(f) * 0.5 + random() * 0.08;
    const phase = random() * Math.PI * 2;
    const points = [];
    for (let k = 0; k <= 5; k += 1) {
      const t = k / 5;
      points.push(
        new Vector3(f * (0.2 + t * 2.7) + Math.sin(t * 4 + phase) * 0.13 * t, -1.02 - t * 4.2 * lengthFactor, -0.08 - Math.abs(f) * 0.4 * t),
      );
    }
    const curve = new CatmullRomCurve3(points);
    for (let k = 0; k < segments; k += 1) {
      const t = k / (segments - 1);
      const dir = curve.getTangent(t);
      const plume = t > 0.9;
      out.push({
        base: curve.getPoint(t),
        dir,
        normal: new Vector3((random() - 0.5) * 0.4, 0, 1).normalize(),
        width: plume ? 0.3 : lerp(0.15, 0.07, t),
        length: plume ? 0.8 : 0.62,
        side: 0,
        span: 0.5 + t * 0.5,
        shade: 0.3,
      });
    }
  }
}

export function buildPhoenix(density = 1, seed = 7): PhoenixData {
  const random = mulberry32(seed);
  const feathers: Feather[] = [];
  wingFeathers(density, random, feathers);
  bodyFeathers(density, random, feathers);
  tailFeathers(density, random, feathers);

  const matrices = new Float32Array(feathers.length * 16);
  const meta = new Float32Array(feathers.length * 4);
  const shade = new Float32Array(feathers.length);
  const x = new Vector3();
  const z = new Vector3();

  feathers.forEach((f, i) => {
    x.crossVectors(f.dir, f.normal).normalize();
    z.crossVectors(x, f.dir).normalize();
    matrices.set(
      [
        x.x * f.width, x.y * f.width, x.z * f.width, 0,
        f.dir.x * f.length, f.dir.y * f.length, f.dir.z * f.length, 0,
        z.x * f.width, z.y * f.width, z.z * f.width, 0,
        f.base.x, f.base.y, f.base.z, 1,
      ],
      i * 16,
    );
    meta.set([f.side, f.span, random(), (i / feathers.length) * Math.PI * 2 * 17], i * 4);
    shade[i] = f.shade;
  });

  return { count: feathers.length, matrices, meta, shade };
}
