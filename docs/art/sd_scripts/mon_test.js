const {chromium}=require('playwright');
const S='/tmp/claude-0/-home-claude/038296be-4010-5ec7-a983-f07d02523297/scratchpad';const TAG=process.argv[2];const MONS=(process.argv[3]||'').split(',').filter(Boolean);
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files']});const errs=[];const ctx=await b.newContext({viewport:{width:1920,height:1080}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+S+'/mv_bg/index.html?nopick');await p.waitForTimeout(4000);
let pick=null;for(let i=0;i<60&&!pick;i++){pick=await p.evaluate(()=>{const s=Expedition.__s();const c=s.active.filter(x=>x.fight&&x.back-s.week>=0);const x=c[0];return x?{id:x.q.id,en:x.fight.enemies.map(m=>m.mon+':'+m.name),win:x.fight.win}:null;});if(!pick){await p.evaluate(()=>document.querySelector('#dWeek').click());await p.waitForTimeout(150);}}
console.log('pick',JSON.stringify(pick));await p.waitForTimeout(400);
for(let t=0;t<60;t++){const on=await p.evaluate(([id,M])=>{const s=Expedition.__s();const x=s.active.find(z=>z.q.id===id);if(!x)return 'gone';if(M.length)x.fight.enemies.forEach((m,i)=>{m.mon=M[i%M.length];});Expedition.close();Expedition.__open(id);return document.querySelector('#expView').classList.contains('on');},[pick.id,MONS]);if(on===true||on==='gone'){console.log('open',on,t);break;}await p.waitForTimeout(500);}
let bb=null;for(let w=0;w<40&&!bb;w++){await p.waitForTimeout(250);const ev=await p.$('#expView canvas')||await p.$('#expView');bb=ev?await ev.boundingBox():null;}console.log('bb',!!bb);
const fs=require('fs');if(bb)for(let i=0;i<80;i++){const d=await p.evaluate(()=>document.querySelector('#expView canvas').toDataURL('image/png'));fs.writeFileSync(`${S}/mont2/${TAG}_${String(i).padStart(3,'0')}.png`,Buffer.from(d.split(',')[1],'base64'));await p.waitForTimeout(200);}
console.log('errors',JSON.stringify(errs.slice(0,5)));await ctx.close();await b.close();})();
