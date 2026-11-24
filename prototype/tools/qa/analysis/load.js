// 게임 규칙 코드를 그대로 읽어 들임 (data_gen → combat → sim_engine → game_core). 게임 코드는 고치지 않음.
const fs=require('fs'),path=require('path'),vm=require('vm');const JS=path.join(__dirname,'..','..','..','js');
module.exports=function(){const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['data_gen.js','combat.js','sim_engine.js','game_core.js'])vm.runInContext(fs.readFileSync(path.join(JS,f),'utf8'),ctx,{filename:f});return ctx;};
