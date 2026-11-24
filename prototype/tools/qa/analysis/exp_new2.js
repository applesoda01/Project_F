const H=require('./harness.js');const {play,avg,med,pct,Gm}=H;const N=100;
const stay=(wk)=>(g)=>{for(const a of g.advs){if(!a.alive)continue;if(a._founder==null)a._founder=!!a.home&&a.joined===0;if(a._founder)continue;a.home=(g.week-a.joined)<wk;}};
const att=(v)=>(g)=>{for(const a of g.advs){if(a.alive&&!a._seen){a._seen=1;if(!a.home)a.attach=Math.max(a.attach,v);}}};
const POL={base:{snap:[48]},stay8:{snap:[48],pre:stay(8)},stay12:{snap:[48],pre:stay(12)},att30:{snap:[48],pre:att(30)},att50:{snap:[48],pre:att(50)}};
const out={};
for(const k of Object.keys(POL)){const R=[];for(let i=0;i<N;i++)R.push(play(7000+i,48,POL[k]));
 const net=R.map(m=>avg(m.hist.map(h=>h.net)));const rank=(r)=>{const A=R.map(m=>{const L=m.snap[48].adv.filter(a=>a.alive).sort((a,b)=>a.j-b.j||a.id-b.id);return L[r];}).filter(Boolean);return `Lv${avg(A.map(a=>a.lv)).toFixed(1)}/${avg(A.map(a=>a.done)).toFixed(0)}건`;};
 const later=[].concat(...R.map(m=>m.snap[48].adv.filter(a=>a.alive&&a.j>0)));
 out[k]={net};const b=out.base.net;const D=net.map((v,i)=>v-b[i]),mm=avg(D),sd=Math.sqrt(D.reduce((t,v)=>t+(v-mm)**2,0)/(N-1));
 const done=R.reduce((t,m)=>t+m.stats.done,0),fail=R.reduce((t,m)=>t+m.stats.fail,0);
 console.log(k.padEnd(7),`net ${avg(net).toFixed(0)} (${mm>=0?'+':''}${mm.toFixed(0)}±${(1.96*sd/Math.sqrt(N)).toFixed(0)}) done ${(done/N).toFixed(1)} succ ${(100*done/(done+fail)).toFixed(1)} E med ${med(R.map(m=>m.first.gE||999))} E≤48 ${R.filter(m=>(m.first.gE||999)<=48).length}% advs ${avg(R.map(m=>m.wk[47].n)).toFixed(1)} #1 ${rank(0)} #3 ${rank(2)} #5 ${rank(4)} #8 ${rank(7)} 나중합류 평균 Lv ${avg(later.map(a=>a.lv)).toFixed(1)} · ${avg(later.map(a=>a.done)).toFixed(1)}건 · 애착 ${avg(later.map(a=>a.att)).toFixed(0)} dead ${avg(R.map(m=>m.stats.deaths)).toFixed(2)} expired ${avg(R.map(m=>m.wk.reduce((t,x)=>t+(x.k.expire||0),0))).toFixed(1)}`);}
