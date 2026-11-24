const H=require('./harness.js');const {play,avg,med,pct,Gm}=H;const N=60;
// 첫해(48주) 게시판 의뢰: 이름별 횟수 · 몬스터별 만난 횟수
const names={},mons={};let tot=0;const per=[];const uniqByW=[];
for(let i=0;i<N;i++){const cnt={};const seen=new Set();const u=[];
 const m=play(7000+i,48,{keepState:true,pre:(g,w)=>{for(const x of g.active){if(x.back<=g.week&&!x._c){x._c=1;if(x.q.rq||x.dgRun)continue;const nm=x.q.name||'?';cnt[nm]=(cnt[nm]||0)+1;names[nm]=(names[nm]||0)+1;tot++;seen.add(nm);for(const e of (x.q.enemies||[])){mons[e.name]=(mons[e.name]||0)+1;}}}u.push(seen.size);}});
 per.push(cnt);uniqByW.push(u);}
console.log('첫해 게시판 의뢰 한 판 평균',(tot/N).toFixed(1),'건, 서로 다른 의뢰',avg(per.map(c=>Object.keys(c).length)).toFixed(1),'종');
console.log(Object.entries(names).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${(v/N).toFixed(1)}`).join(' · '));
console.log('가장 많이 본 의뢰 한 종의 평균 횟수',avg(per.map(c=>Math.max(...Object.values(c)))).toFixed(1));
console.log('서로 다른 의뢰를 다 본 주(누적 종 수) w4/8/12/16/24/36/48:',[4,8,12,16,24,36,48].map(w=>avg(uniqByW.map(u=>u[w-1])).toFixed(1)).join(' / '));
console.log('몬스터 개체 수(한 판 평균):',Object.entries(mons).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`${k} ${(v/N).toFixed(0)}`).join(' · '));
