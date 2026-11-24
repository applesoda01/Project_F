const {play,avg,Gm}=require('./harness.js');
const N=100,W=48,rows=[];for(let q=0;q<4;q++)rows.push({u:[],ge2:0,ge3:0,ge4:0,n:0,town:[]});
const K=[];
for(let i=0;i<N;i++){const m=play(7000+i,W,{post:(g,w)=>{const r=rows[Math.floor(w/12)];const u=g.seatUsed||0;r.u.push(u);r.n++;if(u>=2)r.ge2++;if(u>=3)r.ge3++;if(u>=4)r.ge4++;}});
 K.push(m.hist.map(h=>({meal:h.meal||0,shop:h.shop||0})));}
rows.forEach((r,q)=>console.log(`${q*12+1}~${q*12+12}주: 한 주 식사 평균 ${avg(r.u).toFixed(2)}명 · 2명 이상인 주 ${(100*r.ge2/r.n).toFixed(0)}% · 3명 이상 ${(100*r.ge3/r.n).toFixed(0)}% · 4명 이상 ${(100*r.ge4/r.n).toFixed(0)}%`));
for(let q=0;q<4;q++){const a=avg(K.map(k=>avg(k.slice(q*3,q*3+3).map(x=>x.meal)))),b=avg(K.map(k=>avg(k.slice(q*3,q*3+3).map(x=>x.shop))));console.log(`${q+1}분기 식사 수입 ${a.toFixed(0)}G · 시장 재료 ${b.toFixed(0)}G · 차 ${(a+b).toFixed(0)}G (봇: 준비량 자동)`);}
