"""Mocked Instagram cookie imports in both UIs. Does not access browser cookies or Keychain."""
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
import instagram_auth, time
v1.COOKIE_JAR=root/'cookies.txt'
exports=[]
def fake_export(path,browser,profile,password):
 exports.append((browser,profile,password))
 if browser=='brave':return False,'No usable Instagram login cookie was exported from Brave (default profile).'
 expiry=int(time.time())+3600
 Path(path).write_text(f'# Netscape HTTP Cookie File\n.instagram.com\tTRUE\t/\tTRUE\t{expiry}\tsessionid\tfixture-session\n')
 return True,''
instagram_auth.export_cookies=fake_export
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox'])
 errors=[]
 for path in ['/classic', '/']:
  page=browser.new_page(viewport={'width':1440,'height':1050})
  page.on('pageerror',lambda error:errors.append(str(error)))
  page.goto(f'http://127.0.0.1:{httpd.server_port}'+path,wait_until='domcontentloaded')
  if path=='/':
   page.locator('.rd-nav [data-screen=library]').click()
   page.locator('#instagramDownloadAccess').click()
  page.locator('#connBtn').click()
  assert page.locator('#cookieBrowser').input_value()=='chrome'
  page.locator('#cookieProfile').fill('Profile 1')
  page.get_by_role('button',name='Refresh without password',exact=True).click()
  page.wait_for_function('document.getElementById("connResult").textContent.includes("imported from Chrome")')
  assert exports[-1]==('chrome','Profile 1',None)
  assert json.loads(config.read_text())['instagram_cookie_profile']=='Profile 1'
  assert 'session not verified' in page.locator('#connLabel').inner_text()
  page.evaluate("document.getElementById('connPanel').classList.add('visible')")
  page.locator('#cookieBrowser').select_option('brave',force=True)
  page.locator('#cookieProfile').fill('')
  page.get_by_role('button',name='Refresh without password',exact=True).click()
  page.wait_for_function('document.getElementById("connResult").textContent.startsWith("No usable Instagram login cookie")')
  assert exports[-1]==('brave','',None)
  assert 'No usable' in page.locator('#connResult').inner_text()
  page.screenshot(path=str(report/('instagram-new.png' if path=='/redesign' else 'instagram-v1.png')))
  # Restore the next test's default preference; all changes are in fixtures.
  data=json.loads(config.read_text());data['instagram_cookie_browser']='chrome';data['instagram_cookie_profile']='';config.write_text(json.dumps(data))
  page.close()
  print('PASS',path,'Chrome default, explicit profile, saved-cookie status and actionable Brave failure',flush=True)
 assert not errors,errors
 browser.close()
httpd.shutdown();httpd.server_close()
