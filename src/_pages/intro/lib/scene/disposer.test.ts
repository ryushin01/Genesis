import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Texture } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createDisposer, disposeObject } from './disposer';

describe('createDisposer', () => {
  it('만든 순서의 반대로 한 번만 놓아 준다', () => {
    const order: string[] = [];
    const disposer = createDisposer();
    disposer.track({ dispose: () => order.push('a') });
    disposer.add(() => order.push('b'));
    disposer.dispose();
    disposer.dispose();
    expect(order).toEqual(['b', 'a']);
    expect(disposer.disposed).toBe(true);
  });

  it('해제된 뒤에 들어온 자원은 바로 놓아 준다', () => {
    const disposer = createDisposer();
    disposer.dispose();
    const late = { dispose: vi.fn() };
    disposer.track(late);
    expect(late.dispose).toHaveBeenCalledTimes(1);
  });
});

describe('disposeObject', () => {
  it('지오메트리, 재질, 재질의 텍스처를 모두 놓아 준다', () => {
    const geometry = new BoxGeometry();
    const map = new Texture();
    const material = new MeshBasicMaterial({ map });
    const root = new Group();
    root.add(new Mesh(geometry, material), new Mesh(geometry, material));
    const disposed = { geometry: 0, material: 0, map: 0 };
    geometry.addEventListener('dispose', () => (disposed.geometry += 1));
    material.addEventListener('dispose', () => (disposed.material += 1));
    map.addEventListener('dispose', () => (disposed.map += 1));
    disposeObject(root);
    expect(disposed.geometry).toBeGreaterThanOrEqual(1);
    expect(disposed.material).toBe(1);
    expect(disposed.map).toBe(1);
  });

  it('텍스처가 쓰던 디코딩된 이미지(ImageBitmap)를 바로 닫는다', () => {
    class FakeBitmap {
      closed = 0;
      close() {
        this.closed += 1;
      }
    }
    vi.stubGlobal('ImageBitmap', FakeBitmap);
    try {
      const bitmap = new FakeBitmap();
      const map = new Texture(bitmap as unknown as ImageBitmap);
      // 두 재질이 같은 텍스처를 함께 써도 문제없이 닫힙니다.
      const root = new Group();
      root.add(new Mesh(new BoxGeometry(), new MeshBasicMaterial({ map })), new Mesh(new BoxGeometry(), new MeshBasicMaterial({ map })));
      disposeObject(root);
      expect(bitmap.closed).toBeGreaterThanOrEqual(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
