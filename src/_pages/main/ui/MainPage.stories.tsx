import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { MainPage } from './MainPage';

const meta: Meta<typeof MainPage> = {
  title: 'pages/main/MainPage',
  component: MainPage,
};

export default meta;
export const Default: StoryObj<typeof MainPage> = {};
