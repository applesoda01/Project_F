const fs=require('fs'),path=require('path'),vm=require('vm');const JS=require('path').join(__dirname,'..','..','js');
const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);for(const f of ['data_gen.js','combat.js','sim_engine.js','game_core.js'])vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f});
const Sim=ctx.GuildSim,Gm=ctx.GuildGame,N=30;const tagN={},perWeek=[];const sample={};
for(let i=0;i<N;i++){const g=Gm.newGame(Sim.defaults(),7000+i);Gm.autoPlace(g,true);
 for(let w=0;w<48;w++){const top=g.log[0];const b0=g.board.length;Gm.autoRequests(g);Gm.stepWeek(g);Gm.autoCook(g);if(g.week%Gm.WPM===0)Gm.autoPlace(g,false);
  const f=[];for(const L of g.log){if(L===top)break;f.push(L);} const tags={};for(const L of f){const t=L.kind||'?';tags[t]=(tags[t]||0)+1;tagN[t]=(tagN[t]||0)+1;if(!sample[t])sample[t]=(L.msg||L.text||JSON.stringify(L)).slice(0,70);}
  perWeek.push({i,w,n:f.length,tags,newQ:Math.max(0,g.board.length-b0),gold:g.gold});}}
console.log(JSON.stringify(Object.entries(tagN).sort((a,b)=>b[1]-a[1])));console.log(JSON.stringify(sample,null,0).slice(0,3000));
fs.writeFileSync(__dirname+'/qa_out/tempo_raw.json',JSON.stringify(perWeek));
