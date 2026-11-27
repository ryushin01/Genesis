import { describe, expect, it, vi } from 'vitest';

vi.mock('./fetchModel', () => ({ fetchModel: vi.fn() }));

const { isSoftwareRenderer } = await import('./createPhoenixScene');

const context = (name: string | null) => ({
  getExtension: () => (name === null ? null : { UNMASKED_RENDERER_WEBGL: 0x9246 }),
  getParameter: () => name,
});

describe('isSoftwareRenderer', () => {
  it('GPU 없이 그리는 렌더러(SwiftShader·llvmpipe)를 알아본다', () => {
    expect(isSoftwareRenderer(context('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)'))).toBe(true);
    expect(isSoftwareRenderer(context('llvmpipe (LLVM 15.0.7, 256 bits)'))).toBe(true);
  });

  it('실제 GPU나 이름을 알 수 없는 경우는 소프트웨어로 보지 않는다', () => {
    expect(isSoftwareRenderer(context('ANGLE (Apple, ANGLE Metal Renderer: Apple M1 Max)'))).toBe(false);
    expect(isSoftwareRenderer(context(null))).toBe(false);
  });
});
