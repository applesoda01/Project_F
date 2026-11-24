// 육성의 기준값: 첫해 모험가의 레벨 · 능력치가 어떻게 자라는가, 리퀘스트의 능력치 조건이 얼마나 막는가.  node exp_grow.js [판 수]
const {play,avg,med,Gm}=require('./harness.js');const N=+process.argv[2]||100,W=48,WK=[4,12,24,36,40,48],ST=Gm.STATS||['힘','민첩','지력','정신','기교'];
const q=(a,p)=>{const s=a.slice().sort((x,y)=>x-y);return s.length?s[Math.min(s.length-1,Math.floor(p*(s.length-1)+0.5))]:0;};
const S={};for(const w of WK)S[w]={f:[],l:[]};const lvAt={},RQ={},first={};
for(let i=0;i<N;i++){const seen={},up={};
  const m=play(7000+i,W,{keepState:true,post:(g,w)=>{const wk=g.week;
    for(const a of g.advs){if(!a.alive)continue;const k=i+':'+a.id;if(up[k]==null)up[k]={lv:a.lv,w:wk,home:a.home};if(a.lv>up[k].lv){for(let L=up[k].lv+1;L<=a.lv;L++)if(a.home)(lvAt[L]=lvAt[L]||[]).push(wk);up[k].lv=a.lv;}}
    if(WK.includes(wk))for(const a of g.advs){if(!a.alive)continue;const o=a.stats.slice().map((v,j)=>Gm.finalStat(g,a,j));const nc=o.filter((_,j)=>j!==a.core);
      S[wk][a.home?'f':'l'].push({lv:a.lv,core:o[a.core],nc:avg(nc),ncMax:Math.max(...nc),gr:a.grade,age:wk-(a.joined||0)});}
    for(const r of g.req.open){if(seen[r.id])continue;seen[r.id]=1;const d=Gm.NQ_BY[r.key];if(!d||!d.req||d.req[0]===-1)continue;const al=g.advs.filter(a=>a.alive);
      const vals=al.map(a=>Math.round(Gm.finalStat(g,a,d.req[0]===-2?a.core:d.req[0]))).sort((x,y)=>y-x);const ok=vals.filter(v=>v>=d.req[1]).length;
      const R=RQ[r.key]=RQ[r.key]||{name:d.name,req:d.req,party:d.party,n:0,wk:[],ok:[],best:[],second:[],blocked:0,done:0,doneWk:[]};R.n++;R.wk.push(wk);R.ok.push(ok);R.best.push(vals[0]||0);R.second.push(vals[1]||0);if(!ok)R.blocked++;first[i+':'+r.key]=wk;}
  }});
  for(const k in m.g.req.done){const R=RQ[k];if(R&&first[i+':'+k]!=null){R.done++;R.doneWk.push(m.g.req.done[k].week-first[i+':'+k]);}}}
console.log(`육성의 기준값 (${N}판 · 48주 · 기본 봇 · 능력치는 장비까지 넣은 값)\n\n[1] 레벨과 능력치 — 창립 멤버`);
const row=(L)=>`인원 ${(L.length/N).toFixed(1)}명 · 레벨 평균 ${avg(L.map(x=>x.lv)).toFixed(1)} (10~90%: ${q(L.map(x=>x.lv),.1)}~${q(L.map(x=>x.lv),.9)}) · 주 능력치 ${avg(L.map(x=>x.core)).toFixed(0)} · 나머지 넷 평균 ${avg(L.map(x=>x.nc)).toFixed(1)} (그중 가장 높은 것 ${avg(L.map(x=>x.ncMax)).toFixed(1)}) · E급 이상 ${(100*L.filter(x=>x.gr>=1).length/L.length).toFixed(0)}%`;
for(const w of WK)console.log(`  ${String(w).padStart(2)}주: ${row(S[w].f)}`);
console.log('\n[2] 레벨과 능력치 — 나중에 온 모험가');
for(const w of WK)if(S[w].l.length)console.log(`  ${String(w).padStart(2)}주: ${row(S[w].l)} · 길드에 온 지 평균 ${avg(S[w].l.map(x=>x.age)).toFixed(0)}주`);
console.log('\n[3] 창립 멤버가 그 레벨에 닿는 주 (중앙값 · 10~90%) — 한 레벨에 걸리는 시간');
let prev=0;for(const L of Object.keys(lvAt).map(Number).sort((a,b)=>a-b)){const a=lvAt[L];if(a.length<N)continue;const mm=med(a);console.log(`  Lv ${L}: ${mm}주 (${q(a,.1)}~${q(a,.9)}) · 앞 레벨에서 ${mm-prev}주`);prev=mm;}
console.log('\n[4] 능력치 조건이 붙은 리퀘스트 — 등장했을 때 조건에 맞는 모험가 수');
const name=r=>r[0]===-2?'주 능력치':ST[r[0]];
for(const k of Object.keys(RQ).sort((a,b)=>med(RQ[a].wk)-med(RQ[b].wk))){const R=RQ[k];
  console.log(`  ${R.name.padEnd(16)} ${name(R.req)} ${R.req[1]} 이상 · 파티 ${R.party?R.party.join('~'):'-'}명 | 등장 ${(100*R.n/N).toFixed(0)}% · ${med(R.wk)}주(중앙) | 맞는 사람 평균 ${avg(R.ok).toFixed(1)}명 · 한 명도 없음 ${(100*R.blocked/R.n).toFixed(0)}% | 가장 높은 사람 ${avg(R.best).toFixed(0)} · 둘째 ${avg(R.second).toFixed(0)} | 완료 ${(100*R.done/R.n).toFixed(0)}%${R.doneWk.length?' · 등장 뒤 '+med(R.doneWk)+'주':''}`);}
