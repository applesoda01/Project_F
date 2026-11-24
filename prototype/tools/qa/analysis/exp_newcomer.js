const H=require('./harness.js');const {play,avg,med,pct,Gm}=H;const N=60;
const rec=[];// per adventurer: joined, by relative week: state
for(let i=0;i<N;i++){const T={};
 play(7000+i,72,{post:(g)=>{for(const a of g.advs){if(!a.alive)continue;const t=T[a.id]=T[a.id]||{home:!!a.home,j:a.joined,st:[],att:[],done:[],lv:[]};t.st.push(a.state==='quest'?'q':a.state==='away'?'a':a.state==='injured'?'i':(a.idle||'t'));t.att.push(a.attach);t.done.push(a.done);t.lv.push(a.lv);}}});
 for(const id in T)rec.push(T[id]);}
const F=rec.filter(r=>r.home),NW=rec.filter(r=>!r.home&&r.st.length>=24);
const share=(R,a,b)=>{const c={};let n=0;for(const r of R)for(const s of r.st.slice(a,b)){c[s]=(c[s]||0)+1;n++;}return Object.fromEntries(Object.entries(c).sort((x,y)=>y[1]-x[1]).map(([k,v])=>[k,(100*v/n).toFixed(0)+'%']));};
console.log('창립(n='+F.length+') 첫 12주:',JSON.stringify(share(F,0,12)),' 13~24주:',JSON.stringify(share(F,12,24)));
console.log('나중 합류(n='+NW.length+') 합류 뒤 1~12주:',JSON.stringify(share(NW,0,12)),' 13~24주:',JSON.stringify(share(NW,12,24)));
for(const [nm,R] of [['창립',F],['나중',NW]])console.log(nm,'합류 뒤 12주: 완료',avg(R.map(r=>r.done[11]-0)).toFixed(1),'건 · 애착',avg(R.map(r=>r.att[11])).toFixed(0),'· Lv',avg(R.map(r=>r.lv[11])).toFixed(1),' / 24주: 완료',avg(R.map(r=>r.done[23])).toFixed(1),'건 · 애착',avg(R.map(r=>r.att[23])).toFixed(0),'· Lv',avg(R.map(r=>r.lv[23])).toFixed(1));
// 나중 합류: 합류한 뒤 첫 의뢰를 떠나기까지 걸린 주
const firstQ=NW.map(r=>{const k=r.st.indexOf('q');return k<0?99:k;});console.log('첫 출발까지: 중앙',med(firstQ),'주 · p75',pct(firstQ,.75),'· p90',pct(firstQ,.9),'· 12주 안에 한 번도 안 나감',(100*firstQ.filter(x=>x>=12).length/firstQ.length).toFixed(0)+'%');
// 마을에 있는데(=away 아님, quest 아님) 못 나간 이유
const idle={};let n=0;for(const r of NW)for(const s of r.st.slice(0,24))if(s!=='q'&&s!=='a'&&s!=='i'){idle[s]=(idle[s]||0)+1;n++;}console.log('나중 합류가 길드에 왔지만 못 나간 주의 이유:',JSON.stringify(Object.fromEntries(Object.entries(idle).map(([k,v])=>[k,(100*v/n).toFixed(0)+'%']))),'(전체 주의',(100*n/NW.reduce((t,r)=>t+Math.min(24,r.st.length),0)).toFixed(0)+'%)');
