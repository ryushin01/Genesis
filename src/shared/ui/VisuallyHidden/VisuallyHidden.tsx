import type { ComponentPropsWithoutRef } from 'react';
import styles from './VisuallyHidden.module.css';

/** 화면에는 보이지 않고 보조기기에만 읽히는 글(제목의 읽는 이름, 상태 알림 등). */
export function VisuallyHidden({ className, ...props }: ComponentPropsWithoutRef<'span'>) {
  return <span className={className ? `${styles.root} ${className}` : styles.root} {...props} />;
}
