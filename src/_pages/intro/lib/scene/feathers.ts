import {
  BufferAttribute,
  type BufferGeometry,
  DoubleSide,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  type Object3D,
  ShaderMaterial,
  Vector2,
  Vector3,
} from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { featherFragment, featherVertex } from '../shaders';
import { disposeObject } from './disposer';

/** 깃털 모델에서 이름이 같은 부품을 한 덩어리로 합칩니다. 밑동을 원점, 길이를 1로 맞춥니다(모델의 넓은 면은 원래 화면을 봅니다). */
export function extractFeather(root: Object3D, prefix: string) {
  root.updateMatrixWorld(true);
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const point = new Vector3();
  const direction = new Vector3();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh || !mesh.name.startsWith(prefix)) return;
    const position = mesh.geometry.getAttribute('position');
    const normal = mesh.geometry.getAttribute('normal');
    const index = mesh.geometry.getIndex();
    const offset = positions.length / 3;
    for (let i = 0; i < position.count; i += 1) {
      point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld);
      direction.fromBufferAttribute(normal, i).transformDirection(mesh.matrixWorld);
      positions.push(point.x, point.y, point.z);
      normals.push(direction.x, direction.y, direction.z);
    }
    if (index) for (let i = 0; i < index.count; i += 1) indices.push(index.getX(i) + offset);
  });
  if (positions.length === 0) throw new Error(`깃털 부품을 찾지 못했습니다: ${prefix}`);
  let minY = Infinity;
  let maxY = -Infinity;
  let sumX = 0;
  let sumZ = 0;
  for (let i = 0; i < positions.length; i += 3) {
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
    sumX += positions[i];
    sumZ += positions[i + 2];
  }
  const count = positions.length / 3;
  const length = maxY - minY || 1;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i] = (positions[i] - sumX / count) / length;
    positions[i + 1] = (positions[i + 1] - minY) / length;
    positions[i + 2] = (positions[i + 2] - sumZ / count) / length;
  }
  const geometry = new InstancedBufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(normals), 3));
  geometry.setIndex(indices);
  return geometry;
}

/** 같은 깃털 모양을 여러 장 그리도록 인스턴스 속성을 붙인 지오메트리를 만듭니다(모양 버퍼는 함께 씁니다). */
function instances(shape: BufferGeometry, seeds: number[], hero: boolean) {
  const geometry = new InstancedBufferGeometry();
  geometry.setIndex(shape.getIndex());
  geometry.setAttribute('position', shape.getAttribute('position'));
  geometry.setAttribute('normal', shape.getAttribute('normal'));
  geometry.setAttribute('aSeed', new InstancedBufferAttribute(Float32Array.from(seeds), 1));
  geometry.setAttribute('aHero', new InstancedBufferAttribute(Float32Array.from(seeds, () => (hero ? 1 : 0)), 1));
  geometry.instanceCount = seeds.length;
  return geometry;
}

/** 태양에서 터진 뒤 흩어지는 작은 깃털들과, 가운데로 내려오는 큰 깃털 하나. 서로 따로 그려 보이지 않을 때는 건너뜁니다. */
export function createFeathers(gltf: GLTF, options: { count: number; uTime: { value: number } }) {
  const uniforms = {
    uTime: options.uTime,
    uFall: { value: 0 },
    uLogo: { value: 0 },
    uHeroRoll: { value: 0 },
    uSun: { value: new Vector2(0, 2) },
    uHeroAt: { value: new Vector2(0, 2) },
    uLogoAt: { value: new Vector2(0, 0.35) },
    uAspect: { value: 1 },
  };
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: featherVertex,
    fragmentShader: featherFragment,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
  });
  const shapes = [extractFeather(gltf.scene, 'feather_a'), extractFeather(gltf.scene, 'feather_b')];
  // 원본 모델은 그리지 않으므로 모양만 뽑아낸 뒤 바로 놓아 줍니다.
  disposeObject(gltf.scene);

  const seedsOf = (variant: number) => {
    const seeds: number[] = [];
    for (let i = 1 + variant; i < options.count; i += 2) seeds.push((i * 0.61803398875) % 1);
    return seeds;
  };
  const geometries = [instances(shapes[0], seedsOf(0), false), instances(shapes[1], seedsOf(1), false), instances(shapes[0], [0], true)];
  const meshes = geometries.map((geometry) => {
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    mesh.renderOrder = 3;
    mesh.visible = false;
    return mesh;
  });
  const [smallA, smallB, hero] = meshes;

  return {
    meshes,
    uniforms,
    /** 진행 값에 따라 보이는 깃털만 그리게 합니다. */
    setVisibility(fall: number, logo: number) {
      const small = fall > 0 && fall < 0.62;
      smallA.visible = small;
      smallB.visible = small;
      hero.visible = fall > 0 && logo < 0.72;
    },
    dispose() {
      geometries.forEach((geometry) => geometry.dispose());
      shapes.forEach((shape) => shape.dispose());
      material.dispose();
    },
  };
}

export type Feathers = ReturnType<typeof createFeathers>;
