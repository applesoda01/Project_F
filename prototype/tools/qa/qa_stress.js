// 안정성: 72주 진행 + 매 4주 모든 창 열기 + 화면 넘침 검사 + 극단 상황
const {chromium}=require('playwright');const W=+process.argv[2]||1280,H=W===1920?1080:720,SEED=+process.argv[3]||11;const SP=__dirname,OUT=SP+'/qa_out/';
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files']});const p=await b.newPage({viewport:{width:W,height:H}});const errs=[];
p.on('pageerror',e=>errs.push({w:-1,m:'PAGE '+e.message}));p.on('console',m=>{if(m.type()==='error')errs.push({w:-1,m:m.text().slice(0,200)})});
await p.addInitScript(sd=>{let a=sd;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};},SEED);
await p.goto('file://'+SP+'/qa/index.html?nopick=1');await p.waitForFunction(()=>!document.getElementById('loading'),null,{timeout:120000});await p.waitForTimeout(800);
const POPS=['board','advs','req','fac','meals','sell','ledger','codex','log','opts'];const over=[];const timing=[];
for(let wk=0;wk<72;wk++){
 const r=await p.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));for(let i=0;i<60&&UI.dlgBusy();i++){UI.advance();UI.advance();}const s=__s(),G=GuildGame;const top=s.log[0];const t=performance.now();G.autoRequests(s);G.stepWeek(s);const f=[];for(const L of s.log){if(L===top)break;f.push(L);}try{UI.onLogs(f.reverse());}catch(e){console.error('onLogs '+e.message)}UI.hud();const ms=performance.now()-t;await w(30);return {week:s.week,ms,gold:s.gold,advs:s.advs.length}});
 for(const e of errs)if(e.w<0)e.w=r.week; timing.push(r.ms);
 if(wk%4===3){ for(const pn of POPS){ const o=await p.evaluate(async pn=>{try{UI.open(pn);}catch(e){console.error('open '+pn+' '+e.message);return null}await new Promise(r=>setTimeout(r,250));
   const bad=[];const vw=innerWidth,vh=innerHeight;for(const el of document.querySelectorAll('.bk-r *, .pop *, #book *')){const r=el.getBoundingClientRect();if(!r.width||!r.height)continue;const cs=getComputedStyle(el);if(cs.visibility==='hidden'||cs.display==='none')continue;
    if(el.scrollWidth>el.clientWidth+2&&cs.overflowX==='visible'&&el.children.length===0&&el.textContent.trim().length>1)bad.push('넘침:'+el.textContent.trim().slice(0,24));
    if(r.right>vw+1||r.bottom>vh+1)if(el.children.length===0&&el.textContent.trim())bad.push('화면밖:'+el.textContent.trim().slice(0,24));}
   UI.close();return [...new Set(bad)].slice(0,6);},pn); if(o&&o.length)over.push({week:r.week,pop:pn,bad:o}); }
   if(wk===23||wk===47){for(const pn of ['board','advs','req','fac','ledger']){await p.evaluate(pn=>UI.open(pn),pn);await p.waitForTimeout(350);await p.screenshot({path:OUT+`s_w${wk+1}_${pn}_${W}.png`});await p.evaluate(()=>UI.close());}}
 }
}
// 극단: 금고 0, 모험가 0
const ext=await p.evaluate(async()=>{const s=__s(),G=GuildGame,out=[];const w=ms=>new Promise(r=>setTimeout(r,ms));
 try{s.gold=0;for(let i=0;i<4;i++){G.autoRequests(s);G.stepWeek(s);}UI.hud();out.push('금고0 4주 ok, gold='+s.gold);}catch(e){out.push('금고0 오류 '+e.message)}
 try{s.advs.length=0;s.active.length=0;for(let i=0;i<4;i++){G.autoRequests(s);G.stepWeek(s);}UI.hud();for(const pn of ['board','advs','req','fac']){UI.open(pn);await w(150);UI.close();}out.push('모험가0 4주 ok, advs='+s.advs.length);}catch(e){out.push('모험가0 오류 '+e.message)}
 try{const raw=G.serialize(s);const ns=G.deserialize(raw);out.push('저장/불러오기 ok '+raw.length+'자, week '+ns.week);}catch(e){out.push('저장 오류 '+e.message)}
 return out;});
timing.sort((a,b)=>a-b);
require('fs').writeFileSync(OUT+`stress_${W}_${SEED}.json`,JSON.stringify({errs,over,ext,weekMs:{p50:timing[36],p95:timing[68],max:timing[71]}},null,1));
console.log('errs',errs.length,JSON.stringify(errs.slice(0,10)));console.log('over',over.length,JSON.stringify(over.slice(0,12)));console.log(ext);console.log('weekMs',timing[36].toFixed(1),timing[68].toFixed(1),timing[71].toFixed(1));await b.close();})();
