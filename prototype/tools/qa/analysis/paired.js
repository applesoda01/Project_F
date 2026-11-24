const o=require(require('path').join(require('os').tmpdir(),'levers_100x48.json'));const b=o.base.S;
const st=(a,b)=>{const d=a.map((x,i)=>x-b[i]),n=d.length,m=d.reduce((x,y)=>x+y,0)/n,sd=Math.sqrt(d.reduce((x,y)=>x+(y-m)*(y-m),0)/(n-1));return [m,1.96*sd/Math.sqrt(n)];};
console.log('policy       dNet(G/mo) ±95%   dDone ±      dLv ±      dFame ±    E48%  Emed');
for(const k of Object.keys(o)){const s=o[k].S;const f=(x)=>{const [m,c]=st(s[x],b[x]);return `${m>=0?'+':''}${m.toFixed(x==='lv'?2:1)}±${c.toFixed(x==='lv'?2:1)}`.padEnd(14);};
 console.log(k.padEnd(12),f('net'),f('done'),f('lv'),f('fame'),(s.gE.filter(x=>x<=48).length+'%').padEnd(5),o[k].gEmed);}
console.log('base sd net',Math.sqrt(b.net.reduce((t,x)=>t+(x-o.base.net)**2,0)/99).toFixed(0),'min',Math.min(...b.net).toFixed(0),'max',Math.max(...b.net).toFixed(0));
