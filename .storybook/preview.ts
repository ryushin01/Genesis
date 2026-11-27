import type { Preview } from '@storybook/nextjs-vite';
import * as stylex from '@stylexjs/stylex';
import { documentStyles } from '../src/_app/styles/document';
import '../src/_app/styles/globals.css';

// 앱에서는 루트 레이아웃이 <body>에 붙이는 바탕·글꼴 스타일을, Storybook 미리보기에서는 여기서 붙입니다.
const { className } = stylex.props(documentStyles.body);
if (className) document.body.classList.add(...className.split(' '));

const preview: Preview = {
  parameters: { layout: 'fullscreen', nextjs: { appDirectory: true } },
};

export default preview;
