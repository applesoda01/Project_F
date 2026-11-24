// exp_d1.js 결과 모으기.  node an_d1.js [판 수]
const fs=require('fs'),path=require('path'),os=require('os');const N=+process.argv[2]||100;
const RULES=[['now','지금 규칙'],['att3','먹으면 애착 +3'],['att6','먹으면 애착 +6'],['v1','먹으면 돌아온 뒤 1주 꼭 옴'],['v2','〃 2주'],['v3','〃 3주']];
const D={};for(const [k] of RULES)D[k]=JSON.parse(fs.readFileSync(path.join(os.tmpdir(),`d1_${k}_${N}.json`),'utf8'));
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length,med=a=>a.slice().sort((x,y)=>x-y)[Math.floor((a.length-1)/2)];
const dif=(a,b)=>{const d=a.map((x,i)=>x-b[i]),m=avg(d),sd=Math.sqrt(d.reduce((t,v)=>t+(v-m)**2,0)/(d.length-1));return `${m>=0?'+':''}${m.toFixed(0)} ± ${(1.96*sd/Math.sqrt(d.length)).toFixed(0)}`;};
const pc=a=>(100*avg(a)).toFixed(0)+'%';
console.log(`D1 시험 — 「길드 식당에서 먹은 모험가가 더 자주 온다」 (${N}판 · 48주 · 같은 시드 짝 비교 · ± 는 95% 구간)\n규칙은 측정 도구 안에서만 흉내 낸 것이며 게임 코드와 수치는 그대로입니다.\n`);
console.log('[1] 규칙마다 기본 봇(테이블 2세트로 시작 · 요리 자동)의 한 해');
for(const [k,nm] of RULES){const b=D[k].base;console.log(`  ${nm.padEnd(18)} 월 순수입 ${avg(b.net).toFixed(0)}G (지금 대비 ${k==='now'?'—':dif(b.net,D.now.base.net)}G) · 성공한 원정 ${avg(b.done).toFixed(1)}건 · 48주 안 E급 ${b.gE.filter(x=>x<=48).length*100/N}% (중앙 ${med(b.gE)}주) · 만료 ${avg(b.exp).toFixed(1)}건 · 한 주 식사 ${avg(b.eat).toFixed(2)}명 · 3명 이상인 주 ${pc(b.ge3)} · 자리가 다 찬 주 ${pc(b.full)} · 창립 멤버가 아닌 모험가의 부재 ${pc(b.away)} · 나중 합류자 원정 ${avg(b.ldone).toFixed(1)}건 · 48주 금고 ${avg(b.gold).toFixed(0)}G`);}
console.log('\n[2] 식당 투자의 값 — 월 순수입 차이 (G)');
console.log('  규칙'.padEnd(20)+'식당 전체(기본 − 식당 없음)'.padEnd(24)+'첫 세트(1 − 0)'.padEnd(18)+'둘째 세트(2 − 1)'.padEnd(18)+'셋째 · 넷째(4 − 2)'.padEnd(20)+'요리(테이블 0 − 식당 없음)');
for(const [k,nm] of RULES){const d=D[k];console.log('  '+nm.padEnd(18)+dif(d.base.net,d.noRest.net).padEnd(24)+dif(d.t1.net,d.t0.net).padEnd(18)+dif(d.t2.net,d.t1.net).padEnd(18)+dif(d.t4.net,d.t2.net).padEnd(20)+dif(d.t0.net,d.noRest.net));}
console.log('\n[3] 본전까지 걸리는 달 (세트 200G ÷ 월 순수입 차이)');
for(const [k,nm] of RULES){const d=D[k];const pb=(a,b,c)=>{const m=avg(a.map((x,i)=>x-b[i]));return m>0?(c/m).toFixed(1)+'달':'없음';};console.log('  '+nm.padEnd(18)+`첫 세트 ${pb(d.t1.net,d.t0.net,200)} · 둘째 세트 ${pb(d.t2.net,d.t1.net,200)} · 셋째 · 넷째 ${pb(d.t4.net,d.t2.net,200*avg(d.t4.tab.map((x,i)=>x-d.t2.tab[i]))||400)} (실제로 놓인 세트 ${avg(d.t4.tab).toFixed(1)})`);}
console.log('\n[4] 테이블 수에 따른 식당 이용 (한 주 식사 인원 · 자리가 다 찬 주)');
for(const [k,nm] of RULES){const d=D[k];console.log('  '+nm.padEnd(18)+['t1','t2','t4'].map(p=>`${p.slice(1)}세트 ${avg(d[p].eat).toFixed(2)}명 · ${pc(d[p].full)}`).join('   '));}
console.log('\n[5] 식당에 투자하지 않은 봇(테이블 0 · 요리 안 함)과 기본 봇의 차이');
for(const [k,nm] of RULES){const d=D[k];console.log('  '+nm.padEnd(18)+`성공한 원정 ${avg(d.noRest.done).toFixed(1)} → ${avg(d.base.done).toFixed(1)}건 · 48주 안 E급 ${d.noRest.gE.filter(x=>x<=48).length*100/N}% → ${d.base.gE.filter(x=>x<=48).length*100/N}% · 부재 ${pc(d.noRest.away)} → ${pc(d.base.away)} · 48주 금고 ${avg(d.noRest.gold).toFixed(0)} → ${avg(d.base.gold).toFixed(0)}G`);}
console.log('\n[6] 「식당을 아예 하지 않는 봇」과 견준 값 — 월 순수입 차이 (G) · 테이블 값을 다 낸 뒤 48주 금고 차이');
for(const [k,nm] of RULES){const d=D[k];console.log('  '+nm.padEnd(18)+`1세트 + 요리 ${dif(d.t1.net,d.noRest.net)} · 2세트 + 요리 ${dif(d.t2.net,d.noRest.net)} · 기본 봇 ${dif(d.base.net,d.noRest.net)} · 48주 금고 ${dif(d.base.gold,d.noRest.gold)}G`);}
