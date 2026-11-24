// 요리가 이득이 되려면: 식당 손익과 손잡이별 훑어보기.  node exp_cook.js [판 수]
// 규칙 손잡이는 그 판의 cfg만 바꾸거나(값), 읽어 들인 글을 메모리에서만 바꿉니다(그릇 보관 기간). 게임 파일과 수치는 그대로.
global.__PF_PATCH=(f,src)=>{if(f!=='game_core.js')return src;const a='s.week - b.w <= 1',b='s.week - b.w > 1';if(src.split(a).length!==2||src.split(b).length!==2)throw new Error('exp_cook: 붙일 자리를 찾지 못했습니다');
  return src.replace(a,'s.week - b.w <= (s.cfg.kLife || 1)').replace(b,'s.week - b.w > (s.cfg.kLife || 1)');};
const {play,avg,Gm}=require('./harness.js');const N=+process.argv[2]||30,W=48,ONLY=process.argv[3]?process.argv[3].split(','):null;   // node exp_cook.js 100 now,price2,combo
const one=(g)=>{const ds=Gm.DISH.filter(d=>g.dishes[d.name]);if(ds.length<2)return;const A=g.soldAvg||{};const top=ds.slice().sort((x,y)=>(A[y.name]||0)-(A[x.name]||0))[0];for(const d of ds)if(d!==top)Gm.setMenu(g,d.name,null,0);};
const LEV={
 now:['지금 (기본 봇)',{}],
 one:['한 가지 요리만 준비 (플레이 방식)',{post:one}],
 life4:['그릇을 4주까지 보관',{cfg:c=>{c.kLife=4;}}],
 allBuy:['떠나는 사람은 모두 먹음',{cfg:c=>{c.econ.mealBuyRate=[1,1,1];}}],
 price2:['가격 2배 · 사는 사람은 그대로',{cfg:c=>{c.econ.mealCostK*=2;c.econ.mealGradeAdd=c.econ.mealGradeAdd.map(x=>x*2);}}],
 buff3:['요리 버프 3배 (능력치 +3 → +9)',{buff:3}],
 combo:['한 가지 + 4주 보관 + 모두 먹음 + 가격 2배',{post:one,cfg:c=>{c.kLife=4;c.econ.mealBuyRate=[1,1,1];c.econ.mealCostK*=2;c.econ.mealGradeAdd=c.econ.mealGradeAdd.map(x=>x*2);}}],
};
const V0=Gm.DISH.map(d=>d.val);
const run=(P)=>{Gm.DISH.forEach((d,i)=>{d.val=V0[i]*(P.buff||1);});const R=[];for(let i=0;i<N;i++)R.push(play(7000+i,W,P));Gm.DISH.forEach((d,i)=>{d.val=V0[i];});return R;};
const sum=(m,f)=>m.hist.slice(0,12).reduce((t,h)=>t+f(h),0)/12;
const sold=h=>Object.values(h.dishes||{}).reduce((a,b)=>a+b,0);
const dif=(a,b)=>{const d=a.map((x,i)=>x-b[i]),m=avg(d),sd=Math.sqrt(d.reduce((t,v)=>t+(v-m)**2,0)/(d.length-1));return `${m>=0?'+':''}${m.toFixed(0)} ± ${(1.96*sd/Math.sqrt(d.length)).toFixed(0)}`;};
const net=R=>R.map(m=>avg(m.hist.map(h=>h.net)));
const none=run({tables:0,cook:'none'}),base=run({});const n0=net(none),b0=net(base);
console.log(`요리가 이득이 되려면 (${N}판 · 48주 · 같은 시드 짝 비교 · ± 95%)\n`);
console.log('[1] 지금 식당의 한 달 손익 (기본 봇 · 분기별)');
for(let q=0;q<4;q++){const f=(g)=>avg(base.map(m=>m.hist.slice(q*3,q*3+3).reduce((t,h)=>t+g(h),0)/3));
  const ck=f(h=>h.cooked||0),sd=f(sold),fr=f(h=>h.freeMeal||0),ws=f(h=>h.waste||0),ml=f(h=>h.meal||0),sh=-f(h=>h.shop||0);
  console.log(`  ${q*12+1}~${q*12+12}주: 만든 그릇 ${ck.toFixed(1)} · 팔린 그릇 ${sd.toFixed(1)} (${(100*sd/ck).toFixed(0)}%) · 무료로 준 그릇 ${fr.toFixed(1)} · 버린 그릇 ${ws.toFixed(1)} | 식사 매출 ${ml.toFixed(0)}G (한 그릇 ${(ml/sd).toFixed(0)}G) · 시장 재료 ${sh.toFixed(0)}G (만든 한 그릇에 ${(sh/ck).toFixed(1)}G) · 차 ${(ml-sh).toFixed(0)}G`);}
console.log(`  발견한 요리 수(48주): ${avg(base.map(m=>m.end.dishes)).toFixed(1)}가지`);
console.log('\n[2] 손잡이 하나씩 — 월 순수입 (식당을 안 하는 봇 대비 = 식당의 값 · 지금 기본 봇 대비)');
for(const k of Object.keys(LEV)){if(ONLY&&!ONLY.includes(k))continue;const R=k==='now'?base:run(LEV[k][1]);const x=net(R);const f=g=>avg(R.map(m=>sum(m,g)));
  const wl=avg(R.map(m=>m.adv.filter(a=>a.alive).reduce((t,a)=>t+a.wallet,0)));
  console.log(`  ${LEV[k][0].padEnd(26)} 식당의 값 ${dif(x,n0).padEnd(10)} · 지금 대비 ${(k==='now'?'—':dif(x,b0)).padEnd(10)} · 팔린 ${f(sold).toFixed(1)} / 만든 ${f(h=>h.cooked||0).toFixed(1)}그릇 · 매출 ${f(h=>h.meal||0).toFixed(0)}G · 재료 ${(-f(h=>h.shop||0)).toFixed(0)}G · 성공한 원정 ${avg(R.map(m=>m.stats.done)).toFixed(1)}건 · 48주 안 E급 ${(100*R.filter(m=>(m.first.gE||999)<=48).length/N).toFixed(0)}% · 48주 금고 ${avg(R.map(m=>m.end.gold)).toFixed(0)}G · 모험가 지갑 합계 ${wl.toFixed(0)}G`);}
console.log(`  (식당을 안 하는 봇: 월 순수입 ${avg(n0).toFixed(0)}G · 성공한 원정 ${avg(none.map(m=>m.stats.done)).toFixed(1)}건)`);
