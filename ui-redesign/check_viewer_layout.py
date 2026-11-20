"""Exercise viewer-first layout and header output controls with isolated data."""
import json
from pathlib import Path
import sys
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'showcase'))
from runtime import fixture
from playwright.sync_api import sync_playwright

v1,httpd,origin,work=fixture()
shots=work/'viewer-layout';shots.mkdir()
errors=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox'])
        page=browser.new_page(viewport={'width':1440,'height':1050})
        page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(origin+'/#prepare',wait_until='domcontentloaded')
        page.wait_for_function('video.readyState>=2')
        assert page.locator('.rd-fallback').count()==0
        assert page.locator('.rd-header .remote-bar').count()==1
        assert page.locator('body > .remote-bar').count()==0
        assert page.locator('.catalog-tools .rd-workspace-title h1').inner_text()=='Prepare a look'
        assert not page.locator('#instagramDownloadAccess').is_visible()
        size=page.locator('.rd-preview-frame').bounding_box()
        assert size['y']<100 and size['height']>525,size
        assert page.locator('#catalogSearch').bounding_box()['width']<=230
        assert page.locator('.rd-library-toolbar').bounding_box()['height']<=45
        page.evaluate('setViewModeTo(2)')
        page.wait_for_function('document.querySelectorAll(".rd-pattern").length===16')
        assert page.locator('.rd-pattern').first.bounding_box()['height']>=60
        page.evaluate('setViewModeTo(0)')
        for selector in ('#catalogSearch','#catalogSort + .rd-select-trigger','[data-reload-library]','#catalogManage'):
            assert page.locator('.rd-library-toolbar '+selector).is_visible(),selector
        page.locator('#catalogSearch').fill('no-fixture-video-has-this-name')
        assert page.locator('.library-item:visible').count()==0
        page.locator('#catalogClear').click()
        assert page.locator('.library-item:visible').count()>0
        page.screenshot(path=str(shots/'prepare-desktop.png'))
        toggle=page.locator('#remoteControlsToggle')
        toggle.click()
        assert page.locator('#rdOutputPopover').is_visible()
        assert abs(page.locator('.rd-preview-frame').bounding_box()['height']-size['height'])<1
        pop=page.locator('#rdOutputPopover').bounding_box()
        assert pop['x']>=0 and pop['x']+pop['width']<=1440,pop
        page.screenshot(path=str(shots/'output-dropdown.png'))
        page.keyboard.press('Escape')
        assert not page.locator('#rdOutputPopover').is_visible()
        assert toggle.evaluate('(e)=>e===document.activeElement')
        toggle.click()
        page.locator('.rd-nav [data-screen=library]').click()
        assert not page.locator('#rdOutputPopover').is_visible()
        assert page.locator('#instagramDownloadAccess').is_visible()
        assert not page.locator('#instagramDownloads').is_visible()
        page.locator('#instagramDownloadAccess').click()
        assert page.locator('#url').is_visible()
        assert page.locator('.rd-library-toolbar').bounding_box()['y']<page.locator('#instagramDownloads').bounding_box()['y']
        page.locator('#instagramDownloads > summary').click()
        assert not page.locator('#instagramDownloads').is_visible()
        page.screenshot(path=str(shots/'library-desktop.png'))
        # Ownership and command feedback remain reachable without pushing the viewer.
        page.locator('.rd-nav [data-screen=prepare]').click()
        height=page.locator('.rd-preview-frame').bounding_box()['height']
        page.evaluate('updateControlOwnership({remote:true,owner:"fixture-ipad"})')
        assert page.locator('#controlReturn').is_visible() and page.locator('#controlReturn').is_enabled()
        assert page.locator('#macEditorControls').evaluate('(e)=>e.inert')
        assert toggle.is_enabled()
        assert abs(page.locator('.rd-preview-frame').bounding_box()['height']-height)<1
        page.evaluate('updateControlOwnership({remote:false,owner:null});remoteMessage("Fixture feedback")')
        assert page.locator('#remoteMessage').is_visible()
        page.locator('#rdDismissOutputMessage').click()
        assert not page.locator('.rd-output-feedback').is_visible()
        for key in ('builder','auto','capture','settings'):
            page.locator(f'.rd-nav [data-screen={key}]').click()
            assert page.locator('.rd-workspace-context h1').is_visible(),key
            assert not page.locator('#instagramDownloadAccess').is_visible(),key
        # Navigation, dropdown anchoring and the compact controls work on iPad/phone.
        for width,height in ((1440,1050),(1194,834),(834,1194),(390,844)):
            page.set_viewport_size({'width':width,'height':height})
            for key in ('prepare','playlist','library'):
                page.locator(f'.rd-nav [data-screen={key}]').click()
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,key)
                assert page.locator('.catalog-tools .rd-workspace-title h1').is_visible(),(width,key)
                assert page.locator('#instagramDownloadAccess').is_visible()==(key=='library')
                assert page.locator('#catalogSearch').is_visible()
                toggle.click()
                assert page.locator('#rdOutputPopover').is_visible(),(width,key)
                box=page.locator('#rdOutputPopover').bounding_box()
                assert box['x']>=0 and box['x']+box['width']<=width+1,(width,key,box)
                page.keyboard.press('Escape')
            page.screenshot(path=str(shots/f'library-{width}.png'))
        page.set_viewport_size({'width':1440,'height':1050})
        page.locator('.rd-nav [data-screen=playlist]').click()
        assert page.locator('.playlist-library-col .rd-workspace-title h1').inner_text()=='Library'
        page.screenshot(path=str(shots/'playlist-desktop.png'))
        remote=browser.new_page(viewport={'width':834,'height':1194})
        remote.on('pageerror',lambda error:errors.append(str(error)))
        remote.goto(origin+'/?remote=1#prepare',wait_until='domcontentloaded')
        remote.wait_for_function('isRemoteController && controllerAllowed')
        assert not remote.locator('.rd-output-feedback').is_visible()
        remote.locator('#remoteControlsToggle').click()
        assert remote.locator('#controlNotice').is_visible()
        assert remote.locator('#controlNotice').inner_text()=='You have remote control of the Mac'
        remote.keyboard.press('Escape')
        assert not remote.locator('.rd-output-feedback').is_visible()
        remote.evaluate('updateControlOwnership({remote:false,owner:null})')
        assert remote.locator('#controlClaim').is_visible()
        remote.close()
        assert not errors,errors
        browser.close()
        print('PASS viewer-first layout, compact/search/sort/filter controls, Library-only downloads, header dropdown, outside/Escape closing, ownership/feedback and all workspace/viewport checks. Viewer at 1440x1050:',json.dumps(size),'Screenshots:',shots)
finally:
    httpd.shutdown();httpd.server_close()
