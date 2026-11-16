import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { NoticeScreen } from './NoticeScreen';

const meta: Meta<typeof NoticeScreen> = {
  title: 'shared/NoticeScreen',
  component: NoticeScreen,
  args: {
    label: 'Not found',
    mark: '404',
    title: '페이지를 찾을 수 없습니다',
    description: '주소가 바뀌었거나 없는 페이지입니다.',
    children: <a href="/main">메인으로 가기</a>,
  },
};

export default meta;
type Story = StoryObj<typeof NoticeScreen>;

export const WithMark: Story = {};

/** 큰 장식 글자 없이, 버튼으로 할 일을 줍니다. */
export const WithButton: Story = {
  args: {
    label: 'Error',
    mark: undefined,
    title: '화면을 그리지 못했습니다',
    description: '잠시 뒤 다시 시도해 주세요.',
    children: (
      <>
        <button type="button">다시 시도</button>
        <a href="/main">메인으로 가기</a>
      </>
    ),
  },
};
