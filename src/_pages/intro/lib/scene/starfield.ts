import { AdditiveBlending, BufferAttribute, BufferGeometry, Points, ShaderMaterial, type Vector3 } from 'three';
import { starFragment, starVertex } from '../shaders';

/** 0~1 난수를 돌려주는 작은 생성기(장면을 다시 만들어도 별자리가 같게). */
export function seededRandom(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
}

/** 비행 경로(x축)를 둘러싼 원통 껍질 안의 한 점. */
function aroundPath(random: () => number, inner: number, outer: number, from: number, to: number): [number, number, number] {
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(inner * inner + random() * (outer * outer - inner * inner));
  return [from + random() * (to - from), Math.cos(angle) * radius, Math.sin(angle) * radius];
}

/**
 * 가까운 별(두 겹)과 우주 먼지. 비행 경로를 따라 3D로 놓아 카메라가 날아갈 때 가까운 것일수록 빨리 지나가는 시차를 냅니다.
 * 먼 별은 배경 셰이더가 시선 방향으로 그립니다.
 */
export function createStarfield(counts: { near: number; mid: number; dust: number }, uTime: { value: number }, uHighlight: { value: Vector3 }) {
  const random = seededRandom(20261127);
  const total = counts.near + counts.mid + counts.dust;
  const positions = new Float32Array(total * 3);
  const seeds = new Float32Array(total);
  const kinds = new Float32Array(total);
  let i = 0;
  const put = (point: [number, number, number], kind: number) => {
    positions.set(point, i * 3);
    seeds[i] = random();
    kinds[i] = kind;
    i += 1;
  };
  for (let n = 0; n < counts.mid; n += 1) put(aroundPath(random, 40, 110, -80, 90), 0);
  for (let n = 0; n < counts.near; n += 1) put(aroundPath(random, 9, 40, -60, 60), 0);
  for (let n = 0; n < counts.dust; n += 1) put(aroundPath(random, 0.4, 9, -45, 40), 1);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  geometry.setAttribute('aKind', new BufferAttribute(kinds, 1));
  const uniforms = {
    uTime,
    uHighlight,
    uScale: { value: 600 },
    uMaxPoint: { value: 24 },
    uPixelRatio: { value: 1 },
    uDust: { value: 1 },
    uStars: { value: 1 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: starVertex,
    fragmentShader: starFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 1;
  return {
    points,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
