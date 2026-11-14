import { AnimationClip, AnimationMixer, Bone, Object3D, Quaternion, QuaternionKeyframeTrack, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { measureWingbeat, sampleLoop } from './bird';

/** 어깨가 z축으로 -30° → +30° → -30° 도는 1초짜리 날갯짓(날개 끝은 아래 → 위 → 아래). */
function flappingWing() {
  const root = new Object3D();
  const shoulder = new Bone();
  shoulder.name = 'shoulder';
  const tip = new Bone();
  tip.position.set(3, 0, 0);
  shoulder.add(tip);
  root.add(shoulder);
  const turn = (degrees: number) =>
    new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (degrees * Math.PI) / 180).toArray();
  const track = new QuaternionKeyframeTrack('shoulder.quaternion', [0, 0.5, 1], [...turn(-30), ...turn(30), ...turn(-30)]);
  const mixer = new AnimationMixer(root);
  const action = mixer.clipAction(new AnimationClip('flap', 1, [track])).play();
  return { root, mixer, action };
}

describe('measureWingbeat', () => {
  it('몸에서 가장 먼 뼈의 높이를 한 주기 동안 재어 -1~1로 맞춘다', () => {
    const { root, mixer } = flappingWing();
    const heights = measureWingbeat(root, mixer, 1, 8);
    expect(heights).not.toBeNull();
    expect(heights?.[0]).toBeCloseTo(-1);
    expect(heights?.[4]).toBeCloseTo(1);
    expect(heights?.[2]).toBeCloseTo(0, 1);
  });

  it('잰 뒤에는 애니메이션을 처음으로 되돌린다', () => {
    const { root, mixer, action } = flappingWing();
    measureWingbeat(root, mixer, 1, 8);
    expect(action.time).toBe(0);
  });

  it('뼈나 애니메이션이 없으면 재지 않는다', () => {
    const { mixer } = flappingWing();
    expect(measureWingbeat(new Object3D(), mixer, 1)).toBeNull();
    const { root } = flappingWing();
    expect(measureWingbeat(root, mixer, 0)).toBeNull();
  });
});

describe('sampleLoop', () => {
  it('표본 사이를 잇고, 한 바퀴를 넘거나 음수여도 이어진다', () => {
    const values = Float32Array.from([0, 1, 0, -1]);
    expect(sampleLoop(values, 0.25)).toBeCloseTo(1);
    expect(sampleLoop(values, 0.125)).toBeCloseTo(0.5);
    expect(sampleLoop(values, 0.875)).toBeCloseTo(-0.5);
    expect(sampleLoop(values, 1.25)).toBeCloseTo(1);
    expect(sampleLoop(values, -0.75)).toBeCloseTo(1);
  });
});
