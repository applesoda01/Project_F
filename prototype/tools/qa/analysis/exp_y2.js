const H=require('./harness.js');const {play,avg,med,pct,Gm}=H;const N=60,W=96;
const filt=(f)=>(g)=>{if(g.grade>=1&&!g._f){g._f=1;Gm.setFilter(g,[f[0],f[1],0,0,0,0,0]);}};
const up=(f)=>(g)=>{if(g.built[f]&&!Gm.upg(g,f)&&g.gold>=Gm.upgCost(g,f)+300)Gm.upgrade(g,f);};
const fac=(f)=>(g)=>{if(!g.built[f]&&Gm.FAC_COST[f]<=g.grade&&g.gold>=Gm.facCost(g,f)+300)Gm.build(g,f);};
const POL={base:{},filtE:{pre:filt([1,4])},filtF:{pre:filt([4,1])},filtEonly:{pre:filt([0,4])},up_board:{pre:up('게시판')},up_desk:{pre:up('접수대')},up_tavern:{pre:up('주점')},up_sell:{pre:up('판매창구')},fac_mgr:{pre:fac('관리소')},fee15E:{pre:(g)=>{if(g.grade>=1&&!g._e){g._e=1;Gm.setGradeFee(g,1,0.15);Gm.setGradeFee(g,0,0.15);}}}};
const out={};
for(const k of Object.keys(POL)){const R=[];for(let i=0;i<N;i++)R.push(play(7000+i,W,POL[k]));
 const y=(m,a,b)=>avg(m.hist.slice(a,b).map(h=>h.net));const d=(m,a,b)=>m.ret.filter(x=>x.w>=a&&x.w<b&&!x.rq&&!x.dg);
 const o={n1:R.map(m=>y(m,0,12)),n2:R.map(m=>y(m,12,24)),d2:avg(R.map(m=>d(m,48,96).length)),e2:avg(R.map(m=>{const a=d(m,48,96);return a.filter(x=>x.g>=1).length/a.length;})),s2:avg(R.map(m=>{const a=d(m,48,96);return a.filter(x=>x.ok).length/a.length;})),lv:avg(R.map(m=>m.wk[95].lvAvg)),gD:avg(R.map(m=>m.snap?0:0)),g96:avg(R.map(m=>m.wk[95].gold)),inj:avg(R.map(m=>m.stats.injuries)),dead:avg(R.map(m=>m.stats.deaths)),exp:avg(R.map(m=>m.wk.slice(48).reduce((t,x)=>t+(x.k.expire||0),0)))};
 out[k]=o;const b=out.base;const dd=(x)=>{if(k==='base')return '';const D=o[x].map((v,i)=>v-b[x][i]),n=D.length,mm=avg(D),sd=Math.sqrt(D.reduce((t,v)=>t+(v-mm)**2,0)/(n-1));return `(${mm>=0?'+':''}${mm.toFixed(0)}±${(1.96*sd/Math.sqrt(n)).toFixed(0)})`;};
 console.log(k.padEnd(10),`y1 ${avg(o.n1).toFixed(0)}${dd('n1').padEnd(10)} y2 ${avg(o.n2).toFixed(0)}${dd('n2').padEnd(11)} done2 ${o.d2.toFixed(0)} E급비중 ${(o.e2*100).toFixed(0)}% succ2 ${(o.s2*100).toFixed(1)} lv96 ${o.lv.toFixed(1)} gold96 ${o.g96.toFixed(0)} inj ${o.inj.toFixed(1)} dead ${o.dead.toFixed(2)} expired(y2) ${o.exp.toFixed(1)}`);}
