import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { VisuallyHidden } from './VisuallyHidden';

describe('VisuallyHidden', () => {
  it('글은 보조기기에 남기고 역할 같은 속성도 그대로 넘긴다', () => {
    render(<VisuallyHidden role="status">불사조를 깨우는 중</VisuallyHidden>);
    expect(screen.getByRole('status')).toHaveTextContent('불사조를 깨우는 중');
  });
});
