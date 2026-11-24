const {avg}=require('./harness.js');const R=require(require('path').join(require('os').tmpdir(),`long_${process.argv[2]||'base'}_60x144.json`));const N=R.length;
const K=new Set();for(const m of R)for(const x of m.wk)for(const k in x.k)K.add(k);
const ks=[...K].sort();console.log('window '+ks.map(k=>k.slice(0,7).padStart(8)).join(''));
for(let q=0;q<12;q++){const T={};for(const m of R)for(const x of m.wk.slice(q*12,q*12+12))for(const k in x.k)T[k]=(T[k]||0)+x.k[k];console.log(String(q*12+1).padStart(3)+'-'+String(q*12+12).padEnd(3)+ks.map(k=>((T[k]||0)/N).toFixed(1).padStart(8)).join(''));}
