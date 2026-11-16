import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { NoticeScreen } from './NoticeScreen';

describe('NoticeScreen', () => {
  it('제목을 1단계 제목으로, 큰 장식 글자는 보조기기에서 숨겨 보여 준다', () => {
    render(
      <NoticeScreen label="Not found" mark="404" title="페이지를 찾을 수 없습니다" description="설명">
        <a href="/main">메인으로 가기</a>
      </NoticeScreen>,
    );
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' })).toBeInTheDocument();
    expect(screen.getByText('404')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Not found')).toHaveAttribute('lang', 'en');
    expect(screen.getByRole('link', { name: '메인으로 가기' })).toHaveAttribute('href', '/main');
  });

  it('장식 글자가 없으면 그리지 않는다', () => {
    const { container } = render(
      <NoticeScreen label="Error" title="화면을 그리지 못했습니다" description="설명">
        <button type="button">다시 시도</button>
      </NoticeScreen>,
    );
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull();
  });
});
