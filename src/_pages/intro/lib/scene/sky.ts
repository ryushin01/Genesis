import { Matrix3, Mesh, OrthographicCamera, PlaneGeometry, Scene, ShaderMaterial, type Texture, Vector2, type Vector3 } from 'three';
import { skyFragment, skyVertex } from '../shaders';

/** 색 보정 값(장면 전체가 함께 봄). */
export interface GradeUniforms {
  uShadow: { value: Vector3 };
  uHighlight: { value: Vector3 };
  uSaturation: { value: number };
  uExposure: { value: number };
}

/**
 * 화면 전체를 칠하는 우주 배경(먼 별·은하수·성운·먼 은하·태양·폭발·깃털 빛·로고 잔광).
 * 화소마다 카메라 방향으로 시선을 만들므로 카메라의 회전(uCamRot)과 시야(uTan)를 매 프레임 넣습니다.
 * 불사조 윤곽(mask)으로 뒤의 빛과 불길을 그립니다.
 */
export function createSky(mask: Texture, shared: { uTime: { value: number }; uBurn: { value: number } } & GradeUniforms) {
  const uniforms = {
    uMaskTex: { value: mask },
    uMaskSize: { value: new Vector2(1, 1) },
    uMaskOn: { value: 1 },
    uRes: { value: new Vector2(1, 1) },
    uTan: { value: new Vector2(0.3, 0.2) },
    uCamRot: { value: new Matrix3() },
    uBird: { value: new Vector2(0.5, 0.5) },
    uTime: shared.uTime,
    uBurn: shared.uBurn,
    uShadow: shared.uShadow,
    uHighlight: shared.uHighlight,
    uSaturation: shared.uSaturation,
    uExposure: shared.uExposure,
    uSunOn: { value: 0 },
    uSunR: { value: 0.05 },
    uSunAt: { value: new Vector2(0, 0.25) },
    uCosmos: { value: 0 },
    uWar: { value: 0 },
    uNova: { value: 0 },
    uDark: { value: 0 },
    uLogo: { value: 0 },
    uNovaAt: { value: new Vector2(0, 0) },
    uLogoAt: { value: new Vector2(0, 0) },
    uFeatherAt: { value: new Vector2(0, 0) },
    uFeatherGlow: { value: 0 },
    uShift: { value: new Vector2(0, 0) },
  };
  const geometry = new PlaneGeometry(2, 2);
  const material = new ShaderMaterial({
    uniforms,
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
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
