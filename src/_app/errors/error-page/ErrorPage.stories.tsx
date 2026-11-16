import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { fn } from 'storybook/test';
import { ErrorPage } from './ErrorPage';

// 전역 오류 화면(GlobalError)은 <html>부터 그려 스토리 안에 넣을 수 없어 이 화면만 둡니다.
const meta: Meta<typeof ErrorPage> = {
  title: 'app/ErrorPage',
  component: ErrorPage,
  args: { error: new Error('스토리 예시 오류'), retry: fn() },
};

export default meta;
export const Default: StoryObj<typeof ErrorPage> = {};
