import * as stylex from '@stylexjs/stylex';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { colors, fonts, fontSizes, space } from '../tokens.stylex';

const styles = stylex.create({
  screen: {
    display: 'grid',
    placeContent: 'center',
    justifyItems: 'center',
    gap: '24px',
    minHeight: '100svh',
    padding: 'clamp(80px, 14vh, 140px) 20px',
    backgroundColor: colors.background,
    color: colors.foreground,
    textAlign: 'center',
  },
  label: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.label,
    fontWeight: 700,
    textTransform: 'uppercase',
  },
  mark: {
    fontSize: 'clamp(7rem, 26vw, 22rem)',
    fontWeight: 900,
    lineHeight: 0.85,
    letterSpacing: '-0.04em',
  },
  title: {
    fontSize: 'clamp(1.5rem, 3.6vw, 3rem)',
    fontWeight: 800,
    letterSpacing: '-0.04em',
  },
  description: {
    maxWidth: '34em',
    fontFamily: fonts.mono,
    fontSize: fontSizes.body,
    lineHeight: 1.55,
    color: colors.muted,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: '12px 28px',
  },
  /* 메인 맺음 구역의 링크, 메뉴의 닫기 버튼과 같은 모양 */
  action: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: space.tap,
    fontFamily: fonts.mono,
    fontSize: fontSizes.body,
    color: 'inherit',
    outline: {
      default: null,
      ':focus-visible': `${space.focusRing} solid ${colors.foreground}`,
    },
    outlineOffset: {
      default: null,
      ':focus-visible': '3px',
    },
  },
  link: {
    textUnderlineOffset: '4px',
  },
  button: {
    padding: '0 24px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'currentcolor',
    backgroundColor: 'transparent',
    cursor: 'pointer',
  },
});

export interface NoticeScreenProps {
  /** 제목 위의 작은 영문 라벨(예: "Not found"). */
  label: string;
  /** 크게 보이는 장식 글자(예: "404"). 제목이 같은 뜻을 말하므로 보조기기에는 읽히지 않습니다. */
  mark?: string;
  title: string;
  description: ReactNode;
  /** 갈 곳(NoticeLink)이나 할 일(NoticeButton). */
  children: ReactNode;
}

/**
 * 없는 주소·오류처럼 한 가지를 알리고 갈 곳을 주는 화면.
 * 메인 화면 맺음 구역(큰 글자, 고정폭 링크)의 흑백 편집 디자인을 따릅니다.
 */
export function NoticeScreen({ label, mark, title, description, children }: NoticeScreenProps) {
  return (
    <main {...stylex.props(styles.screen)}>
      <p {...stylex.props(styles.label)} lang="en">
        {label}
      </p>
      {mark ? (
        <p {...stylex.props(styles.mark)} aria-hidden="true">
          {mark}
        </p>
      ) : null}
      <h1 {...stylex.props(styles.title)}>{title}</h1>
      <p {...stylex.props(styles.description)}>{description}</p>
      <div {...stylex.props(styles.actions)}>{children}</div>
    </main>
  );
}

/**
 * 알림 화면의 갈 곳 링크. 페이지를 새로 받는 일반 링크(a)입니다.
 * StyleX는 자식 선택자(.actions a)를 쓰지 않으므로 모양을 링크에 직접 붙입니다.
 */
export function NoticeLink({ children, ...props }: Omit<ComponentPropsWithoutRef<'a'>, 'className' | 'style'>) {
  return (
    <a {...props} {...stylex.props(styles.action, styles.link)}>
      {children}
    </a>
  );
}

/** 알림 화면의 할 일 버튼. */
export function NoticeButton(props: Omit<ComponentPropsWithoutRef<'button'>, 'className' | 'style' | 'type'>) {
  return <button type="button" {...props} {...stylex.props(styles.action, styles.button)} />;
}
