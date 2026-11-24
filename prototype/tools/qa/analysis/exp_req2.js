const H=require('./harness.js');const {play,avg,med,pct,Gm}=H;const N=100;
for(const keep of [400,200,50]){Gm.REQ_CFG.autoReserve=keep;const R=[];for(let i=0;i<N;i++)R.push(play(7000+i,60,{}));
 const rd=w=>avg(R.map(m=>m.wk[w-1].reqDone));
 console.log('reserve',keep,'reqDone@8/12/16/24/36/48',[8,12,16,24,36,48].map(w=>rd(w).toFixed(1)).join(' / '),'mainOffer med',med(R.map(m=>m.first.mainOffer||999)),'E p10/med/p90',pct(R.map(m=>m.first.gE||999),.1),med(R.map(m=>m.first.gE||999)),pct(R.map(m=>m.first.gE||999),.9),'E≤48',R.filter(m=>(m.first.gE||999)<=48).length+'%','net y1',avg(R.map(m=>avg(m.hist.slice(0,12).map(h=>h.net)))).toFixed(0),'goldMin',avg(R.map(m=>Math.min(...m.wk.slice(0,48).map(x=>x.gold)))).toFixed(0),'lowest',Math.min(...R.map(m=>Math.min(...m.wk.slice(0,48).map(x=>x.gold)))),'tries',avg(R.map(m=>m.end.tries||0)).toFixed(2));}
Gm.REQ_CFG.autoReserve=400;
