import { describe, expect, it } from 'vitest';
import { robots, sitemap } from './index';

describe('검색 엔진 파일', () => {
  it('robots.txt는 모든 화면을 열고 Storybook만 빼며 sitemap 위치를 알린다', () => {
    expect(robots()).toEqual({
      rules: [{ userAgent: '*', allow: '/', disallow: '/storybook/' }],
      sitemap: 'https://zero.ryushin0.co.kr/sitemap.xml',
    });
  });

  it('sitemap.xml에는 인트로와 메인의 절대 주소가 있다', () => {
    expect(sitemap().map(({ url }) => url)).toEqual(['https://zero.ryushin0.co.kr/', 'https://zero.ryushin0.co.kr/main']);
  });
});
