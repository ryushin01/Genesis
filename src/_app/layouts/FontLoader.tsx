/**
 * KBIZ한마음명조(변형할 수 없어 원본 파일을 통째로 씀)를 다 받은 뒤 화면을 보여 줍니다.
 * - 받는 동안 검은 화면에 붉은 빛줄기가 번지는 로딩 화면을 덮습니다(html[data-fonts="loading"]).
 * - 8초가 지나거나 글꼴을 받지 못하면 운영체제 글꼴로 그대로 보여 줍니다.
 * - 자바스크립트가 없으면 data-fonts가 붙지 않아 로딩 화면이 나오지 않습니다.
 */
export const FONT_LOADER_TIMEOUT_MS = 8000;

export const FONT_LOADER_SCRIPT = `(function(){var d=document.documentElement,f=document.fonts;function done(){d.dataset.fonts='ready'}if(!f||!f.load){done();return}d.dataset.fonts='loading';var t=setTimeout(done,${FONT_LOADER_TIMEOUT_MS});f.load('400 1em "KBIZ Hanmaum Myungjo"','가').then(function(){clearTimeout(t);done()},function(){clearTimeout(t);done()})})()`;

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
