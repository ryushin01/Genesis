import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntroExperience } from './IntroExperience';

const setPaused = vi.fn();

vi.mock('../lib/createPhoenixScene', () => ({
  createPhoenixScene: () => ({ setProgress: vi.fn(), setPointer: vi.fn(), setPaused, dispose: vi.fn() }),
}));

function stubReducedMotion(reduce: boolean) {
  vi.stubGlobal('matchMedia', () => ({
    matches: reduce,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

/** 페이지를 연 채로 운영체제의 동작 줄이기를 바꾸는 상황. 돌려받은 함수로 설정을 바꿉니다. */
function stubChangingReducedMotion(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', () => ({
    get matches() {
      return matches;
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return (reduce: boolean) => {
    matches = reduce;
    listeners.forEach((listener) => listener());
  };
}

describe('IntroExperience', () => {
  beforeEach(() => {
    setPaused.mockClear();
    window.scrollTo = vi.fn();
  });

  it('메인으로 가는 링크는 이야기 마지막에 하나만 있다', () => {
    stubReducedMotion(true);
    render(<IntroExperience />);
    const link = screen.getByRole('link', { name: '메인으로 들어가기' });
    expect(link).toHaveAttribute('href', '/main');
    const toMain = screen.getAllByRole('link').filter((a) => a.getAttribute('href') === '/main');
    expect(toMain).toHaveLength(1);
    // 3D 모델·아이콘 출처는 화면이 아니라 README에 있고, 여기서는 그곳으로 잇습니다.
    expect(screen.getByRole('link', { name: '3D 모델·아이콘 출처 (README)' })).toHaveAttribute(
      'href',
      'https://github.com/ryushin01/Genesis#출처',
    );
    const headings = screen.getAllByRole('heading');
    expect(headings.at(-1)?.compareDocumentPosition(link)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('동작 줄이기를 쓰면 장면을 띄우지 않는다', () => {
    stubReducedMotion(true);
    const { container } = render(<IntroExperience />);
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('배경 애니메이션을 정지하고 다시 재생할 수 있다', async () => {
    stubReducedMotion(false);
    const user = userEvent.setup();
    render(<IntroExperience />);
    const pause = await screen.findByRole('button', { name: '배경 애니메이션 정지' });
    await user.click(pause);
    expect(setPaused).toHaveBeenLastCalledWith(true);
    await user.click(screen.getByRole('button', { name: '배경 애니메이션 재생' }));
    await waitFor(() => expect(setPaused).toHaveBeenLastCalledWith(false));
  });

  it('장면을 불러오는 동안 처음부터 있던 상태 영역이 알리고, 다 불러오면 비운다', async () => {
    stubReducedMotion(false);
    render(<IntroExperience />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('불사조를 깨우는 중');
    await screen.findByRole('button', { name: '배경 애니메이션 정지' });
    expect(screen.getByRole('status')).toBe(status);
    expect(status).toBeEmptyDOMElement();
  });

  it('정지 버튼은 이야기의 링크보다 먼저 키보드 초점을 받고, 정지하면 화면의 애니메이션도 멈춘다', async () => {
    stubReducedMotion(false);
    const user = userEvent.setup();
    const { container } = render(<IntroExperience />);
    const pause = await screen.findByRole('button', { name: '배경 애니메이션 정지' });
    const enter = screen.getByRole('link', { name: '메인으로 들어가기' });
    expect(pause.compareDocumentPosition(enter) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    await user.click(pause);
    expect(container.firstElementChild).toHaveAttribute('data-paused', 'true');
  });

  it('동작 줄이기를 켰다 끄면 로딩 화면부터 다시 보이고, 정지 상태를 새 장면에 넘긴다', async () => {
    const setReducedMotion = stubChangingReducedMotion(false);
    const user = userEvent.setup();
    const { container } = render(<IntroExperience />);
    await user.click(await screen.findByRole('button', { name: '배경 애니메이션 정지' }));

    act(() => setReducedMotion(true));
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();

    act(() => setReducedMotion(false));
    expect(container.firstElementChild).toHaveAttribute('data-scene', 'loading');
    expect(screen.getByRole('status')).toHaveTextContent('불사조를 깨우는 중');
    expect(screen.queryByRole('button')).toBeNull();

    await screen.findByRole('button', { name: '배경 애니메이션 재생' });
    expect(setPaused).toHaveBeenLastCalledWith(true);
  });

  it('메인 링크에 키보드 초점이 오면 맨 아래로 이동한다', async () => {
    stubReducedMotion(true);
    render(<IntroExperience />);
    screen.getByRole('link', { name: '메인으로 들어가기' }).focus();
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
