"""Review the local guide and exercise delayed bounce captures across a source switch."""
import json
from runtime import ROOT, fixture
from playwright.sync_api import sync_playwright

v1, httpd, origin, work = fixture()
errors = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        page = browser.new_page(viewport={'width':1440, 'height':1000})
        page.goto((ROOT/'showcase/index.html').as_uri())
        page.locator('article img').last.wait_for()
        assert page.locator('article').count() == 7
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(ROOT/'showcase/stills/guide-desktop.png'))
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.screenshot(path=str(ROOT/'showcase/stills/guide-mobile.png'))
        page.set_viewport_size({'width':1440,'height':1050})
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(origin+'/redesign#playlist', wait_until='domcontentloaded')
        page.wait_for_function('video.readyState>=2')
        page.evaluate("loadPlaylistBySlug('version1-showcase-signal-to-spectacle-12min')")
        page.wait_for_function('plPlaylist.entries.length===29')
        page.evaluate('()=>startPlaylist(221)')
        page.wait_for_function('plPlaying&&plEntryIdx===9&&video.readyState>=2',timeout=15000)
        page.evaluate('stopPlaylist()')
        # Hold real bitmaps until the old source is gone. Each must be closed,
        # and none may enter the next source's bounce buffer.
        page.evaluate('''()=>{
          window.heldFrames=[];window.originalBitmap=window.createImageBitmap;
          window.createImageBitmap=(source,...args)=>window.originalBitmap(source,...args).then(bitmap=>new Promise(resolve=>heldFrames.push({bitmap,resolve})));
          return startPlaylist(193);
        }''')
        page.wait_for_function('heldFrames.length>0',timeout=15000)
        page.evaluate('''()=>{
          stopPlaylist();setLoopMode(1);showVideo(plPlaylist.entries[9].video,{type:'cut'});
          window.releasedFrames=heldFrames.splice(0);for(const item of releasedFrames)item.resolve(item.bitmap);
          window.createImageBitmap=window.originalBitmap;
        }''')
        page.wait_for_function('releasedFrames.every(item=>item.bitmap.width===0)&&bounceFrames.length===0')
        assert not errors, errors
        browser.close()
    (ROOT/'showcase/package-verification.json').write_text(json.dumps({'guideDesktop':True,'guideMobile':True,'bounceSourceBoundary':True,'delayedBounceFramesClosed':True,'errors':errors},indent=2))
    print('PASS guide desktop/mobile, native bounce source boundary and delayed bitmap cleanup')
finally:
    httpd.shutdown();httpd.server_close()
