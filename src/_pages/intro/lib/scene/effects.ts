import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  ConeGeometry,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import { emberFragment, emberVertex, fleetFragment, fleetVertex, trailFragment, trailVertex } from '../shaders';

/** 전쟁 장면에서 지나가는 먼 함대. */
export function createFleet(count: number, uTime: { value: number }) {
  const uniforms = { uTime, uWar: { value: 0 } };
  const cone = new ConeGeometry(0.09, 0.55, 3).rotateZ(-Math.PI / 2);
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(cone.getIndex());
  geometry.setAttribute('position', cone.getAttribute('position'));
  const offsets = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    const flank = i % 2 === 0 ? 1 : -1;
    offsets.set([Math.random() * 60 - 30, flank * (2.6 + Math.random() * 5.5), -9 - Math.random() * 15], i * 3);
    seeds[i] = Math.random();
  }
  geometry.setAttribute('aOffset', new InstancedBufferAttribute(offsets, 3));
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
  geometry.instanceCount = count;
  const material = new ShaderMaterial({ uniforms, vertexShader: fleetVertex, fragmentShader: fleetFragment });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.visible = false;
  return {
    mesh,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

function seededPoints(count: number, position: (i: number) => [number, number, number]) {
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i += 1) {
    positions.set(position(i), i * 3);
    seeds[i] = Math.random();
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
  return geometry;
}

/** 화면 전체를 떠다니는 불티. 비행 중에는 태양 쪽에서 카메라 쪽으로 스쳐 지나갑니다. */
export function createEmbers(count: number, uTime: { value: number }) {
  const uniforms = { uTime, uHeat: { value: 0 }, uScale: { value: 300 }, uFlight: { value: 0 }, uMaxPoint: { value: 32 } };
  const geometry = seededPoints(count, () => [Math.random() * 26 - 13, Math.random() * 12 - 6, Math.random() * 12 - 7]);
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: emberVertex,
    fragmentShader: emberFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 2;
  return {
    points,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}

/** 불사조 날개 뒤로 흩날리는 불티 꼬리. 불사조가 있는 장면에 넣고, 몸에 가려지도록 깊이 검사를 합니다. */
export function createTrail(count: number, uTime: { value: number }, span: number) {
  const uniforms = {
    uTime,
    uIntensity: { value: 0 },
    uScale: { value: 300 },
    uMaxPoint: { value: 24 },
    uSpan: { value: span },
    uOrigin: { value: new Vector3() },
    uBack: { value: new Vector3(0, 0.12, 1).normalize() },
    uRight: { value: new Vector3(1, 0, 0) },
    uUp: { value: new Vector3(0, 1, 0) },
  };
  const geometry = seededPoints(count, () => [0, 0, 0]);
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: trailVertex,
    fragmentShader: trailFragment,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  points.renderOrder = 1;
  points.visible = false;
  return {
    points,
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
