import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { IntroExperience } from './IntroExperience';

const meta: Meta<typeof IntroExperience> = {
  title: 'pages/intro/IntroExperience',
  component: IntroExperience,
};

export default meta;
export const Default: StoryObj<typeof IntroExperience> = {};
