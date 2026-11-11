'use client';

import Image from 'next/image';
import Link from 'next/link';
import { type CSSProperties, useEffect, useRef, useState } from 'react';
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
      });
    };
    const request = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    const onPointer = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      sceneRef.current?.setPointer(event.clientX / window.innerWidth - 0.5, event.clientY / window.innerHeight - 0.5);
    };

    update();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request);
    window.addEventListener('pointermove', onPointer, { passive: true });

    let cancelled = false;
    import('../lib/createPhoenixScene')
      .then(async ({ createPhoenixScene }) => {
        if (cancelled || !canvasRef.current) return;
        const scene = await createPhoenixScene(canvasRef.current);
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
        if (!cancelled) setSceneReady(false);
      });

    return () => {
      cancelled = true;
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

  // 키보드로 버튼에 왔을 때도 고리가 완성된 맨 아래 장면에서 보이게 합니다.
  const showFinale = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight });
  };

  return (
    <div ref={rootRef} className={styles.root} data-motion={motionOn ? 'on' : 'off'}>
      {motionOn ? <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" /> : null}
      <div className={styles.scrim} aria-hidden="true" />

      <header className={styles.brand}>
        <Image src="/brand/logo.png" alt="project zero" width={40} height={40} className={styles.logo} />
      </header>

      <main className={styles.story}>
        <section className={styles.chapter} style={lengthStyle(HERO_LENGTH)} data-chapter>
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
          <section key={chapter.id} className={styles.chapter} style={lengthStyle(chapter.length)} data-chapter>
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

        <section className={styles.chapter} style={lengthStyle(FINALE_LENGTH)} data-chapter>
          <div className={`${styles.sticky} ${styles.finale}`}>
            <h2 className={styles.finaleTitle}>
              모든 것은
              <br />
              제로에서 시작된다
            </h2>
            <Link href="/main" className={styles.enter} onFocus={showFinale}>
              메인으로 들어가기
            </Link>
            <p className={styles.credit}>불사조 3D 모델 출처: cadnav.com</p>
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
      <div className={styles.progress} aria-hidden="true" />
    </div>
  );
}
