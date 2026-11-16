import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { VisuallyHidden } from './VisuallyHidden';

/** 화면에는 아무것도 보이지 않습니다. 접근성 탭에서 읽히는 글을 확인합니다. */
const meta: Meta<typeof VisuallyHidden> = {
  title: 'shared/VisuallyHidden',
  component: VisuallyHidden,
  args: { children: '보조기기에만 읽히는 글' },
};

export default meta;
export const Default: StoryObj<typeof VisuallyHidden> = {};
