import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NotFoundPage } from './NotFoundPage';

describe('NotFoundPage', () => {
  it('없는 페이지임을 알리고 메인과 인트로로 가는 링크를 준다', () => {
    render(<NotFoundPage />);
    expect(screen.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '메인으로 가기' })).toHaveAttribute('href', '/main');
    expect(screen.getByRole('link', { name: '인트로 보기' })).toHaveAttribute('href', '/');
  });
});
