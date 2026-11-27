import { Group, Mesh, type ShaderMaterial } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { type BirdUniforms, createCrystalMaterial } from './bird';
import { disposeObject } from './disposer';

/**
 * 불사조가 변해 내려오는 결정 깃털(레퍼런스 feather.glb). 위치·자세·크기는 타임라인의 Feather 노드를 따르고,
 * 레퍼런스와 같이 위아래로 천천히 흔들리며 제 축으로 3초에 한 바퀴 돕니다. 불사조와 같은 진홍 결정 재질을 씁니다.
 */
export function createCrystalFeather(gltf: Pick<GLTF, 'scene'>, uniforms: BirdUniforms) {
  const model = gltf.scene;
  const material: ShaderMaterial = createCrystalMaterial(uniforms);
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    if (!Array.isArray(object.material)) object.material.dispose();
    object.material = material;
    object.frustumCulled = false;
  });
  const spin = new Group();
  spin.add(model);
  const group = new Group();
  group.add(spin);
  group.visible = false;
  return {
    group,
    uniforms,
    /** 타임라인 값을 넣은 뒤 부릅니다. time은 장면 시각(초)입니다. */
    update(time: number) {
      group.position.y += Math.sin(time) * 0.1;
      spin.rotation.y = (time * Math.PI * 2) / 3;
    },
    dispose() {
      material.dispose();
      disposeObject(model);
    },
  };
}

export type CrystalFeather = ReturnType<typeof createCrystalFeather>;
