const S=require('../../prototype/js/sim_engine.js'),G=require('../../prototype/js/game_core.js');
const yrs=[],cnt=[],acc=[];let props=0,accepted=0;
for(let seed=0;seed<40;seed++){const s=G.newGame(S.defaults(),9000+seed);let first=null;
 for(let w=0;w<48*10;w++){
   // 봇: 관리소를 지을 수 있으면 짓고, 등급은 규칙대로(디버그 없음) — 길드 승급은 아직 3차라 수동: 3년차에 E, 5년차에 D 가정
   if(w===110)G.debugSetGrade(s,1); if(w===190)G.debugSetGrade(s,2); if(w===220)G.debugSetGrade(s,3);if(w===290)G.debugSetGrade(s,4);
   if(s.grade>=1&&!s.built['관리소']&&s.gold>2000)G.build(s,'관리소');
   G.stepWeek(s);
   for(const p of s.proposals.slice()){props++;const r=G.decidePromotion(s,p.id,p.opts[0]);if(r&&r.accepted){accepted++;if(first==null)first=s.week/48;}}
 }
 yrs.push(first);cnt.push(s.advs.filter(a=>a.alive&&a.stage>=2).length);}
const ok=yrs.filter(x=>x!=null).sort((a,b)=>a-b);
console.log('first 2nd-class year median',ok[Math.floor(ok.length/2)]?.toFixed(1),'none',yrs.filter(x=>x==null).length,'avg stage2 alive at 10y',(cnt.reduce((a,b)=>a+b,0)/cnt.length).toFixed(1),'proposals',props,'accepted',accepted);
const s=G.newGame(S.defaults(),1);for(let w=0;w<48;w++)G.stepWeek(s);const r=G.deserialize(G.serialize(s));console.log('migrate ok',r.advs[0].skills.length,r.proposals.length);
