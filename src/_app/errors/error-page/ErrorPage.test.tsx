import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorPage } from './ErrorPage';

const monitoring = vi.hoisted(() => ({ reportError: vi.fn() }));
vi.mock('../../monitoring', () => monitoring);

describe('ErrorPage', () => {
  it('오류를 보고하고, 다시 시도하거나 메인으로 갈 수 있다', async () => {
    const user = userEvent.setup();
    const error = new Error('그리기 실패');
    const retry = vi.fn();
    render(<ErrorPage error={error} retry={retry} />);

    expect(monitoring.reportError).toHaveBeenCalledWith(error);
    expect(screen.getByRole('heading', { level: 1, name: '화면을 그리지 못했습니다' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '메인으로 가기' })).toHaveAttribute('href', '/main');

    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
