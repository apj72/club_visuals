"""Chrome checks for current-IP iPad links using temporary data and fake LAN addresses."""
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
import network_links
addresses=[{'interface':'en0','address':'192.168.2.10'},{'interface':'en1','address':'10.0.0.8'}]
network_links.local_addresses=lambda:addresses
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox'])
 errors=[]
 for path,mode in [('/classic', 'v1'),('/','default')]:
  page=browser.new_page(viewport={'width':1440,'height':1050})
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(f'http://127.0.0.1:{httpd.server_port}'+path,wait_until='domcontentloaded')
  addresses[:]=[{'interface':'en0','address':'192.168.2.10'},{'interface':'en1','address':'10.0.0.8'}]
  if page.locator('#remoteControlsToggle').get_attribute('aria-expanded')=='false':page.locator('#remoteControlsToggle').click()
  page.locator('#ipadConnect').click()
  suffix='/?remote=1' if mode=='default' else '/classic?remote=1'
  page.wait_for_function('(url)=>document.getElementById("ipadConnectionUrl").value===url',arg=f'http://192.168.2.10:{httpd.server_port}'+suffix)
  assert page.locator('#ipadLinkNetworks button').count()==2
  page.locator('#ipadLinkNetworks button').last.click()
  assert page.locator('#ipadConnectionUrl').input_value()==f'http://10.0.0.8:{httpd.server_port}'+suffix
  page.locator('#ipadLinkCopy').click()
  page.wait_for_function('document.getElementById("ipadLinkStatus").textContent.includes("copied") || document.getElementById("ipadLinkStatus").textContent.includes("selected")')
  addresses[:]=[{'interface':'en0','address':'172.16.5.9'}]
  page.locator('#ipadLinkRefresh').click()
  page.wait_for_function('(url)=>document.getElementById("ipadConnectionUrl").value===url',arg=f'http://172.16.5.9:{httpd.server_port}'+suffix)
  page.locator('#ipadLinkOtherUi').click()
  assert page.locator('#ipadConnectionUrl').input_value().endswith('/classic?remote=1' if mode=='default' else '/?remote=1')
  page.locator('#ipadLinkClose').click()
  page.evaluate('updateControlOwnership({remote:true,owner:"other-ipad"})')
  assert page.locator('#macEditorControls').evaluate('(e)=>e.inert')
  assert page.locator('#ipadConnect').is_enabled()
  if page.locator('#remoteControlsToggle').get_attribute('aria-expanded')=='false':page.locator('#remoteControlsToggle').click()
  page.locator('#ipadConnect').click()
  assert page.locator('#ipadConnectDialog').evaluate('(e)=>e.open')
  page.locator('#ipadLinkClose').click()
  page.evaluate('updateControlOwnership({remote:false,owner:null})')
  for width,height in [(1440,1050),(1194,834),(834,1194),(390,844)]:
   page.set_viewport_size({'width':width,'height':height})
   assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'),(path,width)
   if page.locator('#remoteControlsToggle').get_attribute('aria-expanded')=='false':page.locator('#remoteControlsToggle').click()
   page.locator('#ipadConnect').click()
   page.wait_for_function('document.getElementById("ipadConnectionUrl").value.length>0')
   page.screenshot(path=str(report/f'connection-{mode}-{width}.png'))
   page.locator('#ipadLinkClose').click()
  addresses.clear()
  if page.locator('#remoteControlsToggle').get_attribute('aria-expanded')=='false':page.locator('#remoteControlsToggle').click()
  page.locator('#ipadConnect').click()
  page.wait_for_function('document.getElementById("ipadLinkStatus").textContent.includes("No usable")')
  assert page.locator('#ipadConnectionUrl').input_value()==''
  assert page.locator('#ipadLinkCopy').is_disabled()
  page.locator('#ipadLinkClose').click()
  page.close()
  print('PASS',path,'generate, alternate interface, refresh, copy, UI switch, locked Mac, no network and responsive dialog',flush=True)
 assert not errors,errors
 browser.close()
httpd.shutdown();httpd.server_close()
