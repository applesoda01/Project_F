const ctx=require('./load.js')();const Gm=ctx.GuildGame,Sim=ctx.GuildSim;
const g=Gm.newGame(Sim.defaults(),7000);
// 어제 저장을 흉내: 오늘 추가된 키(quest.ncBase · ncIntF · adv.ncDrop)가 없는 cfg
delete g.cfg.quest.ncBase;delete g.cfg.quest.ncIntF;delete g.cfg.adv.ncDrop;g.cfg.growth.xpBase=999;
const raw=Gm.serialize(g);const ns=Gm.deserialize(raw);ns.cfg=Object.assign(Sim.defaults(),ns.cfg);
console.log('불러온 뒤 quest.ncBase =',ns.cfg.quest.ncBase,'(오늘 기본값',Sim.defaults().quest.ncBase+')',' adv.ncDrop =',ns.cfg.adv.ncDrop,' growth.xpBase =',ns.cfg.growth.xpBase,'(기본',Sim.defaults().growth.xpBase+')');
console.log('save bytes',raw.length,'cfg bytes',JSON.stringify(g.cfg).length,'log bytes',JSON.stringify(g.log).length);
