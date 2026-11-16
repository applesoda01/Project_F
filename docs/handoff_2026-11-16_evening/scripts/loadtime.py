import asyncio,sys,time
from playwright.async_api import async_playwright
PORT=sys.argv[1]; MBPS=float(sys.argv[2]); Q=sys.argv[3] if len(sys.argv)>3 else ''; SHOT=sys.argv[4] if len(sys.argv)>4 else ''
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
        ctx=await b.new_context(viewport={'width':1920,'height':1080}); pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e:errs.append(str(e)))
        cdp=await ctx.new_cdp_session(pg); await cdp.send('Network.enable')
        await cdp.send('Network.emulateNetworkConditions',{'offline':False,'latency':40,'downloadThroughput':MBPS*1e6/8,'uploadThroughput':2e6/8})
        tot=[0]
        pg.on('response',lambda r: None)
        cdp.on('Network.loadingFinished',lambda e: tot.__setitem__(0,tot[0]+e.get('encodedDataLength',0)))
        t0=time.time(); await pg.goto(f'http://127.0.0.1:{PORT}/index.html'+Q,wait_until='commit')
        shot=False
        while True:
            gone=await pg.evaluate("()=>!document.getElementById('loading')")
            if SHOT and not shot and time.time()-t0>2.5: await pg.screenshot(path=SHOT); shot=True
            if gone: break
            if time.time()-t0>240: break
            await asyncio.sleep(0.2)
        t1=time.time()-t0; mb=tot[0]/1048576
        print(f'{PORT} {MBPS}Mbps: 로딩 화면이 사라지기까지 {t1:.1f}초, 그때까지 받은 양 {mb:.1f}MB')
        await asyncio.sleep(0.5)
        print('dev', await pg.evaluate("()=>[document.body.classList.contains('dev'), getComputedStyle(document.getElementById('devToggle')).display, getComputedStyle(document.getElementById('titleSkip')).display]"),'errors',errs[:3])
        await b.close()
asyncio.run(main())
