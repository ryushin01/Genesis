'use client';

import { useEffect } from 'react';
import { SITE_NAME } from '@/shared/config';
import { reportError } from '../../monitoring';

/**
 * 루트 레이아웃까지 실패했을 때의 마지막 오류 화면(`global-error.tsx`).
 * 전역 스타일과 글꼴이 없으므로 메인의 흑백 디자인을 최소한의 인라인 스타일로 따릅니다.
 */
export function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          margin: 0,
          minHeight: '100svh',
          display: 'grid',
          placeContent: 'center',
          justifyItems: 'center',
          gap: 24,
          padding: 20,
          background: '#fff',
          color: '#000',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          wordBreak: 'keep-all',
        }}
      >
        <title>{`오류 | ${SITE_NAME}`}</title>
        <h1 style={{ margin: 0, fontSize: 'clamp(1.5rem, 3.6vw, 3rem)', fontWeight: 800, letterSpacing: '-0.04em' }}>
          화면을 그리지 못했습니다
        </h1>
        <p style={{ margin: 0, color: '#595959' }}>잠시 뒤 다시 시도해 주세요.</p>
        <button
          type="button"
          onClick={retry}
          style={{
            minHeight: 44,
            padding: '0 24px',
            border: '1px solid currentcolor',
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            cursor: 'pointer',
          }}
        >
          다시 시도
        </button>
      </body>
    </html>
  );
}
