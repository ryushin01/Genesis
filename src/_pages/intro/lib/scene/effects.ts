import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  Points,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import {
  cometFragment,
  cometVertex,
  emberFragment,
  emberVertex,
  meteorFragment,
  meteorVertex,
  trailFragment,
  trailVertex,
} from '../shaders';

type SkyUniforms = Record<string, { value: unknown }>;

/**
 * 전쟁 장면에 쏟아지는 유성우(유성과 혜성). 배경과 함께 불사조보다 먼저 그려, 불사조 뒤의 하늘을 지나갑니다.
 * 꼭짓점 셰이더가 배경 셰이더와 같은 화면 단위에서 바로 화면 좌표를 내므로 카메라와 상관없습니다.
 * 화면 비율(uAspect)과 CSS 한 픽셀의 크기(uPixel)는 화면 크기가 바뀔 때, 태양 자리(uSun)와 흔들림(uShift)은 매 프레임 넣습니다.
 */
export function createMeteorShower(meteorCount: number, cometCount: number, uTime: { value: number }) {
  const uniforms = {
    uTime,
    uIntensity: { value: 0 },
    uAspect: { value: 1.6 },
    uPixel: { value: 1 / 900 },
    uShift: { value: new Vector2() },
    uSun: { value: new Vector2(0, 0.24) },
  };
  const meteors = createSkyQuads(meteorCount, uniforms, meteorVertex, meteorFragment);
  const comets = createSkyQuads(cometCount, uniforms, cometVertex, cometFragment);
  const group = new Group().add(meteors.mesh, comets.mesh);
  group.visible = false;
  return {
    group,
    uniforms,
    dispose() {
      meteors.dispose();
      comets.dispose();
    },
  };
}

/**
 * 하늘에 얹는 사각형 묶음. 사각형의 x는 머리(0)에서 꼬리 끝(1)까지, y는 폭 방향(-1~1)이고, 크기와 방향은 셰이더가 정합니다.
 * 깊이 대신 그리는 순서로 앞뒤를 정하고(배경 다음, 불사조 앞), 빛이라 더하기로 섞습니다.
 */
function createSkyQuads(count: number, uniforms: SkyUniforms, vertexShader: string, fragmentShader: string) {
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  geometry.setAttribute('position', new BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 0, 1, 0, 1, 1, 0]), 3));
  // 씨앗을 고르게 나눠 여러 개가 같은 때·같은 자리에 몰리지 않게 합니다.
  const seeds = Float32Array.from({ length: count }, (_, i) => (i + Math.random()) / count);
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(seeds, 1));
  geometry.instanceCount = count;
  const material = new ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    // 유성은 사각형을 진행 방향의 반대로(꼬리 쪽으로) 펼쳐 감김 방향이 뒤집히므로, 뒷면도 그립니다.
    side: DoubleSide,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = 1;
  return {
    mesh,
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
