const H=require('./harness.js');const {play,avg,med,pct}=H;const fs=require('fs');
const N=+process.argv[2]||60,W=+process.argv[3]||144,name=process.argv[4]||'base';
const POL={base:{},full:{deco:true,build:true,tables:4,dg:'send'}};
const R=[];const t0=Date.now();for(let i=0;i<N;i++){const m=play(7000+i,W,Object.assign({snap:[12,24,48,72,96,120,144,192,240]},POL[name]));m.g=null;R.push(m);}
fs.writeFileSync(require('path').join(require('os').tmpdir(),`long_${name}_${N}x${W}.json`),JSON.stringify(R));console.log('ok',name,N,W,((Date.now()-t0)/1000).toFixed(0)+'s');
