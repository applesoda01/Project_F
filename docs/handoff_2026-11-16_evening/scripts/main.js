const fs=require('fs'),path=require('path'),vm=require('vm');const JS='GW_ROOT/js';const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['data_gen.js','combat.js','sim_engine.js','game_core.js'])vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f});
const Sim=ctx.GuildSim,Gm=ctx.GuildGame;const N=+process.argv[2]||100,WEEKS=+process.argv[3]||72;if(process.argv[4])Gm.MAIN_CFG.autoAccept=+process.argv[4];if(process.argv[5])Gm.MAIN_CFG.need=+process.argv[5];
const off=[],clr=[],tries=[],firstWin=[0,0];let net=0,done=0,fail=0,gold=0,deaths=0,popAt=0,nDef=0,nRun=0,down=0;
for(let i=0;i<N;i++){const g=Gm.newGame(Sim.defaults(),7000+i);Gm.autoPlace(g,true);let lastTry=0;
 for(let w=0;w<WEEKS;w++){Gm.autoRequests(g);Gm.stepWeek(g);Gm.autoCook(g);if(g.week%4===0)Gm.autoPlace(g,false);
  const M=g.main;if(M.tries>lastTry){lastTry=M.tries;nRun++;nDef+=M.last.n;down+=M.last.down;if(M.tries===1)firstWin[M.last.win?0:1]++;}
  if(g.week===48){net+=g.history.slice(0,12).reduce((t,m)=>t+m.net,0)/12;done+=g.stats.done;fail+=g.stats.fail;gold+=g.gold;deaths+=g.stats.deaths;}}
 off.push(g.main.offered==null?999:g.main.offered);clr.push(g.main.clear==null?999:g.main.clear);tries.push(g.main.tries);}
const Q=(a,p)=>{const T=a.slice().sort((x,y)=>x-y);return T[Math.min(T.length-1,Math.floor(p*T.length))]};
const line=(n,a)=>console.log(n,'최소',Q(a,0),'10%',Q(a,.1),'25%',Q(a,.25),'중앙',Q(a,.5),'75%',Q(a,.75),'90%',Q(a,.9),'| 48주 안',a.filter(x=>x<=48).length,'판 |',WEEKS+'주 안 미달',a.filter(x=>x>WEEKS).length);
line('메인 등장 주',off);line('클리어(승급) 주',clr);
console.log('첫 도전 승',firstWin[0],'패',firstWin[1],'| 판당 도전',(tries.reduce((a,b)=>a+b,0)/N).toFixed(2),'| 침공 1번에 참가',(nDef/nRun).toFixed(1),'명, 쓰러짐',(down/nRun).toFixed(1),'명');
console.log('1년: 월 순이익',Math.round(net/N),'성공률',(done/(done+fail)*100).toFixed(1)+'%','금고',Math.round(gold/N),'사망',(deaths/N).toFixed(2));
