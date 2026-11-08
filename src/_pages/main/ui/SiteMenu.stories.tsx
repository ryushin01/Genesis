import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { SiteMenu } from './SiteMenu';

const meta: Meta<typeof SiteMenu> = {
  title: 'pages/main/SiteMenu',
  component: SiteMenu,
};

export default meta;
export const Default: StoryObj<typeof SiteMenu> = {};
