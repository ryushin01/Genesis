'use client';

import Link from 'next/link';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
import { SOURCES_URL } from '@/shared/config';
import { useReducedMotion } from '@/shared/lib';
import type { PhoenixScene } from '../lib/createPhoenixScene';
import { CHAPTERS, FINALE_LENGTH, HERO_LENGTH } from '../model/chapters';
import { chapterReveal, stickyProgress } from '../model/reveal';
import styles from './IntroExperience.module.css';

const lengthStyle = (length: number) => ({ '--length': `${length}svh` }) as CSSProperties;

export function IntroExperience() {
  const reducedMotion = useReducedMotion();
  const motionOn = reducedMotion === false;
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PhoenixScene | null>(null);
  const [sceneReady, setSceneReady] = useState(false);
  const [loaded, setLoaded] = useState(0);
  const [loadFailed, setLoadFailed] = useState(false);
  const cursorRef = useRef<HTMLDivElement>(null);
  const chipRef = useRef<HTMLParagraphElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    if (!motionOn || !root) return;

    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-chapter]'));
    let ticking = false;
    const update = () => {
      ticking = false;
      const viewport = window.innerHeight;
      const max = document.documentElement.scrollHeight - viewport;
      const total = max > 0 ? window.scrollY / max : 0;
      sceneRef.current?.setProgress(total);
      root.style.setProperty('--progress', total.toFixed(4));
      sections.forEach((section, index) => {
        const rect = section.getBoundingClientRect();
        const reveal = chapterReveal(stickyProgress(rect.top, rect.height, viewport), {
          first: index === 0,
          last: index === sections.length - 1,
        });
        section.style.setProperty('--reveal', reveal.toFixed(3));
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

    let cancelled = false;
    import('../lib/createPhoenixScene')
      .then(async ({ createPhoenixScene }) => {
        if (cancelled || !canvasRef.current) return;
        const scene = await createPhoenixScene(canvasRef.current, (ratio) => {
          if (!cancelled) setLoaded(ratio);
        });
        if (cancelled) {
          scene.dispose();
          return;
        }
        sceneRef.current = scene;
        update();
        setSceneReady(true);
      })
      .catch(() => {
        // WebGL을 쓸 수 없으면 CSS 배경과 글자만으로 보여 줍니다.
        if (!cancelled) setLoadFailed(true);
      });

    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      window.removeEventListener('pointermove', onPointer);
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [motionOn]);

  const togglePaused = () => {
    const next = !paused;
    setPaused(next);
    sceneRef.current?.setPaused(next);
  };

  // 키보드로 버튼에 왔을 때도 깃털이 내려앉은 맨 아래 장면에서 보이게 합니다.
  const showFinale = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight });
  };

  return (
    <div ref={rootRef} className={styles.root} data-motion={motionOn ? 'on' : 'off'}>
      {motionOn ? <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" /> : null}
      <div className={styles.scrim} aria-hidden="true" />
      {motionOn && !sceneReady && !loadFailed ? (
        <div className={styles.loader} role="status">
          <span className={styles.loaderMark} aria-hidden="true" />
          <span>불사조를 깨우는 중</span>
          <span className={styles.loaderValue} aria-hidden="true">
            {Math.round(loaded * 100)}%
          </span>
        </div>
      ) : null}

      <header className={styles.brand}>
        <span lang="en">project zero</span>
      </header>

      <main className={styles.story}>
        <section className={styles.chapter} style={lengthStyle(HERO_LENGTH)} data-chapter data-name="Prologue">
          <div className={`${styles.sticky} ${styles.hero}`}>
            <h1 className={styles.title} lang="en">
              <span className={styles.titleLead}>project</span>
              <span className={styles.titleZero}>zero</span>
            </h1>
            <p className={styles.tagline}>신화에서 우주 전쟁까지, 프로젝트 제로</p>
            <p className={styles.scrollCue}>
              아래로 스크롤하세요
              <span className={styles.scrollLine} aria-hidden="true" />
            </p>
          </div>
        </section>

        {CHAPTERS.map((chapter) => (
          <section
            key={chapter.id}
            className={styles.chapter}
            style={lengthStyle(chapter.length)}
            data-chapter
            data-name={chapter.accent}
          >
            <div className={chapter.placement === 'bottom' ? `${styles.sticky} ${styles.bottom}` : styles.sticky}>
              <div className={styles.copy}>
                <p className={styles.accent} lang="en" aria-hidden="true">
                  {chapter.accent}
                </p>
                <p className={styles.line}>
                  {chapter.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </p>
              </div>
            </div>
          </section>
        ))}

        <section className={styles.chapter} style={lengthStyle(FINALE_LENGTH)} data-chapter data-name="zero">
          <div className={`${styles.sticky} ${styles.finale}`}>
            <h2 className={styles.finaleTitle}>
              모든 것은
              <br />
              제로에서 시작된다
            </h2>
            <Link href="/main" className={styles.enter} onFocus={showFinale}>
              메인으로 들어가기
            </Link>
            <p className={styles.credit}>
              <a href={SOURCES_URL}>3D 모델 출처 (README)</a>
            </p>
          </div>
        </section>
      </main>

      {motionOn && sceneReady ? (
        <button
          type="button"
          className={styles.pause}
          onClick={togglePaused}
          aria-label={paused ? '배경 애니메이션 재생' : '배경 애니메이션 정지'}
        >
          <span aria-hidden="true">{paused ? '▶' : 'Ⅱ'}</span>
        </button>
      ) : null}
      {motionOn ? (
        <>
          <p ref={chipRef} className={styles.chip} lang="en" aria-hidden="true">
            Prologue
          </p>
          <div ref={cursorRef} className={styles.cursor} aria-hidden="true" />
        </>
      ) : null}
      <div className={styles.progress} aria-hidden="true" />
    </div>
  );
}
