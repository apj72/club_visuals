"""Audition saved looks using isolated media, clocks and GPU contexts."""
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1 = launch.v1
root = Path(tempfile.mkdtemp(prefix='club-hints-framing-'))
for name in ('media', 'thumbs', 'playlists', 'presets', 'previews'):
    (root / name).mkdir()
for name, source in [('background', 'color=c=blue:size=320x180:rate=30:duration=6'), ('reflection', 'color=c=red:size=320x180:rate=30:duration=6')]:
    subprocess.run([v1.find_working_ffmpeg(), '-v', 'error', '-y', '-f', 'lavfi', '-i', source, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', str(root / 'media' / (name + '.mp4'))], check=True)
config = root / 'config.json'
config.write_text(json.dumps({'download_dir': str(root / 'media')}))
v1.CONFIG_FILE = config
v1.THUMB_DIR = root / 'thumbs'
v1.PLAYLIST_DIR = root / 'playlists'
v1.VIDEO_PRESET_DIR = root / 'presets'
v1.LIBRARY_ORDER_FILE = root / 'order.json'
v1.LIBRARY_CATALOG = v1.LibraryCatalog(root / 'catalog.json')
v1.VIDEO_CUES = v1.VideoCues(root / 'cues')
v1.PREVIEW_CACHE = v1.PreviewCache(root / 'previews', v1.find_working_ffmpeg)
launch.SHOW_LIBRARY = launch.ShowLibrary(root / 'models.json')
library = json.loads(subprocess.check_output(['node', '-e', 'process.stdout.write(JSON.stringify(require("./ui-redesign/show-models.js").defaults()))'], cwd=v1.BASE_DIR))
library['bricks'][0]['steps'][0]['effects'] = [
    {'at': 0, 'seconds': 8, 'effect': 'logo', 'orientation': 'top-bottom', 'reflectionSource': {'filename': 'reflection.mp4', 'speed': 1}, 'snake': {'enabled': True}},
    {'at': 10, 'seconds': 8, 'effect': 'scene-4', 'logoLayer': {'effect': 'text', 'text': 'PREVIEW', 'reflectionSource': {'filename': 'reflection.mp4', 'speed': 1}}}]
launch.SHOW_LIBRARY.save({'revision': 0, 'library': library})

class Output:
    def status(self): return {'connected': False, 'fullscreen': False}

v1.MAC_OUTPUT = Output()
launch.RedesignHandler.log_message = lambda *args: None
httpd = v1.ThreadedHTTPServer(('127.0.0.1', 0), launch.RedesignHandler)
threading.Thread(target=httpd.serve_forever, daemon=True).start()
origin = f'http://127.0.0.1:{httpd.server_port}'
print('FIXTURE', root, flush=True)
try:
    import base64, io
    from PIL import Image
    def blue_box(data):
        image = Image.open(io.BytesIO(data)).convert('RGB')
        pixels = image.load(); xs, ys = [], []
        for y in range(image.height):
            for x in range(image.width):
                r,g,b=pixels[x,y]
                if b>150 and b>r*2 and b>g*2: xs.append(x);ys.append(y)
        assert xs, 'No blue video pixels'
        return (min(xs),min(ys),max(xs)+1,max(ys)+1),len(xs)
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        context=browser.new_context(viewport={'width':1440,'height':1050})
        page=context.new_page();errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
        for url in ('/redesign','/'):
            page.goto(origin+url,wait_until='domcontentloaded')
            page.wait_for_function('video.readyState>=2&&window.ControlHints')
            page.evaluate("showVideo('background.mp4',{type:'cut',duration:0})")
            page.wait_for_function('video.readyState>=2&&currentFilename==="background.mp4"')
            page.evaluate('video.pause();setLayout(0);applyZoomPan(.5,0,0)')
            if url=='/redesign':page.locator('.rd-inspector details').filter(has=page.locator('#zoomWrap')).evaluate('e=>e.open=true')
            assert page.locator('#zoomSlider').get_attribute('min')=='.25' or page.locator('#zoomSlider').get_attribute('min')=='0.25'
            page.locator('#zoomSlider').hover()
            page.locator('#controlHint').wait_for(state='visible',timeout=5000)
            assert 'black space' in page.locator('#controlHint').inner_text()
            assert 'controlHint' in page.locator('#zoomSlider').get_attribute('aria-describedby')
            page.keyboard.press('Escape');assert page.locator('#controlHint').is_hidden()
            page.locator('#zoomSlider').focus();page.locator('#controlHint').wait_for(state='visible')
            page.add_style_tag(content='.remote-bar{visibility:hidden!important}')
            for mode in range(6):
                page.evaluate('(mode)=>{setLayout(mode);applyZoomPan(.5,.4,.3)}',mode)
                page.wait_for_timeout(200)
                encoded=page.evaluate('''()=>{const c=document.createElement('canvas');c.width=Math.round(videoStage.getBoundingClientRect().width);c.height=Math.round(videoStage.getBoundingClientRect().height);drawCompositeFrame(c,c.getContext('2d'),false,false,false);return c.toDataURL().split(',')[1];}''')
                composite=blue_box(base64.b64decode(encoded))
                preview_png=page.locator('#videoStage').screenshot()
                (root/f'frame-{mode}-{url=="/"}.png').write_bytes(preview_png)
                preview=blue_box(preview_png)
                assert abs(preview[1]-composite[1])<max(800,composite[1]*.06),(url,mode,preview,composite)
                for a,b in zip(preview[0],composite[0]):assert abs(a-b)<4,(url,mode,preview,composite)
                assert composite[0][0]>=0
            page.evaluate('setLayout(0);applyZoomPan(.25,1,1)')
            page.wait_for_timeout(100)
            assert page.evaluate('tileZoom')==.25
            page.evaluate("document.getElementById('videoPresetName').value='Quarter-size';saveCurrentVideoPreset()")
            page.wait_for_function('videoPresetCache.get("background.mp4")?.some(p=>p.zoom===.25)')
            page.add_style_tag(content='.remote-bar{visibility:visible!important}')
            page.evaluate("switchTab('playlist');plPlaylist={name:'Framed',entries:[{video:'background.mp4',view:'quad',preset:1,speed:1,zoom:.5,panX:.4,panY:.3,loopMode:1,duration:{type:'seconds',value:6},transition:{type:'cut',duration:0},cues:[]}]};renderPlaylistEntries();openPlaylistCueEditor(0);addPlaylistCue();")
            page.locator('#playlistCueDialog button').filter(has_text='+ Add cue').hover()
            page.locator('#controlHint').wait_for(state='visible')
            assert page.evaluate('document.getElementById("controlHint").matches(":popover-open")')
            page.evaluate('closePlaylistCueEditor()')
            print('PASS hover/focus/modal hints, all six layouts and saved zoom-out preset',url,flush=True)
        page.goto(origin+'/redesign#builder',wait_until='domcontentloaded');page.locator('#sbGenerate').wait_for();page.locator('[data-builder-tab=bricks]').click()
        zoom=page.locator('.sb-brick-editor input[aria-label=Zoom]');zoom.fill('.5');zoom.press('Tab')
        assert zoom.evaluate('e=>e.checkValidity()')
        page.locator('#sbSave').click();page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Saved models")')
        assert json.loads((root/'models.json').read_text())['library']['bricks'][0]['steps'][0]['zoom']==.5
        # Reusable effect fields and custom menu options have contextual help.
        editor=page.locator('.sb-brick-editor .logo-motion-editor').first
        editor.evaluate("e=>{e.closest('details').open=true;e.querySelector('[data-appearance-field]').open=true;}")
        editor.locator('[data-look=roughness]').hover();page.locator('#controlHint').wait_for(state='visible');assert 'polished' in page.locator('#controlHint').inner_text()
        editor.locator('[data-look=skin]').locator('..').locator('.rd-select-trigger').click()
        choice=page.locator('.rd-select-menu:visible [role=option]').filter(has_text='Gold').first
        choice.hover();page.locator('#controlHint').wait_for(state='visible');assert 'gold' in page.locator('#controlHint').inner_text().lower()
        page.keyboard.press('Escape')
        page.screenshot(path=str(root/'hints-builder.png'))
        (root/'hint-audit.json').write_text(json.dumps(page.evaluate("[...document.querySelectorAll('button,input,select,textarea,summary')].map(e=>({id:e.id,label:e.getAttribute('aria-label')||e.textContent.slice(0,80),hint:ControlHints.hint(e)}))"),indent=2))
        # Send the zoomed-out look through the real host and clean-output paths.
        host=context.new_page();host.goto(origin+'/?host=1',wait_until='domcontentloaded');host.wait_for_function('hostClaimed')
        output=context.new_page();output.goto(origin+'/output?monitor=1',wait_until='domcontentloaded')
        page.evaluate("showVideo('background.mp4',{type:'cut'});setLayout(3);applyZoomPan(.5,0,0);setVfxState({enabled:false})")
        page.wait_for_function('video.readyState>=2')
        page.evaluate('sendMacCommand("take",{scene:previewScene()})')
        host.wait_for_function('tileZoom===.5&&viewMode===3&&video.readyState>=2')
        output.wait_for_function('tileZoom===.5&&viewMode===3&&video.readyState>=2')
        output.wait_for_timeout(200)
        outbox,outpixels=blue_box(output.locator('#videoStage').screenshot())
        size=output.locator('#videoStage').bounding_box()
        assert outpixels<size['width']*size['height']*.4
        print('PASS model storage, dynamic material hints and real Mac/output zoom out',flush=True)
        page.bring_to_front()
        page.locator('.rd-nav [data-screen=capture]').click()
        page.evaluate("setLayout(0);applyZoomPan(.5,0,0);setVfxState({enabled:false});captionEnabled=false;captionOverlay.classList.remove('visible')")
        page.locator('#captureFormat').evaluate('(s)=>{s.value="1x1";s.dispatchEvent(new Event("change",{bubbles:true}));}')
        page.locator('#captureDuration').fill('.6');page.locator('#captureAction').click()
        page.wait_for_function('document.getElementById("captureStatus").textContent.startsWith("Saved ")&&!instagramCaptureBusy',timeout=60000)
        filename=page.locator('#captureDownload').get_attribute('download')
        path=root/'media'/filename
        decoded=subprocess.check_output([v1.find_working_ffmpeg(),'-v','error','-ss','0.2','-i',str(path),'-frames:v','1','-f','image2pipe','-vcodec','png','pipe:1'])
        (root/'dust-export.png').write_bytes(decoded)
        box,count=blue_box(decoded)
        image=Image.open(io.BytesIO(decoded)).convert('RGB')
        assert max(image.getpixel((10,10)))<12
        assert count<1080*1080*.5 and count>1080*1080*.05,(box,count)
        assert any(12<b<230 and r<20 and g<20 for r,g,b in image.getdata()),'No faded edge pixels in MP4'
        print('PASS real MP4 export retains black surround and dust-faded edges',flush=True)
        assert not errors,errors
        browser.close();print('Artifacts:',root)
finally:
    httpd.shutdown();httpd.server_close()
