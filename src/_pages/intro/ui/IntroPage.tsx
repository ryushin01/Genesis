import type { Metadata } from 'next';
import { preload } from 'react-dom';
import { MODEL_URLS } from '../model/assets';
import { IntroExperience } from './IntroExperience';

export const metadata: Metadata = {
  title: { absolute: '프로젝트 제로' },
};

export function IntroPage() {
  // 불사조 모델(약 2.7MB)을 JS를 받는 동안 함께 받기 시작합니다. 장면을 띄우지 않는 동작 줄이기 설정에서는 받지 않습니다.
  preload(MODEL_URLS.phoenix, { as: 'fetch', crossOrigin: 'anonymous', media: '(prefers-reduced-motion: no-preference)' });
  return <IntroExperience />;
}
