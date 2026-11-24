const H=require('./harness.js');const {play,avg,med,pct,Gm}=H;
const N=100;
for(const [nm,P] of [['bot(예상60%↑)',{keepState:true}],['바로 받기',{keepState:true,pre:g=>{if(g.main&&g.main.state==='offer')Gm.mainAccept(g);}}]]){
 const R=[];for(let i=0;i<N;i++)R.push(play(7000+i,72,P));
 const tr=R.map(m=>m.g.main.tries),first=R.map(m=>{const L=m.g.log.filter(l=>l.kind==='main'&&/막아 냈습니다|무너졌습니다/.test(l.text));return L.length?(/막아 냈/.test(L[L.length-1].text)?1:0):null;}).filter(x=>x!=null);
 const castle=R.map(m=>m.g.main.last&&m.g.main.last.castle).filter(x=>x!=null);
 console.log(nm,'tries avg',avg(tr).toFixed(2),'dist',JSON.stringify(tr.reduce((o,x)=>{o[x]=(o[x]||0)+1;return o},{})),'first-try win%',(100*avg(first)).toFixed(0),'E med',med(R.map(m=>m.first.gE||999)),'p90',pct(R.map(m=>m.first.gE||999),.9),'castle used(last)%',(100*avg(castle.map(c=>c>0?1:0))).toFixed(0),'offer med',med(R.map(m=>m.first.mainOffer||999)),'down(last) avg',avg(R.map(m=>m.g.main.last?m.g.main.last.down:0)).toFixed(1),'n(last)',avg(R.map(m=>m.g.main.last?m.g.main.last.n:0)).toFixed(1));
 if(nm.startsWith('bot')){
  // 첫해(48주) 나쁜 일 세기
  const X=R.map(m=>{const r=m.ret.filter(x=>x.w<48&&!x.dg);const fails=r.filter(x=>!x.ok&&!x.rq);return {fail:fails.filter(x=>!x.late).length,late:fails.filter(x=>x.late).length,rqFail:r.filter(x=>x.rq&&!x.ok).length,rqN:r.filter(x=>x.rq).length,down:r.reduce((t,x)=>t+x.down,0),exp:m.wk.slice(0,48).reduce((t,x)=>t+(x.k.expire||0),0),inj:m.wk.slice(0,48).reduce((t,x)=>t+(x.k.injury||0),0),dead:m.wk.slice(0,48).reduce((t,x)=>t+(x.k.death||0),0),defMo:m.hist.slice(0,12).filter(h=>h.net<0).length,lowGold:m.wk.slice(0,48).filter(x=>x.gold<100).length,lowGold2:m.wk.slice(3,48).filter(x=>x.gold<200).length,goldDrop:m.wk.slice(0,48).filter(x=>x.dg<0).length};});
  for(const k of Object.keys(X[0]))console.log('  y1',k.padEnd(9),'avg',avg(X.map(x=>x[k])).toFixed(2),'games with ≥1:',X.filter(x=>x[k]>0).length+'%');
  // 실패 한 번의 값: 실패 주와 성공 주의 신뢰 · 명성 변화
  const fl=[].concat(...R.map(m=>m.ret.filter(x=>x.w<48&&!x.rq&&!x.dg&&!x.ok&&!x.late)));console.log('  fail n',fl.length,'avg reward',avg(fl.map(x=>x.rw)).toFixed(0),'avg party',avg(fl.map(x=>x.n)).toFixed(2),'combat%',(100*avg(fl.map(x=>x.c))).toFixed(0),'pm>1 %',(100*avg(fl.map(x=>x.pm>1?1:0))).toFixed(0),'avg shown rate',avg(fl.map(x=>x.rate)).toFixed(0));
  const ok=[].concat(...R.map(m=>m.ret.filter(x=>x.w<48&&!x.rq&&!x.dg&&x.ok)));console.log('  ok n',ok.length,'avg shown rate',avg(ok.map(x=>x.rate)).toFixed(0));
  // 예상 성공률 구간별 실제 성공률 (보정 확인)
  const all=[].concat(...R.map(m=>m.ret.filter(x=>!x.rq&&!x.dg&&!x.late)));for(const [a,b] of [[0,60],[60,70],[70,80],[80,90],[90,96],[96,101]]){const s=all.filter(x=>x.rate>=a&&x.rate<b);console.log('  shown',a+'-'+b,'n',s.length,'actual',(100*avg(s.map(x=>x.ok))).toFixed(1),'combat%',(100*avg(s.map(x=>x.c))).toFixed(0));}
 }
}
