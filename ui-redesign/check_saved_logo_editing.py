"""Edit saved primary/overlaid logo looks without using the live VFX popup.

Generated media, separate model/playlist stores, and no physical camera access.
"""
import json
from pathlib import Path
import shutil
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1=launch.v1;root=Path(tempfile.mkdtemp(prefix='club-logo-editing-'))
for name in ('media','thumbs','playlists','presets','previews'):(root/name).mkdir()
for name,colour in [('background','blue'),('reflection','red')]:
    subprocess.run([v1.find_working_ffmpeg(),'-v','error','-y','-f','lavfi','-i',f'color=c={colour}:size=320x180:rate=30:duration=6','-c:v','libx264','-pix_fmt','yuv420p',str(root/'media'/(name+'.mp4'))],check=True)
config=root/'config.json';config.write_text(json.dumps({'download_dir':str(root/'media')}))
v1.CONFIG_FILE=config;v1.THUMB_DIR=root/'thumbs';v1.PLAYLIST_DIR=root/'playlists';v1.VIDEO_PRESET_DIR=root/'presets';v1.LIBRARY_ORDER_FILE=root/'order.json';v1.LIBRARY_CATALOG=v1.LibraryCatalog(root/'catalog.json')
v1.VIDEO_CUES=v1.VideoCues(root/'cues');v1.PREVIEW_CACHE=v1.PreviewCache(root/'previews',v1.find_working_ffmpeg)
launch.SHOW_LIBRARY=launch.ShowLibrary(root/'models.json')
library=json.loads(subprocess.check_output(['node','-e','process.stdout.write(JSON.stringify(require("./ui-redesign/show-models.js").defaults()))'],cwd=v1.BASE_DIR))
library['profiles'][0]['avoidRepeat']=0
library['bricks'][0]['steps'][0]['effects']=[{'at':0,'seconds':8,'effect':'logo'}, {'at':10,'seconds':8,'effect':'scene-4','logoLayer':{'effect':'logo','reflectionSource':{'filename':'missing.mp4','speed':1}}}]
launch.SHOW_LIBRARY.save({'revision':0,'library':library})
class Output:
    def status(self):return {'connected':False,'fullscreen':False}
v1.MAC_OUTPUT=Output();launch.RedesignHandler.log_message=lambda *args:None
httpd=v1.ThreadedHTTPServer(('127.0.0.1',0),launch.RedesignHandler);threading.Thread(target=httpd.serve_forever,daemon=True).start();origin=f'http://127.0.0.1:{httpd.server_port}'
print('FIXTURE',root,flush=True)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        page=browser.new_page(viewport={'width':1440,'height':1050});errors=[]
        page.on('pageerror',lambda error:errors.append(str(error)))
        def reveal(editor):
            editor.evaluate('''e=>{for(let d=e.parentElement;d;d=d.parentElement)if(d.tagName==='DETAILS')d.open=true;e.querySelector('[data-appearance-field]').open=true;e.querySelector('[data-reflection-field]').open=true;}''')
        def number(editor,selector,value):
            target=editor.locator(selector);target.fill(str(value));target.press('Tab');assert target.evaluate('e=>e.checkValidity()'),selector
        def select(editor,selector,value):
            control=editor.locator(selector)
            if page.evaluate('document.documentElement.classList.contains("redesign")'):
                label=control.evaluate('(e,value)=>[...e.options].find(o=>o.value===value).textContent',value)
                control.locator('..').locator('.rd-select-trigger').click()
                page.locator('.rd-select-menu:visible').get_by_role('option',name=label,exact=True).click()
            else:control.select_option(value)
        for url,slug in [('/redesign#playlist','edited-redesign'),('/','edited-original')]:
            page.goto(origin+url,wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2&&videoListCache.length>=2')
            if url=='/':page.evaluate("switchTab('playlist')")
            page.evaluate('''()=>{
              plSlug='';plPlaylist={name:'',entries:[{video:'background.mp4',view:'single',preset:1,loopMode:1,speed:1,zoom:1,panX:0,panY:0,duration:{type:'seconds',value:6},transition:{type:'cut',duration:1,pace:'steady'},
                cues:[normalisePlaylistCue({at:0,effect:'logo'}),normalisePlaylistCue({at:2,effect:'scene-4',logoLayer:{effect:'logo',reflectionSource:{filename:'missing.mp4',speed:1}}}),normalisePlaylistCue({at:4,effect:'text',text:'@old'})]}]};renderPlaylistEntries();openPlaylistCueEditor(0);
            }''')
            editors=page.locator('#playlistCueList .logo-motion-editor');assert editors.count()==3
            primary=editors.nth(0);overlay=editors.nth(1);text=editors.nth(2)
            for editor in (primary,overlay,text):reveal(editor)
            # Defaults must be valid before changing any optional animation.
            assert primary.locator('[data-dynamics="snake.speed"]').evaluate('e=>e.checkValidity()')
            assert primary.locator('[data-dynamics="fly.distance"]').evaluate('e=>e.checkValidity()')
            number(primary,'[data-look="depth"]',.7);number(primary,'[data-look="rotX"]',30)
            number(primary,'[data-look="bevel"]',.0375)
            select(primary,'[data-reflection="filename"]','reflection.mp4');number(primary,'[data-reflection="speed"]',.75)
            assert overlay.locator('[data-reflection="filename"]').input_value()=='missing.mp4'
            assert 'missing' in overlay.locator('[data-reflection-status]').inner_text()
            assert page.evaluate('plPlaylist.entries[0].cues[1].logoLayer.reflectionSource.filename')=='missing.mp4'
            number(overlay,'[data-look="x"]',.27);number(overlay,'[data-look="scale"]',.42);number(overlay,'[data-look="rotY"]',-35)
            select(overlay,'[data-look="skin"]','gold');select(overlay,'[data-reflection="filename"]','reflection.mp4')
            overlay.locator('summary').filter(has_text='Pulsing snake').click();number(overlay,'[data-dynamics="snake.speed"]',.27)
            overlay.locator('summary').filter(has_text='Fly along').click();number(overlay,'[data-dynamics="fly.distance"]',1.25)
            text.locator('[data-look="text"]').fill('@new');text.locator('[data-look="text"]').press('Tab');select(text,'[data-look="font"]','bungee')
            cues=page.evaluate('plPlaylist.entries[0].cues')
            assert cues[0]['depth']==.7 and cues[0]['rotX']==30 and cues[0]['bevel']==.0375 and cues[0]['reflectionSource']=={'filename':'reflection.mp4','speed':.75}
            assert cues[1]['logoLayer']['x']==.27 and cues[1]['logoLayer']['skin']=='gold'
            assert cues[1]['logoLayer']['snake']['speed']==.27 and cues[1]['logoLayer']['fly']['distance']==1.25
            assert cues[2]['text']=='@new' and cues[2]['font']=='bungee'
            # Adding a source file refreshes choices without altering the saved look.
            if url.startswith('/redesign'):
                shutil.copyfile(root/'media'/'background.mp4',root/'media'/'added.mp4')
                overlay.locator('[data-refresh-reflections]').click()
                page.wait_for_function('document.querySelectorAll("#playlistCueList [data-reflection=filename]")[1].querySelector("option[value=\\"added.mp4\\"]")')
                assert overlay.locator('[data-reflection="filename"]').input_value()=='reflection.mp4'
                assert page.locator('#playlistCueDialog').get_by_role('button',name='Done',exact=True).is_visible()
                page.screenshot(path=str(root/'playlist-editing.png'))
                page.set_viewport_size({'width':834,'height':1194});page.screenshot(path=str(root/'playlist-editing-ipad.png'))
                assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
                bounds=page.locator('#playlistCueDialog').bounding_box();assert bounds['y']>=0 and bounds['y']+bounds['height']<=1194
                page.set_viewport_size({'width':1440,'height':1050})
            page.evaluate('''()=>{setVfxLogo3d({kind:'text',text:'@overlay'});plPlaylist.entries[0].cues.push(normalisePlaylistCue({at:5,effect:'video'}));renderPlaylistCueEditor();}''')
            page.locator('#playlistCueList .playlist-cue-row').last.locator('input[type=checkbox]').first.check()
            cues=page.evaluate('plPlaylist.entries[0].cues')
            assert cues[-1]['logoLayer']['effect']=='text' and cues[-1]['logoLayer']['text']=='@overlay'
            page.locator('#playlistCueDialog').get_by_role('button',name='Done',exact=True).click();page.locator('#plName').fill(slug);page.evaluate('savePlaylist()')
            saved=json.loads((root/'playlists'/(slug+'.json')).read_text())['entries'][0]['cues'];assert saved==cues
            page.evaluate('(cue)=>applyPlaylistCue(cue,1,false)',saved[1]);page.wait_for_function('reflectionVideo.frame()!==null')
            assert page.evaluate('vfxState.logoEnabled&&vfxState.baseEnabled&&vfxState.logo3d.x===.27&&vfxState.logo3d.skin==="gold"')
            assert page.evaluate('vfxState.logo3d.reflectionSource.filename')=='reflection.mp4'
        print('PASS primary/overlay/text editing, numeric validity, source refresh, storage and playback in both interfaces',flush=True)
        # Edit model settings without rebuilding the live look, including dirty-state UI.
        page.goto(origin+'/redesign#builder',wait_until='domcontentloaded');page.locator('#sbGenerate').wait_for()
        page.locator('[data-builder-tab=bricks]').click();editors=page.locator('.sb-brick-editor .logo-motion-editor');assert editors.count()==2
        primary=editors.nth(0);overlay=editors.nth(1);reveal(primary);reveal(overlay)
        assert page.locator('#sbSave').inner_text()=='Save library'
        overlay.evaluate('e=>{window.savedOverlayElement=e;}')
        shutil.copyfile(root/'media'/'background.mp4',root/'media'/'missing.mp4')
        overlay.locator('[data-refresh-reflections]').click()
        page.wait_for_function('document.querySelectorAll(".sb-brick-editor [data-reflection=filename]")[1].selectedOptions[0].textContent==="missing.mp4"')
        assert overlay.locator('[data-reflection="filename"]').input_value()=='missing.mp4'
        assert overlay.evaluate('e=>e===window.savedOverlayElement&&e.isConnected')
        assert page.locator('#sbSave').inner_text()=='Save library'
        number(overlay,'[data-look="y"]',.63)
        assert page.locator('#sbSave').inner_text()=='Save changes •'
        assert page.locator('.sb-save-state').inner_text()=='Unsaved changes'
        select(overlay,'[data-reflection="filename"]','reflection.mp4');number(overlay,'[data-reflection="speed"]',1.5)
        number(primary,'[data-look="depth"]',.8);select(primary,'[data-reflection="filename"]','reflection.mp4')
        page.locator('#sbSave').click();page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Saved models")')
        stored=json.loads((root/'models.json').read_text())['library']['bricks'][0]['steps'][0]['effects']
        assert stored[0]['depth']==.8 and stored[0]['reflectionSource']['filename']=='reflection.mp4'
        assert stored[1]['logoLayer']['y']==.63 and stored[1]['logoLayer']['reflectionSource']['speed']==1.5
        page.reload(wait_until='domcontentloaded');page.locator('#sbGenerate').wait_for();page.locator('[data-builder-tab=bricks]').click()
        editors=page.locator('.sb-brick-editor .logo-motion-editor');assert editors.nth(1).locator('[data-look="y"]').input_value()=='0.63'
        assert editors.nth(1).locator('[data-reflection="filename"]').input_value()=='reflection.mp4'
        reveal(editors.nth(1));editors.nth(1).locator('[data-reflection-field]').scroll_into_view_if_needed()
        page.screenshot(path=str(root/'builder-editing.png'))
        page.locator('[data-builder-tab=assemble]').click();page.locator('#sbGenerate').click()
        page.get_by_role('button',name='Save as new playlist',exact=True).click();page.wait_for_function('document.getElementById("sbStatus").textContent.startsWith("Saved a new playlist")')
        generated=[json.loads(path.read_text()) for path in (root/'playlists').glob('*.json') if path.stem not in ('edited-redesign','edited-original')][0]
        nested=[cue['logoLayer'] for entry in generated['entries'] for cue in entry.get('cues',[]) if cue.get('logoLayer')]
        assert any(logo['y']==.63 and logo['reflectionSource']['filename']=='reflection.mp4' and logo['reflectionSource']['speed']==1.5 for logo in nested)
        assert not errors,errors
        browser.close();print('PASS model editing, unsaved indicator, reload and generated cue retention. Artifacts:',root)
finally:
    httpd.shutdown();httpd.server_close()
