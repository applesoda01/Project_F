const B=process.argv[2];const d=require(require('path').join(__dirname,'qa_out',B));
const med=a=>{a=a.filter(x=>x!=null).sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:null};
const pct=(a,p)=>{a=a.filter(x=>x!=null).sort((x,y)=>x-y);return a.length?a[Math.floor((a.length-1)*p)]:null};
const ks=['advE','dgOpen','mainSeen','guildE','dgSend','advD','mgr','upg1','dgClear','death1'];
for(const k of ks){const a=d.map(m=>m.first[k]);console.log(k.padEnd(9),'n',a.filter(x=>x!=null).length,'med',med(a),'p10',pct(a,.1),'p90',pct(a,.9));}
for(const k of ['q','mon','dish','mat']){const a=d.map(m=>m.lastNew[k]);console.log('lastNew',k,'med',med(a),'p90',pct(a,.9),'max',Math.max(...a.filter(x=>x)));}
console.log('end',JSON.stringify(d[0].end));
const W={};for(const m of d)for(const r of m.weekly){(W[r.w]=W[r.w]||[]).push(r);}
console.log('주  금고  등급 인원 최고Lv 평균Lv E급 D급 던전 의뢰종류 성공 실패 사망 명성 인구');
for(const w of Object.keys(W).map(Number).sort((a,b)=>a-b)){const R=W[w],av=k=>R.reduce((t,r)=>t+(r[k]||0),0)/R.length;console.log(w,Math.round(av('gold')),av('grade').toFixed(2),av('advs').toFixed(1),av('lvMax').toFixed(1),av('lvAvg').toFixed(1),av('gE').toFixed(1),av('gD').toFixed(1),Math.round(av('dg')),av('q').toFixed(0),Math.round(av('done')),Math.round(av('fail')),av('dead').toFixed(1),Math.round(av('fame')),Math.round(av('pop')));}
