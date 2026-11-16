import asyncio,sys
from playwright.async_api import async_playwright
ROOT=sys.argv[1] if len(sys.argv)>1 else 'GW_ROOT'
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--allow-file-access-from-files','--no-sandbox'])
        pg=await b.new_page(viewport={'width':1920,'height':1080}); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        await pg.goto('file://'+ROOT+'/index.html?nopick=1'); await pg.wait_for_timeout(2500)
        await pg.evaluate("()=>{for(let i=0;i<30&&document.querySelector('#dlg.open');i++)UI.advance()}")
        print('그림 읽힘', await pg.evaluate("()=>Object.values(NPC_PORTRAITS).map(P=>P.key+':'+(Assets.has(P.key+'_stand')&&Assets.has(P.key+'_blink'))).join(' ')"))
        await pg.evaluate("()=>UI.say([{name:'그레타',text:'우물 속에 끈적한 손님이 들어앉았어. 누가 좀 꺼내 주겠나?'},{name:'리나',face:'smile',text:'걱정 마세요, 할머니. 길드에서 맡을게요.'},{name:'세실리아',text:'아이들이 강가에서 놀다가…'},{name:'대장장이',text:'쓸 만한 화덕만 있으면 여기 눌러앉지.'},{name:'노아',text:'고향에서 편지가 왔어요.'}])")
        names=['greta','lina','nun','smith','adv']
        for i,n in enumerate(names):
            await pg.wait_for_timeout(1400)
            info=await pg.evaluate("()=>[document.getElementById('dlgName').textContent, !document.getElementById('dlgStand').hidden, document.getElementById('dlgStand').width, document.getElementById('dlg').classList.contains('noface')]")
            print(n, info)
            await pg.screenshot(path=f'/tmp/wk/npc_{n}.png',clip={'x':0,'y':300,'width':1920,'height':780})
            await pg.evaluate("()=>{UI.advance();UI.advance();}")
        print('errors',errs[:3]); await b.close()
asyncio.run(main())
