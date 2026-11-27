'use client';

import * as stylex from '@stylexjs/stylex';
import Link from 'next/link';
import { type MouseEvent, useRef } from 'react';
import { invertedTheme } from '@/shared/ui';
import { colors, fonts, fontSizes, space } from '@/shared/ui/tokens.stylex';

const styles = stylex.create({
  /* 흰 버튼을 차이(difference) 혼합으로 얹어, 흰 바탕에서는 검게·검은 바탕에서는 희게 보입니다. */
  trigger: {
    position: 'fixed',
    left: '50%',
    bottom: '12px',
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    gap: '18px',
    minHeight: space.tapLarge,
    padding: '0 22px',
    borderWidth: 0,
    borderStyle: 'none',
    backgroundColor: colors.background,
    color: colors.foreground,
    fontFamily: fonts.mono,
    fontSize: fontSizes.ui,
    textTransform: 'uppercase',
    transform: 'translateX(-50%)',
    mixBlendMode: 'difference',
    cursor: 'pointer',
    outline: { default: null, ':focus-visible': `${space.focusRing} solid ${colors.background}` },
    outlineOffset: { default: null, ':focus-visible': '3px' },
  },
  dots: {
    letterSpacing: '0.1em',
  },
  dialog: {
    width: '100%',
    maxWidth: 'none',
    height: '100%',
    maxHeight: 'none',
    margin: 0,
    padding: 'clamp(24px, 6vw, 72px)',
    borderWidth: 0,
    borderStyle: 'none',
    backgroundColor: colors.background,
    color: colors.foreground,
    display: { default: null, ':is([open])': 'flex' },
    flexDirection: { default: null, ':is([open])': 'column' },
    justifyContent: { default: null, ':is([open])': 'space-between' },
  },
  list: {
    borderTopWidth: '1px',
    borderTopStyle: 'solid',
    borderTopColor: colors.foreground,
  },
  item: {
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: colors.foreground,
  },
  link: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '0.5em',
    padding: '0.14em 0',
    fontSize: 'clamp(3rem, 10vw, 8rem)',
    fontWeight: 900,
    letterSpacing: '-0.05em',
    textDecoration: 'none',
    backgroundColor: { default: null, ':hover': colors.foreground },
    color: { default: null, ':hover': colors.background },
  },
  focusInset: {
    outline: { default: null, ':focus-visible': `${space.focusRing} solid ${colors.foreground}` },
    outlineOffset: { default: null, ':focus-visible': '-3px' },
  },
  number: {
    width: '2.2em',
    fontFamily: fonts.mono,
    fontSize: '18px',
    fontWeight: 400,
    letterSpacing: 0,
  },
  close: {
    alignSelf: 'center',
    minHeight: space.tapLarge,
    padding: '0 28px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: colors.foreground,
    backgroundColor: 'transparent',
    color: colors.foreground,
    fontFamily: fonts.mono,
    fontSize: fontSizes.ui,
    cursor: 'pointer',
  },
});

const SECTIONS = [
  { href: '#prologue', label: '서사' },
  { href: '#structure', label: '구조' },
  { href: '#archive', label: '기록' },
] as const;

export function SiteMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();
  // 대화상자는 닫히면서 초점을 메뉴 버튼으로 돌려놓으므로, 키보드가 옮겨 간 구역부터 이어지게 그 구역으로 초점을 옮깁니다.
  // 주소의 #과 스크롤은 링크의 기본 동작이 그대로 맡습니다.
  const goToSection = (event: MouseEvent<HTMLAnchorElement>) => {
    const section = document.getElementById(event.currentTarget.hash.slice(1));
    close();
    section?.focus({ preventScroll: true });
  };

  return (
    <>
      <button type="button" {...stylex.props(styles.trigger)} aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
        <span lang="en">Menu</span>
        <span {...stylex.props(styles.dots)} aria-hidden="true">
          ••
        </span>
      </button>

      <dialog ref={dialogRef} {...stylex.props(invertedTheme, styles.dialog)} aria-label="사이트 메뉴">
        <nav aria-label="주요 메뉴">
          <ol {...stylex.props(styles.list)}>
            {SECTIONS.map((item, index) => (
              <li key={item.href} {...stylex.props(styles.item)}>
                <a href={item.href} {...stylex.props(styles.link, styles.focusInset)} onClick={goToSection}>
                  <span {...stylex.props(styles.number)} aria-hidden="true">
                    {'∙'.repeat(index + 1)}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
            <li {...stylex.props(styles.item)}>
              <Link href="/" {...stylex.props(styles.link, styles.focusInset)}>
                <span {...stylex.props(styles.number)} aria-hidden="true">
                  ○
                </span>
                인트로
              </Link>
            </li>
          </ol>
        </nav>
        <button type="button" {...stylex.props(styles.close, styles.focusInset)} onClick={close}>
          닫기
        </button>
      </dialog>
    </>
  );
}
