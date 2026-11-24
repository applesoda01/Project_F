// 모험가 지갑에 쌓이는 돈과 길드가 모험가에게서 버는 돈 (30판 · 96주).  node exp_wallet.js [판 수]
const {play,avg}=require('./harness.js');const N=+process.argv[2]||30,WK=[12,24,36,48,72,96],R=[];
for(let i=0;i<N;i++)R.push(play(7000+i,96,{snap:WK}));
console.log(`모험가 지갑과 길드 금고 (${N}판 · 기본 봇)`);
for(const w of WK){const t=avg(R.map(m=>m.snap[w].adv.filter(a=>a.alive).reduce((x,a)=>x+a.wallet,0))),n=avg(R.map(m=>m.snap[w].adv.filter(a=>a.alive).length)),g=avg(R.map(m=>m.snap[w].gold));
  console.log(`  ${String(w).padStart(2)}주: 지갑 합계 ${t.toFixed(0)}G (모험가 ${n.toFixed(1)}명 · 한 명 ${(t/n).toFixed(0)}G) · 길드 금고 ${g.toFixed(0)}G · 지갑 ÷ 금고 ${(t/g).toFixed(1)}배`);}
const k=x=>avg(R.map(m=>avg(m.hist.slice(0,12).map(h=>h[x]||0))));
const rw=k('subsidyBase'),fee=k('fee'),mb=-k('matBuy'),sc=-k('scout'),meal=k('meal'),tav=k('tavern');
console.log(`첫해 한 달 평균: 모험가가 버는 돈 약 ${(rw-fee+mb+sc).toFixed(0)}G (의뢰 보상 ${rw.toFixed(0)} − 수수료 ${fee.toFixed(0)} + 소재 매입 ${mb.toFixed(0)} + 섭외비 ${sc.toFixed(0)})`);
console.log(`              그 가운데 길드 시설에서 쓰는 돈 ${(meal+tav).toFixed(0)}G (식사 ${meal.toFixed(0)} + 술 ${tav.toFixed(0)}) = ${(100*(meal+tav)/(rw-fee+mb+sc)).toFixed(0)}%`);
