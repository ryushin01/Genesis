import * as stylex from '@stylexjs/stylex';
import type { ComponentPropsWithoutRef } from 'react';

const styles = stylex.create({
  root: {
    position: 'absolute',
    width: '1px',
    height: '1px',
    overflow: 'hidden',
    clipPath: 'inset(50%)',
    whiteSpace: 'nowrap',
  },
});

/** 화면에는 보이지 않고 보조기기에만 읽히는 글(제목의 읽는 이름, 상태 알림 등). 겉모양은 바꿀 수 없게 className·style을 받지 않습니다. */
export function VisuallyHidden(props: Omit<ComponentPropsWithoutRef<'span'>, 'className' | 'style'>) {
  return <span {...props} {...stylex.props(styles.root)} />;
}
