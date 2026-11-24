// 애착 달성 보상의 문턱 간격: 모험가마다 애착이 10 · 20 · 35 · 50 · 75 · 100에 닿는 때.  node exp_attach2.js [판 수] [주]
// 「패널티 없음」은 읽어 들인 글을 메모리에서만 바꿔 흉내 냅니다 (누구나 늘 길드에 옴).
global.__PF_PATCH=(f,src)=>{if(f!=='game_core.js')return src;const a="return s.R() < Math.min(1, 2 / interval);";if(src.split(a).length!==2)throw new Error('exp_attach2: 붙일 자리를 찾지 못했습니다');
  return src.replace(a,"return s.cfg.attFree ? true : s.R() < Math.min(1, 2 / interval);");};
const {play,avg,med}=require('./harness.js');const N=+process.argv[2]||100,W=+process.argv[3]||96,T=[10,20,35,50,75,100];
const q=(a,p)=>{const s=a.slice().sort((x,y)=>x-y);return s.length?s[Math.min(s.length-1,Math.floor(p*(s.length-1)+0.5))]:NaN;};
for(const [k,nm] of [['now','지금 규칙'],['free','패널티 없음 (누구나 늘 옴)']]){const A=[];
  for(let i=0;i<N;i++){const rec={};
    play(7000+i,W,{cfg:c=>{if(k==='free')c.attFree=1;},post:(g)=>{for(const a of g.advs){if(!a.alive)continue;const r=rec[a.id]=rec[a.id]||{f:!!a.home&&(a.joined||0)===0,j:a.joined||0,hit:{},last:g.week,a0:a.attach,done:0};r.last=g.week;r.att=a.attach;r.done=a.done;for(const t of T)if(r.hit[t]==null&&a.attach>=t)r.hit[t]=g.week;}}});
    for(const id in rec)A.push(rec[id]);}
  console.log(`\n[${nm}] (${N}판 · ${W}주)`);
  const F=A.filter(r=>r.f),L=A.filter(r=>!r.f);
  console.log(`  창립 멤버 (애착 20에서 시작 · ${(F.length/N).toFixed(1)}명): `+T.filter(t=>t>20).map(t=>{const h=F.filter(r=>r.hit[t]!=null);return `${t} → ${h.length?med(h.map(r=>r.hit[t]))+'주':'—'} (48주 안 ${(100*F.filter(r=>r.hit[t]!=null&&r.hit[t]<=48).length/F.length).toFixed(0)}% · ${W}주 안 ${(100*h.length/F.length).toFixed(0)}%)`;}).join(' · '));
  console.log(`  창립 멤버의 48주 애착: ${'측정 끝 애착 평균 '+avg(F.map(r=>r.att)).toFixed(0)} · 원정 ${avg(F.map(r=>r.done)).toFixed(0)}건`);
  console.log(`  나중에 온 모험가 (애착 0에서 시작 · ${(L.length/N).toFixed(1)}명) — 온 뒤 몇 주 만에 닿는가`);
  for(const t of T){const obs=(x)=>L.filter(r=>r.last-r.j>=x),pc=(x)=>{const o=obs(x);return o.length?(100*o.filter(r=>r.hit[t]!=null&&r.hit[t]-r.j<=x).length/o.length).toFixed(0)+'%':'—';};const h=L.filter(r=>r.hit[t]!=null);
    console.log(`    애착 ${String(t).padStart(3)}: 온 뒤 12주 안 ${pc(12).padStart(4)} · 24주 안 ${pc(24).padStart(4)} · 48주 안 ${pc(48).padStart(4)} · 72주 안 ${pc(72).padStart(4)} · 닿은 사람의 중앙 ${h.length?med(h.map(r=>r.hit[t]-r.j))+'주':'—'} (10~90%: ${h.length?q(h.map(r=>r.hit[t]-r.j),.1)+'~'+q(h.map(r=>r.hit[t]-r.j),.9):'—'})`);}
  const L48=L.filter(r=>r.last-r.j>=48);console.log(`  온 지 48주가 지난 사람의 한 해 원정 ${avg(L48.map(r=>r.done*48/(r.last-r.j))).toFixed(1)}건 · 측정 끝 애착 ${avg(L48.map(r=>r.att)).toFixed(0)}`);}
