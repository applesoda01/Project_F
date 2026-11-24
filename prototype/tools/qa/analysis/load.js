// 게임 규칙 코드를 그대로 읽어 들임 (data_gen → combat → sim_engine → game_core). 게임 코드는 고치지 않음.
// patch(파일 이름, 글) 를 주면 읽어 들인 글을 메모리에서만 바꿔 실행 (「이런 규칙이라면」 시험용 · 파일은 그대로). 주지 않으면 원본 그대로.
const fs=require('fs'),path=require('path'),vm=require('vm');const JS=path.join(__dirname,'..','..','..','js');
module.exports=function(patch){const ctx={console,Math,JSON,Date};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['data_gen.js','combat.js','sim_engine.js','game_core.js']){let src=fs.readFileSync(path.join(JS,f),'utf8');if(patch)src=patch(f,src);vm.runInContext(src,ctx,{filename:f});}return ctx;};
