import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/shared/config';

/** 인트로와 메인. 내용이 작품 자료와 함께 가끔 바뀌므로 갱신 주기는 monthly로 둡니다. */
export function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: 'monthly', priority: 1 },
    { url: `${SITE_URL}/main`, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
