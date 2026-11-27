import { Texture, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { createSky } from './sky';

describe('createSky', () => {
  it('장면의 시간·불길·색 보정 값을 그대로 함께 보고, 화면 전체를 덮는 사각형 하나를 깊이 없이 그린다', () => {
    const shared = {
      uTime: { value: 1 },
      uBurn: { value: 0 },
      uShadow: { value: new Vector3() },
      uHighlight: { value: new Vector3(1, 1, 1) },
      uSaturation: { value: 1 },
      uExposure: { value: 1 },
    };
    const mask = new Texture();
    const sky = createSky(mask, shared);
    expect(sky.uniforms.uTime).toBe(shared.uTime);
    expect(sky.uniforms.uHighlight).toBe(shared.uHighlight);
    expect(sky.uniforms.uMaskTex.value).toBe(mask);
    expect(sky.scene.children).toHaveLength(1);
    expect(sky.camera.isOrthographicCamera).toBe(true);
    sky.dispose();
  });
});
