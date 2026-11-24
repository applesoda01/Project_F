const H=require('./harness.js');const {play,avg,med,pct,Gm}=H;const fs=require('fs');
const N=+process.argv[2]||60,W=96;
const contract=(terms)=>(g)=>{if(!Gm.contractOpen(g))return;const C=g.advs.filter(a=>a.alive&&!Gm.contractWhy(g,a)).sort((a,b)=>Gm.earnMonthly(g,b)-Gm.earnMonthly(g,a));for(const a of C){const t=Object.assign(Gm.contractDefault(g),terms||{});t.pay=Math.max(t.pay,Gm.contractMinPay(g,a));const r=Gm.contractPropose(g,a.id,t);if(r.ok)break;}};
const price=(k)=>(g)=>{for(const d of Gm.DISH)if(g.dishes[d.name]){const b=Gm.dishBase(g,d);Gm.setMenu(g,d.name,Math.max(1,Math.round(b*k)),null);}};
const prep=(n)=>(g)=>{for(const d of Gm.DISH)if(g.dishes[d.name])Gm.setMenu(g,d.name,null,n);};
const buy=(r)=>(g)=>{for(const id in g.knownMats)Gm.setBuyRate(g,id,r);};
const POL={
 base:{},
 contract:{pre:contract()},contract30:{pre:contract({rate:0.3})},
 priceUp:{post:price(1.3)},priceDn:{post:price(0.7)},
 prep2:{post:prep(2)},prep4:{post:prep(4)},prep8:{post:prep(8)},
 buy50:{post:buy(0.5)},buy120:{post:buy(1.2)},
 c_supply:{cfg:c=>{c.quest.perMonth=7.5;}},
 c_adv4:{cfg:c=>{c.adv.startCount=4;}},
 c_fame3:{cfg:c=>{c.adv.fameStep=[3,5,5,5,5,5,5];}},
 c_xp2:{cfg:c=>{c.growth.xpBase=480;}},
 c_brave:{cfg:c=>{c.adv.departTh=[0.8,0.7,0.5];}},
 c_sub25:{cfg:c=>{c.econ.subsidyRate=0.25;}},
 c_reward15:{cfg:c=>{c.quest.reward=c.quest.reward.map(x=>x*1.5);}},
 c_noLate:{cfg:c=>{c.late.on=0;}},
 c_cap16:{cfg:c=>{c.adv.capByGrade=[12,16,20,24,28,32,36];}},
};
const only=process.argv[3]?process.argv[3].split(','):Object.keys(POL);const out={};
for(const k of only){const R=[];for(let i=0;i<N;i++)R.push(play(7000+i,W,POL[k]));
 const y=(m,a,b)=>avg(m.hist.slice(a,b).map(h=>h.net));const d=(m,a,b)=>m.ret.filter(x=>x.w>=a&&x.w<b&&!x.rq&&!x.dg);
 const o={n1:avg(R.map(m=>y(m,0,12))),n2:avg(R.map(m=>y(m,12,24))),d1:avg(R.map(m=>d(m,0,48).length)),d2:avg(R.map(m=>d(m,48,96).length)),s1:avg(R.map(m=>{const a=d(m,0,48);return a.filter(x=>x.ok).length/a.length;})),s2:avg(R.map(m=>{const a=d(m,48,96);return a.filter(x=>x.ok).length/a.length;})),
  gE:med(R.map(m=>m.first.gE||999)),g48:avg(R.map(m=>m.wk[47].gold)),g96:avg(R.map(m=>m.wk[95].gold)),a48:avg(R.map(m=>m.wk[47].n)),lv48:avg(R.map(m=>m.wk[47].lvAvg)),lv96:avg(R.map(m=>m.wk[95].lvAvg)),inj:avg(R.map(m=>m.stats.injuries)),dead:avg(R.map(m=>m.stats.deaths)),cpay:avg(R.map(m=>avg(m.hist.map(h=>(h.cpay||0)+(h.csup||0))))),fee:avg(R.map(m=>avg(m.hist.map(h=>h.fee||0)))),meal:avg(R.map(m=>avg(m.hist.map(h=>(h.meal||0)+(h.shop||0)+(h.matBuy||0))))),
  S:{n1:R.map(m=>y(m,0,12)),n2:R.map(m=>y(m,12,24))}};
 out[k]=o;const b=out.base;const dd=(x)=>{if(!b||k==='base')return '';const D=o.S[x].map((v,i)=>v-b.S[x][i]),n=D.length,mm=avg(D),sd=Math.sqrt(D.reduce((t,v)=>t+(v-mm)**2,0)/(n-1));return `(${mm>=0?'+':''}${mm.toFixed(0)}±${(1.96*sd/Math.sqrt(n)).toFixed(0)})`;};
 console.log(k.padEnd(11),`y1 ${o.n1.toFixed(0)}${dd('n1').padEnd(10)} y2 ${o.n2.toFixed(0)}${dd('n2').padEnd(11)} done ${o.d1.toFixed(0)}/${o.d2.toFixed(0)} succ ${(o.s1*100).toFixed(1)}/${(o.s2*100).toFixed(1)} E ${o.gE} gold ${o.g48.toFixed(0)}/${o.g96.toFixed(0)} advs48 ${o.a48.toFixed(1)} lv ${o.lv48.toFixed(1)}/${o.lv96.toFixed(1)} inj ${o.inj.toFixed(1)} dead ${o.dead.toFixed(2)} cpay ${o.cpay.toFixed(0)} fee ${o.fee.toFixed(0)} kitchen ${o.meal.toFixed(0)}`);}

