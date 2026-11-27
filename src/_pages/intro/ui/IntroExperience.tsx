'use client';

import * as stylex from '@stylexjs/stylex';
import Link from 'next/link';
import { type MouseEvent, useEffect, useRef, useState } from 'react';
import { SOURCES_URL } from '@/shared/config';
import { useReducedMotion } from '@/shared/lib';
import { introTheme, VisuallyHidden } from '@/shared/ui';
import { colors, fonts, fontSizes, space } from '@/shared/ui/tokens.stylex';
import type { PhoenixScene } from '../lib/createPhoenixScene';
import { CHAPTERS, FINALE_LENGTH, HERO_LENGTH } from '../model/chapters';
import { chapterReveal, stickyProgress } from '../model/reveal';

const REDUCED_MOTION = '@media (prefers-reduced-motion: reduce)';
const NARROW = '@media (max-width: 640px)';
const INSET_X = 'clamp(4px, 5vw, 96px)';
const CORNER_X = 'clamp(16px, 4vw, 56px)';
const CORNER_Y = 'clamp(16px, 4vh, 40px)';

const cue = stylex.keyframes({
  '0%, 100%': { transform: 'scaleX(0.25)' },
  '50%': { transform: 'scaleX(1)' },
});

const spin = stylex.keyframes({
  to: { rotate: '360deg' },
});

const styles = stylex.create({
  root: {
    // 스크롤할 때 스크립트가 바꾸는 값: 장의 투명도(--reveal), 전체 진행률(--progress)
    '--reveal': 1,
    '--progress': 0,
    position: 'relative',
    color: colors.foreground,
    backgroundColor: colors.background,
    minHeight: '100svh',
    // 장면을 띄우지 않을 때 보이는 배경. background-attachment: fixed는 스크롤마다 메인 스레드에서 다시 칠하게 하므로
    // 고정 위치 요소로 대신합니다. 장면이 뜨면 캔버스가 위를 덮습니다.
    '::before': {
      content: "''",
      position: 'fixed',
      inset: 0,
      backgroundImage:
        'radial-gradient(120% 90% at 70% 15%, #b3131a 0%, transparent 60%), linear-gradient(160deg, #8b0000 0%, #3d0003 75%, #1a0002 100%)',
      pointerEvents: 'none',
    },
  },
  canvas: {
    position: 'fixed',
    inset: '0 0 auto',
    width: '100%',
    // 모바일 주소창이 접히고 펼쳐져도 크기가 바뀌지 않게 가장 큰 화면 높이로 고정합니다(그리기 버퍼를 다시 만들지 않음).
    // lvh를 모르는 브라우저는 vh를 씁니다.
    height: ['100vh', '100lvh'],
    display: 'block',
  },
  /* 동작 줄이기: 움직이는 장면 대신 같은 장면의 정지 화면을 배경에 깔고, 결말에는 로고가 된 장면을 보입니다. */
  still: {
    position: 'fixed',
    inset: 0,
    backgroundImage: 'url(/intro/still-flight.webp)',
    backgroundSize: 'cover',
    backgroundPosition: 'center top',
    pointerEvents: 'none',
  },
  stillFinale: {
    width: 'min(78vw, 560px)',
    aspectRatio: '16 / 10',
    borderRadius: '24px',
    backgroundImage: 'url(/intro/still-finale.webp)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    boxShadow: '0 0 80px rgb(139 0 0 / 0.55)',
  },
  scrim: {
    position: 'fixed',
    inset: 'auto 0 0',
    height: '62svh',
    backgroundImage: 'linear-gradient(to top, rgb(20 0 2 / 0.62), transparent)',
    pointerEvents: 'none',
  },
  brand: {
    position: 'fixed',
    top: 'clamp(20px, 3.4vw, 42px)',
    left: 'clamp(20px, 4vw, 56px)',
    zIndex: 2,
    fontSize: fontSizes.body,
    fontWeight: 700,
    letterSpacing: '0.02em',
  },
  logo: {
    display: 'block',
    width: '40px',
    height: '40px',
  },
  story: {
    position: 'relative',
    zIndex: 1,
  },
  chapter: {
    minHeight: '100svh',
  },
  /** 장마다 스크롤 길이(svh). 장면을 띄울 때만 씁니다. */
  chapterLength: (length: string) => ({
    height: length,
  }),
  sticky: {
    display: 'grid',
    placeItems: 'center',
    minHeight: '100svh',
    padding: '88px clamp(20px, 5vw, 72px)',
  },
  stickyMotion: {
    position: 'sticky',
    top: 0,
    height: '100svh',
  },
  /* 투명도는 글이 든 안쪽 요소에만 줍니다. 화면 전체 크기의 상자에 주면 장이 바뀔 때마다 큰 레이어를 새로 래스터해 프레임이 밀립니다. */
  revealed: {
    opacity: 'var(--reveal)',
  },
  /* 화면 근처의 장(data-near)만 투명도 변화를 합성 단계에서 처리합니다. */
  revealedNear: {
    willChange: {
      default: null,
      [stylex.when.ancestor('[data-near="true"]')]: 'opacity',
    },
  },
  hero: {
    alignItems: 'end',
    justifyItems: 'start',
    paddingBottom: { default: 'clamp(28px, 5vh, 56px)', [NARROW]: '76px' },
    gridTemplateRows: '1fr auto auto',
    rowGap: space.gutter,
  },
  title: {
    gridRow: 1,
    alignSelf: 'end',
    fontWeight: 400,
    width: '100%',
  },
  titleLead: {
    display: 'block',
    marginLeft: INSET_X,
    fontSize: 'clamp(3rem, 7.4vw, 7.5rem)',
    letterSpacing: '-0.045em',
    lineHeight: 1,
  },
  titleZero: {
    display: 'block',
    marginTop: '-0.14em',
    fontFamily: fonts.display,
    fontSize: 'clamp(9rem, 30vw, 33rem)',
    lineHeight: 0.82,
    letterSpacing: '-0.02em',
    textAlign: 'right',
    textShadow: '0 6px 60px rgb(40 0 0 / 0.55)',
  },
  tagline: {
    fontSize: 'clamp(1rem, 1.6vw, 1.4rem)',
    marginLeft: INSET_X,
  },
  scrollCue: {
    display: 'flex',
    alignItems: 'center',
    gap: space.gutter,
    marginLeft: INSET_X,
    fontSize: fontSizes.label,
  },
  scrollLine: {
    width: '72px',
    height: '1px',
    backgroundColor: 'currentcolor',
    transformOrigin: 'left',
    animationName: { default: cue, [REDUCED_MOTION]: 'none' },
    animationDuration: '2.4s',
    animationTimingFunction: 'ease-in-out',
    animationIterationCount: 'infinite',
  },
  /* 배경 애니메이션을 정지하면 스크롤 안내 선도 멈춥니다. */
  paused: {
    animationPlayState: 'paused',
  },
  bottom: {
    alignItems: 'end',
  },
  copy: {
    maxWidth: '62rem',
    textAlign: 'center',
    textShadow: '0 2px 28px rgb(30 0 0 / 0.75), 0 0 6px rgb(30 0 0 / 0.5)',
  },
  accent: {
    fontFamily: fonts.display,
    fontSize: 'clamp(5rem, 15vw, 14rem)',
    lineHeight: 0.95,
  },
  /* 서사 글꼴: 한글은 우아한 세리프, 문장 속 영문(SF)은 Cormorant 똑바른 Bold */
  line: {
    marginTop: '0.4em',
    fontFamily: fonts.narrative,
    fontSize: 'clamp(1.75rem, 4.4vw, 4rem)',
    fontWeight: 600,
    lineHeight: 1.22,
    letterSpacing: '-0.03em',
  },
  lineBreak: {
    display: 'block',
  },
  finale: {
    alignContent: 'end',
    paddingBottom: 'clamp(56px, 7vh, 88px)',
    justifyItems: 'center',
    rowGap: 'clamp(28px, 5vh, 48px)',
    textAlign: 'center',
  },
  finaleTitle: {
    fontSize: 'clamp(1.5rem, 3.2vw, 2.75rem)',
    fontWeight: 600,
    lineHeight: 1.28,
    letterSpacing: '-0.03em',
    textShadow: '0 2px 24px rgb(0 0 0 / 0.9)',
  },
  enter: {
    display: 'inline-flex',
    alignItems: 'center',
    minHeight: '56px',
    padding: '0 34px',
    borderRadius: '999px',
    backgroundColor: '#fff',
    color: colors.primary,
    fontSize: '18px',
    fontWeight: 700,
    textDecoration: 'none',
    transition: { default: 'transform 0.25s ease, box-shadow 0.25s ease', [REDUCED_MOTION]: 'none' },
    transform: { default: null, ':hover': 'scale(1.04)' },
    boxShadow: { default: null, ':hover': '0 0 44px rgb(255 90 60 / 0.75)' },
  },
  focusRing: {
    outline: { default: null, ':focus-visible': `${space.focusRing} solid ${colors.foreground}` },
    outlineOffset: { default: null, ':focus-visible': '4px' },
  },
  credit: {
    fontSize: fontSizes.caption,
    textShadow: '0 1px 8px rgb(0 0 0 / 0.9)',
  },
  /* 작은 글자라도 누르기 쉬운 높이(24px 이상) */
  creditLink: {
    display: 'inline-block',
    paddingBlock: '4px',
    textUnderlineOffset: '0.2em',
  },
  pause: {
    position: 'fixed',
    left: CORNER_X,
    bottom: { default: CORNER_Y, [NARROW]: '14px' },
    zIndex: 3,
    display: 'grid',
    placeItems: 'center',
    width: space.tapLarge,
    height: space.tapLarge,
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgb(255 255 255 / 0.75)',
    borderRadius: '50%',
    backgroundColor: 'rgb(40 0 2 / 0.55)',
    color: colors.foreground,
    fontSize: fontSizes.label,
    cursor: 'pointer',
  },
  progress: {
    position: 'fixed',
    zIndex: 2,
    top: 0,
    right: 0,
    width: '2px',
    height: '100%',
    backgroundColor: colors.foreground,
    transform: 'scaleY(var(--progress))',
    transformOrigin: 'top',
  },
  /* 장면을 불러오는 동안의 화면 */
  loader: {
    position: 'fixed',
    inset: 0,
    zIndex: 4,
    display: 'grid',
    placeContent: 'center',
    justifyItems: 'center',
    gap: '14px',
    backgroundColor: '#140001',
    fontSize: fontSizes.body,
    pointerEvents: 'none',
  },
  loaderMark: {
    width: '56px',
    height: '56px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgb(255 255 255 / 0.35)',
    borderTopColor: colors.foreground,
    borderRadius: '50%',
    animationName: { default: spin, [REDUCED_MOTION]: 'none' },
    animationDuration: '1.1s',
    animationTimingFunction: 'linear',
    animationIterationCount: 'infinite',
  },
  loaderValue: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.caption,
  },
  /* 현재 장의 이름 */
  chip: {
    position: 'fixed',
    right: CORNER_X,
    bottom: CORNER_Y,
    zIndex: 3,
    display: 'flex',
    alignItems: 'center',
    minHeight: space.tap,
    padding: '0 18px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgb(255 255 255 / 0.55)',
    borderRadius: '999px',
    backgroundColor: 'rgb(40 0 2 / 0.45)',
    fontFamily: fonts.display,
    fontSize: '20px',
    backdropFilter: 'blur(6px)',
  },
  /* 마우스를 따라오는 원. 기본 커서는 그대로 둡니다. */
  cursor: {
    position: 'fixed',
    top: 0,
    left: 0,
    zIndex: 5,
    display: { default: null, '@media (pointer: coarse)': 'none' },
    width: space.tap,
    height: space.tap,
    margin: '-22px 0 0 -22px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'rgb(255 255 255 / 0.7)',
    borderRadius: '50%',
    opacity: { default: 0, ':is([data-visible="true"])': 1 },
    pointerEvents: 'none',
    transition: 'translate 0.18s ease-out, opacity 0.3s',
  },
});

export function IntroExperience() {
  const reducedMotion = useReducedMotion();
  const motionOn = reducedMotion === false;
  const still = reducedMotion === true;
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PhoenixScene | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [loadedPercent, setLoadedPercent] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLParagraphElement>(null);
  const [paused, setPaused] = useState(false);
  // 장면을 다시 만들 때(동작 줄이기를 껐다 켤 때) 지금의 정지 상태를 넘겨주려고 함께 둡니다.
  const pausedRef = useRef(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!motionOn || !root) return;

    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'));
    const reveals = sections.map(() => '');
    let ticking = false;
    const update = () => {
      ticking = false;
      // 위치를 모두 읽은 뒤에 스타일을 씁니다. 읽기와 쓰기를 섞으면 장마다 레이아웃을 다시 계산합니다.
      const viewport = window.innerHeight;
      const max = document.documentElement.scrollHeight - viewport;
      const total = max > 0 ? window.scrollY / max : 0;
      const rects = sections.map((section) => section.getBoundingClientRect());

      sceneRef.current?.setProgress(total);
      root.style.setProperty('--progress', total.toFixed(4));
      rects.forEach((rect, index) => {
        const section = sections[index];
        const reveal = chapterReveal(stickyProgress(rect.top, rect.height, viewport), {
          first: index === 0,
          last: index === sections.length - 1,
        }).toFixed(3);
        if (reveal !== reveals[index]) {
          reveals[index] = reveal;
          section.style.setProperty('--reveal', reveal);
        }
        // 화면 근처의 장만 합성 레이어로 올립니다. 모두 올리면 전체 화면 크기의 레이어가 장 수만큼 생깁니다.
        const near = String(rect.bottom > -viewport * 0.25 && rect.top < viewport * 1.25);
        if (section.dataset.near !== near) section.dataset.near = near;
        // 화면 가운데를 지나는 장의 이름을 오른쪽 아래 칩에 보여 줍니다.
        if (chipRef.current && rect.top <= viewport / 2 && rect.bottom > viewport / 2) {
          const name = section.dataset.name ?? '';
          if (chipRef.current.textContent !== name) chipRef.current.textContent = name;
        }
      });
    };
    let frame = 0;
    const request = () => {
      if (ticking) return;
      ticking = true;
      frame = requestAnimationFrame(update);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      sceneRef.current?.setPointer(event.clientX / window.innerWidth - 0.5, event.clientY / window.innerHeight - 0.5);
      cursorRef.current?.style.setProperty('translate', `${event.clientX}px ${event.clientY}px`);
      cursorRef.current?.setAttribute('data-visible', 'true');
    };

    update();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    window.addEventListener('pointermove', onPointer, { passive: true });

    // 장면을 띄우기 전에 화면을 떠나면 받던 모델도 멈춥니다.
    const loading = new AbortController();
    const { signal } = loading;
    import('../lib/createPhoenixScene')
      .then(async ({ createPhoenixScene }) => {
        if (signal.aborted || !canvasRef.current) return;
        let lastPercent = -1;
        const scene = await createPhoenixScene(canvasRef.current, {
          signal,
          onProgress: (ratio) => {
            // 진행 이벤트마다 다시 그리지 않고, 백분율이 바뀔 때만 상태를 고칩니다.
            const percent = Math.round(ratio * 100);
            if (signal.aborted || percent === lastPercent) return;
            lastPercent = percent;
            setLoadedPercent(percent);
          },
        });
        if (signal.aborted) {
          scene.dispose();
          return;
        }
        scene.setPaused(pausedRef.current);
        sceneRef.current = scene;
        update();
        setSceneReady(true);
      })
      .catch(() => {
        // WebGL을 쓸 수 없으면 CSS 배경과 글자만으로 보여 줍니다.
        if (!signal.aborted) setLoadFailed(true);
      });

    return () => {
      loading.abort();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      window.removeEventListener('pointermove', onPointer);
      sceneRef.current?.dispose();
      sceneRef.current = null;
      // 다음에 장면을 다시 만들 때 로딩 화면부터 보이도록 처음 상태로 돌립니다.
      setSceneReady(false);
      setLoadFailed(false);
      setLoadedPercent(0);
    };
  }, [motionOn]);

  const togglePaused = () => {
    const next = !paused;
    pausedRef.current = next;
    setPaused(next);
    sceneRef.current?.setPaused(next);
  };

  const isLoading = motionOn && !sceneReady && !loadFailed;

  // 메인으로 들어가면 화면이 바뀌기 전에 그리기부터 멈춥니다(마지막 그림은 남음). GPU 없이 그리는 기기에서는 장면이
  // 메인 스레드를 차지해 화면 전환이 몇 초씩 밀리기 때문입니다. 새 탭으로 여는 클릭(보조 키·가운데 단추)은 이 화면에 남으므로 그대로 둡니다.
  const leave = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    sceneRef.current?.stop();
  };

  // 키보드로 버튼에 왔을 때도 깃털이 내려앉은 맨 아래 장면에서 보이게 합니다.
  const showFinale = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight });
  };

  /** 장 하나: 화면 근처 표시(data-near)를 자식이 볼 수 있게 표식을 붙이고, 장면을 띄울 때만 스크롤 길이를 줍니다. */
  const chapterProps = (length: number) =>
    stylex.props(styles.chapter, motionOn && styles.chapterLength(`${length}svh`), stylex.defaultMarker());
  const sticky = [styles.sticky, motionOn && styles.stickyMotion];
  const revealed = [styles.revealed, motionOn && styles.revealedNear];

  return (
    <div
      ref={rootRef}
      {...stylex.props(introTheme, styles.root)}
      data-motion={motionOn ? 'on' : 'off'}
      data-scene={loadFailed ? 'failed' : sceneReady ? 'ready' : 'loading'}
      data-paused={paused ? 'true' : undefined}
    >
      {motionOn ? <canvas ref={canvasRef} {...stylex.props(styles.canvas)} aria-hidden="true" /> : null}
      {still ? <div {...stylex.props(styles.still)} aria-hidden="true" data-still="flight" /> : null}
      <div {...stylex.props(styles.scrim)} aria-hidden="true" />
      {/* 상태 알림 영역은 처음부터 두고 글만 바꿔야 화면 낭독기가 읽습니다. 보이는 로딩 화면은 같은 내용이라 숨깁니다. */}
      <VisuallyHidden role="status">{isLoading ? '불사조를 깨우는 중' : ''}</VisuallyHidden>
      {isLoading ? (
        <div {...stylex.props(styles.loader)} aria-hidden="true">
          <span {...stylex.props(styles.loaderMark)} />
          <span>불사조를 깨우는 중</span>
          <span {...stylex.props(styles.loaderValue)}>{loadedPercent}%</span>
        </div>
      ) : null}

      <header {...stylex.props(styles.brand)}>
        {/* 40px 로고 한 장이라 next/image 런타임(용량 예산 초과)을 쓰지 않습니다. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo.webp" alt="project zero" width={40} height={40} {...stylex.props(styles.logo)} />
      </header>
      {/* 정지 버튼은 화면 왼쪽 아래에 고정되어 있지만, 키보드로는 이야기보다 먼저 닿게 앞에 둡니다. */}
      {motionOn && sceneReady ? (
        <button
          type="button"
          {...stylex.props(styles.pause, styles.focusRing)}
          onClick={togglePaused}
          aria-label={paused ? '배경 애니메이션 재생' : '배경 애니메이션 정지'}
        >
          <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
        </button>
      ) : null}

      <main {...stylex.props(styles.story)}>
        <section {...chapterProps(HERO_LENGTH)} data-chapter data-name="Prologue">
          <div {...stylex.props(sticky, styles.hero)}>
            <h1 {...stylex.props(styles.title, revealed)} lang="en">
              <span {...stylex.props(styles.titleLead)}>project</span>
              <span {...stylex.props(styles.titleZero)}>zero</span>
            </h1>
            <p {...stylex.props(styles.tagline, revealed)}>신화에서 우주 전쟁까지, 프로젝트 제로</p>
            <p {...stylex.props(styles.scrollCue, revealed)}>
              아래로 스크롤하세요
              <span {...stylex.props(styles.scrollLine, paused && styles.paused)} aria-hidden="true" />
            </p>
          </div>
        </section>

        {CHAPTERS.map((chapter) => (
          <section key={chapter.id} {...chapterProps(chapter.length)} data-chapter data-name={chapter.accent}>
            <div {...stylex.props(sticky, chapter.placement === 'bottom' && styles.bottom)}>
              <div {...stylex.props(styles.copy, revealed)}>
                <p {...stylex.props(styles.accent)} lang="en" aria-hidden="true">
                  {chapter.accent}
                </p>
                <p {...stylex.props(styles.line)}>
                  {chapter.lines.map((line) => (
                    <span key={line} {...stylex.props(styles.lineBreak)}>
                      {line}
                    </span>
                  ))}
                </p>
              </div>
            </div>
          </section>
        ))}

        <section {...chapterProps(FINALE_LENGTH)} data-chapter data-name="zero">
          <div {...stylex.props(sticky, styles.finale)}>
            {still ? <div {...stylex.props(styles.stillFinale)} aria-hidden="true" data-still="finale" /> : null}
            <h2 {...stylex.props(styles.finaleTitle, revealed)}>
              모든 것은
              <br />
              제로에서 시작된다
            </h2>
            <Link href="/main" {...stylex.props(styles.enter, styles.focusRing, revealed)} onFocus={showFinale} onClick={leave}>
              메인으로 들어가기
            </Link>
            <p {...stylex.props(styles.credit, revealed)}>
              <a href={SOURCES_URL} {...stylex.props(styles.creditLink)}>
                3D 모델·아이콘 출처 (README)
              </a>
            </p>
          </div>
        </section>
      </main>

      {motionOn ? (
        <>
          <p ref={chipRef} {...stylex.props(styles.chip)} lang="en" aria-hidden="true">
            Prologue
          </p>
          <div ref={cursorRef} {...stylex.props(styles.cursor)} aria-hidden="true" />
        </>
      ) : null}
      <div {...stylex.props(styles.progress)} aria-hidden="true" />
    </div>
  );
}
