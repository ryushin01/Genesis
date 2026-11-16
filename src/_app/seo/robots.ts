import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/shared/config';

/** 모든 화면을 읽게 하되, 함께 배포한 디자인 시스템(Storybook)은 검색 결과에 올리지 않습니다. */
export function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: '/storybook/' }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
