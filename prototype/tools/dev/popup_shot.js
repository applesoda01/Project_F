// 팝업 시안 캡처 도구 (Claude 작업 공간용, Playwright 필요)
// 게임(prototype/index.html)을 띄워 상태를 만든 뒤 팝업을 열고, 필요하면 마우스를 올려 오버 창까지 캡처한다.
//
//   node tools/dev/popup_shot.js --pop=ledger --weeks=58 --out=/tmp/ledger.png
//   node tools/dev/popup_shot.js --pop=advs --weeks=60 --grade=1 --hover="#popBody .ux-row[data-adv]" --out=/tmp/advs_tip.png
//   node tools/dev/popup_shot.js --lab=kitchen --out=/tmp/kitchen.png              (식당 시험 상태로 바로 열기)
//   node tools/dev/popup_shot.js --pop=fac --setup="s.gold=5000; G.build(s,'관리소');" --out=/tmp/fac.png
//
// 옵션
//   --pop=이름     board · advs · fac · meals · ledger · log · codex · promo · sell (UI.open 이름)
//   --weeks=N      새 게임(시드 --seed, 기본 77)을 N주 진행. 매주 autoCook(요리 자동 발견) 포함 (기본 20)
//   --grade=N      진행 뒤 길드 등급을 N으로 (0=F, 1=E …)
//   --setup="JS"   팝업을 열기 전에 실행할 코드. 쓸 수 있는 이름: G(GuildGame), s(상태), UI
//   --click="css"  팝업을 연 뒤 차례로 누를 요소 (쉼표로 여러 개: --click="[data-kmat=mat_x003],[data-kcook]")
//   --hover="css"  마지막에 마우스를 올릴 요소 (오버 창 캡처)
//   --wait=ms      캡처 전 기다림 (기본 700. 연출을 찍을 때 늘림)
//   --lab=kitchen  주소에 ?lab=kitchen 을 붙여 식당 시험 상태로 시작 (--pop·--weeks 무시)
//   --dsf=2        화면 배율 (기본 1). 사람에게 보여 줄 확대 캡처에 2
//   --vw/--vh      창 크기 (기본 1920×1080). 작은 창(예: 1366×768)에서 배율 문제를 확인할 때
//   --full         화면 전체를 찍음 (기본은 팝업 둘레만)
//   --nobars       스크롤 막대를 숨기고 찍음 (기본은 실제 게임처럼 보임. Playwright 기본값은 숨김이라 막대 자리 문제를 놓칠 수 있음)
//   --out=파일     저장 경로 (기본 popup_shot.png)
//
// 주의: 시안 확인용. 게임 화면의 HUD(금고 등)는 main.js의 원래 상태를 보여 주므로 --setup으로 바꾼 값과 다를 수 있음.
'use strict';
const path = require('path');
const { chromium } = require('playwright');
const arg = k => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.slice(k.length + 3) : null; };
const flag = k => process.argv.includes('--' + k);

(async () => {
  const vw = +(arg('vw') || 1920), vh = +(arg('vh') || 1080), out = arg('out') || 'popup_shot.png';
  const lab = arg('lab'), pop = arg('pop'), weeks = +(arg('weeks') || 20), grade = arg('grade'), seed = +(arg('seed') || 77);
  const b = await chromium.launch(flag('nobars') ? {} : { ignoreDefaultArgs: ['--hide-scrollbars'] }), p = await b.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: +(arg('dsf') || 1) });   // 기본: 실제 게임처럼 스크롤 막대를 보이게 찍음
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const url = 'file://' + path.resolve(__dirname, '../../prototype/index.html') + (lab ? '?lab=' + lab : '');
  await p.goto(url); await p.waitForTimeout(lab ? 4500 : 3500);
  if (!lab) {
    await p.evaluate(() => { const d = document.querySelector('#dlg'); if (d) d.click(); });   // 시작 대화 닫기
    await p.evaluate(({ pop, weeks, grade, seed, setup }) => {
      const G = window.GuildGame, s = G.newGame(window.GuildSim.defaults(), seed), UI = window.UI;
      for (let i = 0; i < weeks; i++) { G.stepWeek(s); G.autoCook(s); }
      if (grade != null) G.debugSetGrade(s, +grade);
      if (setup) new Function('G', 's', 'UI', setup)(G, s, UI);
      window.__s = s; UI.setState(s); if (pop) UI.open(pop);
    }, { pop, weeks, grade, seed, setup: arg('setup') });
  }
  await p.waitForTimeout(500);
  for (const sel of (arg('click') || '').split(',').filter(Boolean)) { await p.click(sel); await p.waitForTimeout(150); }
  const hv = arg('hover');
  if (hv) { const r = await p.evaluate(sel => { const e = document.querySelector(sel); if (!e) return null; e.scrollIntoView({ block: 'nearest' }); const b = e.getBoundingClientRect(); return [b.x + b.width / 2, b.y + b.height / 2]; }, hv); if (r) await p.mouse.move(r[0], r[1]); else errs.push('hover 대상 없음: ' + hv); }
  await p.waitForTimeout(+(arg('wait') || 700));
  let clip;
  if (!flag('full')) clip = await p.evaluate(() => { const e = document.querySelector('#pop'); if (!e) return null; const r = e.getBoundingClientRect(); return { x: Math.max(0, r.x - 40), y: Math.max(0, r.y - 50), width: Math.min(innerWidth, r.width + 80), height: Math.min(innerHeight, r.height + 100) }; });
  await p.screenshot({ path: out, clip: clip || undefined });
  console.log('저장:', out, errs.length ? '\n오류: ' + errs.join(' | ') : '');
  await b.close();
})();
