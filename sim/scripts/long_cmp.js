const S=require(process.argv[2]);const c=S.defaults();if(process.argv[3])Object.assign(c.fame,JSON.parse(process.argv[3]));
const N=60,R=[];for(let i=0;i<N;i++)R.push(S.simulate(c,'balanced',7000+i));
const med=a=>{a=a.filter(x=>x!=null).sort((x,y)=>x-y);return a.length?a[a.length>>1]:null};
console.log('reachS',(med(R.map(r=>r.reach[6]))/48).toFixed(1),'end',(med(R.map(r=>r.end))/48||0).toFixed(1),'adv y10/15',med(R.map(r=>r.advYear[9])),med(R.map(r=>r.advYear[14])),'deaths',med(R.map(r=>r.deaths)),'stage2',(med(R.map(r=>r.firstStage2))/48).toFixed(1));
