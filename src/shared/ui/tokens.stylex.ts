import * as stylex from '@stylexjs/stylex';

/*
 * 디자인 토큰. StyleX는 토큰 파일 이름이 .stylex.ts로 끝나야 하고, 쓰는 쪽에서 이 파일을 바로 가져와야
 * 빌드할 때 변수 이름을 알 수 있습니다(shared/ui의 index로 다시 내보내면 읽지 못함).
 */

/*
 * 대체 글꼴: 흑백 편집 디자인이 남도록 제목은 올드스타일 세리프와 운영체제 명조, 본문은 운영체제 한글 고딕, 기록은 고정폭.
 * --font-*-latin은 next/font/local이 <html>에 붙이는 저장소 글꼴 변수입니다.
 */
const SANS =
  'var(--font-sans-latin), "GenesisSerif", "Apple SD Gothic Neo", "Malgun Gothic", "Noto Sans CJK KR", system-ui, sans-serif';

export const fonts = stylex.defineVars({
  sans: SANS,
  mono: 'var(--font-mono-latin), ui-monospace, "SF Mono", Menlo, Consolas, "D2Coding", "Apple SD Gothic Neo", "Malgun Gothic", monospace',
  display:
    'var(--font-display-latin), "GenesisSerif", Garamond, Baskerville, Georgia, "AppleMyungjo", "Noto Serif CJK KR", "Batang", serif',
  /** 한글 서사 문장(메인 서사·인트로 장): 문장 속 영문·숫자는 Inter 대신 Cormorant 똑바른 Bold(키운 크기) */
  narrative: `var(--font-narrative-latin), ${SANS}`,
});

/** 색. 기본은 흰 종이에 검은 글자이고, 반전·인트로 색은 themes.ts의 테마로 바꿉니다. */
export const colors = stylex.defineVars({
  /** 인트로의 적색(#8B0000) */
  primary: '#8b0000',
  background: '#fff',
  foreground: '#000',
  /** 배경 위에서 4.5:1 이상인 흐린 글자 */
  muted: '#595959',
});

export const space = stylex.defineVars({
  /** 메인 편집 디자인의 기본 여백·간격 */
  gutter: '12px',
  /** 누르기 쉬운 최소 높이 */
  tap: '44px',
  tapLarge: '48px',
  /** 초점 외곽선 두께 */
  focusRing: '3px',
});

export const fontSizes = stylex.defineVars({
  caption: '13px',
  label: '14px',
  body: '15px',
  ui: '16px',
});
