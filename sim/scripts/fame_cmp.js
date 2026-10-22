const S=require(require("path").resolve(process.argv[2]));const N=60;const c=S.defaults();if(process.argv[3])Object.assign(c.fame,JSON.parse(process.argv[3]));
let adv=[[],[],[],[],[]],reach=[[],[],[]],net=0,d=0,f=0,fame=[];
for(let i=0;i<N;i++){const r=S.simulate(c,'balanced',7000+i);for(let y=0;y<5;y++)adv[y].push(r.advYear[y]);for(let g=1;g<=3;g++)if(r.reach[g]!=null)reach[g-1].push(r.reach[g]/48);net+=r.firstNetF.reduce((a,b)=>a+b,0)/r.firstNetF.length;d+=r.qDone;f+=r.qFail;if(r.fameYear)fame.push(r.fameYear);}
const med=a=>{a=a.slice().sort((x,y)=>x-y);return a[a.length>>1]};
console.log('advYear y1..5',adv.map(a=>med(a)).join(' '),'| reach E/D/C',reach.map(a=>med(a).toFixed(1)).join(' '),'| 1y net',Math.round(net/N),'| success',(d/(d+f)*100).toFixed(1)+'%');
if(fame.length)console.log('fame y1..10',[0,1,2,3,4,5,6,7,8,9].map(y=>Math.round(med(fame.map(x=>x[y]||0)))).join(' '));
