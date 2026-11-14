import { Box3, Color, Group, type Material, type Mesh, MeshLambertMaterial, type MeshStandardMaterial, Vector3 } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeObject } from './disposer';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** 깃털이 내려앉은 자리에 나타나는 불사조 로고. 색을 #8B0000 계열로 옮기고 빛을 받아 입체감이 나게 합니다. */
export function createLogo(gltf: GLTF) {
  const model = gltf.scene;
  const box = new Box3().setFromObject(model);
  const size = box.getSize(new Vector3());
  model.position.copy(box.getCenter(new Vector3())).multiplyScalar(-1);

  const materials: MeshLambertMaterial[] = [];
  const replaced: Material[] = [];
  model.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    const source = mesh.material as MeshStandardMaterial;
    replaced.push(source);
    const lum = Math.min(1, (source.color.r * 0.3 + source.color.g * 0.59 + source.color.b * 0.11) / 0.32);
    const color = new Color(lerp(0.3, 0.86, lum), lerp(0, 0.08, lum), lerp(0, 0.05, lum));
    const material = new MeshLambertMaterial({ color, emissive: color.clone().multiplyScalar(0.35), transparent: true, opacity: 0 });
    mesh.material = material;
    mesh.frustumCulled = false;
    materials.push(material);
  });
  // 원래 재질은 한 번도 그리지 않았으므로 바로 놓아 줍니다.
  replaced.forEach((material) => material.dispose());

  const group = new Group();
  group.add(model);
  group.renderOrder = 4;
  group.visible = false;
  const baseScale = 2.8 / Math.max(size.y, 1e-6);
  let lastAppear = -1;

  return {
    group,
    /** appear(0~1)만큼 돌며 커지면서 나타나고, 다 나타난 뒤에는 천천히 흔들립니다. */
    update(appear: number, time: number, y: number) {
      group.visible = appear > 0.001;
      if (!group.visible) return;
      group.scale.setScalar(baseScale * (0.4 + appear * 0.6));
      group.position.set(0, y, 0);
      group.rotation.y = (1 - appear) * 2.4 + Math.sin(time * 0.4) * 0.12;
      if (appear !== lastAppear) {
        lastAppear = appear;
        materials.forEach((material) => {
          material.opacity = appear;
        });
      }
    },
    dispose() {
      disposeObject(model);
    },
  };
}

export type Logo = ReturnType<typeof createLogo>;
