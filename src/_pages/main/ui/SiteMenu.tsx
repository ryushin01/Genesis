'use client';

import Link from 'next/link';
import { useRef } from 'react';
import styles from './SiteMenu.module.css';

const SECTIONS = [
  { href: '#prologue', label: '서사' },
  { href: '#structure', label: '구조' },
  { href: '#archive', label: '기록' },
] as const;

export function SiteMenu() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button type="button" className={styles.trigger} aria-haspopup="dialog" onClick={() => dialogRef.current?.showModal()}>
        <span lang="en">Menu</span>
        <span className={styles.dots} aria-hidden="true">
          ••
        </span>
      </button>

      <dialog ref={dialogRef} className={styles.dialog} aria-label="사이트 메뉴">
        <nav aria-label="주요 메뉴">
          <ol className={styles.list}>
            {SECTIONS.map((item, index) => (
              <li key={item.href}>
                <a href={item.href} className={styles.link} onClick={close}>
                  <span className={styles.number} aria-hidden="true">
                    {'∙'.repeat(index + 1)}
                  </span>
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/" className={styles.link}>
                <span className={styles.number} aria-hidden="true">
                  ○
                </span>
                인트로
              </Link>
            </li>
          </ol>
        </nav>
        <button type="button" className={styles.close} onClick={close}>
          닫기
        </button>
      </dialog>
    </>
  );
}
