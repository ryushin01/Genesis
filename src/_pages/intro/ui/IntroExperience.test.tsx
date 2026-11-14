import { render, screen, waitFor } from '@testing-library/react';
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

  it('장면을 다 불러오면 로딩 표시가 사라진다', async () => {
    stubReducedMotion(false);
    render(<IntroExperience />);
    await screen.findByRole('button', { name: '배경 애니메이션 정지' });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('메인 링크에 키보드 초점이 오면 맨 아래로 이동한다', async () => {
    stubReducedMotion(true);
    render(<IntroExperience />);
    screen.getByRole('link', { name: '메인으로 들어가기' }).focus();
    expect(window.scrollTo).toHaveBeenCalled();
  });
});
