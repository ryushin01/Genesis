import type { Preview } from '@storybook/nextjs-vite';
import '../src/_app/styles/globals.css';
import '../public/fonts/kbiz-hanmaum-myungjo.css';

const preview: Preview = {
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
};

export default preview;
