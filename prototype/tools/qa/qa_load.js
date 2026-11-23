// 처음 10초 동안 받는 전체 양 + manifest 기준 「시작 전(eager)」 · 「뒤에 천천히(lazy)」 나누기
const {chromium}=require('playwright');const fs=require('fs'),path=require('path');const SP=__dirname;const C=SP+'/'+(process.env.COPY||'qa');
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files']});const p=await b.newPage({viewport:{width:1280,height:720}});const req=new Set();
p.on('request',r=>{const u=r.url();if(u.startsWith('file://'))req.add(decodeURIComponent(u.slice(7).split('?')[0]));});
const t0=Date.now();await p.goto('file://'+C+'/index.html?nopick=1');await p.waitForFunction(()=>!document.getElementById('loading'),null,{timeout:120000});const tl=Date.now()-t0;await p.waitForTimeout(10000);
const lazy=await p.evaluate(()=>{const it=window.ASSET_MANIFEST.items;return Object.keys(it).filter(k=>it[k].lazy).map(k=>it[k].src);});await b.close();
const sz=f=>{try{return fs.statSync(fs.realpathSync(f)).size}catch(e){return 0}};let tot=0,lz=0;const big=[];
for(const f of req){const s=sz(f);tot+=s;const rel=f.split('/assets/')[1]||'';if(lazy.includes(rel))lz+=s;else if(s>2097152)big.push(rel+' '+(s/1048576).toFixed(1));}
console.log(JSON.stringify({loadMsLocal:tl,files:req.size,totalMB:(tot/1048576).toFixed(1),lazyMB:(lz/1048576).toFixed(1),bootMB:((tot-lz)/1048576).toFixed(1),bootBig:big}));})();
