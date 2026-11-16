'use strict';
// 늦장 실패 제안서용 측정: 게임 규칙 사본에 늦장 판정을 끼워 100판 · 48주
const fs=require('fs'),path=require('path'),vm=require('vm');
const JS=path.join(__dirname,'..','..','prototype','js');   // node docs/design/proposal_late_fail_measure.js
function load(mode){
  const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);
  for(const f of ['data_gen.js','combat.js','sim_engine.js']) vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f});
  let g=fs.readFileSync(path.join(JS,'game_core.js'),'utf8');
  const A="const ok = fight ? fight.win : s.R() < p, rate = Math.round(pp * 100);";
  if(!g.includes(A)) throw 'anchor';
  g=g.replace(A,`let ok = fight ? fight.win : s.R() < p; const rate = Math.round(pp * 100);
        const LT = window.__LATE; let late = false;
        if (LT) { let none = 1; for (const m of party) none *= 1 - (LT.base + LT.spend[m.spend] + LT.social[m.social] + LT.risk[m.risk]) * (LT.combat || !fight ? 1 : LT.combatMul); late = s.R() > none; }
        if (late) { s.stats.late = (s.stats.late || 0) + 1; if (LT.mode === 'fail') { if (ok) s.stats.lateFail = (s.stats.lateFail || 0) + 1; ok = false; } }
        s.stats.byRisk = s.stats.byRisk || [[0,0],[0,0],[0,0]]; s.stats.byRisk[party[0].risk][ok ? 0 : 1]++;
        if (fight) { s.stats.cb = s.stats.cb || [0,0]; s.stats.cb[ok?0:1]++; } else { s.stats.nc = s.stats.nc || [0,0]; s.stats.nc[ok?0:1]++; }`);
  g=g.replace("const RW = q.reward * (q.x2 ? 2 : 1), DV = s.cfg.deco;","const RW = q.reward * (q.x2 ? 2 : 1) * (x.late ? (window.__LATE.rwMul || 1) : 1), DV = s.cfg.deco;");
  g=g.replace("s.active.push({ q, party: party.map(m => m.id), p, ok, rate, start: s.week, weeks, back: s.week + weeks,","s.active.push({ late, q, party: party.map(m => m.id), p, ok, rate, start: s.week, weeks: weeks + (late && window.__LATE.addW ? 1 : 0), back: s.week + weeks + (late && window.__LATE.addW ? 1 : 0),");
  vm.runInContext(g,ctx,{filename:'game_core.js'});
  return ctx;
}
function run(name,LATE,cfgMod){
  const ctx=load(); ctx.__LATE=LATE; const Sim=ctx.GuildSim,Gm=ctx.GuildGame,N=100;
  let op=0,d=0,f=0,late=0,lf=0,br=[[0,0],[0,0],[0,0]],cb=[0,0],nc=[0,0],dead=0,trust=0;
  for(let i=0;i<N;i++){const c=Sim.defaults(); if(cfgMod) cfgMod(c); const g=Gm.newGame(c,7000+i);Gm.autoPlace(g,true);
    for(let w=0;w<48;w++){Gm.autoRequests(g);Gm.stepWeek(g);Gm.autoCook(g);if(g.week%Gm.WPM===0)Gm.autoPlace(g,false);}
    op+=g.history.reduce((t,m)=>t+m.net,0)/g.history.length;d+=g.stats.done;f+=g.stats.fail;late+=g.stats.late||0;lf+=g.stats.lateFail||0;
    const b=g.stats.byRisk||[[0,0],[0,0],[0,0]];for(let r=0;r<3;r++){br[r][0]+=b[r][0];br[r][1]+=b[r][1];}
    for(const [k,arr] of [['cb',cb],['nc',nc]]){const v=g.stats[k]||[0,0];arr[0]+=v[0];arr[1]+=v[1];}
    dead+=g.advs.filter(a=>!a.alive).length; trust+=g.trust;}
  const pc=(a)=>a[0]+a[1]?(100*a[0]/(a[0]+a[1])).toFixed(1):'-';
  const o={name,op:Math.round(op/N),succ:(100*d/(d+f)).toFixed(1),quests:((d+f)/N).toFixed(1),late:(late/N).toFixed(1),lateFail:(lf/N).toFixed(1),risk:br.map(pc),combat:pc(cb),noncombat:pc(nc),dead:(dead/N).toFixed(2),trust:(trust/N).toFixed(0)};
  console.log(JSON.stringify(o)); return o;
}
const out=[];
const L=(base,mode,extra)=>Object.assign({base,spend:[0,0.01,0.04],social:[-0.01,0,0.03],risk:[-0.01,0,0.02],combat:true,mode},extra||{});
out.push(run('0 지금',null));
out.push(run('A 늦장=실패 (기본 3%)',L(0.03,'fail')));
out.push(run('A2 늦장=실패 (기본 5%)',L(0.05,'fail')));
out.push(run('B 늦장=늦게 성공(+1주 · 보수 절반)',L(0.03,'late',{addW:1,rwMul:0.5})));
out.push(run('C 출발 기준 낮춤',null,c=>{c.adv.departTh=[0.85,0.75,0.55];}));
out.push(run('D = A + C',L(0.03,'fail'),c=>{c.adv.departTh=[0.90,0.80,0.60];}));
fs.writeFileSync(require('path').join(__dirname,'proposal_late_fail_result.json'),JSON.stringify(out,null,1));
