"""Regress live effect toggles, isolated motion transport and fullscreen preview.

Uses generated temporary media and metadata. Requires Chrome and Playwright.
Run: python3 ui-redesign/check_vfx_controls.py
"""
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1 = launch.v1
root = Path(tempfile.mkdtemp(prefix='club-vfx-controls-'))
for name in ('media','thumbs','playlists','presets','previews'):
    (root/name).mkdir()
subprocess.run([v1.find_working_ffmpeg(),'-v','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=30:duration=12','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',str(root/'media'/'fixture.mp4')],check=True)
config=root/'config.json';config.write_text(json.dumps({'download_dir':str(root/'media')}))
v1.CONFIG_FILE=config;v1.THUMB_DIR=root/'thumbs';v1.PLAYLIST_DIR=root/'playlists';v1.VIDEO_PRESET_DIR=root/'presets';v1.LIBRARY_ORDER_FILE=root/'order.json'
v1.LIBRARY_CATALOG=v1.LibraryCatalog(root/'catalog.json');v1.VIDEO_CUES=v1.VideoCues(root/'cues');v1.PREVIEW_CACHE=v1.PreviewCache(root/'previews',v1.find_working_ffmpeg)
launch.SHOW_LIBRARY=launch.ShowLibrary(root/'models.json')
class Output:
    def status(self):return {'connected':False,'fullscreen':False}
v1.MAC_OUTPUT=Output();launch.RedesignHandler.log_message=lambda *args:None
httpd=v1.ThreadedHTTPServer(('127.0.0.1',0),launch.RedesignHandler)
threading.Thread(target=httpd.serve_forever,daemon=True).start()
origin=f'http://127.0.0.1:{httpd.server_port}'
print('FIXTURE',root,flush=True)
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        context=browser.new_context(viewport={'width':1440,'height':1050})
        errors=[]
        context.on('page',lambda page:page.on('pageerror',lambda error:errors.append(error.stack or str(error))))
        page=context.new_page()
        page.goto(origin+'/redesign#prepare',wait_until='domcontentloaded')
        page.wait_for_function('video.readyState>=2')
        page.locator('summary').filter(has_text='Colour, VFX').click()
        with page.expect_popup() as opened:page.locator('#text3dBtn').click()
        popup=opened.value;popup.wait_for_load_state('domcontentloaded')
        popup.wait_for_function('document.body.dataset.connected==="true"')
        def state():return page.evaluate('({enabled:vfxState.enabled,scene:vfxState.scene,kind:vfxState.logo3d.kind,backdrop:vfxState.logo3d.backdrop,orientation:vfxState.logo3d.orientation})')
        # Each shortcut selects only its intended scene/object; the popup toggles only enabled.
        for button,scene,kind,backdrop in [('logo3dBtn',6,'logo','video'),('reflectionLogoBtn',6,'logo','black'),('text3dBtn',6,'text','black')]:
            if button!='mirrorBtn':
                # Standalone shortcuts remain available; combining layers is
                # covered separately by check_vfx_layers.py.
                page.evaluate('setVfxState({enabled:false,baseEnabled:false,logoEnabled:false,scene:0})')
                page.locator('#'+button).click()
            page.wait_for_function('(scene)=>vfxState.enabled&&vfxState.scene===scene',arg=scene)
            selected=state()
            if kind:assert selected['kind']==kind and selected['backdrop']==backdrop,selected
            assert popup.locator('#scene').input_value()==str(scene)
            for _ in range(2):
                popup.locator('#enableBtn').click()
                assert state()['enabled'] is False and state()['scene']==scene,state()
                assert not page.locator('#'+button).evaluate('(b)=>b.classList.contains("active")')
                popup.locator('#enableBtn').click()
                assert state()['enabled'] is True and state()['scene']==scene,state()
            if scene==6:assert not page.locator('#mirrorBtn').evaluate('(b)=>b.classList.contains("active")')
            page.locator('#'+button).click();assert not state()['enabled']
            popup.wait_for_event('close') if not popup.is_closed() else None
            with page.expect_popup() as reopened:page.locator('#'+button).click()
            popup=reopened.value;popup.wait_for_load_state('domcontentloaded');popup.wait_for_function('document.body.dataset.connected==="true"')
            assert state()['enabled'] and state()['scene']==scene

        print('PASS effect shortcuts and popup On/Off',flush=True)
        # Pausing motion holds legacy oscillation while the source video keeps playing.
        page.locator('#logo3dBtn').click();page.wait_for_function('vfxEngine?.logoSurfaceReady')
        assert page.evaluate('vfxState.logo3d.animationClock.playing') is False
        page.evaluate("setVfxLogo3d({motion:.8,axis:'y',startAngle:-45,endAngle:45,animation:{enabled:false}})")
        rotation=lambda:page.evaluate('() => {renderVfxFrame();return [...vfxEngine.gl.getUniform(vfxEngine.logoProgram,vfxEngine.logoUniforms.logoRotation)];}')
        before=rotation();t=page.evaluate('video.currentTime')
        page.wait_for_function('(time)=>video.currentTime>time+.3',arg=t)
        assert rotation()==before
        popup.locator('#logoMotionPlay').click()
        assert page.evaluate('vfxState.logo3d.animationClock.playing') is True
        page.wait_for_function('VfxEngine.animationSeconds(vfxState.logo3d)>.4')
        assert rotation()!=before
        page.locator('#logoMotionPlayBtn').click()
        frozen=rotation();t=page.evaluate('video.currentTime')
        page.wait_for_function('(time)=>video.currentTime>time+.3',arg=t)
        assert rotation()==frozen
        assert popup.locator('#logoMotionPlay').inner_text()=='Play logo motion'
        # Authored path and XYZ turns use that same independent transport.
        editor=popup.locator('.logo-motion-editor')
        editor.locator('[data-motion=preset]').select_option('orbit')
        assert page.evaluate('vfxState.logo3d.animationClock.playing') is False
        frozen=rotation()
        popup.locator('#logoMotionPlay').click();page.wait_for_function('VfxEngine.animationSeconds(vfxState.logo3d)>.4')
        popup.locator('#logoMotionPlay').click();paused=rotation()
        t=page.evaluate('video.currentTime');page.wait_for_function('(time)=>video.currentTime>time+.25',arg=t)
        assert rotation()==paused and paused!=frozen
        print('PASS independent legacy/path Play/Pause with video continuing',flush=True)
        # Quarter-turns reach the renderer, not just the selected dropdown value.
        page.evaluate("setVfxLogo3d({motion:0,rotX:0,rotY:0,rotZ:0,animation:{enabled:false}})")
        for orientation,sign in [('top-bottom',-1),('bottom-top',1),('horizontal',0)]:
            popup.locator('#logo3dOrientation').select_option(orientation)
            r=rotation();assert abs(r[1]-sign)<1e-6,(orientation,r)
            assert state()['orientation']==orientation
        # Reload and close/reopen never detach the controller from its owning editor.
        popup.reload(wait_until='domcontentloaded');popup.wait_for_function('document.body.dataset.connected==="true"')
        assert page.evaluate('vfxWindow && !vfxWindow.closed')
        popup.locator('#enableBtn').click();assert not state()['enabled']
        popup.locator('#enableBtn').click();assert state()['enabled']
        popup.close();page.wait_for_function('vfxWindow===null')
        with page.expect_popup() as opened:page.locator('#vfxBtn').click()
        popup=opened.value;popup.wait_for_load_state('domcontentloaded');popup.wait_for_function('document.body.dataset.connected==="true"')
        assert popup.locator('#scene').input_value()=='6'
        # A second editor gets a different controller and cannot steal the first popup.
        second=context.new_page();second.goto(origin+'/redesign#prepare',wait_until='domcontentloaded');second.wait_for_function('video.readyState>=2')
        second.locator('summary').filter(has_text='Colour, VFX').click()
        with second.expect_popup() as other:second.locator('#vfxBtn').click()
        other=other.value;other.wait_for_load_state('domcontentloaded');other.wait_for_function('document.body.dataset.connected==="true"')
        assert page.evaluate('getVfxControllerIdentity().owner')!=second.evaluate('getVfxControllerIdentity().owner')
        popup.locator('#enableBtn').click();assert not state()['enabled']
        assert second.evaluate('vfxState.enabled') is False
        second.evaluate('setVfxState({enabled:false,scene:3,baseEnabled:true,logoEnabled:false})')
        other.wait_for_function('document.getElementById("scene").value==="3"')
        other.locator('#enableBtn').click()
        assert second.evaluate('vfxState.enabled&&vfxState.scene===3')
        assert not state()['enabled'] and state()['scene']==6
        other.close();second.close();popup.locator('#enableBtn').click()
        print('PASS orientation, popup reload/reopen and editor ownership',flush=True)
        # Native fullscreen or its visible fallback fills the viewport and restores its home.
        home=page.evaluate('videoWrap.parentElement.className');token=page.evaluate('videoLoadToken')
        for layout in [0,3]:
            page.evaluate('(layout)=>setLayout(layout)',layout)
            page.get_by_role('button',name='Preview fullscreen',exact=True).click()
            page.wait_for_function('videoWrap.classList.contains("preview-fullscreen")')
            page.wait_for_function('videoStage.clientWidth>=innerWidth*.95&&videoStage.clientHeight>=innerHeight*.9')
            bounds=page.evaluate('({w:videoWrap.clientWidth,h:videoWrap.clientHeight,innerW:innerWidth,innerH:innerHeight,source:video.readyState,mode:previewFullscreenMode,canvasW:vfxCanvas.clientWidth,canvasH:vfxCanvas.clientHeight})')
            assert bounds['canvasW']>=bounds['innerW']*.95 and bounds['canvasH']>=bounds['innerH']*.9,bounds
            assert page.evaluate('videoLoadToken')==token
            page.screenshot(path=str(root/f'fullscreen-layout-{layout}.png'))
            page.evaluate('togglePreviewFullscreen()');page.wait_for_function('!previewFullscreenMode')
            assert page.evaluate('videoWrap.parentElement.className')==home
        page.evaluate('() => {videoWrap.requestFullscreen=()=>Promise.reject(new Error("denied for regression"));}')
        page.get_by_role('button',name='Preview fullscreen',exact=True).click()
        page.wait_for_function('previewFullscreenMode==="window"')
        assert page.evaluate('videoWrap.clientHeight>=innerHeight*.95')
        page.keyboard.press('Escape');page.wait_for_function('!previewFullscreenMode')
        print('PASS fullscreen geometry, restore and denied-permission fallback',flush=True)
        # Logo capture must respect Off even after a resize callback.
        popup.locator('#logoPortraitRender').click()
        page.wait_for_function('videoWrap.classList.contains("logo-render-preview")&&logoRenderEngine?.logoSurfaceReady')
        popup.locator('#enableBtn').click();assert not state()['enabled']
        page.evaluate('updateCaptureBox()')
        assert not state()['enabled'] and not page.locator('#logoRenderPreview').is_visible()
        popup.locator('#enableBtn').click();assert state()['enabled']
        page.wait_for_function('videoWrap.classList.contains("logo-render-preview")')
        page.locator('.rd-nav [data-screen=prepare]').click()

        popup.close()
        # Missing optional authoring assets show a useful message and leave basic controls usable.
        missing=browser.new_context(viewport={'width':1440,'height':1050})
        missing.on('page',lambda child:child.on('pageerror',lambda error:errors.append(error.stack or str(error))))
        missing.route('**/logo_motion_controls.js',lambda route:route.fulfill(status=404,body=''))
        partial=missing.new_page();partial.goto(origin+'/redesign#prepare',wait_until='domcontentloaded');partial.wait_for_function('video.readyState>=2')
        partial.locator('summary').filter(has_text='Colour, VFX').click()
        with partial.expect_popup() as fallback:partial.locator('#logo3dBtn').click()
        fallback=fallback.value;fallback.wait_for_load_state('domcontentloaded')
        assert 'Restart the local server' in fallback.locator('#logoMotionControls').inner_text()
        fallback.locator('#enableBtn').click();assert partial.evaluate('vfxState.enabled') is False
        fallback.locator('#enableBtn').click();assert partial.evaluate('vfxState.enabled&&vfxState.scene===6')
        fallback.locator('#logo3dOrientation').select_option('top-bottom')
        assert partial.evaluate('vfxState.logo3d.orientation')=='top-bottom'
        missing.close()
        assert not errors,errors
        browser.close()
        print('PASS: all reported VFX controls, independent motion, orientation and fullscreen regressions. Artifacts:',root)
finally:
    httpd.shutdown();httpd.server_close()
