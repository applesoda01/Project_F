const fs=require('fs'),path=require('path'),vm=require('vm');const JS='GW_ROOT/js';const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['data_gen.js','combat.js','sim_engine.js','game_core.js'])vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f});
const Sim=ctx.GuildSim,Gm=ctx.GuildGame;let same=0,diff=0,ex=null;
for(let i=0;i<40;i++){const g=Gm.newGame(Sim.defaults(),7000+i);Gm.autoPlace(g,true);
 for(let w=0;w<80;w++){Gm.autoRequests(g);if(g.main.state==='set'&&g.week+1>=g.main.at)break;Gm.stepWeek(g);Gm.autoCook(g);if(g.week%4===0)Gm.autoPlace(g,false);}
 if(g.main.state!=='set')continue;
 // 침공 주까지 진행
 while(g.week<g.main.at){Gm.stepWeek(g);}
 // 이제 g.week>=at: 다음 stepWeek에서 침공. 두 갈래로 복제
 const A=Gm.deserialize(Gm.serialize(g)),B=Gm.deserialize(Gm.serialize(g));
 Gm.live=false;Gm.stepWeek(A);
 Gm.live=true;Gm.stepWeek(B);const segs=[];let k=0;while(B.main.state==='live'&&k++<10){const r=Gm.mainNextWave(B);segs.push(r.segs.map(x=>x.kind).join('+'));}
 Gm.live=false;
 const a=JSON.stringify([A.main.state,A.main.last,A.grade,Math.round(A.gold),A.pop]),b=JSON.stringify([B.main.state,B.main.last,B.grade,Math.round(B.gold),B.pop]);
 if(a===b)same++;else{diff++;if(!ex)ex=[a,b];}
 if(i<6)console.log(i,B.main.state,segs.join(' | '));}
console.log('자동 = 화면 경로 같음',same,'다름',diff,ex||'');
