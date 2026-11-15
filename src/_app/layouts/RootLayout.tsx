import type { Metadata, Viewport } from 'next';
import { Cormorant, Inter, JetBrains_Mono } from 'next/font/google';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import '../styles/globals.css';
import { RestFonts } from './RestFonts';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans-latin', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-latin', display: 'swap' });
const display = Cormorant({
  subsets: ['latin'],
  style: 'italic',
  weight: ['400'],
  variable: '--font-display-latin',
  display: 'swap',
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

export const metadata: Metadata = {
  title: { default: '프로젝트 제로', template: '%s | 프로젝트 제로' },
  description: '다양한 신화관이 얽히고 우주적 규모로 확대되어 SF 전쟁까지 이어지는 대서사시, 소설 프로젝트 제로.',
};

export const viewport: Viewport = { themeColor: '#8b0000' };

export function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable} ${display.variable} ${narrativeLatin.variable}`}
    >
      <body>
        {children}
        {/* 한글 우아한 세리프(GenesisSerif): 화면 글자 파일은 globals.css와 함께 받고, 나머지 글자 조각은 페이지를 다 받은 뒤 붙임 */}
        <RestFonts href="/fonts/genesis-serif-rest.css" />
      </body>
    </html>
  );
}
