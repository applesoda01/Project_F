// 요리의 등급 제한을 풀면: ① 먹는 쪽(의뢰 등급 이하의 요리만 먹음) ② 발견하는 쪽(봇은 길드 등급 이하만 시도 — 게임 규칙에는 제한 없음).  node exp_cook_grade.js [판 수]
global.__PF_PATCH=(f,src)=>{if(f!=='game_core.js')return src;const a="if (!s.dishes[d.name] || d.g > q.g || (mealCookOn(s) && stockOf(s, d) <= 0)) continue;";if(src.split(a).length!==2)throw new Error('exp_cook_grade: 붙일 자리를 찾지 못했습니다');
  return src.replace(a,"if (!s.dishes[d.name] || (!s.cfg.eatAny && d.g > q.g) || (mealCookOn(s) && stockOf(s, d) <= 0)) continue;");};
const {play,avg,Gm}=require('./harness.js');const N=+process.argv[2]||30,W=96;
const any=(g)=>{for(const d of Gm.DISH)if(!d.dungeon&&!g.dishes[d.name]&&d.mats.every(m=>g.mats[m]>0||Gm.canMarket(g,m))&&d.mats.some(m=>g.mats[m]>0))Gm.cook(g,d.mats);};
const eMats=[...new Set(Gm.DISH.filter(d=>d.g===1&&!d.dungeon).flatMap(d=>d.mats))];
const LEV={now:['지금',{}],eat:['어느 의뢰를 떠나든 어떤 요리나 먹음',{cfg:c=>{c.eatAny=1;}}],craft:['길드 등급과 상관없이 발견 시도',{post:any}],both:['둘 다',{cfg:c=>{c.eatAny=1;},post:any}],
 mkt:['둘 다 + E급 식재료를 시장에서 삼',{cfg:c=>{c.eatAny=1;c.econ.stapleGrade=1;},post:any}],
 mkt1:['〃 + 가장 비싼 요리 한 가지만 준비',{cfg:c=>{c.eatAny=1;c.econ.stapleGrade=1;},post:(g,w)=>{any(g);const ds=Gm.DISH.filter(d=>g.dishes[d.name]);if(ds.length<2)return;const top=ds.slice().sort((x,y)=>Gm.menuOf(g,y).price-Gm.menuOf(g,x).price)[0];for(const d of ds)if(d!==top)Gm.setMenu(g,d.name,null,0);}}]};
const ONLY=process.argv[3]?process.argv[3].split(','):null;
const sold=h=>Object.values(h.dishes||{}).reduce((a,b)=>a+b,0);
const dif=(a,b)=>{const d=a.map((x,i)=>x-b[i]),m=avg(d),sd=Math.sqrt(d.reduce((t,v)=>t+(v-m)**2,0)/(d.length-1));return `${m>=0?'+':''}${m.toFixed(0)} ± ${(1.96*sd/Math.sqrt(d.length)).toFixed(0)}`;};
let b1,b2;console.log(`요리의 등급 제한을 풀면 (${N}판 · 96주 · 기본 봇)\n`);
for(const k of Object.keys(LEV)){if(ONLY&&k!=='now'&&!ONLY.includes(k))continue;let eStock=[];const P=Object.assign({},LEV[k][1]);const p0=P.post;P.post=(g,w)=>{if(p0)p0(g,w);if(w===23||w===39)eStock.push(eMats.filter(m=>g.mats[m]>0).length);};
  const R=[];for(let i=0;i<N;i++)R.push(play(7000+i,W,P));
  const yr=(y)=>R.map(m=>avg(m.hist.slice(y*12,y*12+12).map(h=>h.net)));const n1=yr(0),n2=yr(1);if(k==='now'){b1=n1;b2=n2;}
  const f=(y,q)=>avg(R.map(m=>m.hist.slice(y*12,y*12+12).reduce((t,h)=>t+q(h),0)/12));
  const eDish=avg(R.map(m=>Gm.DISH.filter(d=>d.g>=1&&!d.dungeon&&m.end&&0).length));
  console.log(`  ${LEV[k][0].padEnd(22)} 첫해 ${avg(n1).toFixed(0)}G (${k==='now'?'—':dif(n1,b1)}) · 한 그릇 ${(f(0,h=>h.meal||0)/f(0,sold)).toFixed(0)}G · 팔린 ${f(0,sold).toFixed(1)}그릇 · 매출 ${f(0,h=>h.meal||0).toFixed(0)}G | 2년 차 ${avg(n2).toFixed(0)}G (${k==='now'?'—':dif(n2,b2)}) · 한 그릇 ${(f(1,h=>h.meal||0)/f(1,sold)).toFixed(0)}G · 팔린 ${f(1,sold).toFixed(1)}그릇 · 매출 ${f(1,h=>h.meal||0).toFixed(0)}G · 품절 ${f(1,h=>h.soldOut||0).toFixed(1)}번 | 96주 요리 ${avg(R.map(m=>m.end.dishes)).toFixed(1)}가지 · 24 · 40주에 창고에 있는 E급 요리 재료 ${avg(eStock).toFixed(1)} / ${eMats.length}종`);}
