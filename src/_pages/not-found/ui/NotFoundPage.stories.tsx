import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NotFoundPage } from './NotFoundPage';

const meta: Meta<typeof NotFoundPage> = {
  title: 'pages/not-found/NotFoundPage',
  component: NotFoundPage,
};

export default meta;
export const Default: StoryObj<typeof NotFoundPage> = {};
