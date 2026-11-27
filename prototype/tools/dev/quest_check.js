// 명세 3장 「확인하는 방법」 1 · 2 · 5 · 6 · 7 · 12를 돌림 (2026-11-27 바닥 공사 5-나) — node prototype/tools/dev/quest_check.js
const fs=require('fs'),vm=require('vm'),path=require('path');const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['data_gen.js','combat.js','sim_engine.js','game_core.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'..','..','js',f),'utf8'),ctx,{filename:f});
const Sim=ctx.GuildSim,Gm=ctx.GuildGame,GD=ctx.GAME_DATA,CB=ctx.GuildCombat.make(GD);
const out=[];const ok=(n,c,d)=>out.push(`${c?'○':'✕'} ${n} — ${d}`);
const maxOf=a=>{a.hp=a.hpMax||a.hp;};const fresh=(seed)=>{const g=Gm.newGame(Sim.defaults(),seed||7000);Gm.autoPlace(g,true);return g;};
// 1
{const g=fresh();g.tut=null;Gm.stepBeat(g);const B=g.board.filter(q=>q.nw);ok('1 새 판의 첫 주',B.length+(g.pend||[]).length>=10&&B.every(q=>q.lv===1),`종이 ${B.length}장(+준비 중 ${(g.pend||[]).length}) · 레벨 ${[...new Set(B.map(q=>q.lv))]}`);}
// 2,3 : 직접 정산
{let lv2=0,N=200;for(let i=0;i<N;i++){const g=fresh(7000+i);g.board=[];g.qlv={};Gm.qlvOf(g,'q_slay_F').lv=2;g.week=1;g.tick=70;g.calT=-1;g.board=[];
  // 열린 2 → 종이 레벨 1 또는 2
  g.active=[];Gm.stepBeat(g);const q=g.board.find(x=>x.tid==='q_slay_F')||((g.pend||[]).find(p=>p.q.tid==='q_slay_F')||{}).q||(g.active.find(x=>x.q.tid==='q_slay_F')||{}).q; if(q&&q.lv===2)lv2++;}
 ok('2 Lv2가 열린 틀의 종이',lv2>N*0.35&&lv2<N*0.65,`${N}판 가운데 Lv2 ${lv2}장`);}
// 4,5: 어림셈
{const g=fresh();const a=g.advs.find(x=>x.core===0);a.stats=[17,7.5,7.5,7.5,7.5];a.hp=null;a.hpMax=null;
 const mk=(tid,lv)=>Object.assign({},{tid,lv,nodes:GD.frames.frames.find(f=>f.id===tid).lv[lv-1].map(c=>Object.assign({},c))});
 const est=(q)=>{const u=Object.assign(CB.unit(a,i=>a.stats[i],-1,0),{}); return CB.estimate([u],q.nodes,{MON:GD.frames.monsters,fleeBase:GD.frames.fleeBase});};
 const e1=est(mk('q_study_F_2',1)),e2=est(mk('q_study_F_2',2));ok('5 전사 혼자 「먹어도 되나요」',e1.beats<=70&&e2.beats>70,`Lv1 ${Math.round(e1.beats)}박자 · Lv2 ${Math.round(e2.beats)}박자 (기한 70)`);}
// 6,7,12: 실제로 돌림 — Lv3 종이를 셋째 칸 뒤 물러남으로 만들고 정산
{const g=fresh();g.tut=null;for(const a of g.advs)a.stats=a.stats.map(()=>17);
 const P=g.advs.filter(a=>a.alive).slice(0,3);const q=Gm.makePaper?null:null;
 // 종이를 만들어 칸 셋을 지나게 하고 기한을 넘김
 const paper=Gm.tutPost(g,'q_slay_F');paper.lv=3;paper.reward=300;paper.nodes=GD.frames.frames.find(f=>f.id==='q_slay_F').lv[2].map(c=>Object.assign({},c));paper.tutorial=false;
 g.board.splice(g.board.indexOf(paper),1);
 Gm.nqLaunchT(g,paper,P);const x=g.active[g.active.length-1];
 let guard=0;while(x.i<3&&guard++<400){Gm.nqBeatT(g);}
 const mat0=Object.values(g.mats).reduce((t,v)=>t+v,0),xp0=P.map(a=>a.xp+0);x.deadT=g.tick;Gm.nqBeatT(g);
 const back=g.board.find(z=>z===paper);const mats=Object.values(g.mats).reduce((t,v)=>t+v,0)-mat0;
 ok('6 Lv3에서 셋째 칸까지 지나고 실패',back&&paper.nodes.filter(c=>c.done).length===3&&mats===3,`게시판에 돌아옴 ${!!back} · 지난 칸 ${paper.nodes.filter(c=>c.done).length}/4 · 소재 ${mats}개`);
 // 7: 다른 파티가 끝냄 — Lv2 종이(열린 레벨 2)를 둘째 칸 뒤 실패시키고 남은 칸을 다른 사람이 끝냄
 const p2=Gm.tutPost(g,'q_study_F');p2.lv=2;p2.reward=200;p2.tutorial=false;p2.nodes=GD.frames.frames.find(f=>f.id==='q_study_F').lv[1].map(c=>Object.assign({},c));Gm.qlvOf(g,'q_study_F').lv=2;
 g.board.splice(g.board.indexOf(p2),1);for(const a of P){a.state='town';maxOf(a);}Gm.nqLaunchT(g,p2,P);const x2=g.active[g.active.length-1];guard=0;while(x2.i<2&&guard++<400)Gm.nqBeatT(g);x2.deadT=g.tick;Gm.nqBeatT(g);
 const Q=g.advs.filter(a=>a.alive&&!P.includes(a)&&a.state==='town');const party=Q.length?Q.slice(0,1):[P[0]];for(const a of party){a.state='town';a.hp=a.hpMax;}
 g.board.splice(g.board.indexOf(p2),1);const g0=g.gold,w0=party.map(a=>a.wallet);Gm.nqLaunchT(g,p2,party);const y=g.active[g.active.length-1];guard=0;while(!y.end&&guard++<400)Gm.nqBeatT(g);
 ok('7 남은 한 칸을 다른 사람이 끝냄',y.end&&Gm.qlvOf(g,'q_study_F').lv===3,`끝남 ${y.end} · 금고 +${Math.round(g.gold-g0)} · 지갑 +${Math.round(party[0].wallet-w0[0])} · 열린 레벨 2 → ${Gm.qlvOf(g,'q_study_F').lv} · 앞서 간 사람 ${(p2.prev||[]).length}명`);
 const fk=Object.keys(party[0].first||{});ok('12 처음 해낸 종이 +1',fk.includes('q_study_F:2'),`처음 해낸 것 ${fk.join(',')} · kept ${JSON.stringify(party[0].kept)}`);}

// 8: 보스 — 굼바의 두 틀을 Lv 3까지 해냄
{const g=fresh();Gm.qlvOf(g,'q_slay_F').won3=true;Gm.qlvOf(g,'q_hunt_F_2').won3=true;Gm.bossCheck(g);const B=(g.boss||{})[0];ok('8 한 의뢰인의 두 틀을 Lv 3까지 해냄',B&&B.state==='open'&&B.q.nodes.length===4,`보스 종이 ${B?B.state:'없음'} · 칸 ${B?B.q.nodes.map(c=>c.k+(c.boss?'(보스)':'')).join(' '):''} · 보상 ${B?B.q.reward:0}G`);}
// 9: 주문 — 「반짝이면 다 내 거」 Lv 2
{const g=fresh();g.tut=null;Gm.qlvOf(g,'q_mine_F').lv=2;g.gold=1000;const n0=g.board.length;const r=Gm.nqOrder(g,'q_mine_F',2);
 const q=r.q;ok('9 주문: 반짝이면 다 내 거 Lv 2',r.ok&&g.gold===800&&g.board.length===n0+1&&q.fee===0,`금고 1000 → ${g.gold} · 종이 +${g.board.length-n0} · 수수료 ${q&&q.fee}`);
 const P=g.advs.filter(a=>a.alive).slice(0,3);for(const a of P)a.stats=a.stats.map(()=>20);g.board.splice(g.board.indexOf(q),1);const w0=P.map(a=>a.wallet);Gm.nqLaunchT(g,q,P);const x=g.active[g.active.length-1];let k=0;while(!x.end&&k++<500)Gm.nqBeatT(g);
 ok('9 그 종이를 해냄',x.end&&Gm.qlvOf(g,'q_mine_F').lv===3&&!(g.gq||[]).length,`끝남 ${x.end} · 주머니 +${Math.round(P.reduce((t,a,i)=>t+a.wallet-w0[i],0))} · 열린 레벨 ${Gm.qlvOf(g,'q_mine_F').lv}`);}
// 10: 아무도 못 감 → 경고 카드
{const g=fresh(7001);g.tut=null;for(const a of g.advs)a.stats=[8,8,1,8,8];Gm.qlvOf(g,'q_study_F_2').lv=2;g.board=[];const q=Gm.makePaper(g,'q_study_F_2',2);g.board.push(q);g.board.push(Gm.makePaper(g,'q_slay_F',1));
 for(let i=0;i<72;i++)Gm.stepBeat(g);const W=(g.warn||[]).find(w=>w.tid==='q_study_F_2');ok('10 지력이 낮은 길드의 「먹어도 되나요」 Lv 2',!!W,`경고 ${W?W.why:'없음'} · 경고 ${(g.warn||[]).length}건`);}
console.log(out.join('\n'));
