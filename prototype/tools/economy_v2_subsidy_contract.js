// 경제 개편 V2 E7-3 · E7-4: 보조금(매달 고정 / 반기 50%) × 계약(없음 / 자동 계약) 4가지를 100판 비교 (2026-11-18). 실행: node prototype/tools/economy_v2_subsidy_contract.js
// 2026-11-27 V6 1단위: 게임 기본은 보조금 0 · 수수료 20%가 됨. A ~ D는 그때의 비교를 지키려고 V2 값(보조금 비율 50% · 수수료 10%)을 고정하고, E로 지금 기본(V6)을 함께 보임
// 자동 계약 = 집무실이 있으면 월 기준액이 가장 큰 후보에게 기본값으로 제안, 보수를 5G씩 올리며 수락될 때까지(최대 60G), 끝나기 2주 전 같은 조건으로 갱신
const fs=require('fs'),vm=require('vm');const JS=require('path').join(__dirname,'..','js');
const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);for(const f of ['data_gen.js','combat.js','sim_engine.js','game_core.js'])vm.runInContext(fs.readFileSync(JS+'/'+f,'utf8'),ctx);
const Sim=ctx.GuildSim,Gm=ctx.GuildGame;const P=(a,q=.5)=>{a=a.slice().sort((x,y)=>x-y);return a[Math.floor((a.length-1)*q)]};
function autoContract(g){if(!Gm.contractOpen(g))return;
 for(const a of g.advs){const c=a.contract;if(c&&!c.next&&g.week>=c.end-1){for(let p=c.pay;p<=60;p+=5){if(Gm.contractPropose(g,a.id,{weeks:12,rate:c.rate,pay:p,sup:c.sup}).ok)break;}}}
 if(g.advs.some(a=>a.alive&&a.contract))return;
 const al=g.advs.filter(a=>a.alive&&!Gm.contractWhy(g,a)).sort((x,y)=>Gm.earnMonthly(g,y)-Gm.earnMonthly(g,x));if(!al.length)return;
 const a=al[0];for(let p=25;p<=60;p+=5){if(Gm.contractPropose(g,a.id,{pay:p}).ok)return true;}}
function run(name,mode,contract,W,v6){let net=0,e48=0,neg=0,signed=0,cpay=0,calls=0,lowSum=[];const gold=[],ew=[],low=[];
 for(let i=0;i<100;i++){const c=Sim.defaults();if(!v6){c.econ.subsidyMode=mode;c.econ.subsidyEvery=6;c.econ.subsidyRate=0.5;c.econ.feeBase=0.1;}const g=Gm.newGame(c,7000+i);Gm.autoPlace(g,true);let e=null,mn=1e9,sg=false;   // 이 비교는 반기 지급 기준 (2026-11-18 결정 23으로 게임 기본은 4주마다)
  for(let w=0;w<W;w++){Gm.autoRequests(g);Gm.stepWeek(g);Gm.autoCook(g);if(g.week%4===0)Gm.autoPlace(g,false);if(contract&&autoContract(g))sg=true;if(g.week>=2&&g.week<=24)mn=Math.min(mn,g.gold);if(e==null&&g.grade>0)e=g.week;}
  net+=g.history.reduce((t,m)=>t+m.net,0)/g.history.length;neg+=g.history.filter(m=>m.net<0).length;if(e!=null&&e<=48)e48++;ew.push(e==null?999:e);gold.push(Math.round(g.gold));low.push(Math.round(mn));if(sg||g.advs.some(a=>a.contract))signed++;cpay+=g.history.reduce((t,m)=>t+(m.cpay||0)+(m.csup||0),0);}
 const me=P(ew);console.log(name.padEnd(22),W+'주','| 월 순이익',(Math.round(net/100)+'G').padStart(5),'| 48주 안 승급',String(e48).padStart(3),'· 중앙',me>W?W+'+':me+'주','| 2~24주 금고 저점 중앙 · 하위10%',P(low)+'G ·',P(low,.1)+'G','| 적자 달',neg,'| 연말 금고',P(gold)+'G','| 계약 판',signed,'· 계약 비용/판',Math.round(cpay/100)+'G');}
for(const W of [48,96]){run('A 기존(매달 고정)',0,false,W);run('B 반기 50% 단독',1,false,W);run('C 계약 단독',0,true,W);run('D 결합(반기+계약)',1,true,W);run('E V6 기본(보조금0·수수료20%)',1,false,W,true);}
