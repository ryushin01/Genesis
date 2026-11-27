import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { SITE_NAME } from '@/shared/config';
import { MODEL_URLS } from '../model/assets';
import { IntroExperience } from './IntroExperience';

export const metadata: Metadata = {
  title: { absolute: SITE_NAME },
  alternates: { canonical: '/' },
};

export function IntroPage() {
  // 불사조 모델(약 1.7MB)과 비행 타임라인을 JS를 받는 동안 함께 받기 시작합니다. 장면을 띄우지 않는 동작 줄이기 설정에서는 받지 않습니다.
  const motion = '(prefers-reduced-motion: no-preference)';
  preload(MODEL_URLS.phoenix, { as: 'fetch', crossOrigin: 'anonymous', media: motion });
  preload(MODEL_URLS.flight, { as: 'fetch', crossOrigin: 'anonymous', media: motion });
  preload(MODEL_URLS.flightMobile, { as: 'fetch', crossOrigin: 'anonymous', media: motion });
  return <IntroExperience />;
}
