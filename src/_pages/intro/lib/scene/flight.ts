import { AnimationMixer, LoopOnce, Object3D, Quaternion, Vector3 } from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

/** 타임라인 노드 하나의 값. 찾지 못한 노드는 원점·기본 자세로 둡니다. */
function nodeOf(root: Object3D, name: string) {
  return root.getObjectByName(name) ?? new Object3D();
}

/**
 * 레퍼런스의 Blender 타임라인(glTF 애니메이션)을 스크롤 시각으로 넘겨 읽습니다.
 * 레퍼런스와 같이 모든 클립을 멈춘 채 재생 위치만 옮기고(seek), 클립 길이보다 뒤의 시각은 마지막 값에 둡니다.
 *
 * 노드: Phoenix(불사조 위치·자세), Camera(카메라 위치), Target(카메라가 바라보는 점), Sun(태양 위치·크기),
 * Sun_opacity(x: 태양 밝기), Feather(내려오는 깃털), Phoenix_animationId(x: 날갯짓 클립 번호),
 * Camera_pointerInfluence(x: 포인터로 카메라를 돌리는 세기), Env_darkness(x: 우주가 어두워지는 정도).
 */
export function createFlight(gltf: GLTF) {
  const root = gltf.scene;
  const mixer = new AnimationMixer(root);
  const actions = gltf.animations.map((clip) => {
    const action = mixer.clipAction(clip);
    action.setLoop(LoopOnce, 1);
    action.clampWhenFinished = true;
    action.play();
    action.paused = true;
    return { action, duration: clip.duration };
  });
  const phoenix = nodeOf(root, 'Phoenix');
  const camera = nodeOf(root, 'Camera');
  const target = nodeOf(root, 'Target');
  const sun = nodeOf(root, 'Sun');
  const sunOpacity = nodeOf(root, 'Sun_opacity');
  const feather = nodeOf(root, 'Feather');
  const clipId = nodeOf(root, 'Phoenix_animationId');
  const pointer = nodeOf(root, 'Camera_pointerInfluence');
  const darkness = nodeOf(root, 'Env_darkness');

  const state = {
    phoenixPosition: new Vector3(),
    phoenixQuaternion: new Quaternion(),
    camera: new Vector3(),
    target: new Vector3(),
    sun: new Vector3(),
    sunScale: 1,
    sunOpacity: 1,
    featherPosition: new Vector3(),
    featherQuaternion: new Quaternion(),
    featherScale: 0,
    clipId: 0,
    pointerInfluence: 0,
    darkness: 0,
  };

  return {
    state,
    /** 타임라인을 time초로 옮기고 값을 state에 씁니다. */
    seek(time: number) {
      for (const { action, duration } of actions) {
        action.enabled = true;
        action.paused = true;
        action.time = Math.max(0, Math.min(time, duration));
      }
      mixer.update(0);
      state.phoenixPosition.copy(phoenix.position);
      state.phoenixQuaternion.copy(phoenix.quaternion);
      state.camera.copy(camera.position);
      state.target.copy(target.position);
      state.sun.copy(sun.position);
      state.sunScale = sun.scale.x;
      state.sunOpacity = Math.min(1, Math.max(0, sunOpacity.position.x));
      state.featherPosition.copy(feather.position);
      state.featherQuaternion.copy(feather.quaternion);
      state.featherScale = Math.max(0, feather.scale.x);
      state.clipId = Math.round(clipId.position.x);
      state.pointerInfluence = pointer.position.x;
      state.darkness = Math.min(1, Math.max(0, darkness.position.x));
      return state;
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(root);
    },
  };
}

export type Flight = ReturnType<typeof createFlight>;
export type FlightState = Flight['state'];
