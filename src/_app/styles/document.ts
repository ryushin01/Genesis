import * as stylex from '@stylexjs/stylex';
import { colors, fonts } from '@/shared/ui/tokens.stylex';

/** <body>의 바탕색·글자색·글꼴. 루트 레이아웃과 Storybook 미리보기가 함께 씁니다. */
export const documentStyles = stylex.create({
  body: {
    backgroundColor: colors.background,
    color: colors.foreground,
    fontFamily: fonts.sans,
    wordBreak: 'keep-all',
  },
});
