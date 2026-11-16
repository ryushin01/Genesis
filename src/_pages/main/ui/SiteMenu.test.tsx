import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SiteMenu } from './SiteMenu';

describe('SiteMenu', () => {
  beforeEach(() => {
    HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
      this.open = true;
    });
    HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
      this.open = false;
    });
  });

  it('메뉴를 열고 닫는다', async () => {
    const user = userEvent.setup();
    render(<SiteMenu />);
    await user.click(screen.getByRole('button', { name: /menu/i }));
    const dialog = screen.getByRole('dialog', { name: '사이트 메뉴' });
    expect(dialog).toHaveAttribute('open');
    await user.click(screen.getByRole('button', { name: '닫기' }));
    expect(dialog).not.toHaveAttribute('open');
  });

  it('구역 링크를 누르면 메뉴를 닫고 그 구역으로 초점을 옮긴다', async () => {
    const user = userEvent.setup();
    render(
      <>
        <SiteMenu />
        <section id="structure" tabIndex={-1} aria-label="세 개의 흐름" />
      </>,
    );
    await user.click(screen.getByRole('button', { name: /menu/i }));
    const dialog = screen.getByRole('dialog', { name: '사이트 메뉴' });
    await user.click(screen.getByRole('link', { name: /구조/ }));
    expect(dialog).not.toHaveAttribute('open');
    expect(screen.getByRole('region', { name: '세 개의 흐름' })).toHaveFocus();
  });
});
