import type { Metadata } from 'next';
import { NoticeLink, NoticeScreen } from '@/shared/ui';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없음',
};

/** 없는 주소로 들어왔을 때의 화면(404). */
export function NotFoundPage() {
  return (
    <NoticeScreen
      label="Not found"
      mark="404"
      title="페이지를 찾을 수 없습니다"
      description="주소가 바뀌었거나 없는 페이지입니다. 아래에서 갈 곳을 고르세요."
    >
      {/* 404 화면은 모든 페이지의 RSC 데이터에 함께 실려, next/link를 쓰면 그 코드가 모든 페이지의 첫 화면 JS에 더해집니다. */}
      <NoticeLink href="/main">메인으로 가기</NoticeLink>
      <NoticeLink href="/">인트로 보기</NoticeLink>
    </NoticeScreen>
  );
}
