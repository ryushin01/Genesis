import type { ReactNode } from 'react';
import styles from './NoticeScreen.module.css';

export interface NoticeScreenProps {
  /** 제목 위의 작은 영문 라벨(예: "Not found"). */
  label: string;
  /** 크게 보이는 장식 글자(예: "404"). 제목이 같은 뜻을 말하므로 보조기기에는 읽히지 않습니다. */
  mark?: string;
  title: string;
  description: ReactNode;
  /** 갈 곳(링크)이나 할 일(버튼). */
  children: ReactNode;
}

/**
 * 없는 주소·오류처럼 한 가지를 알리고 갈 곳을 주는 화면.
 * 메인 화면 맺음 구역(큰 글자, 고정폭 링크)의 흑백 편집 디자인을 따릅니다.
 */
export function NoticeScreen({ label, mark, title, description, children }: NoticeScreenProps) {
  return (
    <main className={styles.screen}>
      <p className={styles.label} lang="en">
        {label}
      </p>
      {mark ? (
        <p className={styles.mark} aria-hidden="true">
          {mark}
        </p>
      ) : null}
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      <div className={styles.actions}>{children}</div>
    </main>
  );
}
