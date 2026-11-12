import type { Metadata } from "next";
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import styles from "./MainPage.module.css";
import { SiteMenu } from "./SiteMenu";

/** 앱과 함께 배포한 Storybook. 개발 서버에는 빌드 결과물이 없어 Storybook 개발 서버로 보냅니다. */
const STORYBOOK_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:6006"
    : "/storybook/index.html";

export const metadata: Metadata = {
  title: "메인",
  description:
    "다양한 신화관이 얽히고 우주적 규모로 확대되어 SF 전쟁까지 이어지는 대서사시, 소설 프로젝트 제로.",
};

const LETTER_ROWS = [
  { word: "project", className: styles.rowLarge },
  { word: "zero", className: styles.rowMedium },
  { word: "0", className: styles.rowSmall },
];

const ARCS = [
  {
    mark: "∙",
    numeral: "I",
    title: "신화",
    latin: "Myth",
    note: "다양한 신화관이 하나의 이야기로 얽힙니다.",
    art: (
      <>
        <circle pathLength={1} cx="74" cy="84" r="46" />
        <circle pathLength={1} cx="126" cy="84" r="46" />
        <circle pathLength={1} cx="100" cy="128" r="46" />
      </>
    ),
  },
  {
    mark: "∙∙",
    numeral: "II",
    title: "우주",
    latin: "Cosmos",
    note: "이야기의 무대가 우주적 규모로 확대됩니다.",
    art: (
      <>
        <circle pathLength={1} cx="100" cy="100" r="14" />
        <ellipse pathLength={1}
          cx="100"
          cy="100"
          rx="84"
          ry="28"
          transform="rotate(-24 100 100)"
        />
        <ellipse pathLength={1}
          cx="100"
          cy="100"
          rx="56"
          ry="74"
          transform="rotate(32 100 100)"
        />
        <circle cx="168" cy="72" r="4" fill="currentColor" />
      </>
    ),
  },
  {
    mark: "∙∙∙",
    numeral: "III",
    title: "전쟁",
    latin: "War",
    note: "거대한 서사는 SF 전쟁으로 이어집니다.",
    art: (
      <>
        <path pathLength={1} d="M16 32 100 100M184 32 100 100M16 168 100 100M184 168 100 100M100 12v176M12 100h176" />
        <circle pathLength={1} cx="100" cy="100" r="30" />
      </>
    ),
  },
];

/** 서사 문장. 단어마다 나눠 스크롤에 따라 하나씩 또렷하게 보여 줍니다. */
const STATEMENT = [
  "다양한 신화관이 얽히고",
  "⦾",
  "우주적 규모로 확대되어",
  "✕",
  "SF 전쟁까지 이어지는 대서사시.",
];

const GLYPHS = new Set(["⦾", "✕"]);

/** 단어(또는 기호)마다 전체 순번을 매겨 둡니다. 순번으로 드러나는 때를 나눕니다. */
const STATEMENT_WORDS = STATEMENT.flatMap((part) =>
  GLYPHS.has(part) ? [{ glyph: true, text: part }] : part.split(" ").map((text) => ({ glyph: false, text })),
).map((word, order, all) => ({ ...word, order, total: all.length }));

const ARCHIVE = [
  { title: "세계관", latin: "World" },
  { title: "인물", latin: "Characters" },
  { title: "세력", latin: "Factions" },
  { title: "연대기", latin: "Chronicle" },
];

export function MainPage() {
  return (
    <>
      <a href="#content" className={styles.skip}>
        본문 바로가기
      </a>
      <SiteMenu />

      <main id="content" tabIndex={-1} className={styles.main}>
        <section className={styles.hero}>
          <svg
            className={styles.heroRings}
            viewBox="0 0 1000 1000"
            aria-hidden="true"
          >
            <circle cx="500" cy="500" r="490" />
            <circle cx="500" cy="500" r="470" />
            <circle cx="500" cy="500" r="300" />
          </svg>
          <h1 className={styles.heroTitle}>
            <span className={styles.visuallyHidden}>프로젝트 제로</span>
            <span aria-hidden="true">
              {LETTER_ROWS.map((row) => (
                <span
                  key={row.word}
                  className={`${styles.row} ${row.className}`}
                >
                  {row.word.split("").map((letter, index) => (
                    <span key={`${letter}-${index}`}>{letter}</span>
                  ))}
                </span>
              ))}
            </span>
          </h1>
          <div className={styles.axis} aria-hidden="true">
            <span>T − 3 MYTH</span>
            <span>T − 2 COSMOS</span>
            <span>T − 1 WAR</span>
            <span>T = 0</span>
          </div>
        </section>

        <section
          id="prologue"
          className={styles.prologue}
          aria-labelledby="prologue-title"
        >
          <div className={styles.prologueStage}>
          <h2 id="prologue-title" className={styles.label}>
            서사
          </h2>
          <p className={styles.statement}>
            {STATEMENT_WORDS.map((word) => {
              const style = {
                "--w": word.order,
                "--n": word.total,
              } as CSSProperties;
              // 기호를 건너뛰고 읽어도 구절 사이가 띄어지도록, 기호 앞뒤에도 공백 글자를 둡니다.
              return (
                <Fragment key={word.order}>
                  {word.order > 0 && " "}
                  {word.glyph ? (
                    <span
                      className={`${styles.glyph} ${styles.word}`}
                      style={style}
                      aria-hidden="true"
                    >
                      {word.text}
                    </span>
                  ) : (
                    <span className={styles.word} style={style}>
                      {word.text}
                    </span>
                  )}
                </Fragment>
              );
            })}
          </p>
          </div>
        </section>

        <section
          id="structure"
          className={styles.structure}
          aria-labelledby="structure-title"
        >
          <h2 id="structure-title" className={styles.structureTitle}>
            세 개의 흐름
          </h2>
          <ol>
            {ARCS.map((arc) => (
              <li key={arc.numeral} className={styles.arc}>
                <p className={styles.arcMark} aria-hidden="true">
                  {arc.mark} <span lang="en">{arc.latin}</span>
                </p>
                <article className={styles.card}>
                  <div className={styles.cardArt}>
                    <svg viewBox="0 0 200 200" aria-hidden="true">
                      {arc.art}
                    </svg>
                  </div>
                  <div className={styles.cardBody}>
                    <h3 className={styles.cardTitle}>{arc.title}</h3>
                    <p className={styles.cardLatin} lang="en">
                      {arc.latin}
                    </p>
                    <p className={styles.cardNote}>{arc.note}</p>
                  </div>
                </article>
                <p className={styles.arcNumeral} aria-hidden="true">
                  {arc.numeral}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="archive"
          className={styles.archive}
          aria-labelledby="archive-title"
        >
          <p className={styles.archiveEyebrow} lang="en">
            The Archive
          </p>
          <h2 id="archive-title" className={styles.archiveTitle}>
            기록 보관소
          </h2>
          <ul className={styles.archiveGrid}>
            {ARCHIVE.map((item) => (
              <li key={item.title} className={styles.slot}>
                <h3 className={styles.slotTitle}>{item.title}</h3>
                <p className={styles.slotLatin} lang="en">
                  {item.latin}
                </p>
                <p className={styles.slotStatus}>기록 준비 중</p>
              </li>
            ))}
          </ul>
        </section>

        <section className={styles.closing}>
          <p className={styles.closingZero} aria-hidden="true">
            0
          </p>
          <p className={styles.closingLine}>모든 것은 제로에서 시작된다.</p>
          <Link href="/" className={styles.closingLink}>
            인트로 다시 보기
          </Link>
        </section>
      </main>

      <footer className={styles.footer}>
        <small>
          © 2026 프로젝트 제로 · 불사조 모델:{" "}
          <a href="https://sketchfab.com/3d-models/phoenix-243fea4f846f44d18d37bf371272b7ec">“Phoenix”</a> by{" "}
          <a href="https://sketchfab.com/norberto3d">NORBERTO-3D</a>,{" "}
          <a href="http://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a> (색 변경·장식 제거) ·{" "}
          <a href={STORYBOOK_URL}>디자인 시스템(Storybook)</a>
        </small>
      </footer>
    </>
  );
}
