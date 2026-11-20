import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// Paseo처럼 프로젝트 아이콘을 자동으로 찾는 도구는 src/를 보지 않고 public/을 하위 폴더까지 뒤진다.
// 그러면 `pnpm build`가 만든 public/storybook/favicon.svg(Storybook 로고)가 잡히므로,
// public/ 바로 아래에 사이트 아이콘과 같은 favicon.png를 두어 먼저 찾게 한다.
// 사이트는 이 파일을 쓰지 않는다(사이트 아이콘은 이 폴더의 icon.png·favicon.ico·apple-icon.png).
describe('도구용 프로젝트 아이콘(public/favicon.png)', () => {
  it('사이트 아이콘(src/app/icon.png)과 같은 파일이다', () => {
    const root = path.resolve(import.meta.dirname, '../..');
    const toolIcon = readFileSync(path.join(root, 'public/favicon.png'));
    const siteIcon = readFileSync(path.join(root, 'src/app/icon.png'));

    expect(
      toolIcon.equals(siteIcon),
      'src/app/icon.png를 바꿨다면 public/favicon.png에도 복사하세요',
    ).toBe(true);
  });
});
