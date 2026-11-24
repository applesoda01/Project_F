const {chromium}=require('playwright');const W=+process.argv[2]||1280,H=+process.argv[3]||720,WEEKS=+process.argv[4]||26,COPY=process.argv[5],TAG=process.argv[6]||('w'+WEEKS);
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files']});const p=await b.newPage({viewport:{width:W,height:H}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+COPY+'/index.html?nopick=1');await p.waitForFunction(()=>!document.getElementById('loading'),null,{timeout:120000});await p.waitForTimeout(1200);
const clear=()=>p.evaluate(()=>{for(let k=0;k<200&&UI.dlgBusy();k++){UI.advance();UI.advance();}});
await clear();
for(let w=0;w<WEEKS;w++){await p.evaluate(()=>{const s=__s(),G=GuildGame;const top=s.log[0];G.autoRequests(s);const bf=Director.snap(s);G.stepWeek(s);G.autoCook(s);if(s.week%G.WPM===0)G.autoPlace(s,false);Director.onWeek(bf,s,Lobby.Board);const fresh=[];for(const l of s.log){if(l===top)break;fresh.push(l);}UI.onLogs(fresh.reverse());UI.hud();});await p.waitForTimeout(60);await clear();await p.evaluate(()=>{const l=document.getElementById('rqdLay');if(l&&l.classList.contains('on'))l.dispatchEvent(new Event('pointerdown'));document.querySelectorAll('#gupLay.on,#arrCard.on,#nmPop.on .nm-ok').forEach(e=>e.click&&e.click());});}
await p.waitForTimeout(800);await clear();
const metric=(sel)=>p.evaluate((sel)=>{const root=document.querySelector(sel);if(!root)return null;const st=document.querySelector('#ui')||document.body;const sc=(()=>{const r=root.getBoundingClientRect();return root.offsetWidth?r.width/root.offsetWidth:1;})();
  const vis=el=>{const r=el.getBoundingClientRect();if(r.width<2||r.height<2)return false;const cs=getComputedStyle(el);return cs.visibility!=='hidden'&&cs.display!=='none'&&+cs.opacity>0.05&&r.bottom>0&&r.right>0&&r.top<innerHeight&&r.left<innerWidth;};
  let chars=0;const fs={};const tw=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let n;while(n=tw.nextNode()){const t=n.textContent.replace(/\s+/g,'');if(!t)continue;const el=n.parentElement;if(!el||!vis(el))continue;const px=Math.round(parseFloat(getComputedStyle(el).fontSize)*sc*10)/10;chars+=t.length;fs[px]=(fs[px]||0)+t.length;}
  const ctl=[...root.querySelectorAll('button,input,select,[data-act],[data-sub],[role=button],a[href]')].filter(vis);const dis=ctl.filter(e=>e.disabled||e.classList.contains('off')).length;
  // 누를 수 있는 것의 크기 (화면 px)
  const sizes=ctl.map(e=>{const r=e.getBoundingClientRect();return Math.round(Math.min(r.width,r.height));}).sort((a,b)=>a-b);
  return {scale:+sc.toFixed(3),chars,fs,controls:ctl.length,disabled:dis,minCtl:sizes[0]||null,ctlLt24:sizes.filter(x=>x<24).length,ctlLt32:sizes.filter(x=>x<32).length,scroll:[...root.querySelectorAll('*')].filter(e=>e.scrollHeight>e.clientHeight+8&&/(auto|scroll)/.test(getComputedStyle(e).overflowY)&&vis(e)).length};},sel);
const out={W,H,weeks:WEEKS,screens:{}};
const dismiss=async()=>{for(let k=0;k<12;k++){const on=await p.evaluate(()=>{let n=0;for(const id of ['gupLay','rqdLay']){const l=document.getElementById(id);if(l&&l.classList.contains('on')){l.dispatchEvent(new Event('pointerdown',{bubbles:true}));n++;}}const nb=document.querySelector('#nmPop.on .nm-ok');if(nb){nb.click();n++;}for(let k=0;k<50&&UI.dlgBusy();k++){UI.advance();UI.advance();}return n;});if(!on)break;await p.waitForTimeout(250);}};
const shot=async(name,sel)=>{await dismiss();await p.waitForTimeout(450);await p.screenshot({path:`${TAG}_${name}_${W}x${H}.png`});out.screens[name]=await metric(sel);};
await shot('lobby','.stage-ui');
for(const nm of ['board','req','advs','fac','meals','ledger','trade','codex','order','log','sell','opts']){const ok=await p.evaluate((nm)=>{try{UI.open(nm);return UI.popupName?UI.popupName():true;}catch(e){return 'ERR '+e.message;}},nm);await shot('pop_'+nm,'#pop');out.screens['pop_'+nm]&&(out.screens['pop_'+nm].opened=ok);}
await p.evaluate(()=>{try{UI.close&&UI.close();}catch(e){}});await p.keyboard.press('Escape');await p.waitForTimeout(400);
await p.evaluate(()=>Town.open());await shot('town','.stage-ui');await p.evaluate(()=>Town.close());
out.state=await p.evaluate(()=>{const s=__s();return {week:s.week,gold:Math.round(s.gold),advs:s.advs.filter(a=>a.alive).length,board:s.board.length,req:s.req.open.length,done:Object.keys(s.req.done).length,grade:s.grade};});out.errs=errs;
require('fs').writeFileSync(`${TAG}_${W}x${H}.json`,JSON.stringify(out,null,1));console.log(JSON.stringify(out.state),'errs',errs.length);await b.close();})();
