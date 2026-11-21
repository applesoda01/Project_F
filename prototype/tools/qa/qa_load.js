const {chromium}=require('playwright');const fs=require('fs');const SP=__dirname;
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files']});const p=await b.newPage({viewport:{width:1280,height:720}});const req=[];let phase='boot';
p.on('request',r=>{const u=r.url();if(u.startsWith('file://')){let f=decodeURIComponent(u.slice(7).split('?')[0]);try{req.push({phase,f,sz:fs.statSync(fs.realpathSync(f)).size})}catch(e){}}});
const t0=Date.now();await p.goto('file://'+SP+'/qa/index.html?nopick=1');await p.waitForFunction(()=>!document.getElementById('loading'),null,{timeout:120000});const tl=Date.now()-t0;phase='lazy';await p.waitForTimeout(8000);
const sum=ph=>req.filter(r=>r.phase===ph);const mb=a=>(a.reduce((x,r)=>x+r.sz,0)/1048576).toFixed(1);
const boot=sum('boot'),lazy=sum('lazy');const big=boot.filter(r=>/\.png$/.test(r.f)).sort((a,b)=>b.sz-a.sz).slice(0,6).map(r=>(r.sz/1048576).toFixed(1)+'MB '+r.f.split('/assets/')[1]);
const ext={};for(const r of boot){const e=r.f.split('.').pop();ext[e]=(ext[e]||0)+r.sz;}
console.log(JSON.stringify({loadMsLocal:tl,boot:{n:boot.length,mb:mb(boot)},lazy:{n:lazy.length,mb:mb(lazy)},byExt:Object.fromEntries(Object.entries(ext).map(([k,v])=>[k,(v/1048576).toFixed(1)])),bigPng:big}));await b.close();})();
