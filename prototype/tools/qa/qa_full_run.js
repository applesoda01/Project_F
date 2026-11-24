const fs=require('fs'),path=require('path'),vm=require('vm');const JS=path.join(__dirname,'..','..','js');
const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['data_gen.js','combat.js','sim_engine.js','game_core.js'])vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f});
const Sim=ctx.GuildSim,Gm=ctx.GuildGame;
const N=+process.argv[2]||20, W=+process.argv[3]||240, BOT=process.argv[4]||'full';
const out=[];
for(let i=0;i<N;i++){const g=Gm.newGame(Sim.defaults(),9000+i);Gm.autoPlace(g,true);
 const M={seed:9000+i,first:{},lastNew:{},weekly:[]};const seen={q:new Set(),mon:0,dish:0,mat:0,kind:new Set()};
 const mark=(k,w)=>{if(M.first[k]==null)M.first[k]=w};
 for(let w=0;w<W;w++){
  Gm.autoRequests(g);
  if(BOT==='full'){
   // 던전: 열려 있고 예약 · 진행 없으면 레벨 높은 3명
   if(g.dg&&!g.dg.plan&&!g.active.some(x=>x.dgRun)&&(!g.dg.clear||w%4===0)){const town=g.advs.filter(a=>a.alive&&a.state!=='injured'&&a.state!=='dead').sort((a,b)=>b.lv-a.lv).slice(0,3);if(town.length>=2){const r=Gm.dgPlan(g,town.map(a=>a.id),true);if(r.ok)mark('dgSend',g.week);}}
   // 시설 · 업그레이드
   for(const f of Object.keys(Gm.FAC_COST)){const c=Gm.FAC_COST[f];if(c==null||g.built[f]||c>g.grade||f==='집무실')continue;const cost=c===0?1000:g.cfg.econ.buildCost[c];if(g.gold>=cost+600)Gm.build(g,f);}
   for(const f of Gm.UPG){if(g.built[f]&&!(g.up&&g.up[f])&&g.gold>=Gm.upgCost(g,f)+800)Gm.upgrade(g,f);}
  }
  const L0=g.log.length;Gm.stepWeek(g);Gm.autoCook(g);if(g.week%Gm.WPM===0)Gm.autoPlace(g,false);
  const nw=g.log.filter(l=>l.week===g.week-1||l.week===g.week);
  for(const l of g.log.slice(0,Math.max(0,g.log.length-L0+40))){if(l._s)continue;l._s=1;const t=l.text||'';
   if(/E급으로 승급/.test(t))mark('guildE',l.week);
   if(/메인 퀘스트|다리를 지켜라/.test(t)&&l.kind==='main')mark('mainSeen',l.week);
   if(/정복했습니다!/.test(t))mark('dgClear',l.week);
   if(/발견되었습니다/.test(t)&&l.kind==='dungeon')mark('dgOpen',l.week);
   if(/E급 모험가가 되었습니다/.test(t))mark('advE',l.week);
   if(/D급 모험가가 되었습니다/.test(t))mark('advD',l.week);
   if(/관리소.*지었습니다|관리소를 지었/.test(t))mark('mgr',l.week);
   if(/업그레이드했습니다/.test(t))mark('upg1',l.week);
   if(/세상을 떠|돌아오지 못했/.test(t))mark('death1',l.week);
   if(l.kind)seen.kind.add(l.kind);}
  for(const x of g.active){if(x.q&&x.q.name&&!seen.q.has(x.q.name)){seen.q.add(x.q.name);M.lastNew.q=g.week;}}
  const mon=Object.keys(g.seenMons||{}).length,dish=Object.keys(g.dishes||{}).length,mat=(g.knownMats&&(g.knownMats.size||Object.keys(g.knownMats).length))||0;
  if(mon>seen.mon){seen.mon=mon;M.lastNew.mon=g.week}if(dish>seen.dish){seen.dish=dish;M.lastNew.dish=g.week}if(mat>seen.mat){seen.mat=mat;M.lastNew.mat=g.week}
  if(g.week%12===0){const al=g.advs.filter(a=>a.alive);M.weekly.push({w:g.week,gold:Math.round(g.gold),grade:g.grade,advs:al.length,lvMax:Math.max(...al.map(a=>a.lv)),lvAvg:+(al.reduce((t,a)=>t+a.lv,0)/al.length).toFixed(1),gE:al.filter(a=>a.grade>=1).length,gD:al.filter(a=>a.grade>=2).length,dg:g.dg?g.dg.prog:null,q:seen.q.size,done:g.stats.done,fail:g.stats.fail,dead:g.stats.deaths||0,fame:Math.round(g.fame||0),pop:Math.round(g.pop)});}
 }
 M.end={q:seen.q.size,mon:seen.mon,dish:seen.dish,mat:seen.mat,reqDone:(g.req&&g.req.done&&g.req.done.length)||null,built:Object.keys(g.built),main:g.main&&g.main.state,mainTries:g.main&&g.main.tries};
 out.push(M);}
fs.writeFileSync(path.join(__dirname,'qa_out',`full_${BOT}_${N}x${W}.json`),JSON.stringify(out));console.log('ok',N,W,BOT);
