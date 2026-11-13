import type { Material, Object3D, Texture } from 'three';

interface Disposable {
  dispose(): void;
}

/**
 * 장면이 만든 GPU 자원을 모아 두었다가 한 번에, 만든 순서의 반대로 놓아 줍니다.
 * 이미 해제된 뒤에 들어온 자원(늦게 끝난 로딩 등)은 바로 놓아 줍니다.
 */
export function createDisposer() {
  const tasks: Array<() => void> = [];
  let disposed = false;
  const add = (task: () => void) => {
    if (disposed) task();
    else tasks.push(task);
  };
  return {
    get disposed() {
      return disposed;
    },
    add,
    track<T extends Disposable>(item: T): T {
      add(() => item.dispose());
      return item;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (let i = tasks.length - 1; i >= 0; i -= 1) tasks[i]();
      tasks.length = 0;
    },
  };
}

export type Disposer = ReturnType<typeof createDisposer>;

const isTexture = (value: unknown): value is Texture =>
  typeof value === 'object' && value !== null && (value as Texture).isTexture === true;

/** 오브젝트 아래 모든 메시·점의 지오메트리와 재질, 재질이 쓰는 텍스처를 놓아 줍니다. */
export function disposeObject(root: Object3D) {
  const materials = new Set<Material>();
  root.traverse((object) => {
    const drawable = object as Object3D & { geometry?: { dispose(): void }; material?: Material | Material[] };
    drawable.geometry?.dispose();
    const material = drawable.material;
    if (Array.isArray(material)) material.forEach((item) => materials.add(item));
    else if (material) materials.add(material);
  });
  materials.forEach((material) => {
    Object.values(material).forEach((value) => {
      if (!isTexture(value)) return;
      const image: unknown = value.image;
      value.dispose();
      // 디코딩된 이미지는 GC를 기다리지 않고 바로 놓아 줍니다(여러 재질이 함께 써도 두 번 닫아도 됩니다).
      if (typeof ImageBitmap !== 'undefined' && image instanceof ImageBitmap) image.close();
    });
    material.dispose();
  });
}
