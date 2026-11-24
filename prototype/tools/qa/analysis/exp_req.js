const H=require('./harness.js');const {play,avg,med,pct,Gm}=H;
const N=60,T={};const perGame=[];
for(let i=0;i<N;i++){const seen={};
 const m=play(7000+i,96,{keepState:true,post:(g)=>{for(const r of g.req.open){const o=seen[r.key]=seen[r.key]||{at:r.at!=null?r.at:g.week,first:g.week,lockW:0,openW:0,queuedW:0,activeW:0};if(r.state==='open'){o.openW++;if(Gm.reqLock(g,r))o.lockW++;}else if(r.state==='queued')o.queuedW++;else if(r.state==='active')o.activeW++;}
   for(const k in g.req.done)if(seen[k]&&seen[k].done==null)seen[k].done=g.req.done[k].week;}});
 perGame.push(seen);
 for(const k in seen){const o=seen[k];(T[k]=T[k]||[]).push(o);}}
const rows=Object.keys(T).map(k=>{const d=Gm.NQ_BY[k],A=T[k],D=A.filter(o=>o.done!=null);return {k,name:d.name,type:d.type,season:(d.season||[]).join('/'),seen:A.length/N,at:med(A.map(o=>o.at)),done:D.length/N,wait:D.length?avg(D.map(o=>o.done-o.at)):null,lock:avg(A.map(o=>o.lockW)),doneW:D.length?med(D.map(o=>o.done)):null,cost:d.cost};}).sort((a,b)=>a.at-b.at);
console.log('id | 종류 | 계절 | 등장률 | 등장 주(중앙) | 완료율 | 완료 주(중앙) | 걸린 주(평균) | 잠긴 주(평균) | 비용');
for(const r of rows)console.log([r.k.replace('f_req_',''),r.type,r.season||'-',(r.seen*100).toFixed(0)+'%',r.at,(r.done*100).toFixed(0)+'%',r.doneW,r.wait!=null?r.wait.toFixed(1):'-',r.lock.toFixed(1),JSON.stringify(r.cost)].join(' | ')+' | '+r.name);
const missing=Gm.NQ.filter(d=>!T[d.id]).map(d=>d.id+' '+d.name);console.log('never seen in 96w:',missing.join(', '));
// 10번째 완료 주, 종류별 완료 수(48주)
const tenth=perGame.map(s=>{const w=Object.values(s).map(o=>o.done).filter(x=>x!=null).sort((a,b)=>a-b);return w[9];}).filter(x=>x!=null);console.log('10th done week p10/med/p90',pct(tenth,.1),med(tenth),pct(tenth,.9));
const byT={};for(const s of perGame)for(const k in s){const o=s[k];if(o.done!=null&&o.done<=48){const t=Gm.NQ_BY[k].type;byT[t]=(byT[t]||0)+1;}}console.log('done≤48 by type per game',JSON.stringify(Object.fromEntries(Object.entries(byT).map(([k,v])=>[k,(v/N).toFixed(1)]))));
// 리퀘스트에 쓴 돈 (48주): 돈 내기 비용 + 섭외비
