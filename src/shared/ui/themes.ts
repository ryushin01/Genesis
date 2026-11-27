import * as stylex from '@stylexjs/stylex';
import { colors } from './tokens.stylex';

/** 검은 바탕에 흰 글자(메인의 구조·기록 구역, 메뉴, 본문 바로가기). 흐린 글자는 검은 바탕에서 4.5:1 이상인 밝은 회색. */
export const invertedTheme = stylex.createTheme(colors, {
  primary: '#8b0000',
  background: '#000',
  foreground: '#fff',
  muted: '#b8b8b8',
});

/** 반전 구역 안에서 다시 흰 종이로 돌아오는 곳(구조 구역의 카드). */
export const paperTheme = stylex.createTheme(colors, {
  primary: '#8b0000',
  background: '#fff',
  foreground: '#000',
  muted: '#595959',
});

/** 인트로: 짙은 적색 바탕에 흰 글자. */
export const introTheme = stylex.createTheme(colors, {
  primary: '#8b0000',
  background: '#1a0002',
  foreground: '#fff',
  muted: '#b8b8b8',
});
