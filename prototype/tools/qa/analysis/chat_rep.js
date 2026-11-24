const {chromium}=require('playwright');const SEC=+process.argv[3]||300;
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files']});const p=await b.newPage({viewport:{width:1280,height:720}});
await p.goto('file://'+process.argv[2]+'/index.html?nopick=1');await p.waitForFunction(()=>!document.getElementById('loading'),null,{timeout:120000});await p.waitForTimeout(1200);
const clear=()=>p.evaluate(()=>{for(let k=0;k<200&&UI.dlgBusy();k++){UI.advance();UI.advance();}for(const id of ['gupLay','rqdLay']){const l=document.getElementById(id);if(l&&l.classList.contains('on'))l.dispatchEvent(new Event('pointerdown',{bubbles:true}));}const nb=document.querySelector('#nmPop.on .nm-ok');if(nb)nb.click();});await clear();
await p.evaluate(()=>{const s=__s();const G=GuildGame;const c=G.facCost(s,'집무실');s.gold+=c;G.build(s,'집무실');});
for(let w=0;w<20;w++){await p.evaluate(()=>{const s=__s(),G=GuildGame;const top=s.log[0];G.autoRequests(s);const bf=Director.snap(s);G.stepWeek(s);G.autoCook(s);if(s.week%G.WPM===0)G.autoPlace(s,false);Director.onWeek(bf,s,Lobby.Board);const fresh=[];for(const l of s.log){if(l===top)break;fresh.push(l);}UI.onLogs(fresh.reverse());UI.hud();});await p.waitForTimeout(40);await clear();}
await p.evaluate(()=>{window.__C=[];const f=UI.chat;UI.chat=function(name,text,who,a,grp){window.__C.push({t:performance.now(),name,text,who:who||'',grp:grp||'',w:__s().week});return f.apply(this,arguments);};try{UI.close&&UI.close();}catch(e){}});
await p.keyboard.press('Escape');await p.click('[data-speed="1"]').catch(()=>{});
const t0=Date.now();let w0=await p.evaluate(()=>__s().week);
while(Date.now()-t0<SEC*1000){await p.waitForTimeout(700);await clear();await p.evaluate(()=>{const s=__s();if(UI.popupName&&UI.popupName()){try{document.getElementById('bookRibbon')&&document.getElementById('bookRibbon').click();}catch(e){}}GuildGame.autoRequests(s);});}
const R=await p.evaluate(()=>({C:window.__C,week:__s().week,advs:__s().advs.filter(a=>a.alive).length}));
require('fs').writeFileSync('chat_rep.json',JSON.stringify({sec:SEC,w0,w1:R.week,advs:R.advs,C:R.C}));console.log('weeks',w0,'→',R.week,'lines',R.C.length);await b.close();})();
