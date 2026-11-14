/**
 * 목표 값을 부드럽게 따라가는 2차 추종기(임계 감쇠).
 *
 * 1차 지수 감쇠는 목표가 갑자기 바뀌면(마우스 휠 한 칸) 그 순간 속도가 튀어 덜컥거립니다.
 * 두 단계를 이어 붙이면 위치와 속도가 모두 이어지고, 목표가 일정한 구간에서는 정확한 해를 써서
 * 프레임 간격이 달라도(60Hz·120Hz, 프레임이 밀릴 때) 같은 궤적을 그립니다.
 */
export function createFollower(rate: number, initial = 0) {
  let value = initial;
  let middle = initial;
  return {
    get value() {
      return value;
    },
    /** dt초 동안 target을 향해 움직이고 새 값을 돌려줍니다. */
    step(target: number, dt: number) {
      const decay = Math.exp(-rate * dt);
      value = target + (value - target + rate * dt * (middle - target)) * decay;
      middle = target + (middle - target) * decay;
      return value;
    },
    /** 목표에 충분히 가까워 멈춰도 되는지. */
    settled(target: number, epsilon: number) {
      return Math.abs(target - value) < epsilon && Math.abs(target - middle) < epsilon;
    },
  };
}

export type Follower = ReturnType<typeof createFollower>;
