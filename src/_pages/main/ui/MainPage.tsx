import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { SiteMenu } from "./SiteMenu";
import { SITE_DESCRIPTION, SOURCES_URL } from "@/shared/config";
import { invertedTheme, paperTheme, VisuallyHidden } from "@/shared/ui";
import { colors, fonts, fontSizes, space } from "@/shared/ui/tokens.stylex";

/*
 * 스크롤 연출 (애플 제품 페이지식). 기본은 정지 화면이고,
 * 스크롤 타임라인을 지원하고 동작 줄이기를 끄지 않은 경우에만 움직입니다.
 * 글자는 색·투명도를 바꾸지 않고 흐림만 걷어 내므로 명도 대비는 그대로입니다.
 */
const NO_PREFERENCE = "@media (prefers-reduced-motion: no-preference)";
const NARROW = "@media (max-width: 720px)";
/** 익명 스크롤·뷰 타임라인(scroll(), view())을 쓰는 연출 */
const scrollMotion = <T,>(value: T) => ({
  default: null,
  [NO_PREFERENCE]: { "@supports (animation-timeline: scroll())": value },
});
/** 이름 붙은 뷰 타임라인(--hero 등)을 쓰는 연출 */
const viewMotion = <T,>(value: T) => ({
  default: null,
  "@supports (animation-timeline: view())": { [NO_PREFERENCE]: value },
});

const converge = stylex.keyframes({
  to: { gap: 0, width: "44%" },
});

const rise = stylex.keyframes({
  from: { opacity: 0, transform: "translateY(36px)" },
});

const heroDriftAway = stylex.keyframes({
  to: {
    letterSpacing: "0.18em",
    transform: "translateY(-12svh) scale(0.92)",
    filter: "blur(6px)",
  },
});

const ringsOpen = stylex.keyframes({
  to: { transform: "translate(-50%, -50%) rotate(40deg) scale(1.6)" },
});

const wordFocus = stylex.keyframes({
  from: { filter: "blur(10px)", transform: "translateY(0.35em)" },
  to: { filter: "blur(0)", transform: "none" },
});

const artDraw = stylex.keyframes({
  from: { strokeDashoffset: 1 },
  to: { strokeDashoffset: 0 },
});

const cardRise = stylex.keyframes({
  from: { transform: "translateY(12svh) scale(0.9)" },
  to: { transform: "none" },
});

const monoLabel = {
  fontFamily: fonts.mono,
  fontSize: fontSizes.label,
  fontWeight: 700,
};

/** 기록 칸 모서리 선 한 토막(글자색 단색) */
const CORNER_LINE = `linear-gradient(${colors.foreground}, ${colors.foreground})`;

/** 구역 위의 1px 선(글자색) */
const hairlineTop = {
  borderTopWidth: "1px",
  borderTopStyle: "solid",
  borderTopColor: colors.foreground,
};

const styles = stylex.create({
  skip: {
    position: "fixed",
    top: "8px",
    left: "8px",
    zIndex: 30,
    padding: "12px 18px",
    backgroundColor: colors.background,
    color: colors.foreground,
    transform: { default: "translateY(-200%)", ":focus": "none" },
    outline: { default: null, ":focus": `${space.focusRing} solid ${colors.foreground}` },
    outlineOffset: { default: null, ":focus": "-5px" },
  },
  main: {
    overflow: "clip",
    outline: { default: null, ":focus": "none" },
  },
  /* 메뉴로 옮겨 온 구역은 초점만 받습니다(다음 탭이 그 구역부터 이어지게). 본문 바로가기의 main처럼 테두리는 그리지 않습니다. */
  sectionFocus: {
    outline: { default: null, ":focus": "none" },
  },
  hero: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    minHeight: "100svh",
    padding: `24px ${space.gutter} 96px`,
    viewTimeline: viewMotion("--hero block"),
  },
  heroRings: {
    position: "absolute",
    top: "50%",
    left: "50%",
    width: "max(110vw, 110vh)",
    transform: "translate(-50%, -50%)",
    fill: "none",
    stroke: colors.foreground,
    strokeOpacity: 0.14,
    strokeWidth: 1,
    pointerEvents: "none",
    animationName: viewMotion(ringsOpen),
    animationTimingFunction: viewMotion("linear"),
    animationFillMode: viewMotion("both"),
    animationTimeline: viewMotion("--hero"),
    animationRange: viewMotion("exit 0% exit 100%"),
  },
  heroTitle: {
    position: "relative",
    fontWeight: 900,
    lineHeight: 1,
  },
  heroLetters: {
    display: viewMotion("block"),
    animationName: viewMotion(heroDriftAway),
    animationTimingFunction: viewMotion("linear"),
    animationFillMode: viewMotion("both"),
    animationTimeline: viewMotion("--hero"),
    animationRange: viewMotion("exit 0% exit 90%"),
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    marginInline: "auto",
  },
  converge: {
    animationName: scrollMotion(converge),
    animationTimingFunction: scrollMotion("linear"),
    animationFillMode: scrollMotion("both"),
    animationTimeline: scrollMotion("scroll(root)"),
    animationRange: scrollMotion("0 90vh"),
  },
  rowLarge: {
    fontSize: "clamp(3.2rem, 13vw, 13rem)",
  },
  rowMedium: {
    width: "62%",
    marginTop: "0.42em",
    fontSize: "clamp(2rem, 6.4vw, 6.4rem)",
  },
  rowSmall: {
    justifyContent: "center",
    marginTop: "1.1em",
    fontSize: "clamp(1.4rem, 2.6vw, 2.6rem)",
  },
  axis: {
    position: "relative",
    display: "flex",
    justifyContent: "space-between",
    gap: space.gutter,
    marginTop: "clamp(32px, 7vh, 72px)",
    paddingTop: "10px",
    ...hairlineTop,
    fontFamily: fonts.mono,
    fontSize: "12px",
    color: colors.muted,
  },
  /* 좁은 화면에서는 처음과 끝 눈금만 남깁니다. */
  axisMiddle: {
    display: { default: null, [NARROW]: "none" },
  },
  /* 서사: 화면을 고정해 두고 단어가 차례로 또렷해집니다 */
  prologue: {
    position: "relative",
    height: viewMotion("300svh"),
    viewTimeline: viewMotion("--prologue block"),
  },
  prologueStage: {
    display: "grid",
    placeContent: "center",
    justifyItems: "center",
    gap: "32px",
    minHeight: "100svh",
    padding: "96px clamp(20px, 7vw, 120px)",
    textAlign: "center",
    position: viewMotion("sticky"),
    top: viewMotion(0),
  },
  label: monoLabel,
  /* 서사 글꼴: 한글은 우아한 세리프, 문장 속 영문(SF)은 Cormorant 똑바른 Bold */
  statement: {
    maxWidth: "21em",
    fontFamily: fonts.narrative,
    fontSize: "clamp(2.1rem, 5.4vw, 5.25rem)",
    fontWeight: 800,
    lineHeight: 1.14,
    letterSpacing: "-0.05em",
  },
  /** 화면에 들어오며 떠오릅니다(서사 문장, 기록 칸). */
  rise: {
    animationName: scrollMotion(rise),
    animationTimingFunction: scrollMotion("linear"),
    animationFillMode: scrollMotion("both"),
    animationTimeline: scrollMotion("view()"),
    animationRange: scrollMotion("entry 0% entry 55%"),
  },
  /** 단어의 순번(--w)과 전체 수(--n). 순번으로 드러나는 때를 나눕니다. */
  word: (order: number, total: number) => ({
    "--w": order,
    "--n": total,
    display: viewMotion("inline-block"),
    animationName: viewMotion(wordFocus),
    animationTimingFunction: viewMotion("linear"),
    animationFillMode: viewMotion("both"),
    animationTimeline: viewMotion("--prologue"),
    animationRange: viewMotion(
      "contain calc(var(--w) / var(--n) * 80%) contain calc(var(--w) / var(--n) * 80% + 14%)",
    ),
  }),
  glyph: {
    display: "inline-block",
    /* 앞뒤 공백 글자가 간격을 만듭니다 */
    marginInline: 0,
    fontWeight: 400,
  },
  structure: {
    backgroundColor: colors.background,
    color: colors.foreground,
  },
  structureTitle: {
    padding: `clamp(80px, 16vh, 160px) ${space.gutter} 24px`,
    fontSize: "clamp(3rem, 11vw, 11rem)",
    fontWeight: 900,
    letterSpacing: "-0.05em",
    lineHeight: 1,
    textAlign: "center",
  },
  /* 세 개의 흐름: 카드가 떠오르며 선화가 그려집니다 */
  arc: {
    position: "sticky",
    top: 0,
    display: "grid",
    gridTemplateColumns: {
      default: "minmax(0, 1fr) minmax(0, 520px) minmax(0, 1fr)",
      [NARROW]: "minmax(0, 1fr) auto",
    },
    gridTemplateRows: { default: null, [NARROW]: "auto 1fr" },
    alignItems: "center",
    gap: space.gutter,
    height: "100svh",
    padding: `24px ${space.gutter} 84px`,
    backgroundColor: colors.background,
    viewTimeline: viewMotion("--arc block"),
  },
  arcMark: {
    ...monoLabel,
    gridArea: { default: null, [NARROW]: "1 / 1" },
  },
  arcNumeral: {
    ...monoLabel,
    textAlign: "right",
    gridArea: { default: null, [NARROW]: "1 / 2" },
  },
  card: {
    display: "grid",
    gap: space.gutter,
    padding: space.gutter,
    backgroundColor: colors.background,
    color: colors.foreground,
    gridArea: { default: null, [NARROW]: "2 / 1 / 3 / 3" },
    alignSelf: { default: null, [NARROW]: "center" },
    animationName: viewMotion(cardRise),
    animationTimingFunction: viewMotion("linear"),
    animationFillMode: viewMotion("both"),
    animationTimeline: viewMotion("--arc"),
    animationRange: viewMotion("entry 0% entry 100%"),
  },
  cardArt: {
    display: "grid",
    placeItems: "center",
    padding: "clamp(12px, 3svh, 32px)",
    backgroundColor: colors.background,
    color: colors.foreground,
  },
  cardArtSvg: {
    display: "block",
    width: "min(100%, 25svh)",
    fill: "none",
    stroke: "currentcolor",
    strokeWidth: 1,
  },
  /** 선화의 선 하나하나 */
  cardArtStroke: {
    strokeDasharray: viewMotion(1),
    animationName: viewMotion(artDraw),
    animationTimingFunction: viewMotion("linear"),
    animationFillMode: viewMotion("both"),
    animationTimeline: viewMotion("--arc"),
    animationRange: viewMotion("entry 40% entry 100%"),
  },
  cardBody: {
    padding: "8px 4px 12px",
  },
  cardTitle: {
    fontSize: "clamp(3rem, 7vw, 5.25rem)",
    fontWeight: 900,
    letterSpacing: "-0.05em",
    lineHeight: 1.05,
  },
  cardLatin: {
    ...monoLabel,
    textTransform: "uppercase",
  },
  cardNote: {
    marginTop: space.gutter,
    fontFamily: fonts.mono,
    fontSize: fontSizes.body,
    lineHeight: 1.55,
    color: colors.muted,
  },
  archive: {
    position: "relative",
    zIndex: 1,
    padding: `clamp(96px, 18vh, 180px) ${space.gutter}`,
    backgroundColor: colors.background,
    color: colors.foreground,
    ...hairlineTop,
  },
  archiveEyebrow: {
    ...monoLabel,
    textTransform: "uppercase",
  },
  archiveTitle: {
    marginTop: "8px",
    fontSize: "clamp(3rem, 11vw, 11rem)",
    fontWeight: 900,
    letterSpacing: "-0.05em",
    lineHeight: 1,
  },
  archiveGrid: {
    display: "grid",
    gridTemplateColumns: {
      default: "repeat(4, minmax(0, 1fr))",
      [NARROW]: "repeat(2, minmax(0, 1fr))",
    },
    gap: space.gutter,
    marginTop: "clamp(40px, 8vh, 80px)",
  },
  /* 네 모서리에만 선을 그린 빈 칸 */
  slot: {
    "--corner": "18px",
    display: "flex",
    flexDirection: "column",
    aspectRatio: 1,
    padding: { default: "20px", [NARROW]: "14px" },
    backgroundImage: `${CORNER_LINE}, ${CORNER_LINE}, ${CORNER_LINE}, ${CORNER_LINE}, ${CORNER_LINE}, ${CORNER_LINE}, ${CORNER_LINE}, ${CORNER_LINE}`,
    backgroundPosition: "0 0, 0 0, 100% 0, 100% 0, 0 100%, 0 100%, 100% 100%, 100% 100%",
    backgroundSize:
      "var(--corner) 1px, 1px var(--corner), var(--corner) 1px, 1px var(--corner), var(--corner) 1px, 1px var(--corner), var(--corner) 1px, 1px var(--corner)",
    backgroundRepeat: "no-repeat",
  },
  slotTitle: {
    fontSize: "clamp(1.75rem, 3.4vw, 3.25rem)",
    fontWeight: 900,
    letterSpacing: "-0.04em",
  },
  slotMeta: {
    fontFamily: fonts.mono,
    fontSize: fontSizes.caption,
    color: colors.muted,
  },
  slotStatus: {
    marginTop: "auto",
  },
  closing: {
    position: "relative",
    zIndex: 1,
    display: "grid",
    justifyItems: "center",
    gap: "24px",
    padding: "clamp(80px, 14vh, 140px) 20px",
    backgroundColor: colors.background,
    textAlign: "center",
  },
  closingZero: {
    fontSize: "clamp(10rem, 36vw, 32rem)",
    fontWeight: 900,
    lineHeight: 0.85,
  },
  closingLine: {
    fontSize: "clamp(1.5rem, 3.6vw, 3rem)",
    fontWeight: 800,
    letterSpacing: "-0.04em",
  },
  closingLink: {
    display: "inline-flex",
    alignItems: "center",
    minHeight: space.tap,
    fontFamily: fonts.mono,
    fontSize: fontSizes.body,
    textUnderlineOffset: "4px",
    outline: { default: null, ":focus-visible": `${space.focusRing} solid ${colors.foreground}` },
    outlineOffset: { default: null, ":focus-visible": "3px" },
  },
  footer: {
    position: "relative",
    zIndex: 1,
    padding: `16px ${space.gutter} 84px`,
    backgroundColor: colors.background,
    ...hairlineTop,
    fontFamily: fonts.mono,
    textAlign: "center",
  },
});

/** 앱과 함께 배포한 Storybook. 개발 서버에는 빌드 결과물이 없어 Storybook 개발 서버로 보냅니다. */
const STORYBOOK_URL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:6006"
    : "/storybook/index.html";

export const metadata: Metadata = {
  title: "메인",
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/main" },
};

const LETTER_ROWS = [
  { word: "project", style: [styles.converge, styles.rowLarge] },
  { word: "zero", style: [styles.converge, styles.rowMedium] },
  { word: "0", style: styles.rowSmall },
];

/** 선화의 선 하나하나에 붙여 카드가 떠오를 때 그려지게 합니다. */
const stroke = stylex.props(styles.cardArtStroke);

const ARCS = [
  {
    mark: "∙",
    numeral: "I",
    title: "신화",
    latin: "Myth",
    note: "다양한 신화관이 하나의 이야기로 얽힙니다.",
    art: (
      <>
        <circle {...stroke} pathLength={1} cx="74" cy="84" r="46" />
        <circle {...stroke} pathLength={1} cx="126" cy="84" r="46" />
        <circle {...stroke} pathLength={1} cx="100" cy="128" r="46" />
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
        <circle {...stroke} pathLength={1} cx="100" cy="100" r="14" />
        <ellipse {...stroke} pathLength={1}
          cx="100"
          cy="100"
          rx="84"
          ry="28"
          transform="rotate(-24 100 100)"
        />
        <ellipse {...stroke} pathLength={1}
          cx="100"
          cy="100"
          rx="56"
          ry="74"
          transform="rotate(32 100 100)"
        />
        <circle {...stroke} cx="168" cy="72" r="4" fill="currentColor" />
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
        <path {...stroke} pathLength={1} d="M16 32 100 100M184 32 100 100M16 168 100 100M184 168 100 100M100 12v176M12 100h176" />
        <circle {...stroke} pathLength={1} cx="100" cy="100" r="30" />
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
      <a href="#content" {...stylex.props(invertedTheme, styles.skip)}>
        본문 바로가기
      </a>
      <SiteMenu />

      <main id="content" tabIndex={-1} {...stylex.props(styles.main)}>
        <section {...stylex.props(styles.hero)}>
          <svg
            {...stylex.props(styles.heroRings)}
            viewBox="0 0 1000 1000"
            aria-hidden="true"
          >
            <circle cx="500" cy="500" r="490" />
            <circle cx="500" cy="500" r="470" />
            <circle cx="500" cy="500" r="300" />
          </svg>
          <h1 {...stylex.props(styles.heroTitle)}>
            <VisuallyHidden>프로젝트 제로</VisuallyHidden>
            <span aria-hidden="true" {...stylex.props(styles.heroLetters)}>
              {LETTER_ROWS.map((row) => (
                <span key={row.word} {...stylex.props(styles.row, row.style)}>
                  {row.word.split("").map((letter, index) => (
                    <span key={`${letter}-${index}`}>{letter}</span>
                  ))}
                </span>
              ))}
            </span>
          </h1>
          <div {...stylex.props(styles.axis)} aria-hidden="true">
            <span>T − 3 MYTH</span>
            <span {...stylex.props(styles.axisMiddle)}>T − 2 COSMOS</span>
            <span {...stylex.props(styles.axisMiddle)}>T − 1 WAR</span>
            <span>T = 0</span>
          </div>
        </section>

        <section
          id="prologue"
          tabIndex={-1}
          {...stylex.props(styles.prologue, styles.sectionFocus)}
          aria-labelledby="prologue-title"
        >
          <div {...stylex.props(styles.prologueStage)}>
          <h2 id="prologue-title" {...stylex.props(styles.label)}>
            서사
          </h2>
          <p {...stylex.props(styles.statement, styles.rise)}>
            {STATEMENT_WORDS.map((word) => {
              const order = styles.word(word.order, word.total);
              // 기호를 건너뛰고 읽어도 구절 사이가 띄어지도록, 기호 앞뒤에도 공백 글자를 둡니다.
              return (
                <Fragment key={word.order}>
                  {word.order > 0 && " "}
                  {word.glyph ? (
                    <span {...stylex.props(order, styles.glyph)} aria-hidden="true">
                      {word.text}
                    </span>
                  ) : (
                    <span {...stylex.props(order)}>{word.text}</span>
                  )}
                </Fragment>
              );
            })}
          </p>
          </div>
        </section>

        <section
          id="structure"
          tabIndex={-1}
          {...stylex.props(invertedTheme, styles.structure, styles.sectionFocus)}
          aria-labelledby="structure-title"
        >
          <h2 id="structure-title" {...stylex.props(styles.structureTitle)}>
            세 개의 흐름
          </h2>
          <ol>
            {ARCS.map((arc) => (
              <li key={arc.numeral} {...stylex.props(styles.arc)}>
                <p {...stylex.props(styles.arcMark)} aria-hidden="true">
                  {arc.mark} <span lang="en">{arc.latin}</span>
                </p>
                <article {...stylex.props(paperTheme, styles.card)}>
                  <div {...stylex.props(invertedTheme, styles.cardArt)}>
                    <svg viewBox="0 0 200 200" aria-hidden="true" {...stylex.props(styles.cardArtSvg)}>
                      {arc.art}
                    </svg>
                  </div>
                  <div {...stylex.props(styles.cardBody)}>
                    <h3 {...stylex.props(styles.cardTitle)}>{arc.title}</h3>
                    <p {...stylex.props(styles.cardLatin)} lang="en">
                      {arc.latin}
                    </p>
                    <p {...stylex.props(styles.cardNote)}>{arc.note}</p>
                  </div>
                </article>
                <p {...stylex.props(styles.arcNumeral)} aria-hidden="true">
                  {arc.numeral}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section
          id="archive"
          tabIndex={-1}
          {...stylex.props(invertedTheme, styles.archive, styles.sectionFocus)}
          aria-labelledby="archive-title"
        >
          <p {...stylex.props(styles.archiveEyebrow)} lang="en">
            The Archive
          </p>
          <h2 id="archive-title" {...stylex.props(styles.archiveTitle)}>
            기록 보관소
          </h2>
          <ul {...stylex.props(styles.archiveGrid)}>
            {ARCHIVE.map((item) => (
              <li key={item.title} {...stylex.props(styles.slot, styles.rise)}>
                <h3 {...stylex.props(styles.slotTitle)}>{item.title}</h3>
                <p {...stylex.props(styles.slotMeta)} lang="en">
                  {item.latin}
                </p>
                <p {...stylex.props(styles.slotMeta, styles.slotStatus)}>기록 준비 중</p>
              </li>
            ))}
          </ul>
        </section>

        <section {...stylex.props(styles.closing)}>
          <p {...stylex.props(styles.closingZero)} aria-hidden="true">
            0
          </p>
          <p {...stylex.props(styles.closingLine)}>모든 것은 제로에서 시작된다.</p>
          <Link href="/" {...stylex.props(styles.closingLink)}>
            인트로 다시 보기
          </Link>
        </section>
      </main>

      <footer {...stylex.props(styles.footer)}>
        <small>
          © 2026 프로젝트 제로 · <a href={SOURCES_URL}>3D 모델·글꼴·아이콘 출처 (README)</a> ·{" "}
          <a href={STORYBOOK_URL}>디자인 시스템(Storybook)</a>
        </small>
      </footer>
    </>
  );
}
