const fs=require('fs'),path=require('path'),vm=require('vm');const JS=path.join(__dirname,'..','..','js');
const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['data_gen.js','combat.js','sim_engine.js','game_core.js'])vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f});
const Sim=ctx.GuildSim,Gm=ctx.GuildGame;const N=40;
const seg=w=>Math.min(2,Math.floor(w/16));const T=[0,1,2].map(()=>({c:0,n:0,cOk:0,nOk:0,cls:{},clsAll:{},type:{},posted:{c:0,n:0},exp:{c:0,n:0}}));
const a0=Gm.newGame(Sim.defaults(),1).advs[0];console.log('adv keys',Object.keys(a0).join(','));
for(let i=0;i<N;i++){const g=Gm.newGame(Sim.defaults(),9000+i);Gm.autoPlace(g,true);const seen=new Set(),seenQ=new Set(),taken=new Set();let prev=new Map();
 for(let w=0;w<48;w++){Gm.autoRequests(g);{const S0=T[seg(w)];for(const q of g.board){if(seenQ.has(q.id))continue;seenQ.add(q.id);const nc=!Gm.isCombat(q);S0.posted[nc?'n':'c']++;if(nc){const k=q.req.map(r=>Gm.STATS[r]||r).join('+');S0.req=S0.req||{};S0.req[k]=(S0.req[k]||0)+1;}}}Gm.stepWeek(g);Gm.autoCook(g);if(g.week%Gm.WPM===0)Gm.autoPlace(g,false);
  const S=T[seg(w)];
  for(const x of g.active){if(seen.has(x.uid)||!x.q||x.dgRun||x.q.rq)continue;seen.add(x.uid);taken.add(x.q.id);const nc=!Gm.isCombat(x.q);S[nc?'n':'c']++;
   const tn=Gm.QTYPE&&Gm.QTYPE[x.q.type]?(Gm.QTYPE[x.q.type].name||Gm.QTYPE[x.q.type]):x.q.type;if(nc)S.type[tn]=(S.type[tn]||0)+1;
   for(const id of x.party){const a=g.advs.find(b=>b.id===id);if(!a)continue;const c=Gm.CLASS1[a.cls]||a.cls||a.job||'?';const cn=typeof c==='object'?(c.name||JSON.stringify(c)):c;S.clsAll[cn]=(S.clsAll[cn]||0)+1;if(nc)S.cls[cn]=(S.cls[cn]||0)+1;}
   x._nc=nc;if(nc){S.ps=S.ps||{};S.ps[x.party.length]=(S.ps[x.party.length]||0)+1;}}
  {const cur=new Map(g.board.map(q=>[q.id,q]));for(const [id,q] of prev){if(!cur.has(id)&&!taken.has(id)){S.exp[Gm.isCombat(q)?'c':'n']++;}}prev=cur;}
 }}
const nm=['1~16주','17~32주','33~48주'];
T.forEach((S,k)=>{console.log(nm[k],'출발 전투',(S.c/N).toFixed(1),'비전투',(S.n/N).toFixed(1),'비전투 비율',Math.round(S.n/(S.c+S.n)*100)+'%','| 게시 전투',(S.posted.c/N).toFixed(1),'비전투',(S.posted.n/N).toFixed(1));
 console.log('  안 맡고 사라진 의뢰(만료·철회) 전투',(S.exp.c/N).toFixed(1),'비전투',(S.exp.n/N).toFixed(1));console.log('  비전투 종류',JSON.stringify(S.type));console.log('  비전투 참가 직업',JSON.stringify(S.cls));console.log('  전체 참가 직업',JSON.stringify(S.clsAll));console.log('  비전투 파티 인원',JSON.stringify(S.ps),' 비전투 요구 능력치',JSON.stringify(S.req));});
