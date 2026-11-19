"""Render real portrait logo MP4s and verify they can be used as library videos.

Uses generated temporary media, metadata and a separate social clip folder.
Run: python3 ui-redesign/check_logo_portrait.py (Chrome, Playwright and FFmpeg).
"""
import base64
import json
from pathlib import Path
import subprocess
import tempfile
import threading
import launch
from playwright.sync_api import sync_playwright

v1 = launch.v1
root = Path(tempfile.mkdtemp(prefix='club-portrait-logo-'))
for name in ('media', 'social', 'thumbs', 'playlists', 'presets', 'previews'):
    (root / name).mkdir()
subprocess.run([v1.find_working_ffmpeg(), '-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=640x360:rate=30:duration=6', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(root / 'media' / 'fixture.mp4')], check=True)
config = root / 'config.json'; config.write_text(json.dumps({'download_dir':str(root/'media'), 'instagram_clip_dir':str(root/'social')}))
v1.CONFIG_FILE = config; v1.THUMB_DIR = root/'thumbs'; v1.PLAYLIST_DIR = root/'playlists'; v1.VIDEO_PRESET_DIR = root/'presets'; v1.LIBRARY_ORDER_FILE = root/'order.json'
v1.LIBRARY_CATALOG = v1.LibraryCatalog(root/'catalog.json'); v1.VIDEO_CUES = v1.VideoCues(root/'cues'); v1.PREVIEW_CACHE = v1.PreviewCache(root/'previews',v1.find_working_ffmpeg)
launch.SHOW_LIBRARY = launch.ShowLibrary(root/'models.json')
class Output:
    def status(self): return {'connected':False,'fullscreen':False}
v1.MAC_OUTPUT = Output()
launch.RedesignHandler.log_message = lambda *args: None
httpd = v1.ThreadedHTTPServer(('127.0.0.1',0),launch.RedesignHandler)
threading.Thread(target=httpd.serve_forever,daemon=True).start()
origin = f'http://127.0.0.1:{httpd.server_port}'
print('FIXTURE',root,flush=True)
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        page = browser.new_page(viewport={'width':1440,'height':1050})
        errors=[]; page.on('pageerror',lambda error: errors.append(error.stack or str(error)))
        page.goto(origin+'/redesign#prepare',wait_until='domcontentloaded'); page.wait_for_function('video.readyState>=2')
        page.locator('summary').filter(has_text='Colour, VFX').click()
        with page.expect_popup() as popup: page.locator('#reflectionLogoBtn').click()
        controller=popup.value; controller.on('pageerror',lambda error: errors.append(error.stack or str(error)));controller.wait_for_load_state('domcontentloaded')
        controller.locator('#logo3dOrientation').select_option('top-bottom')
        assert page.evaluate('vfxState.logo3d.orientation')=='top-bottom'
        assert page.evaluate('vfxState.logo3d.rotZ')==0
        page.evaluate("setVfxLogo3d({motion:0,rotX:0,rotY:0,rotZ:0,scale:.32,animation:{enabled:true,path:'still',duration:2,zoomMin:.7,zoomMax:.9},animationClock:{time:17,startedAt:Date.now(),playing:false}})")
        controller.locator('#logoPortraitRender').click()
        page.wait_for_function('document.body.dataset.workspace==="capture" && logoRenderEngine?.logoSurfaceReady')
        assert page.locator('#captureFormat').input_value()=='logo_9x16'
        assert not page.locator('#captureBox').is_visible()
        assert page.locator('#logoRenderPreview').is_visible()
        preview = page.evaluate('''() => {
          drawLogoRender(CAPTURE_FORMATS[captureFormat.value]);
          const gl=logoRenderEngine.gl,w=logoRenderPreview.width,h=logoRenderPreview.height,p=new Uint8Array(w*h*4);
          gl.readPixels(0,0,w,h,gl.RGBA,gl.UNSIGNED_BYTE,p);
          let x0=w,y0=h,x1=0,y1=0,count=0;
          for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;if(p[i]+p[i+1]+p[i+2]>30){count++;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
          return {w,h,x0,y0,x1,y1,count,error:gl.getError(),image:logoRenderPreview.toDataURL('image/png').split(',')[1]};
        }''')
        (root/'portrait-logo-preview.png').write_bytes(base64.b64decode(preview.pop('image')))
        assert (preview['w'],preview['h'])==(1080,1920),preview
        assert preview['count']>10000 and preview['y1']-preview['y0']>5*(preview['x1']-preview['x0']),preview
        assert preview['y0']>20 and preview['y1']<1900 and preview['error']==0,preview
        page.wait_for_function('document.querySelector("#captureFormat + .rd-select-trigger").textContent.includes("Logo render")')
        page.screenshot(path=str(root/'portrait-capture-desktop.png'))
        files=[]
        for key,width,height,orientation in [('logo_9x16',1080,1920,'top-bottom'),('logo_16x9',1920,1080,'bottom-top'),('logo_1x1',1080,1080,'horizontal')]:
            page.evaluate('(orientation)=>setVfxLogo3d({orientation})',orientation)
            page.locator('#captureFormat').evaluate('(s,value)=>{s.value=value;s.dispatchEvent(new Event("change",{bubbles:true}));}',key)
            page.wait_for_function('(size)=>logoRenderPreview.width===size[0]&&logoRenderPreview.height===size[1]',arg=[width,height])
            page.locator('#captureStart').fill('1')
            page.locator('#captureDuration').fill('1.2' if key=='logo_9x16' else '.6')
            page.locator('#captureAction').click()
            page.wait_for_function('instagramRecorder!==null')
            assert page.evaluate('logoRecordingClock.time')==0
            assert page.evaluate('vfxState.logo3d.animationClock.time')==17
            page.wait_for_function('document.getElementById("captureStatus").textContent.startsWith("Saved ")',timeout=60000)
            filename=page.locator('#captureDownload').get_attribute('download');files.append(filename)
            path=root/'media'/filename
            assert path.is_file() and filename.startswith('logo_render_')
            assert not list((root/'social').glob('*.mp4'))
            data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(path)]))
            assert len(data['streams'])==1
            stream=data['streams'][0]
            assert (stream['width'],stream['height'])==(width,height) and stream['codec_name']=='h264' and stream['r_frame_rate']=='30/1',stream
            assert stream['nb_frames']==('36' if key=='logo_9x16' else '18'),stream
            page.wait_for_function('(name)=>videoListCache.some(v=>v.filename===name)',arg=filename)
            assert page.request.get(origin+'/video/'+filename).status==200
            print('PASS',key,orientation,width,height,stream['nb_frames'],'frames',flush=True)
        # Encoded portrait footage retains a complete tall logo over black.
        portrait=root/'media'/files[0]
        pixels=subprocess.check_output([v1.find_working_ffmpeg(),'-v','error','-i',str(portrait),'-vf','scale=135:240','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
        lit=[(i%135,i//135) for i in range(135*240) if sum(pixels[i*3:i*3+3])>60]
        assert lit
        xs,ys=zip(*lit)
        assert max(ys)-min(ys)>4*(max(xs)-min(xs)),(min(xs),max(xs),min(ys),max(ys))
        assert min(ys)>1 and max(ys)<238
        for index in (0,134,135*239,135*240-1): assert sum(pixels[index*3:index*3+3])<12
        subprocess.run([v1.find_working_ffmpeg(),'-v','error','-y','-i',str(portrait),'-frames:v','1',str(root/'portrait-logo-recorded.png')],check=True)
        # Orientation is part of saved cues and shared authoring controls.
        page.evaluate("setVfxLogo3d({orientation:'top-bottom'})")
        page.locator('.rd-nav [data-screen=playlist]').click();page.locator('#timelineAddCurrent').click()
        page.wait_for_function('plPlaylist.entries.length===1')
        assert page.evaluate('plPlaylist.entries[0].cues[0].orientation')=='top-bottom'
        page.evaluate('openPlaylistCueEditor(0)')
        assert page.locator('#playlistCueList [data-motion=orientation]').input_value()=='top-bottom'
        page.evaluate('closePlaylistCueEditor()')
        page.locator('#plName').fill('Portrait logo');page.evaluate('savePlaylist()')
        stored=json.loads(next((root/'playlists').glob('*.json')).read_text())
        assert stored['entries'][0]['cues'][0]['orientation']=='top-bottom'
        # Select the exported file as an ordinary library video.
        page.evaluate('(name)=>showVideo(name,{type:"cut"})',files[0])
        page.wait_for_function('video.readyState>=2&&video.videoWidth===1080&&video.videoHeight===1920')
        page.set_viewport_size({'width':834,'height':1194})
        page.locator('.rd-nav [data-screen=capture]').click()
        page.screenshot(path=str(root/'portrait-capture-ipad.png'))
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors,errors
        controller.close();browser.close()
        print('PASS: vertical orientation, full-frame render preview, three real MP4 exports, animation restart, source-library reuse, cue persistence and portrait layout. Artifacts:',root)
finally:
    httpd.shutdown();httpd.server_close()
