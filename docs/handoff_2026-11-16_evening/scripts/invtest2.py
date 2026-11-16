import asyncio,sys
from playwright.async_api import async_playwright
ROOT=sys.argv[1]; SEED=int(sys.argv[2]); W=int(sys.argv[3]); H=int(sys.argv[4]); TAG=sys.argv[5]; BUY=int(sys.argv[6]) if len(sys.argv)>6 else 1
SHOTW=int(sys.argv[7]) if len(sys.argv)>7 else -1
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--allow-file-access-from-files','--no-sandbox'])
        pg=await b.new_page(viewport={'width':W,'height':H}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+ROOT+'/index.html?nopick=1'); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{for(let i=0;i<30&&document.querySelector('#dlg.open');i++)UI.advance()}")
        info=await pg.evaluate("""(seed)=>{const G=GuildGame;G.live=false;const x=G.newGame(GuildSim.defaults(),seed);G.autoPlace(x,true);
          for(let w=0;w<90;w++){G.autoRequests(x);if(x.main&&x.main.state==='set'&&x.week>=x.main.at)break;G.stepWeek(x);G.autoCook(x);if(x.week%4===0)G.autoPlace(x,false);}
          G.live=true; localStorage.setItem('guildProto2_s1',G.serialize(x)); localStorage.setItem('guildProto2_s1_t',String(Date.now())); localStorage.setItem('guildProto2_slot','1');
          return [(x.main||{}).state,x.week,(x.main||{}).at,x.advs.filter(a=>a.alive).length,Math.round(x.gold)];}""",SEED)
        print('준비',info)
        await pg.evaluate("()=>document.querySelector('#mLoad').click()"); await pg.wait_for_timeout(800)
        await pg.evaluate("()=>{for(let i=0;i<30&&document.querySelector('#dlg.open');i++)UI.advance()}")
        await pg.evaluate("()=>document.querySelector('#dWeek').click()"); await pg.wait_for_timeout(1700)
        await pg.screenshot(path=f'/tmp/wk/{TAG}_1.png')
        await pg.wait_for_timeout(2600); await pg.screenshot(path=f'/tmp/wk/{TAG}_2.png')
        await pg.wait_for_timeout(2500); await pg.screenshot(path=f'/tmp/wk/{TAG}_3.png')
        await pg.evaluate("()=>{const b=document.querySelector('#invUi [data-iv=sp][data-v=\"4\"]'); if(b) b.click()}")
        prep=0; castle=False
        for i in range(160):
            await pg.wait_for_timeout(400)
            st=await pg.evaluate("()=>[!!document.querySelector('#invUi .iv-panel:not(.iv-res)'),!!document.querySelector('#invUi .iv-res'),Invasion.on]")
            if not castle:
                c=await pg.evaluate("()=>{const t=document.querySelector('#invUi .iv-top');return t?t.textContent:''}")
            if st[0]:
                prep+=1
                if prep==1: await pg.screenshot(path=f'/tmp/wk/{TAG}_prep.png')
                if BUY:
                    for k in range(2): await pg.evaluate("()=>{const b=document.querySelector('#invUi [data-iv=pot][data-n=\"1\"]:not([disabled])'); if(b) b.click();}")
                await pg.wait_for_timeout(200)
                await pg.evaluate("()=>document.querySelector('#invUi [data-iv=go]').click()")
                if prep==SHOTW:
                    await pg.evaluate("()=>{const b=document.querySelector('#invUi [data-iv=sp][data-v=\"1\"]'); if(b) b.click()}")
                    for f in range(14):
                        await pg.wait_for_timeout(1100); await pg.screenshot(path=f'/tmp/wk/{TAG}_w{f:02d}.png')
                    await pg.evaluate("()=>{const b=document.querySelector('#invUi [data-iv=sp][data-v=\"4\"]'); if(b) b.click()}")
            if st[1]:
                await pg.wait_for_timeout(500); await pg.screenshot(path=f'/tmp/wk/{TAG}_result.png')
                print('결과 창',await pg.evaluate("()=>document.querySelector('#invUi .iv-res').innerText.replace(/\\n+/g,' / ')"))
                await pg.evaluate("()=>document.querySelector('#invUi [data-iv=end]').click()")
                await pg.wait_for_timeout(1200)
                print('끝난 뒤',await pg.evaluate("()=>[Invasion.on,Town.active,document.body.classList.contains('invOn'),document.getElementById('hDate').textContent,document.getElementById('hGold').textContent]"))
                await pg.screenshot(path=f'/tmp/wk/{TAG}_after.png')
                break
        print('정비 창',prep,'errors',errs[:5]); await b.close()
asyncio.run(main())
