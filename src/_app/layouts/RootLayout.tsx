import * as stylex from '@stylexjs/stylex';
import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/shared/config';
import { documentStyles } from '../styles/document';
import '../styles/globals.css';
import { RestFonts } from './RestFonts';

/*
 * 라틴 글꼴(OFL)은 저장소의 파일을 씁니다. next/font/google은 빌드할 때 Google Fonts에서 받으므로
 * 네트워크가 없으면 빌드가 실패합니다. 파일은 Fontsource 패키지의 라틴 조각(라틴 글자만 담겨 한글은 다음 글꼴로 넘어감)이고 라이선스는 각 폴더의 OFL.txt입니다.
 */
const sans = localFont({
  src: '../styles/fonts/inter/inter-latin-wght-normal.woff2',
  weight: '100 900',
  style: 'normal',
  variable: '--font-sans-latin',
  display: 'swap',
});
const mono = localFont({
  src: '../styles/fonts/jetbrains-mono/jetbrains-mono-latin-wght-normal.woff2',
  weight: '100 800',
  style: 'normal',
  variable: '--font-mono-latin',
  display: 'swap',
  adjustFontFallback: false,
});
const display = localFont({
  src: '../styles/fonts/cormorant/cormorant-latin-400-italic.woff2',
  weight: '400',
  style: 'italic',
  variable: '--font-display-latin',
  display: 'swap',
  adjustFontFallback: 'Times New Roman',
});

/*
 * 한글 서사 문장 속 영문·숫자(“SF” 등): Cormorant 똑바른 Bold(가변 글꼴을 700으로 고정하고 라틴 글자만 담음).
 * 우아한 세리프 한글은 글자 면을 꽉 채워(높이 1em) Cormorant 대문자(0.625em)가 작고 가늘어 보이므로,
 * 이 글꼴만 키워(size-adjust) 대문자가 한글 높이의 약 85%가 되게 합니다. 첫 화면 아래에서만 쓰여 미리 받지 않습니다.
 */
const narrativeLatin = localFont({
  src: '../styles/fonts/cormorant/cormorant-700-latin.woff2',
  weight: '700',
  style: 'normal',
  variable: '--font-narrative-latin',
  display: 'swap',
  preload: false,
  adjustFontFallback: false,
  declarations: [
    { prop: 'size-adjust', value: '136%' },
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD',
    },
  ],
});

/*
 * 공유 미리보기: 그림은 src/app/opengraph-image.jpg(인트로 첫 화면, pnpm og-image)를 Next가 붙입니다.
 * 페이지가 openGraph를 따로 정하면 이 값을 통째로 덮으므로, 페이지에서는 canonical만 정합니다.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: 'website',
    siteName: SITE_NAME,
    locale: 'ko_KR',
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = { themeColor: '#8b0000' };

export function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${display.variable} ${narrativeLatin.variable}`}
    >
      <body {...stylex.props(documentStyles.body)}>
        {children}
        {/* 한글 우아한 세리프(GenesisSerif): 화면 글자 파일은 globals.css와 함께 받고, 나머지 글자 조각은 페이지를 다 받은 뒤 붙임 */}
        <RestFonts href="/fonts/genesis-serif-rest.css" />
      </body>
    </html>
  );
}
