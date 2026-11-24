// D1 시험: 「먹은 모험가가 더 자주 온다」 규칙에서 식당에 투자한 봇과 안 한 봇의 차이.  node exp_d1.js <규칙> [판 수]
global.__PF_PATCH=require('./patch_d1.js');
const {play,avg,med,Gm}=require('./harness.js');const fs=require('fs'),path=require('path'),os=require('os');
const RULE={now:null,att3:{att:3},att6:{att:6},v1:{visits:1},v2:{visits:2},v3:{visits:3},d7:{d7:1},d7h:{d7:0.5},d7v2:{d7:1,visits:2},d7hv2:{d7:0.5,visits:2}};
const POL={base:{},noRest:{tables:0,cook:'none'},t0:{tables:0},t1:{tables:1},t2:{tables:2},t4:{tables:4,tkeep:0}};
const rk=process.argv[2]||'now',N=+process.argv[3]||100,W=48,out={};const only=process.argv[4]?process.argv[4].split(','):Object.keys(POL);
for(const pk of only){const S={net:[],done:[],gE:[],exp:[],eat:[],ge3:[],full:[],away:[],ldone:[],tab:[],meal:[],gold:[]};
  for(let i=0;i<N;i++){let eat=0,ge3=0,full=0,aw=0,nf=0;
    const m=play(7000+i,W,Object.assign({snap:[48]},POL[pk],{cfg:c=>{const r=RULE[rk];if(r){if(r.att||r.visits)c.d1=r;if(r.d7)c.d7=r.d7;}},
      post:(g)=>{const u=g.seatUsed||0,s=Gm.seatsOf(g);eat+=u;if(u>=3)ge3++;if(s>0&&u>=s)full++;for(const a of g.advs)if(a.alive&&!a.home){nf++;if(a.state==='away')aw++;}}}));
    const later=m.snap[48].adv.filter(a=>a.alive&&a.j>0);
    S.net.push(avg(m.hist.map(h=>h.net)));S.done.push(m.stats.done);S.gE.push(m.first.gE||999);S.exp.push(m.wk.reduce((t,x)=>t+(x.k.expire||0),0));
    S.eat.push(eat/W);S.ge3.push(ge3/W);S.full.push(full/W);S.away.push(nf?aw/nf:0);S.ldone.push(later.length?avg(later.map(a=>a.done)):0);
    S.tab.push(m.end.deco.filter(x=>x==='table').length);S.meal.push(avg(m.hist.map(h=>h.meal||0)));S.gold.push(m.end.gold);}
  out[pk]=S;console.log(rk,pk,'net',avg(S.net).toFixed(0),'done',avg(S.done).toFixed(1),'E≤48',S.gE.filter(x=>x<=48).length*100/N+'%');}
fs.writeFileSync(path.join(os.tmpdir(),`d1_${rk}_${N}.json`),JSON.stringify(out));
