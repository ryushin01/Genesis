import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IntroExperience } from './IntroExperience';

const setPaused = vi.fn();
const stop = vi.fn();

vi.mock('../lib/createPhoenixScene', () => ({
  createPhoenixScene: () => ({ setProgress: vi.fn(), setPointer: vi.fn(), setPaused, stop, dispose: vi.fn() }),
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
    stop.mockClear();
    window.scrollTo = vi.fn();
  });

  it('동작 줄이기에서는 정지 장면과 결말 이미지를 꾸밈으로 보이고, 장면을 띄우면 보이지 않는다', () => {
    stubReducedMotion(true);
    const { container, unmount } = render(<IntroExperience />);
    const stills = container.querySelectorAll('[data-still]');
    expect([...stills].map((still) => still.getAttribute('data-still'))).toEqual(['flight', 'finale']);
    stills.forEach((still) => expect(still).toHaveAttribute('aria-hidden', 'true'));
    unmount();

    stubReducedMotion(false);
    const motion = render(<IntroExperience />);
    expect(motion.container.querySelectorAll('[data-still]')).toHaveLength(0);
  });

  it('머리글 로고는 화면 크기(40px)와 같은 그림을 1배 화면에 써서 줄여 그리지 않는다', () => {
    stubReducedMotion(true);
    render(<IntroExperience />);
    const logo = screen.getByRole('img', { name: 'project zero' });
    expect(logo).toHaveAttribute('width', '40');
    expect(logo.getAttribute('srcset')).toContain('/brand/logo-40.webp 1x');
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

    // 정지 버튼을 누를 때의 호출과 섞이지 않게, 새 장면이 받는 호출만 봅니다.
    setPaused.mockClear();
    act(() => setReducedMotion(false));
    expect(container.firstElementChild).toHaveAttribute('data-scene', 'loading');
    expect(screen.getByRole('status')).toHaveTextContent('불사조를 깨우는 중');
    expect(screen.queryByRole('button')).toBeNull();

    await screen.findByRole('button', { name: '배경 애니메이션 재생' });
    expect(setPaused).toHaveBeenCalledTimes(1);
    expect(setPaused).toHaveBeenCalledWith(true);
  });

  it('메인 링크에 키보드 초점이 오면 맨 아래로 이동한다', async () => {
    stubReducedMotion(true);
    render(<IntroExperience />);
    screen.getByRole('link', { name: '메인으로 들어가기' }).focus();
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it('메인으로 들어가는 링크를 누르면 화면이 바뀌기 전에 장면 그리기부터 멈춘다', async () => {
    // GPU 없이 그리는 느린 기기에서는 장면이 메인 스레드를 차지해, 그리기를 멈추지 않으면 화면 전환이 몇 초씩 늦어집니다.
    stubReducedMotion(false);
    render(<IntroExperience />);
    await screen.findByRole('button', { name: '배경 애니메이션 정지' });
    const enter = screen.getByRole('link', { name: '메인으로 들어가기' });
    // 이동은 막고(시험 환경에는 라우터가 없음) 누른 순간의 동작만 봅니다.
    enter.addEventListener('click', (event) => event.preventDefault());

    // 새 탭으로 여는 클릭은 이 화면에 남으므로 멈추지 않습니다.
    fireEvent.click(enter, { ctrlKey: true });
    expect(stop).not.toHaveBeenCalled();
    fireEvent.click(enter);
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
