const fs=require('fs'),path=require('path'),vm=require('vm');const JS='GW_ROOT/js';const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['data_gen.js','combat.js','sim_engine.js','game_core.js'])vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f});
const Sim=ctx.GuildSim,Gm=ctx.GuildGame;Gm.live=true;
for(let i=0;i<30;i++){const seed=7000+i;const g=Gm.newGame(Sim.defaults(),seed);Gm.autoPlace(g,true);
 for(let w=0;w<90&&!(g.main&&g.main.state==='live');w++){Gm.autoRequests(g);Gm.stepWeek(g);Gm.autoCook(g);if(g.week%4===0)Gm.autoPlace(g,false);}
 if(!(g.main&&g.main.state==='live'))continue;const k=[];let n=0;while(g.main.state==='live'&&n++<8){const r=Gm.mainNextWave(g);k.push(r.segs.map(x=>x.kind[0]).join(''));}
 console.log(seed,g.main.state,k.join(' '));}
