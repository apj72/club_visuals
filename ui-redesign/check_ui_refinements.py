"""Verify compact controls, Instagram access, retired effects and vertical text.

Uses isolated showcase data and a stubbed download; no live output or inputs.
"""
from pathlib import Path
import json
import sys
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'showcase'))
from runtime import fixture
from playwright.sync_api import sync_playwright

v1,httpd,origin,work=fixture()
shots=work/'ui-refinements';shots.mkdir()
errors=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox'])
        context=browser.new_context(viewport={'width':1440,'height':1050})
        page=context.new_page();page.on('pageerror',lambda error:errors.append(str(error)))
        page.goto(origin+'/',wait_until='domcontentloaded')
        page.wait_for_function('video.readyState>=2')
        toggle=page.locator('#remoteControlsToggle')
        assert toggle.get_attribute('aria-expanded')=='false'
        assert not page.locator('#remoteControlsPanel').is_visible()
        collapsed=page.locator('.remote-bar').bounding_box()['height']
        toggle.click()
        assert page.locator('#remoteControlsPanel').is_visible()
        assert page.locator('.remote-bar').bounding_box()['height']>collapsed+25
        page.reload(wait_until='domcontentloaded')
        assert toggle.get_attribute('aria-expanded')=='true'
        toggle.click()
        page.evaluate('updateControlOwnership({remote:true,owner:"fixture-ipad"})')
        assert page.locator('#controlReturn').is_visible()
        assert toggle.is_enabled()
        page.evaluate('updateControlOwnership({remote:false,owner:null})')
        # Library's visible shortcut reveals the original wired downloader.
        page.locator('#instagramDownloadAccess').click()
        assert page.evaluate('document.body.dataset.workspace')=='library'
        assert page.locator('#instagramDownloads').evaluate('(e)=>e.open')
        assert page.locator('#url').evaluate('(e)=>e===document.activeElement')
        assert page.locator('#connBtn').is_visible()
        requests=[]
        def download(route):
            requests.append(route.request.post_data_json)
            route.fulfill(status=200,content_type='text/event-stream',body='data: '+json.dumps({'status':'error','message':'Fixture download reached'})+'\n\n')
        page.route('**/download',download)
        page.locator('#url').fill('https://www.instagram.com/reel/fixture/')
        page.locator('#downloadBtn').click()
        page.wait_for_function('document.getElementById("status").textContent.includes("Fixture download reached")')
        assert requests==[{'url':'https://www.instagram.com/reel/fixture/'}]
        page.screenshot(path=str(shots/'instagram-library.png'))
        for w,h in ((1440,1050),(1194,834),(834,1194),(390,844)):
            page.set_viewport_size({'width':w,'height':h})
            page.evaluate('document.getElementById("remoteConnection").textContent="Output: fullscreen · Mac engine: connected · Live: "+"long-video-name-".repeat(30)')
            assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),w
            assert page.locator('#url').is_visible()
            assert page.locator('.remote-bar').bounding_box()['height']<115,w
        page.set_viewport_size({'width':1440,'height':1050})
        page.locator('.rd-nav [data-screen=settings]').click()
        page.locator('#settingsInstagramDownload').click()
        assert page.locator('#url').evaluate('(e)=>e===document.activeElement')
        # A legacy cue remains editable but is not offered to unrelated/new cues.
        page.evaluate('loadPlaylistBySlug("version1-showcase-signal-to-spectacle-12min")')
        page.wait_for_function('plPlaylist.entries.length===29')
        page.evaluate('plPlaylist.entries[0].cues=[{at:0,effect:"mirror",text:"OLD"}];openPlaylistCueEditor(0)')
        effect=page.locator('[data-cue-field="effect"]')
        assert effect.input_value()=='mirror'
        assert effect.locator('option[value="mirror"]').count()==1
        assert effect.locator('option[value="scene-1"],option[value="scene-5"]').count()==0
        effect.select_option('text',force=True)
        assert effect.input_value()=='text'
        assert effect.locator('option[value="mirror"]').count()==0
        page.evaluate('closePlaylistCueEditor()')
        page.locator('.rd-nav [data-screen=prepare]').click()
        page.locator('summary').filter(has_text='Colour, VFX').click()
        assert not page.locator('#mirrorBtn').is_visible()
        with page.expect_popup() as opened:page.locator('#text3dBtn').click()
        popup=opened.value;popup.on('pageerror',lambda error:errors.append(str(error)))
        popup.wait_for_load_state('domcontentloaded')
        popup.wait_for_function('document.body.dataset.connected==="true"')
        assert popup.locator('#scene option[value="1"],#scene option[value="3"],#scene option[value="5"]').count()==0
        page.evaluate('setVfxState({enabled:true,scene:3,baseEnabled:true,logoEnabled:false})')
        popup.wait_for_function('document.getElementById("scene").value==="3"')
        assert 'existing legacy' in popup.locator('#scene option:checked').inner_text()
        popup.locator('#scene').select_option('4')
        popup.wait_for_function('!document.querySelector("#scene option[value=\\"3\\"]")')
        popup.keyboard.press('2')
        page.wait_for_function('vfxState.scene===2')
        # Render through the real GPU at portrait size, checking top/bottom order
        # from the red @, and save readable images of both upright stacks.
        for orientation in ('top-bottom','bottom-top','horizontal'):
            metrics=page.evaluate('''orientation=>{
              const source=document.createElement('canvas');source.width=480;source.height=854;
              source.getContext('2d').fillRect(0,0,480,854);
              const canvas=document.createElement('canvas');canvas.id='uprightTextProbe';
              canvas.style.cssText='position:fixed;inset:0;z-index:99999;width:480px;height:854px';document.body.append(canvas);
              const engine=new VfxEngine(canvas);window.textProbe=engine;
              engine.setLogo3d({kind:'text',text:'@text',font:'modern',orientation,skin:'original',backdrop:'black',rotX:0,rotY:0,rotZ:0,motion:0,scale:.5,depth:.08,animation:{enabled:false}});
              engine.render(source,{enabled:true,scene:6,logoEnabled:true,baseEnabled:false},{width:480,height:854,fitObject:true});
              const gl=engine.gl,rgba=new Uint8Array(480*854*4);gl.readPixels(0,0,480,854,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
              let red=0,sumY=0,ink=0,minY=854,maxY=0,minX=480,maxX=0;
              for(let y=0;y<854;y++)for(let x=0;x<480;x++){const i=(y*480+x)*4;
                if(rgba[i]+rgba[i+1]+rgba[i+2]>60){ink++;minY=Math.min(minY,y);maxY=Math.max(maxY,y);minX=Math.min(minX,x);maxX=Math.max(maxX,x);}
                if(rgba[i]>100&&rgba[i+1]<70&&rgba[i+2]<100){red++;sumY+=y;}}
              return {red,redY:sumY/Math.max(1,red),ink,ratio:(maxY-minY)/Math.max(1,maxX-minX),aspect:engine.logoAspect};
            }''',orientation)
            assert metrics['ink']>100,metrics
            if orientation!='horizontal':
                assert metrics['ratio']>2,metrics
                assert metrics['red']>10,metrics
                assert (metrics['redY']>427)==(orientation=='top-bottom'),(orientation,metrics)
            page.locator('#uprightTextProbe').screenshot(path=str(shots/(orientation+'-text.png')))
            page.evaluate('textProbe.dispose();document.getElementById("uprightTextProbe").remove()')
        surface_checks=page.evaluate("""async()=>{
          await document.fonts.load('900 100px "Version1 Bungee"');
          const results=[];
          for(const font of ['modern','bungee','serif'])for(const orientation of ['top-bottom','bottom-top']){
            const engine=Object.create(VfxEngine.prototype);engine.maxTextureSize=4096;
            engine.logo3d={text:'@é. '+('abcdefghij'.repeat(8)),font,orientation};
            engine.uploadLogoSurface=canvas=>{const data=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
              let ink=0;for(let i=3;i<data.length;i+=4)if(data[i]>0)ink++;
              results.push({font,orientation,width:canvas.width,height:canvas.height,ink});};
            engine.renderLogoText();
          }
          return results;
        }""")
        assert len(surface_checks)==6
        assert all(0<c['width']<=4096 and 0<c['height']<=4096 and c['ink']>0 for c in surface_checks),surface_checks
        popup.close()
        assert not errors,errors
        browser.close()
        print('PASS compact/persistent toolbar, reachable handover, Instagram download wiring, responsive layouts, legacy effect preservation/cleanup and upright vertical GPU text. Screenshots:',shots)
finally:
    httpd.shutdown();httpd.server_close()
