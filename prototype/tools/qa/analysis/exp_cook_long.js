// 등급이 오르면 요리 수익이 느는가: 등급별 요리 값 · 3년 동안의 식당 손익.  node exp_cook_long.js [판 수]
const {play,avg,Gm,Sim}=require('./harness.js');const N=+process.argv[2]||30;
const g=Gm.newGame(Sim.defaults(),7000),by={};
for(const d of Gm.DISH){if(d.dungeon)continue;(by[d.g]=by[d.g]||[]).push({p:Gm.dishBase(g,d),c:Gm.dishCost(g,d),rare:d.mats.filter(m=>!Gm.isStaple(g,m)).length,val:d.val});}
console.log('[1] 등급별 요리 (시작 시세 기준)');
for(const k of Object.keys(by)){const L=by[k];console.log(`  ${Gm.GR[k]}급 ${L.length}가지: 값 ${L.map(x=>x.p).join(' · ')}G · 한 그릇 원가 ${L.map(x=>x.c.toFixed(0)).join(' · ')}G · 한 그릇에 남는 돈 평균 ${avg(L.map(x=>x.p-x.c)).toFixed(0)}G · 버프 +${L[0].val} · 시장에서 못 사는 재료 ${L.map(x=>x.rare).join(' · ')}개`);}
const R=[];for(let i=0;i<N;i++)R.push(play(7000+i,144,{}));const sold=h=>Object.values(h.dishes||{}).reduce((a,b)=>a+b,0);
console.log(`\n[2] 3년 동안의 식당 (${N}판 · 기본 봇 · 반년씩 · 한 달 평균)`);
for(let y=0;y<6;y++){const f=q=>avg(R.map(m=>m.hist.slice(y*6,y*6+6).reduce((t,h)=>t+q(h),0)/6));const sd=f(sold),ml=f(h=>h.meal||0),sh=-f(h=>h.shop||0),ck=f(h=>h.cooked||0),net=f(h=>h.net);
  console.log(`  ${y*24+1}~${y*24+24}주: 팔린 ${sd.toFixed(1)} / 만든 ${ck.toFixed(1)}그릇 · 한 그릇 ${(ml/sd).toFixed(0)}G · 식사 매출 ${ml.toFixed(0)}G · 시장 재료 ${sh.toFixed(0)}G · 차 ${(ml-sh).toFixed(0)}G · 월 순수입 ${net.toFixed(0)}G · 길드 등급 ${Gm.GR[Math.round(avg(R.map(m=>m.hist[y*6+5].grade)))]}`);}
console.log(`  144주에 발견한 요리 ${avg(R.map(m=>m.end.dishes)).toFixed(1)}가지`);
