const {chromium}=require('playwright');const fs=require('fs');
const S='/tmp/claude-0/-home-claude/038296be-4010-5ec7-a983-f07d02523297/scratchpad';const TAG=process.argv[2]||'e';
(async()=>{const b=await chromium.launch({args:['--allow-file-access-from-files']});const errs=[];const ctx=await b.newContext({viewport:{width:1920,height:1080}});const p=await ctx.newPage();p.on('pageerror',e=>errs.push(e.message));
await p.goto('file://'+S+'/mv_bg/index.html?nopick');await p.waitForTimeout(5000);
await p.evaluate(()=>{const s=Expedition.__s();s.place=s.place||{items:[]};s.place.items=s.place.items||[];for(const [gx,gy] of [[4,9],[7,9],[10,9]])s.place.items.push({id:"table",gx,gy});});
await p.waitForTimeout(1500);
let info=null;
for(let i=0;i<90;i++){if(i<6){await p.mouse.click(960,950);}info=await p.evaluate(()=>{const D=window.Director;if(!D)return 'noD';const L=[...D.actors.values()].filter(a=>a.sp&&a.sp.mode==='idle').map(a=>({ik:a.ik,x:a.sp.ax,y:a.sp.ay}));return L;});if(Array.isArray(info)&&info.length>=1)break;await p.waitForTimeout(1000);}
console.log('seated',JSON.stringify(info));await p.keyboard.press('Escape');const CL={x:300,y:500,width:1100,height:480};
fs.mkdirSync(S+'/eatt',{recursive:true});
for(let i=0;i<80;i++){await p.screenshot({path:`${S}/eatt/${TAG}_${String(i).padStart(3,"0")}.jpg`,type:"jpeg",quality:80,clip:CL});const st=await p.evaluate(()=>[...Director.actors.values()].filter(a=>a.sp).map(a=>a.ik+':'+(a.sp.ea?a.sp.ea.v:'-')).join(','));if(i%5==0)console.log(i,st);await p.waitForTimeout(200);}
console.log('eatstate',JSON.stringify(await p.evaluate(()=>[...Director.actors.values()].filter(a=>a.sp).map(a=>[a.ik,a.sp.ea?a.sp.ea.v:null,Math.round(a.sp.nx||0)]))));
console.log('errors',JSON.stringify(errs.slice(0,5)));await ctx.close();await b.close();})();
