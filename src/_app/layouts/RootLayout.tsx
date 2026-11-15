import type { Metadata, Viewport } from 'next';
import { Cormorant, Inter, JetBrains_Mono } from 'next/font/google';
import type { ReactNode } from 'react';
import '../styles/globals.css';
import { FONT_FACE_CSS, FontLoader } from './FontLoader';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans-latin', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-latin', display: 'swap' });
const display = Cormorant({
  subsets: ['latin'],
  style: 'italic',
  weight: ['400'],
  variable: '--font-display-latin',
  display: 'swap',
});

export const metadata: Metadata = {
  title: { default: '프로젝트 제로', template: '%s | 프로젝트 제로' },
  description: '다양한 신화관이 얽히고 우주적 규모로 확대되어 SF 전쟁까지 이어지는 대서사시, 소설 프로젝트 제로.',
};

export const viewport: Viewport = { themeColor: '#8b0000' };

export function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ko" suppressHydrationWarning className={`${sans.variable} ${mono.variable} ${display.variable}`}>
      <head>
        {/* 한글 KBIZ한마음명조(통파일): 바로 받기 시작하고, 다 받을 때까지 FontLoader가 로딩 화면을 보여 줌 */}
        <link
          rel="preload"
          href="/fonts/kbiz-hanmaum-myungjo/KBIZHanmaumMyungjo.woff"
          as="font"
          type="font/woff"
          crossOrigin=""
        />
        <style dangerouslySetInnerHTML={{ __html: FONT_FACE_CSS }} />
      </head>
      <body>
        <FontLoader />
        {children}
      </body>
    </html>
  );
}
