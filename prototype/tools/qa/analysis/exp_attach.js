// 애착 패널티의 크기: 「애착이 낮으면 길드에 잘 안 옴」 규칙을 바꿔 보면.  node exp_attach.js <규칙,…|all> [판 수]   → 모으기: node exp_attach.js report [판 수]
// 규칙은 읽어 들인 game_core.js 글을 메모리에서만 바꿔 흉내 냅니다 (게임 파일 · 수치는 그대로). cfg.att 가 없으면 원본과 같음.
const fs=require('fs'),path=require('path'),os=require('os');
const RULE={now:['지금 규칙 (애착 0이면 33%)',{}],floor50:['들를 확률 바닥 50%',{floor:.5}],floor60:['들를 확률 바닥 60%',{floor:.6}],floor70:['들를 확률 바닥 70%',{floor:.7}],floor80:['들를 확률 바닥 80%',{floor:.8}],all:['누구나 늘 옴 (천장)',{floor:1}],
  stay8:['수습 8주 (그동안 머묾)',{stayW:8}],stay12:['수습 12주',{stayW:12}],gain5:['애착이 빨리 오름 (성공 1건 +2 → +5)',{gain:5}],
  stay12f60:['수습 12주 + 바닥 60%',{stayW:12,floor:.6}],settle:['수습 12주 + 애착 +5 + 애착 30에 정착',{stayW:12,gain:5,settle:30}],full:['수습 12주 + 바닥 60% + 애착 +5 + 애착 30에 정착',{stayW:12,floor:.6,gain:5,settle:30}]};
const arg=process.argv[2]||'all',N=+process.argv[3]||100,W=48,file=k=>path.join(os.tmpdir(),`att_${k}_${N}.json`);
const avg=a=>a.reduce((x,y)=>x+y,0)/a.length,med=a=>a.slice().sort((x,y)=>x-y)[Math.floor((a.length-1)/2)];
if(arg!=='report'){
  global.__PF_PATCH=(f,src)=>{if(f!=='game_core.js')return src;const a="return s.R() < Math.min(1, 2 / interval);";if(src.split(a).length!==2)throw new Error('exp_attach: 붙일 자리를 찾지 못했습니다');
    return src.replace(a,"{ const X = s.cfg.att || {}; if (X.stayW && s.week - (a.joined || 0) < X.stayW) return true; if (X.settle && a.attach >= X.settle) { a.home = true; return true; } return s.R() < Math.max(X.floor || 0, Math.min(1, 2 / interval)); }");};
  const {play}=require('./harness.js');
  for(const k of (arg==='all'?Object.keys(RULE):arg.split(','))){const X=RULE[k][1],S={net:[],done:[],exp:[],gE:[],away:[],lq:[],llv:[],latt:[],home:[],gold:[],fail:[]};
    for(let i=0;i<N;i++){let aw=0,nf=0;const fo={};
      const m=play(7000+i,W,{keepState:true,cfg:c=>{if(X.floor||X.stayW||X.settle)c.att=X;if(X.gain)c.adv.attachSuccess=X.gain;},
        pre:(g)=>{for(const a of g.advs)if(fo[a.id]==null)fo[a.id]=!!a.home;},
        post:(g)=>{for(const a of g.advs)if(a.alive&&fo[a.id]===false){nf++;if(a.state==='away')aw++;}}});
      const L=m.g.advs.filter(a=>a.alive&&fo[a.id]===false);
      S.net.push(avg(m.hist.map(h=>h.net)));S.done.push(m.stats.done);S.fail.push(m.stats.fail);S.exp.push(m.wk.reduce((t,x)=>t+(x.k.expire||0),0));S.gE.push(m.first.gE||999);S.away.push(nf?aw/nf:0);
      S.lq.push(L.length?avg(L.map(a=>a.done)):0);S.llv.push(L.length?avg(L.map(a=>a.lv)):0);S.latt.push(L.length?avg(L.map(a=>a.attach)):0);S.home.push(L.filter(a=>a.home).length);S.gold.push(m.end.gold);}
    fs.writeFileSync(file(k),JSON.stringify(S));console.log(k,'net',avg(S.net).toFixed(0));}
}else{
  const D={};for(const k of Object.keys(RULE))if(fs.existsSync(file(k)))D[k]=JSON.parse(fs.readFileSync(file(k),'utf8'));const b=D.now;
  const dif=(a,c)=>{const d=a.map((x,i)=>x-c[i]),m=avg(d),sd=Math.sqrt(d.reduce((t,v)=>t+(v-m)**2,0)/(d.length-1));return `${m>=0?'+':''}${m.toFixed(0)} ± ${(1.96*sd/Math.sqrt(d.length)).toFixed(0)}`;};
  console.log(`애착 패널티의 크기 (${N}판 · 48주 · 같은 시드 짝 비교 · ± 95%)\n지금 규칙: 길드에 들를 확률 = 애착 0 → 33% · 20 → 38% · 50 → 50% · 80 → 71% · 100 → 100% (창립 멤버는 늘 있음)\n`);
  for(const k of Object.keys(D)){const S=D[k];console.log(`${RULE[k][0].padEnd(30)} 월 순수입 ${avg(S.net).toFixed(0)}G (${k==='now'?'기준':dif(S.net,b.net)}) · 성공한 원정 ${avg(S.done).toFixed(1)}건 · 실패 ${avg(S.fail).toFixed(1)}건 · 만료 ${avg(S.exp).toFixed(1)}건 · 48주 안 E급 ${(100*S.gE.filter(x=>x<=48).length/N).toFixed(0)}% (중앙 ${med(S.gE)}주) | 나중에 온 모험가: 부재 ${(100*avg(S.away)).toFixed(0)}% · 한 해 원정 ${avg(S.lq).toFixed(1)}건 · 48주 Lv ${avg(S.llv).toFixed(1)} · 애착 ${avg(S.latt).toFixed(0)} · 정착 ${avg(S.home).toFixed(1)}명 | 48주 금고 ${avg(S.gold).toFixed(0)}G`);}
}
