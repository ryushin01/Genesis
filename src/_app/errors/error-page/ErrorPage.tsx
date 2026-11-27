'use client';

import { useEffect } from 'react';
import { NoticeButton, NoticeLink, NoticeScreen } from '@/shared/ui';
import { reportError } from '../../monitoring';

export interface ErrorPageProps {
  error: unknown;
  /** 화면을 다시 받아 그립니다(Next 16 오류 경계의 retry). */
  retry: () => void;
}

/** 화면을 그리다 오류가 나면 보여 주는 화면(`error.tsx`). 오류는 Sentry로 보내고(DSN이 있을 때) 다시 시도할 수 있습니다. */
export function ErrorPage({ error, retry }: ErrorPageProps) {
  useEffect(() => {
    reportError(error);
  }, [error]);

  return (
    <NoticeScreen
      label="Error"
      title="화면을 그리지 못했습니다"
      description="잠시 뒤 다시 시도해 주세요. 문제가 계속되면 메인 화면에서 다시 들어와 주세요."
    >
      <NoticeButton onClick={retry}>다시 시도</NoticeButton>
      {/* 오류 뒤에는 앱 상태를 모두 새로 시작하도록 페이지를 다시 받습니다(next/link를 쓰지 않음). */}
      <NoticeLink href="/main">메인으로 가기</NoticeLink>
    </NoticeScreen>
  );
}
