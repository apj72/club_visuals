"""Capture real short MP4s from V1 and the redesigned UI using temporary data."""
import sys, json, tempfile, shutil, threading
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
import launch
v1=launch.v1
root=Path(tempfile.mkdtemp(prefix='club-reskin-check-'))
report=root/'screenshots'; report.mkdir()
for name in ['media','thumbnails','playlists','presets','previews']:(root/name).mkdir()
original=v1.get_download_dir()
sources=list(original.glob('*.mp4'))[:8]
if len(sources)<8:raise SystemExit('Browser integration check needs at least eight MP4s in the configured library.')
for path in sources:(root/'media'/path.name).symlink_to(path)
config=root/'config.json';config.write_text(json.dumps({'download_dir':str(root/'media')}))
v1.CONFIG_FILE=config
v1.THUMB_DIR=root/'thumbnails';v1.PLAYLIST_DIR=root/'playlists';v1.VIDEO_PRESET_DIR=root/'presets';v1.LIBRARY_ORDER_FILE=root/'order.json'
catalog=root/'catalog.json'
if (v1.BASE_DIR/'library_catalog.json').exists():shutil.copy(v1.BASE_DIR/'library_catalog.json', catalog)
v1.LIBRARY_CATALOG=v1.LibraryCatalog(catalog)
v1.PREVIEW_CACHE=v1.PreviewCache(root/'previews',v1.find_working_ffmpeg)
class Output:
 def status(self):return {'connected':False,'fullscreen':False}
v1.MAC_OUTPUT=Output()
launch.RedesignHandler.log_message=lambda *args:None
httpd=v1.ThreadedHTTPServer(('127.0.0.1',0),launch.RedesignHandler)
threading.Thread(target=httpd.serve_forever,daemon=True).start()
print('FIXTURE',root,'PORT',httpd.server_port,flush=True)
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox'])
 formats=[('4x5',1080,1350),('9x16',1080,1920),('1x1',1080,1080),('facebook_4x5',1080,1350),('facebook_16x9',1920,1080),('facebook_9x16',1080,1920),('facebook_1x1',1080,1080)]
 import subprocess
 errors=[]
 for route in ['/', '/redesign']:
  page=browser.new_page(viewport={'width':1440,'height':1050})
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(f'http://127.0.0.1:{httpd.server_port}'+route,wait_until='domcontentloaded')
  page.wait_for_function('video.readyState >= 2 && video.videoWidth > 0')
  if route=='/redesign':page.locator('.rd-nav [data-screen=capture]').click()
  else:page.locator('#captureToggle').click()
  for key,width,height in formats:
   if route=='/redesign':
    page.locator('#captureFormat + .rd-select-trigger').click()
    name=page.locator(f'#captureFormat option[value="{key}"]').inner_text()
    page.get_by_role('option',name=name,exact=True).click()
   else:page.locator('#captureFormat').select_option(key)
   page.locator('#captureDuration').fill('0.6')
   # Verify loop-join capture as well as straight exports.
   if key=='facebook_16x9':
    if route=='/redesign':
     page.locator('#captureTransition + .rd-select-trigger').click()
     page.get_by_role('option',name='Crossfade',exact=True).click()
    else:page.locator('#captureTransition').select_option('fade')
    page.locator('#captureTransitionDuration').fill('0.2')
   else:
    page.locator('#captureTransition').select_option('none',force=True)
   box=page.locator('#captureBox').bounding_box()
   assert abs(box['width']/box['height']-width/height)<0.01,(route,key,box)
   page.locator('#captureAction').click()
   page.wait_for_function('document.getElementById("captureStatus").textContent.startsWith("Saved ")',timeout=45000)
   filename=page.locator('#captureDownload').get_attribute('download')
   prefix=key if key.startswith('facebook_') else 'instagram_'+key
   assert filename.startswith(prefix+'_'),filename
   data=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-of','json',str(root/'media'/filename)]))
   assert len(data['streams'])==1,'Social clips should remain silent'
   stream=data['streams'][0]
   assert (stream['width'],stream['height'])==(width,height),(route,key,stream)
   assert stream['codec_name']=='h264'
   assert stream['r_frame_rate']=='30/1'
   assert int(stream['nb_frames'])==18
   response=page.request.get(f'http://127.0.0.1:{httpd.server_port}'+page.locator('#captureDownload').get_attribute('href'))
   assert response.status==200
   print('PASS',route,key,f'{width}x{height}',stream['nb_frames'],'frames',flush=True)
  assert len(page.request.get(f'http://127.0.0.1:{httpd.server_port}/api/videos').json())==8
  page.screenshot(path=str(report/('capture-new.png' if route=='/redesign' else 'capture-v1.png')))
  page.close()
 assert not errors,errors
 browser.close()
httpd.shutdown();httpd.server_close()
print('Both UIs: all seven formats captured, downloaded and probed successfully.',flush=True)
