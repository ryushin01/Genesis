import type { Metric } from 'web-vitals';

type SentryModule = typeof import('./sentry');

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

let sentry: Promise<SentryModule> | undefined;

/**
 * 브라우저의 오류·성능 모니터링을 켭니다. `instrumentation-client.ts`가 화면을 그리기 전에 부릅니다.
 * 첫 화면을 무겁게 하지 않도록 Sentry와 web-vitals는 나중에 따로 받습니다.
 * - NEXT_PUBLIC_SENTRY_DSN이 있으면 처리하지 못한 오류와 나쁜(poor) Web Vitals를 Sentry로 보냅니다.
 * - 없으면 Sentry를 번들에 넣지 않고, 개발 모드에서만 Web Vitals를 콘솔에 찍습니다.
 */
export function initMonitoring() {
  if (typeof window === 'undefined') return;

  if (dsn) {
    sentry = import('./sentry').then((Sentry) => {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        release: process.env.NEXT_PUBLIC_RELEASE,
        // 오류 내용만 남깁니다. 사용자 정보·쿠키·헤더·쿼리 문자열과
        // 방문 기록(세션)·이동과 클릭 기록(브레드크럼)은 모으지 않습니다.
        dataCollection: {
          userInfo: false,
          cookies: false,
          httpHeaders: false,
          httpBodies: [],
          urlQueryParams: false,
          stackFrameVariables: false,
        },
        integrations: (defaults) =>
          defaults.filter(({ name }) => name !== 'BrowserSession' && name !== 'Breadcrumbs'),
      });
      return Sentry;
    });
  }

  void import('web-vitals').then(({ onCLS, onINP, onLCP, onFCP, onTTFB }) => {
    for (const subscribe of [onCLS, onINP, onLCP, onFCP, onTTFB]) subscribe(reportMetric);
  });
}

export function reportMetric(metric: Metric) {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[web-vitals] ${metric.name} ${metric.value.toFixed(1)} (${metric.rating})`);
  }
  if (!sentry || metric.rating !== 'poor') return;
  void sentry.then((Sentry) =>
    Sentry.captureMessage(`Web Vitals 나쁨: ${metric.name}`, {
      level: 'warning',
      tags: { metric: metric.name, rating: metric.rating, path: location.pathname },
      extra: { value: metric.value, id: metric.id, navigationType: metric.navigationType },
    }),
  );
}

/** 오류 경계(error.tsx)에서 잡은 오류를 보냅니다. */
export function reportError(error: unknown) {
  if (!sentry) return;
  void sentry.then((Sentry) => Sentry.captureException(error));
}
