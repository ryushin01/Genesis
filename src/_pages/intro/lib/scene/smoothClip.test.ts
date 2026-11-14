import {
  AnimationClip,
  Bone,
  Object3D,
  Quaternion,
  QuaternionKeyframeTrack,
  QuaternionLinearInterpolant,
  Vector3,
  VectorKeyframeTrack,
} from 'three';
import { describe, expect, it } from 'vitest';
import { smoothLoopClip } from './smoothClip';

const turn = (degrees: number) => new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), (degrees * Math.PI) / 180);
const keys = (degrees: number[]) => degrees.flatMap((d) => turn(d).toArray());

function rig() {
  const root = new Object3D();
  const bone = new Bone();
  bone.name = 'wing';
  root.add(bone);
  return { root, bone };
}

/** 재생할 때처럼 선형 보간한 z축 회전각(도, 부호 있음). */
const angleAt = (track: QuaternionKeyframeTrack, time: number) => {
  const value = new QuaternionLinearInterpolant(track.times, track.values, 4, new Float32Array(4)).evaluate(time);
  return (2 * Math.atan2(value[2], value[3]) * 180) / Math.PI;
};

describe('smoothLoopClip', () => {
  it('처음과 끝 자세가 다르면 끝을 처음에 맞춰 반복할 때 튀지 않게 한다', () => {
    const { root } = rig();
    const clip = new AnimationClip('flap', 0.7, [new QuaternionKeyframeTrack('wing.quaternion', [0, 0.35, 0.7], keys([0, 60, 20]))]);
    const track = smoothLoopClip(clip, root, { strokeEase: 0 }).tracks[0] as QuaternionKeyframeTrack;
    const first = new Quaternion().fromArray(track.values, 0);
    const last = new Quaternion().fromArray(track.values, track.values.length - 4);
    expect(first.angleTo(last)).toBeLessThan(1e-4);
    // 보정 구간 밖의 키는 그대로 지납니다.
    expect(angleAt(track, 0.35)).toBeCloseTo(60, 1);
  });

  it('키마다 꺾이던 움직임을 곡선으로 이어 각속도가 갑자기 바뀌지 않게 한다', () => {
    const { root } = rig();
    const times = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7];
    const original = new QuaternionKeyframeTrack('wing.quaternion', times, keys([0, 40, 80, 40, 0, -40, -80, 0]));
    const smooth = smoothLoopClip(new AnimationClip('flap', 0.7, [original]), root, { strokeEase: 0 })
      .tracks[0] as QuaternionKeyframeTrack;
    const largestJump = (track: QuaternionKeyframeTrack) => {
      const dt = 1 / 240;
      let previous = 0;
      let jump = 0;
      for (let i = 1; i < 0.7 / dt; i += 1) {
        const speed = (angleAt(track, i * dt) - angleAt(track, (i - 1) * dt)) / dt;
        if (i > 1) jump = Math.max(jump, Math.abs(speed - previous));
        previous = speed;
      }
      return jump;
    };
    expect(largestJump(smooth)).toBeLessThan(largestJump(original) / 4);
  });

  it('위치·크기 트랙도 이음매를 맞춘다', () => {
    const { root } = rig();
    const clip = new AnimationClip('flap', 1, [new VectorKeyframeTrack('wing.scale', [0, 0.5, 1], [1, 1, 1, 2, 2, 2, 1.5, 1.5, 1.5])]);
    const track = smoothLoopClip(clip, root).tracks[0];
    expect(Array.from(track.values.slice(-3))).toEqual(Array.from(track.values.slice(0, 3)));
  });

  it('변하지 않는 트랙은 노드에 한 번 적용하고 클립에서 뺀다', () => {
    const { root, bone } = rig();
    const clip = new AnimationClip('flap', 1, [
      new VectorKeyframeTrack('wing.position', [0, 0.5, 1], [1, 2, 3, 1, 2, 3, 1, 2, 3]),
      new QuaternionKeyframeTrack('wing.quaternion', [0, 0.5, 1], keys([0, 30, 0])),
    ]);
    const smooth = smoothLoopClip(clip, root);
    expect(smooth.tracks.map((track) => track.name)).toEqual(['wing.quaternion']);
    expect(bone.position.toArray()).toEqual([1, 2, 3]);
  });

  it('한 번에 크게 휘두르는 순간을 늦추고, 주기 길이와 반복 이음매는 그대로 둔다', () => {
    const { root } = rig();
    // 0.6~0.65초에 90°를 휘두르는 날갯짓
    const times = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.65, 0.7];
    const clip = new AnimationClip('flap', 0.7, [new QuaternionKeyframeTrack('wing.quaternion', times, keys([0, 5, 10, 15, 20, 25, 30, -60, 0]))]);
    const peak = (track: QuaternionKeyframeTrack) => {
      const dt = 1 / 480;
      let fastest = 0;
      for (let i = 1; i * dt <= 0.7; i += 1) fastest = Math.max(fastest, Math.abs(angleAt(track, i * dt) - angleAt(track, (i - 1) * dt)) / dt);
      return fastest;
    };
    const plain = smoothLoopClip(clip, root, { strokeEase: 0 });
    const eased = smoothLoopClip(clip, root, { strokeEase: 0.6 });
    const track = eased.tracks[0] as QuaternionKeyframeTrack;
    expect(eased.duration).toBe(0.7);
    expect(peak(track)).toBeLessThan(peak(plain.tracks[0] as QuaternionKeyframeTrack) * 0.6);
    const first = new Quaternion().fromArray(track.values, 0);
    const last = new Quaternion().fromArray(track.values, track.values.length - 4);
    expect(first.angleTo(last)).toBeLessThan(1e-4);
  });

  it('고르게 도는 움직임은 시간을 바꾸지 않는다', () => {
    const { root } = rig();
    const times = [0, 0.25, 0.5, 0.75, 1];
    const clip = new AnimationClip('spin', 1, [new QuaternionKeyframeTrack('wing.quaternion', times, keys([0, 30, 60, 30, 0]))]);
    const plain = smoothLoopClip(clip, root, { strokeEase: 0 }).tracks[0] as QuaternionKeyframeTrack;
    const eased = smoothLoopClip(clip, root, { strokeEase: 0.6 }).tracks[0] as QuaternionKeyframeTrack;
    for (const time of [0.1, 0.4, 0.8]) expect(Math.abs(angleAt(eased, time) - angleAt(plain, time))).toBeLessThan(4);
  });

  it('사원수가 반구를 넘는 이웃(0→100→200°)에서도 키 앞뒤 각속도가 이어진다', () => {
    const { root } = rig();
    const times = [0, 0.25, 0.5, 0.75, 1];
    const clip = new AnimationClip('swing', 1, [new QuaternionKeyframeTrack('wing.quaternion', times, keys([0, 100, 200, 100, 0]))]);
    const track = smoothLoopClip(clip, root, { strokeEase: 0 }).tracks[0] as QuaternionKeyframeTrack;
    const interpolant = new QuaternionLinearInterpolant(track.times, track.values, 4, new Float32Array(4));
    const at = (time: number) => new Quaternion().fromArray(Array.from(interpolant.evaluate(time)));
    // 부호와 상관없는 각(angleTo)으로 잽니다. 100° 키(0.25초) 앞뒤의 각속도가 같아야 합니다.
    const speed = (time: number, dt = 1 / 480) => (at(time).angleTo(at(time + dt)) * 180) / Math.PI / dt;
    const before = speed(0.24);
    const after = speed(0.26);
    expect(before).toBeGreaterThan(100);
    expect(Math.abs(after - before)).toBeLessThan(before * 0.05);
  });
});
