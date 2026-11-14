import { Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, type Texture, Vector2 } from 'three';
import { backgroundFragment, backgroundVertex } from '../shaders';

/** 화면 전체를 칠하는 배경(하늘·우주·태양·폭발·빛 무리). 불사조 윤곽(mask)으로 뒤의 빛과 불길을 그립니다. */
export function createBackdrop(mask: Texture, shared: { uTime: { value: number }; uBurn: { value: number } }) {
  const uniforms = {
    uMaskTex: { value: mask },
    uMaskSize: { value: new Vector2(1, 1) },
    uMaskOn: { value: 1 },
    uRes: { value: new Vector2(1, 1) },
    uBird: { value: new Vector2(0.5, 0.5) },
    uTime: shared.uTime,
    uBurn: shared.uBurn,
    uSun: { value: 0 },
    uSunSize: { value: 0 },
    uSunX: { value: 0 },
    uCosmos: { value: 0 },
    uWar: { value: 0 },
    uNova: { value: 0 },
    uLogo: { value: 0 },
    uNovaAt: { value: new Vector2(0, 0) },
    uLogoAt: { value: new Vector2(0, 0) },
    uHeroAt: { value: new Vector2(0, 0) },
    uHeroGlow: { value: 0 },
    uShift: { value: new Vector2(0, 0) },
  };
  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: backgroundVertex,
    fragmentShader: backgroundFragment,
    depthTest: false,
    depthWrite: false,
  });
  const mesh = new Mesh(geometry, material);
  mesh.frustumCulled = false;
  const scene = new Scene();
  scene.add(mesh);
  return {
    scene,
    camera: new OrthographicCamera(-1, 1, 1, -1, 0, 1),
    uniforms,
    dispose() {
      geometry.dispose();
      material.dispose();
    },
  };
}
