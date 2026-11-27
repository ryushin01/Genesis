import { BoxGeometry, Group, Mesh, MeshLambertMaterial, MeshStandardMaterial } from 'three';
import { describe, expect, it } from 'vitest';
import { createLogo } from './logo';

function fakeLogo() {
  return { scene: new Group().add(new Mesh(new BoxGeometry(1, 2, 0.2), new MeshStandardMaterial({ color: 0xffffff }))) };
}

describe('createLogo', () => {
  it('나타나기 전에는 숨겨 두고, 깃털이 내려앉은 자리(x, y)에서 투명도를 올리며 나타난다', () => {
    const logo = createLogo(fakeLogo());
    logo.update(0, 0, 1, 2);
    expect(logo.group.visible).toBe(false);
    logo.update(0.5, 0, 1, 2);
    expect(logo.group.visible).toBe(true);
    expect(logo.group.position.x).toBe(1);
    expect(logo.group.position.y).toBe(2);
    const materials: MeshLambertMaterial[] = [];
    logo.group.traverse((object) => {
      if (object instanceof Mesh && object.material instanceof MeshLambertMaterial) materials.push(object.material);
    });
    expect(materials).toHaveLength(1);
    expect(materials[0].opacity).toBe(0.5);
    logo.dispose();
  });

  it('다 나타나면 크기가 가장 크다', () => {
    const logo = createLogo(fakeLogo());
    logo.update(0.2, 0, 0, 0);
    const small = logo.group.scale.x;
    logo.update(1, 0, 0, 0);
    expect(logo.group.scale.x).toBeGreaterThan(small);
    logo.dispose();
  });
});
