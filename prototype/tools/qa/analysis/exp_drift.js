const H=require('./harness.js');const {play,avg,med,pct}=H;const N=100;
for(const [nm,P] of [['지금',{}],['비전투 예전 값(ncBase .55 · ncIntF 1 · ncDrop 0)',{cfg:c=>{c.quest.ncBase=0.55;c.quest.ncIntF=1;c.adv.ncDrop=[0,0,0];}}],['별 · 따라잡기 끔(starOn 0)',{cfg:c=>{c.adv.starOn=0;}}],['둘 다 예전',{cfg:c=>{c.quest.ncBase=0.55;c.quest.ncIntF=1;c.adv.ncDrop=[0,0,0];c.adv.starOn=0;}}]]){
 const R=[];for(let i=0;i<N;i++)R.push(play(7000+i,72,P));const e=R.map(m=>m.first.gE||999);
 console.log(nm,'| E p10/med/p90',pct(e,.1),med(e),pct(e,.9),'| 48주 안',e.filter(x=>x<=48).length+'%','| 메인 제안 중앙',med(R.map(m=>m.first.mainOffer||999)),'| 첫해 순이익',avg(R.map(m=>avg(m.hist.slice(0,12).map(h=>h.net)))).toFixed(0),'| 첫해 성공',avg(R.map(m=>m.ret.filter(x=>x.w<48&&x.ok&&!x.rq&&!x.dg).length)).toFixed(1));}
