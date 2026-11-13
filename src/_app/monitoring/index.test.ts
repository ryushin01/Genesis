import type { Metric } from 'web-vitals';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { reportError, reportMetric } from './index';

const metric = (rating: Metric['rating']): Metric => ({
  name: 'LCP',
  value: 4200,
  rating,
  delta: 4200,
  id: 'v1',
  navigationId: 1,
  entries: [],
  navigationType: 'navigate',
});

describe('monitoring', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('DSN이 없으면 나쁜 지표와 오류를 오류 없이 넘긴다', () => {
    expect(() => reportMetric(metric('poor'))).not.toThrow();
    expect(() => reportError(new Error('x'))).not.toThrow();
  });

  it('개발 모드에서는 지표를 콘솔에 남긴다', () => {
    vi.stubEnv('NODE_ENV', 'development');
    const debug = vi.spyOn(console, 'debug').mockImplementation(() => {});
    reportMetric(metric('good'));
    expect(debug).toHaveBeenCalledWith(expect.stringContaining('LCP 4200.0 (good)'));
  });
});
