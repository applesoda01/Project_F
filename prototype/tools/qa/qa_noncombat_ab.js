const fs=require('fs'),path=require('path'),vm=require('vm');const JS=path.join(__dirname,'..','..','js');
const BASE=+process.argv[2]||0.55, DROP=(process.argv[3]||'0,0,0').split(',').map(Number), N=+process.argv[4]||40, W=+process.argv[5]||48;
const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['data_gen.js','combat.js','sim_engine.js','game_core.js']){let src=fs.readFileSync(path.join(JS,f),'utf8');
 if(f==='game_core.js'){const n0=src.length;
  src=src.replace('0.55 + 1.1 * (F - 1)',`${BASE} + 1.1 * (F - 1)`);
  src=src.replace('if (perceived(s, a, questP(s, party, q)) >= th) break;',`if (perceived(s, a, questP(s, party, q)) >= (isCombat(q) ? th : th - [${DROP}][a.risk])) break;`);
  src=src.replace('        if (pp < th) continue;',`        if (pp < (isCombat(q) ? th : th - [${DROP}][a.risk])) continue;`);
  if(!src.includes(`${BASE} + 1.1`)||!src.includes(`[${DROP}][a.risk])) continue;`))throw 'patch fail';}
 vm.runInContext(src,ctx,{filename:f});}
const Sim=ctx.GuildSim,Gm=ctx.GuildGame;
const seg=w=>Math.min(2,Math.floor(w/16));const T=[0,1,2].map(()=>({c:0,n:0,expC:0,expN:0,nOk:0,nDone:0,cOk:0,cDone:0,solo:0}));
let gold=0,net=0,gE=[],minG=0,dead=0,lv=0,na=0;
for(let i=0;i<N;i++){const g=Gm.newGame(Sim.defaults(),9000+i);Gm.autoPlace(g,true);const seen=new Set(),taken=new Set();let prev=new Map(),mg=1e9,ge=null;const live=new Map();
 for(let w=0;w<W;w++){Gm.autoRequests(g);Gm.stepWeek(g);Gm.autoCook(g);if(g.week%Gm.WPM===0)Gm.autoPlace(g,false);mg=Math.min(mg,g.gold);if(ge==null&&g.grade>=1)ge=g.week;
  if(w>=48)continue;const S=T[seg(w)];
  for(const x of g.active){if(seen.has(x.uid)||!x.q||x.dgRun||x.q.rq)continue;seen.add(x.uid);taken.add(x.q.id);const nc=!Gm.isCombat(x.q);S[nc?'n':'c']++;if(nc&&x.party.length===1)S.solo++;if(nc){S.nDone++;if(x.ok)S.nOk++;}else{S.cDone++;if(x.ok)S.cOk++;}live.set(x.uid,{nc,S});}
  for(const [u,o] of live){if(!g.active.some(x=>x.uid===u)){live.delete(u);}}
  const cur=new Map(g.board.map(q=>[q.id,q]));for(const [id,q] of prev){if(!cur.has(id)&&!taken.has(id))S[Gm.isCombat(q)?'expC':'expN']++;}prev=cur;
 }
 gold+=g.gold;net+=g.history.slice(0,12).reduce((t,m)=>t+m.net,0)/12;minG+=mg;gE.push(ge);dead+=g.stats.deaths||0;
 for(const a of g.advs)if(a.alive){lv+=a.lv;na++;}
}
const f=x=>(x/N).toFixed(1);gE.sort((a,b)=>(a??1e9)-(b??1e9));
console.log(`기준 ${BASE} · 비전투 출발 기준 −[${DROP}]`);
['1~16','17~32','33~48'].forEach((nm,k)=>{const S=T[k];console.log(` ${nm}주  전투 ${f(S.c)}  비전투 ${f(S.n)} (혼자 ${f(S.solo)})  사라짐 전투 ${f(S.expC)} 비전투 ${f(S.expN)}`)});
const tn=T.reduce((a,S)=>a+S.n,0),tc=T.reduce((a,S)=>a+S.c,0),te=T.reduce((a,S)=>a+S.expN,0);
const nd=T.reduce((a,S)=>a+S.nDone,0),no=T.reduce((a,S)=>a+S.nOk,0),cd=T.reduce((a,S)=>a+S.cDone,0),co=T.reduce((a,S)=>a+S.cOk,0);console.log(` 성공률 비전투 ${Math.round(no/nd*100)}% · 전투 ${Math.round(co/cd*100)}%`);console.log(` 48주 합 전투 ${f(tc)} 비전투 ${f(tn)} 비전투 사라짐 ${f(te)} | 월 순이익(첫해) ${Math.round(net/N)}G · 금고 최저 ${Math.round(minG/N)}G · ${W}주 금고 ${Math.round(gold/N)}G · E급 중앙 ${gE[Math.floor(N/2)]}주 · 사망 ${f(dead)} · 평균 Lv ${(lv/na).toFixed(1)}`);
