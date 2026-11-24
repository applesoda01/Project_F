const H=require('./harness.js');const {play,avg,med,pct,Gm}=H;const fs=require('fs');
const N=+process.argv[2]||60,W=+process.argv[3]||48;
const one=(id)=>(g)=>{const d=Gm.DECO_BY[id];if(!d||Gm.capOf(g,id)<=Gm.placedN(g,id)||g.gold-d.price<300)return;
  if(d.kind==='wall'||d.kind==='fire'){for(const w of ['L','R'])for(let i=0;i<14;i++)if(Gm.placeOk(g,id,{wall:w,i})){Gm.placeBuy(g,id,{wall:w,i});return;}}
  else for(let y=1;y<13;y++)for(let x=1;x<13;x++)if(Gm.placeOk(g,id,{gx:x,gy:y})){Gm.placeBuy(g,id,{gx:x,gy:y});return;}};
const POL={
 base:{},
 passive:{req:'none',cook:'none',place:'none',tables:1},
 noReq:{req:'none'},
 noCook:{cook:'none'},
 cookDish:{cook:'dish'},
 tables0:{tables:0},tables1:{tables:1},tables4:{tables:4},
 fee5:{fee:0.05},fee15:{fee:0.15},
 deco:{deco:true},build:{build:true},dg:{dg:'send'},
 full:{deco:true,build:true,tables:4,dg:'send'},
 d_plant:{pre:one('plant')},d_boardDeco:{pre:one('boardDeco')},d_locker:{pre:one('locker')},d_banner:{pre:one('banner')},d_bench:{pre:one('bench')},d_map:{pre:one('map')},d_fireplace:{pre:one('fireplace')},d_trophy:{pre:one('trophy')},
};
const only=process.argv[4]?process.argv[4].split(','):Object.keys(POL);
const out={};
for(const k of only){const R=[];for(let i=0;i<N;i++)R.push(play(7000+i,W,POL[k]));
 const done=R.reduce((t,m)=>t+m.stats.done,0),fail=R.reduce((t,m)=>t+m.stats.fail,0);
 const gE=R.map(m=>m.first.gE).filter(x=>x!=null);
 const o={net:avg(R.map(m=>avg(m.hist.map(h=>h.net)))),gold:avg(R.map(m=>m.end.gold)),goldMin:avg(R.map(m=>Math.min(...m.wk.map(x=>x.gold)))),succ:done/(done+fail),done:done/N,fail:fail/N,gEn:gE.length/N,gEmed:med(R.map(m=>m.first.gE||999)),
  advs:avg(R.map(m=>m.adv.filter(a=>a.alive).length)),lvAvg:avg(R.map(m=>avg(m.adv.filter(a=>a.alive).map(a=>a.lv)))),lvMax:avg(R.map(m=>Math.max(...m.adv.map(a=>a.lv)))),fame:avg(R.map(m=>m.end.fame)),trust:avg(R.map(m=>m.end.trust)),pop:avg(R.map(m=>m.end.pop)),
  req:avg(R.map(m=>m.end.reqDone)),inj:avg(R.map(m=>m.stats.injuries)),dead:avg(R.map(m=>m.stats.deaths)),dishes:avg(R.map(m=>m.end.dishes)),
  build:avg(R.map(m=>m.hist.reduce((t,h)=>t+(h.build||0),0))),decoN:avg(R.map(m=>m.end.deco.filter(x=>x!=='table').length)),tabN:avg(R.map(m=>m.end.deco.filter(x=>x==='table').length))};
 o.S={net:R.map(m=>avg(m.hist.map(h=>h.net))),done:R.map(m=>m.stats.done),gE:R.map(m=>m.first.gE||999),lv:R.map(m=>avg(m.adv.filter(a=>a.alive).map(a=>a.lv))),fame:R.map(m=>m.end.fame),tot:R.map(m=>m.wk[m.wk.length-1].gold-m.hist.reduce((t,h)=>t+0,0))};out[k]=o;console.log(k.padEnd(12),`net ${o.net.toFixed(0).padStart(5)} gold ${o.gold.toFixed(0).padStart(6)} min ${o.goldMin.toFixed(0).padStart(5)} succ ${(o.succ*100).toFixed(1)} done ${o.done.toFixed(1).padStart(5)} gE ${(o.gEn*100).toFixed(0).padStart(3)}% med ${String(o.gEmed).padStart(3)} advs ${o.advs.toFixed(1)} lv ${o.lvAvg.toFixed(1)}/${o.lvMax.toFixed(1)} fame ${o.fame.toFixed(0)} trust ${o.trust.toFixed(0)} pop ${o.pop.toFixed(0)} req ${o.req.toFixed(1)} inj ${o.inj.toFixed(1)} dead ${o.dead.toFixed(2)} dish ${o.dishes.toFixed(1)} build ${o.build.toFixed(0)} deco ${o.decoN.toFixed(1)} tab ${o.tabN.toFixed(1)}`);}
fs.writeFileSync(require('path').join(require('os').tmpdir(),`levers_${N}x${W}.json`),JSON.stringify(out));
