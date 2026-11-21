// 주 넘김 구간별 시간: 실제 main.js step()과 같은 순서 (autoRequests는 봇 대신 결정이므로 시간에서 뺌)
const {chromium}=require('playwright');const SP=__dirname;
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files']});const p=await b.newPage({viewport:{width:1280,height:720}});
await p.addInitScript(()=>{let a=11;Math.random=()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};});
await p.goto('file://'+SP+'/qa/index.html?nopick=1');await p.waitForFunction(()=>!document.getElementById('loading'),null,{timeout:120000});await p.waitForTimeout(800);
const R=[];for(let wk=0;wk<72;wk++){R.push(await p.evaluate(async()=>{const w=ms=>new Promise(r=>setTimeout(r,ms));for(let i=0;i<80&&UI.dlgBusy();i++){UI.advance();UI.advance();}
 const s=__s(),G=GuildGame;G.autoRequests(s);const T={};let t=performance.now();const mark=k=>{const n=performance.now();T[k]=n-t;t=n;};
 const before=Director.snap(s),top=s.log[0];G.stepWeek(s);mark('stepWeek');Director.onWeek(before,s,Lobby.Board);mark('director');const f=[];for(const L of s.log){if(L===top)break;f.push(L);}UI.onLogs(f.reverse());mark('onLogs');UI.hud();mark('hud');
 if(s.week%GuildGame.WPM===0){try{localStorage.setItem('qa_prof',GuildGame.serialize(s));}catch(e){}mark('save');}
 await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));mark('frame2');T.week=s.week;await w(20);return T;}));}
const keys=['stepWeek','director','onLogs','hud','save','frame2'];const tot=R.map(r=>keys.reduce((a,k)=>a+(r[k]||0),0)-(r.frame2||0));
const q=(arr,pp)=>{const a=[...arr].sort((x,y)=>x-y);return a[Math.floor(pp*(a.length-1))]};
console.log('total(no frame) p50',q(tot,.5).toFixed(0),'p95',q(tot,.95).toFixed(0),'max',Math.max(...tot).toFixed(0));
for(const k of keys){const v=R.map(r=>r[k]||0);console.log(k,'p50',q(v,.5).toFixed(1),'p95',q(v,.95).toFixed(1),'max',Math.max(...v).toFixed(1));}
const worst=R.map((r,i)=>({w:r.week,t:tot[i],r})).sort((a,b)=>b.t-a.t).slice(0,5);console.log(JSON.stringify(worst.map(x=>({w:x.w,t:Math.round(x.t),s:Math.round(x.r.stepWeek),o:Math.round(x.r.onLogs),d:Math.round(x.r.director),sv:Math.round(x.r.save||0),f:Math.round(x.r.frame2)}))));
await b.close();})();
