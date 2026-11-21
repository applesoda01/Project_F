// 처음 10분 봇: 타이틀 → 새로 시작 → 프롤로그(건너뜀) → 튜토리얼을 빛나는 칸만 눌러 진행
const {chromium}=require('playwright');const W=+process.argv[2]||1280,H=W===1920?1080:720;const SP=__dirname,OUT=SP+'/qa_out/';
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files','--autoplay-policy=no-user-gesture-required']});
const p=await b.newPage({viewport:{width:W,height:H}});const errs=[];p.on('pageerror',e=>errs.push('PAGE '+e.message));p.on('console',m=>{if(m.type()==='error'||m.type()==='warning')errs.push(m.type()+' '+m.text().slice(0,200))});
const t0=Date.now();const T=()=>((Date.now()-t0)/1000).toFixed(1);const ev=[];const log=(k,o)=>{ev.push(Object.assign({t:+T(),k},o||{}));};
await p.goto('file://'+SP+'/qa/index.html');await p.waitForFunction(()=>!document.getElementById('loading'),null,{timeout:120000});log('loaded');
await p.waitForTimeout(2500);await p.screenshot({path:OUT+'f00_title_'+W+'.png'});
await p.evaluate(()=>window.postMessage({collegium:'title',act:'new'},'*'));await p.waitForSelector('[data-sp="new"]',{timeout:15000});await p.waitForTimeout(800);await p.screenshot({path:OUT+'f01_slot_'+W+'.png'});
await p.click('[data-sp="new"]');log('slot');
await p.waitForTimeout(4000);const pro=await p.evaluate(()=>{const v=document.getElementById('prologueVid');return {on:document.getElementById('prologue').classList.contains('on'),dur:v.duration,t:v.currentTime}});log('prologue',pro);
await p.screenshot({path:OUT+'f02_prologue_'+W+'.png'});await p.keyboard.press('Escape');await p.waitForTimeout(2500);
let clicks=0,lines=[],last='',stallAt=Date.now(),lastKey='',shots=0;
const tEnd=Date.now()+11*60e3;for(let i=0;i<4000&&Date.now()<tEnd;i++){
 const st=await p.evaluate(()=>{const s=__s(),t=s.tut||{};const g=[...document.querySelectorAll('.tutGlow')].filter(e=>{const r=e.getBoundingClientRect();return r.width>0});const gl=g[0];let c=null;if(gl){const r=gl.getBoundingClientRect();c=[r.left+r.width/2,r.top+r.height/2,gl.outerHTML.slice(0,90)]}
  const nx=document.getElementById('dlgNext');const h=document.querySelector('.tutHint.on');return {busy:UI.dlgBusy(),full:nx&&!nx.hidden,txt:(document.getElementById('dlgText')||{}).textContent,who:(document.querySelector('#dlgName')||{}).textContent,step:t.step,ph:t.ph,base:!!t.base,hint:h?h.textContent:'',glow:c,pop:UI.popupName&&UI.popupName(),week:s.week,place:!!document.querySelector('#placeLay.on'),items:s.place.items.length,gold:s.gold}});
 const key=st.step+'/'+st.ph; if(key==='FT0003/away'){ if(!global.__aw){global.__aw=Date.now();} const el=Date.now()-global.__aw; for(const [ms,nm] of [[3500,'a1'],[14500,'a2']]){ if(el>ms&&!global['__'+nm]){global['__'+nm]=1; await p.screenshot({path:OUT+'away_'+nm+'_'+W+'.png'});} } }if(key!==lastKey){log('phase',{key,hint:st.hint,week:st.week});lastKey=key;stallAt=Date.now();if(shots<30){await p.screenshot({path:OUT+'f1_'+String(++shots).padStart(2,'0')+'_'+key.replace(/\W/g,'_')+'_'+W+'.png'});}}
 if(st.base){log('tutorial_end',{clicks,lines:lines.length,chars:lines.reduce((a,l)=>a+l.length,0),week:st.week,gold:st.gold});break;}
 if(st.busy){ if(st.full&&st.txt!==last){lines.push(st.txt);last=st.txt;} await p.click('#dlg',{timeout:2000}).catch(()=>{}); clicks++; await p.waitForTimeout(120); continue;}
 if(st.place){ /* 배치 모드: 초록 칸을 찾아 바닥을 차례로 눌러 봄 (사람은 초록 칸을 보고 한 번에 누름 → 클릭 1회로 셈) */ const n0=st.items; let ok=false; for(const [fx,fy] of [[.45,.62],[.55,.6],[.4,.55],[.6,.7],[.5,.5],[.35,.65],[.65,.55],[.5,.72]]){ await p.mouse.move(W*fx,H*fy); await p.waitForTimeout(150); await p.mouse.click(W*fx,H*fy); await p.waitForTimeout(500); const n=await p.evaluate(()=>__s().place.items.length); if(n>n0){ok=true;break;} } clicks++; log('click',{key,el:'floor:'+ok,hint:st.hint,glowDuringPlace:st.glow&&st.glow[2]}); await p.waitForTimeout(800); continue;}
 if(st.glow){ await p.mouse.click(st.glow[0],st.glow[1]); clicks++; log('click',{key,el:st.glow[2],hint:st.hint}); stallAt=Date.now(); await p.waitForTimeout(700); continue;}

 if(Date.now()-stallAt>20000){log('stall',{key,hint:st.hint,pop:st.pop});await p.screenshot({path:OUT+'stall_'+key.replace(/\W/g,'_')+'_'+W+'.png'});stallAt=Date.now()+1e9;}
 await p.waitForTimeout(250);
}
// 튜토리얼 뒤 자유 플레이 첫 화면
await p.waitForTimeout(1500);await p.screenshot({path:OUT+'f9_free_'+W+'.png'});
const free=await p.evaluate(()=>{const s=__s();return {week:s.week,gold:s.gold,advs:s.advs.length,board:s.board.length,goal:(document.getElementById('goalBox')||{}).textContent}});log('free',free);
require('fs').writeFileSync(OUT+'first10_'+W+'.json',JSON.stringify({ev,lines,errs},null,1));
console.log(JSON.stringify(ev.filter(e=>e.k!=='click').slice(-40)));console.log('clicks',clicks,'lines',lines.length,'errs',errs.length,errs.slice(0,8));await b.close();})();
