import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { GlobalError } from './GlobalError';

vi.mock('../../monitoring', () => ({ reportError: vi.fn() }));

describe('GlobalError', () => {
  // 루트 레이아웃 대신 <html>부터 그리므로 문서 조각 대신 정적 마크업으로 확인합니다.
  it('한국어 문서로 오류를 알리고 다시 시도 버튼을 준다', () => {
    const html = renderToStaticMarkup(<GlobalError error={new Error('x')} retry={() => {}} />);
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('화면을 그리지 못했습니다');
    expect(html).toMatch(/<button type="button"[^>]*>다시 시도<\/button>/);
  });
});
