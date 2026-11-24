// 분석용 실행기: 정책(P)에 따라 한 판을 돌리고 주별 · 월별 지표를 모은다. 게임 코드는 건드리지 않음.
const ctx=require('./load.js')();const Gm=ctx.GuildGame,Sim=ctx.GuildSim;
const DECO_SPOTS={floor:[[2,3],[11,3],[2,6],[11,6],[6,4],[8,4]],wallL:[1,3,5,7,9,11],wallR:[1,3,5,7,9,11]};
function buyDeco(g,keep){for(const d of Gm.DECO){if(d.id==='table')continue;if(Gm.capOf(g,d.id)<=Gm.placedN(g,d.id))continue;if(g.gold-d.price<keep)continue;
  let ok=false;if(d.kind==='wall'||d.kind==='fire'){for(const w of ['L','R'])for(let i=0;i<14&&!ok;i++)if(Gm.placeOk(g,d.id,{wall:w,i})){ok=!!Gm.placeBuy(g,d.id,{wall:w,i});}}
  else{for(let y=1;y<13&&!ok;y++)for(let x=1;x<13&&!ok;x++)if(Gm.placeOk(g,d.id,{gx:x,gy:y}))ok=!!Gm.placeBuy(g,d.id,{gx:x,gy:y});}}}
function buyTables(g,n,keep){const T=[[4,9],[7,9],[10,9],[4,12],[7,12],[10,12]];while(Gm.placedN(g,'table')<Math.min(n,Gm.capOf(g,'table'))&&g.gold-200>=keep){const sp=T.find(([gx,gy])=>Gm.placeOk(g,'table',{gx,gy}));if(!sp||!Gm.placeBuy(g,'table',{gx:sp[0],gy:sp[1]}))break;}}
function buildAll(g,keep){for(const f of Object.keys(Gm.FAC_COST)){const c=Gm.FAC_COST[f];if(c==null||g.built[f]||c>g.grade)continue;if(g.gold>=Gm.facCost(g,f)+keep)Gm.build(g,f);}
  for(const f of Gm.UPG){if(g.built[f]&&!Gm.upg(g,f)&&g.gold>=Gm.upgCost(g,f)+keep)Gm.upgrade(g,f);}}
function play(seed,W,P){P=P||{};const cfg=Sim.defaults();if(P.cfg)P.cfg(cfg);const g=Gm.newGame(cfg,seed);
  if(P.start!=='raw'){const c=Gm.facCost(g,'집무실')||0;g.gold+=c;Gm.build(g,'집무실');}   // 튜토리얼이 끝난 상태: 집무실
  if(P.tables==null||P.tables==='bot')buyTables(g,2,0);else if(P.tables>0)buyTables(g,Math.min(2,P.tables),0);
  if(P.fee!=null)Gm.setGradeFee(g,0,P.fee);
  const M={seed,wk:[],first:{},ret:[],idle:{},adv:null,hist:null};const mark=(k,w)=>{if(M.first[k]==null)M.first[k]=w;};
  let logSeen=0,uidSeen=new Set();
  for(let w=0;w<W;w++){
    // --- 주 넘김 전: 플레이어 행동 ---
    if(P.req!=='none'){if(P.req==='nomain'){const m=g.main;const st=m&&m.state;Gm.autoRequests(g);}else Gm.autoRequests(g);}
    if(P.dg==='send'&&g.dg&&!g.dg.plan&&!g.active.some(x=>x.dgRun)&&(!g.dg.clear||w%4===0)){const t=g.advs.filter(a=>a.alive&&a.state==='town').sort((a,b)=>b.lv-a.lv).slice(0,3);if(t.length>=2)Gm.dgPlan(g,t.map(a=>a.id),true);}
    if(P.build)buildAll(g,P.build===true?600:P.build);
    if(P.deco)buyDeco(g,P.deco===true?300:P.deco);
    if(P.tables>2)buyTables(g,P.tables,P.tkeep!=null?P.tkeep:200);
    if(P.fee!=null&&g.gradeFee&&g.grade>=1&&g.gradeFee[1]==null)Gm.setGradeFee(g,1,P.fee);
    if(P.pre)P.pre(g,w);
    // 이번 주에 돌아오는 원정 기록
    for(const x of g.active){if(x.back<=g.week&&!uidSeen.has(x.uid)){uidSeen.add(x.uid);const pt=x.party.map(id=>g.advs.find(a=>a.id===id)).filter(Boolean);
      M.ret.push({w:g.week,g:x.q.g,t:x.q.type,c:x.fight?1:0,ok:x.ok?1:0,late:x.late?1:0,n:pt.length,rate:x.rate,rq:x.q.rq?1:0,dg:x.dgRun?1:0,gq:x.q.gq!=null?1:0,lv:pt.map(a=>a.lv),pm:x.q.party||1,down:x.fight?x.fight.units.filter(u=>u.down).length:0,rw:x.q.reward,x2:x.q.x2?1:0});}}
    const g0=g.gold,b0=g.board.length,id0=g.nextId;
    Gm.stepWeek(g);
    // --- 주 넘김 뒤 ---
    if(P.cook==null||P.cook==='auto')Gm.autoCook(g);else if(P.cook==='dish'){for(const d of Gm.DISH)if(!d.dungeon&&!g.dishes[d.name]&&d.g<=g.grade&&d.mats.every(m=>g.mats[m]>0)&&d.mats.some(m=>g.mats[m]>0))Gm.cook(g,d.mats);}
    if(g.week%Gm.WPM===0&&(P.place==null||P.place==='bot')){if(P.tables==null||P.tables==='bot')Gm.autoPlace(g,false);else Gm.autoSell(g);}
    if(P.post)P.post(g,w);
    // 기록
    const nl=g.log.length-logSeen;const fresh=g.log.slice(0,Math.max(0,Math.min(g.log.length,nl>0?nl:0)));logSeen=g.log.length;
    const kinds={};for(const l of g.log){if(l._s)break;l._s=1;kinds[l.kind]=(kinds[l.kind]||0)+1;const t=l.text||'';
      if(/E급으로 승급/.test(t)&&l.kind!=='promo'&&/길드/.test(t))mark('guildE',l.week);
      if(l.kind==='death')mark('death',l.week);if(/정복했습니다/.test(t))mark('dgClear',l.week);}
    if(g.grade>=1)mark('gE',g.week);if(g.main&&g.main.state==='offer')mark('mainOffer',g.week);if(g.main&&g.main.tries>0)mark('mainTry',g.week);
    const al=g.advs.filter(a=>a.alive);
    const idw={};for(const a of al){let k;if(a.state==='town'&&a.idleW===g.week-1)k=a.idle||'?';else if(a.state==='quest')k='_q';else if(a.state==='injured')k='_inj';else if(a.state==='away')k='_away';else k='_etc';idw[k]=(idw[k]||0)+1;M.idle[k]=(M.idle[k]||0)+1;M.idle._n=(M.idle._n||0)+1;}
    if(P.snap&&P.snap.includes(g.week))(M.snap=M.snap||{})[g.week]={adv:g.advs.map(a=>({id:a.id,j:a.joined,lv:a.lv,gr:a.grade,done:a.done,alive:a.alive,star:a.star,att:Math.round(a.attach),wallet:Math.round(a.wallet),eqN:(a.eq||[]).filter(x=>x>=0).length,home:!!a.home})),save:Gm.serialize(g).length,gold:Math.round(g.gold),mats:Object.values(g.mats||{}).reduce((x,y)=>x+y,0)};
    M.wk.push({w:g.week,gold:Math.round(g.gold),dg:Math.round(g.gold-g0),fame:Math.round(g.fame||0),trust:Math.round(g.trust),pop:Math.round(g.pop),grade:g.grade,n:al.length,board:g.board.length,posted:g.nextId-id0,act:g.active.length,k:kinds,
      town:al.filter(a=>a.state==='town').length,quest:al.filter(a=>a.state==='quest').length,lvMax:Math.max(...al.map(a=>a.lv)),lvAvg:al.reduce((t,a)=>t+a.lv,0)/al.length,idle:idw,reqOpen:g.req?g.req.open.length:0,reqDone:g.req?Object.keys(g.req.done).length:0});
  }
  M.adv=g.advs.map(a=>({id:a.id,j:a.joined,lv:a.lv,gr:a.grade,done:a.done,alive:a.alive,star:a.star,att:Math.round(a.attach),cls:a.cls,risk:a.risk,spend:a.spend,social:a.social,quirk:a.quirk||null,wallet:Math.round(a.wallet),eq:a.eq,core:a.core,stat:Math.round(a.stats[a.core])}));
  M.hist=g.history;M.stats=g.stats;M.end={gold:Math.round(g.gold),grade:g.grade,fame:g.fame,trust:g.trust,pop:g.pop,dishes:Object.keys(g.dishes).length,mons:Object.keys(g.seenMons||{}).length,mats:Object.keys(g.knownMats||{}).length,reqDone:g.req?Object.keys(g.req.done).length:0,main:g.main&&g.main.state,tries:g.main&&g.main.tries,built:Object.keys(g.built),up:Object.keys(g.up||{}),deco:g.place.items.map(i=>i.id),unlock:g.unlock,dg:g.dg?{prog:g.dg.prog,clear:!!g.dg.clear,runs:g.dg.runs.length}:null,save:Gm.serialize(g).length,logN:g.log.length};
  M.g=P.keepState?g:null;return M;}
const med=a=>{if(!a.length)return null;const b=a.slice().sort((x,y)=>x-y);return b[Math.floor((b.length-1)/2)];};
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
const pct=(a,p)=>{if(!a.length)return null;const b=a.slice().sort((x,y)=>x-y);return b[Math.min(b.length-1,Math.floor(p*(b.length-1)+0.5))];};
module.exports={play,Gm,Sim,med,avg,pct,buyDeco,buyTables,buildAll};
