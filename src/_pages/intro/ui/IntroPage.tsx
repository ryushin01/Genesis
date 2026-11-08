import type { Metadata } from 'next';
import { IntroExperience } from './IntroExperience';

export const metadata: Metadata = {
  title: { absolute: '프로젝트 제로' },
};

export function IntroPage() {
  return <IntroExperience />;
}
