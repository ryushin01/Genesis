/**
 * KBIZ한마음명조(변형할 수 없어 원본 파일을 통째로 씀)를 다 받은 뒤 화면을 보여 줍니다.
 * - 받는 동안 검은 화면에 붉은 빛줄기가 번지는 로딩 화면을 덮습니다(html[data-fonts="loading"]).
 * - 8초가 지나거나 글꼴을 받지 못하면 글꼴 정의(#font-faces)를 꺼서 늦게 도착해도 글자가 바뀌지 않게 하고, 운영체제 글꼴로 그대로 보여 줍니다.
 * - 자바스크립트가 없으면 data-fonts가 붙지 않아 로딩 화면이 나오지 않습니다.
 */
export const FONT_LOADER_TIMEOUT_MS = 8000;

/** 글꼴 정의는 외부 CSS 대신 페이지에 바로 넣어, CSS를 기다리느라 제한 시간 타이머가 늦게 시작하지 않게 합니다. */
export const FONT_FACE_CSS = "@font-face {font-family: \"KBIZ Hanmaum Myungjo\";font-style: normal;font-weight: 400;font-display: swap;src: url(\"/fonts/kbiz-hanmaum-myungjo/KBIZHanmaumMyungjo.woff\") format(\"woff\");unicode-range: U+1100-11FF, U+3130-318F, U+A960-A97F, U+AC00-D7A3, U+D7B0-D7FF;}";

export const FONT_LOADER_SCRIPT = `(function(){var d=document.documentElement,f=document.fonts;var end=false;function done(ok){if(end)return;end=true;if(!ok){var s=document.getElementById('font-faces');if(s)s.disabled=true}d.dataset.fonts='ready'}if(!f||!f.load){done(true);return}d.dataset.fonts='loading';var t=setTimeout(function(){done(false)},${FONT_LOADER_TIMEOUT_MS});f.load('400 1em "KBIZ Hanmaum Myungjo"','가').then(function(){clearTimeout(t);done(true)},function(){clearTimeout(t);done(false)})})()`;

export function FontLoader() {
  return (
    <>
      <div className="font-loader" role="status">
        <span className="font-loader__ray" aria-hidden="true" />
        <p className="font-loader__text">
          <span className="font-loader__mark" aria-hidden="true">
            Genesis
          </span>
          태초의 문장을 새기는 중입니다
        </p>
      </div>
      <script dangerouslySetInnerHTML={{ __html: FONT_LOADER_SCRIPT }} />
    </>
  );
}
