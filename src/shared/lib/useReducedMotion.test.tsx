import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useReducedMotion } from './useReducedMotion';

/** 설정을 바꿀 수 있는 matchMedia. 바꾸면 change 이벤트를 보냅니다. */
function mockMatchMedia(initial: boolean) {
  const media = new EventTarget();
  const state = { matches: initial };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() =>
      Object.assign(media, {
        get matches() {
          return state.matches;
        },
      }),
    ),
  );
  return (matches: boolean) => {
    state.matches = matches;
    media.dispatchEvent(new Event('change'));
  };
}

function Probe() {
  const reduced = useReducedMotion();
  return <p>{reduced === null ? '모름' : reduced ? '동작 줄이기' : '동작 그대로'}</p>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useReducedMotion', () => {
  it('사용자의 동작 줄이기 설정을 따르고, 설정을 바꾸면 다시 그린다', () => {
    const change = mockMatchMedia(false);
    const { unmount } = render(<Probe />);
    expect(screen.getByText('동작 그대로')).toBeInTheDocument();
    act(() => change(true));
    expect(screen.getByText('동작 줄이기')).toBeInTheDocument();
    unmount();
  });
});
