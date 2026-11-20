"""Audition saved looks using isolated media, clocks and GPU contexts."""
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1 = launch.v1
root = Path(tempfile.mkdtemp(prefix='club-logo-preview-'))
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
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args=['--no-sandbox', '--autoplay-policy=no-user-gesture-required'])
        page = browser.new_page(viewport={'width': 1440, 'height': 1050})
        errors, playout = [], []
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('request', lambda request: playout.append(request.post_data) if request.method == 'POST' and request.url.endswith('/api/state') else None)
        def install_probe():
            page.evaluate('''() => {
              const render = VfxEngine.prototype.render;
              window.previewFrames = [];
              VfxEngine.prototype.render = function(source, state, size) {
                render.call(this, source, state, size);
                if (!this.canvas.closest('.lm-preview')) return;
                window.auditionEngine = this;
                const gl=this.gl, pixels=new Uint8Array(this.canvas.width*this.canvas.height*4);
                gl.readPixels(0,0,this.canvas.width,this.canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
                let red=0,blue=0,black=0,hash=0;
                for(let i=0;i<pixels.length;i+=4){
                  if(pixels[i]>pixels[i+2]*1.4&&pixels[i]>35)red++;
                  if(pixels[i+2]>pixels[i]*1.4&&pixels[i+2]>35)blue++;
                  if(pixels[i]+pixels[i+1]+pixels[i+2]<12)black++;
                  hash=(hash+pixels[i]*(i+1)+pixels[i+2]*(i+3))%1000000007;
                }
                window.previewFrames.push({red,blue,black,hash,scene:state.scene,kind:this.logo3d.kind,clock:{...this.logo3d.animationClock},time:state.elapsedSeconds});
                if(window.previewFrames.length>30)window.previewFrames.shift();
              };
            }''')
        def reveal(editor):
            editor.evaluate("e=>{for(let d=e.parentElement;d;d=d.parentElement)if(d.tagName==='DETAILS')d.open=true;}")
        def select(editor, selector, value):
            control = editor.locator(selector).first
            if page.evaluate('document.documentElement.classList.contains("redesign")'):
                label = control.evaluate('(e,value)=>[...e.options].find(o=>o.value===value).textContent', value)
                control.locator('..').locator('.rd-select-trigger').click()
                page.locator('.rd-select-menu:visible').get_by_role('option', name=label, exact=True).click()
            else:
                control.select_option(value)
        def open_preview(editor):
            reveal(editor)
            editor.locator('[data-preview=open]').click()
            page.wait_for_function('window.auditionEngine?.logoSurfaceReady&&previewFrames.at(-1)?.red>20')
        for url in ('/redesign#playlist', '/'):
            page.goto(origin + url, wait_until='domcontentloaded')
            page.wait_for_function('video.readyState>=2&&videoListCache.length===2')
            if url == '/': page.evaluate("switchTab('playlist')")
            install_probe()
            page.evaluate('''()=>{
              video.pause();
              plPlaylist={name:'Audition',entries:[{video:'background.mp4',view:'single',duration:{type:'seconds',value:6},cues:[
                normalisePlaylistCue({at:1,effect:'logo',orientation:'top-bottom',backdrop:'black',snake:{enabled:true},reflectionSource:{filename:'reflection.mp4',speed:1}}),
                normalisePlaylistCue({at:3,effect:'scene-4',logoLayer:{effect:'text',text:'PREVIEW',reflectionSource:{filename:'reflection.mp4',speed:1}}})]}]};
              renderPlaylistEntries();openPlaylistCueEditor(0);
              window.beforePreview={vfx:JSON.stringify(vfxState),src:video.src,time:video.currentTime,cues:JSON.stringify(plPlaylist.entries[0].cues)};
            }''')
            editors = page.locator('#playlistCueList .logo-motion-editor')
            primary, overlay = editors.nth(0), editors.nth(1)
            open_preview(primary)
            assert primary.locator('[data-preview=source]').input_value() == 'background.mp4'
            assert page.evaluate('previewFrames.at(-1).black>100000')
            select(primary, '[data-preview=aspect]', 'portrait')
            page.wait_for_function('auditionEngine.canvas.width===270&&auditionEngine.canvas.height===480')
            primary.locator('[data-preview=time]').fill('2.5')
            page.wait_for_function('previewFrames.at(-1)?.clock.time===2.5')
            still = page.evaluate('previewFrames.at(-1).hash')
            primary.locator('[data-preview=play]').click()
            page.wait_for_function('previewFrames.at(-1)?.clock.playing&&previewFrames.at(-1).time>2.7')
            assert page.evaluate('previewFrames.at(-1).hash') != still
            primary.locator('[data-transport=pause]').click()
            page.wait_for_function('previewFrames.at(-1)?.clock.playing===false')
            held = page.evaluate('previewFrames.at(-1).clock.time')
            page.wait_for_function('previewFrames.at(-1).time>3.1')
            assert page.evaluate('previewFrames.at(-1).clock.time') == held
            primary.locator('[data-preview=play]').click()
            primary.locator('[data-preview=restart]').click()
            page.wait_for_function('previewFrames.at(-1).time===0&&previewFrames.at(-1).clock.time===0')
            primary.locator('[data-preview=open]').scroll_into_view_if_needed()
            page.screenshot(path=str(root / ('portrait-redesign.png' if url.startswith('/redesign') else 'portrait-original.png')))
            page.evaluate('window.oldAudition=auditionEngine')
            open_preview(overlay)
            page.wait_for_function('oldAudition.disposed&&previewFrames.at(-1).scene===4&&previewFrames.at(-1).kind==="text"')
            assert primary.locator('[data-preview=panel]').is_hidden()
            page.wait_for_function('previewFrames.at(-1).blue>50000')
            # Authoring edits update only the audition renderer.
            overlay.locator('[data-appearance-field]').evaluate('e=>e.open=true')
            overlay.locator('[data-look=x]').fill('0.3')
            overlay.locator('[data-look=x]').press('Tab')
            page.wait_for_function('auditionEngine.logo3d.x===.3')
            assert page.evaluate('vfxState.logo3d.x') != .3
            assert page.evaluate('JSON.stringify(vfxState)===beforePreview.vfx&&video.src===beforePreview.src&&video.currentTime===beforePreview.time')
            assert page.evaluate("JSON.stringify(plPlaylist.entries[0].cues).includes('animationClock')") is False
            page.evaluate('window.oldAudition=auditionEngine')
            page.locator('#playlistCueDialog').get_by_role('button', name='Done', exact=True).click()
            page.wait_for_function('oldAudition.disposed&&oldAudition.gl.isContextLost()')
            print('PASS isolated playlist preview, GPU colours, portrait, seek, transport and cleanup', url, flush=True)
        page.goto(origin + '/redesign#builder', wait_until='domcontentloaded')
        page.locator('#sbGenerate').wait_for()
        page.locator('[data-builder-tab=bricks]').click()
        install_probe()
        editor = page.locator('.sb-brick-editor .logo-motion-editor').first
        before_models = (root / 'models.json').read_text()
        open_preview(editor)
        assert page.locator('#sbSave').inner_text() == 'Save library'
        select(editor, '[data-preview=source]', '')
        select(editor, '[data-preview=aspect]', 'portrait')
        page.wait_for_function('auditionEngine.canvas.width===270')
        page.evaluate('window.oldAudition=auditionEngine')
        editor.locator('[data-preview=open]').click()
        page.wait_for_function('oldAudition.disposed')
        open_preview(editor)
        assert editor.locator('[data-preview=source]').input_value() == ''
        page.set_viewport_size({'width':834,'height':1194})
        editor.locator('[data-preview=open]').scroll_into_view_if_needed()
        page.screenshot(path=str(root/'builder-preview-ipad.png'))
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        page.evaluate('window.oldAudition=auditionEngine')
        page.locator('[data-builder-tab=assemble]').click()
        page.wait_for_function('oldAudition.disposed')
        page.locator('[data-builder-tab=bricks]').click()
        select(page.locator('.sb-brick-editor'), 'select:has(option[value="dj"])', 'dj')
        editor = page.locator('.sb-brick-editor .logo-motion-editor').first
        open_preview(editor)
        expected_brand = library['profiles'][0]['branding']['text'] or library['profiles'][0]['name']
        page.wait_for_function('(text)=>auditionEngine.logo3d.kind==="text"&&auditionEngine.logo3d.text===text', arg=expected_brand)
        page.evaluate('window.oldAudition=auditionEngine')
        editor.evaluate("e=>e.closest('details').open=false")
        page.wait_for_function('oldAudition.disposed')
        assert (root/'models.json').read_text() == before_models
        assert not playout, playout
        assert not errors, errors
        browser.close()
        print('PASS builder preview, source retention, no dirty/save/playout side effects, navigation cleanup. Artifacts:', root)
finally:
    httpd.shutdown()
    httpd.server_close()
