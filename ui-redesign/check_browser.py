"""Optional Chrome integration check using temporary metadata and read-only media links.

Requires the developer-only playwright Python package and Google Chrome.
No live server is contacted. Fixtures and screenshots remain in the printed
system temporary directory for inspection. Run: python3 ui-redesign/check_browser.py
"""
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
 page=browser.new_page(viewport={'width':1440,'height':1050})
 errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
 origin=f'http://127.0.0.1:{httpd.server_port}'
 page.goto(origin+'/redesign',wait_until='domcontentloaded');page.wait_for_timeout(1800)
 print('ERRORS',errors,flush=True)
 print('heading',page.locator('.rd-workspace-title').inner_text(),flush=True)
 print('cards',page.locator('.library-item').count(),flush=True)
 page.screenshot(path=str(report/'prepare.png'))
 for key in ['playlist','library','auto','capture','settings','prepare']:
  page.locator(f'.rd-nav [data-screen={key}]').click();page.wait_for_timeout(350)
  page.screenshot(path=str(report/f'{key}.png'))

  print(key,page.evaluate('({screen:document.body.dataset.workspace, width:document.documentElement.scrollWidth, height:document.documentElement.scrollHeight})'),flush=True)

 page.locator('.rd-nav [data-screen=prepare]').click()

 if not page.evaluate('video.paused'):page.locator('#playBtn').click()
 page.locator('#playBtn').click();page.wait_for_timeout(200)
 assert page.evaluate('video.paused') is False
 page.locator('#playBtn').click()
 for mode, expected in [(1,8),(2,16),(3,16),(4,32)]:
  page.evaluate(f'setLayout({mode})');page.wait_for_timeout(350)
  assert page.locator('.rd-pattern').count()==expected, (mode,page.locator('.rd-pattern').count())
  page.locator('.rd-pattern').last.click()
  assert page.evaluate('configIdx + 1')==int(page.locator('.rd-pattern').last.get_attribute('aria-label').split()[-1])
 page.evaluate('setLayout(0)')
 page.locator('.rd-nav [data-screen=settings]').click()
 page.locator('.rd-pattern-settings details').first.locator('summary').click()
 page.locator('.rd-preference input').first.check()
 assert page.evaluate('JSON.parse(localStorage.clubRedesignFeaturedPatterns)[1].length')==1
 page.locator('.rd-nav [data-screen=prepare]').click()
 page.evaluate('setLayout(1)');page.wait_for_timeout(350)
 assert page.locator('.rd-pattern').count()<=2
 page.get_by_role('button',name='Show all patterns',exact=True).click()
 assert page.locator('.rd-pattern').count()==8
 page.locator('.rd-nav [data-screen=library]').click()
 page.locator('#catalogSearch').fill('this-does-not-exist')
 assert page.locator('.library-item:visible').count()==0
 page.locator('#catalogClear').click()
 assert page.locator('.library-item:visible').count()==8
 page.locator('.catalog-edit').first.click()
 assert page.locator('.catalog-dialog').evaluate('(d)=>d.open')
 page.wait_for_function('catalogueEditingRevision!==null&&!document.getElementById("catalogEditReviewed").disabled')
 page.locator('#catalogEditReviewed').check()
 page.locator('#catalogEditNotes').fill('temporary browser integration check')
 page.locator('#catalogSave').click();page.wait_for_timeout(300)
 assert 'temporary browser integration check' in catalog.read_text()
 page.locator('.rd-nav [data-screen=playlist]').click()
 page.locator('#timelineAddCurrent').click();page.wait_for_timeout(350)
 assert page.evaluate('plPlaylist.entries.length')==1
 page.locator('#plName').fill('Reskin browser check')
 page.locator('button[onclick="savePlaylist()"]').click();page.wait_for_timeout(500)
 assert len(list((root/'playlists').glob('*.json')))==1
 page.locator('#insDurationValue').fill('9');page.locator('#insDurationValue').dispatch_event('change')
 assert page.evaluate('plPlaylist.entries[0].duration.value')==9
 page.locator('#insCues').click();assert page.locator('#playlistCueDialog').evaluate('(d)=>d.open')
 page.evaluate('closePlaylistCueEditor()')
 page.locator('.rd-nav [data-screen=prepare]').click()
 page.get_by_text('Saved layouts',exact=True).click()
 page.locator('#videoPresetName').fill('Reskin saved layout')
 page.get_by_role('button',name='Save layout',exact=True).click();page.wait_for_timeout(500)
 assert len(list((root/'presets').glob('*.json')))==1

 page.locator('.rd-nav [data-screen=library]').click()
 trigger=page.locator('#catalogReview + .rd-select-trigger')
 trigger.click();page.get_by_role('option',name='Reviewed',exact=True).click()
 assert page.locator('#catalogReview').input_value()=='reviewed'
 assert page.locator('.library-item:visible').count()>=1
 page.locator('#catalogClear').click()
 page.locator('.catalog-edit').first.click()
 page.locator('#catalogPickThemes + .rd-select-trigger').click()
 assert page.locator('.rd-select-menu').evaluate('(e)=>e.closest("dialog") !== null')
 page.keyboard.press('Escape');page.locator('#catalogCancel').click()
 page.locator('.rd-nav [data-screen=prepare]').click()
 page.locator('summary').filter(has_text='Colour, VFX').click()
 with page.expect_popup() as opened:page.locator('#vfxBtn').click()
 popup=opened.value;popup.wait_for_load_state('domcontentloaded')
 assert '/vfx' in popup.url
 popup.close()
 page.set_viewport_size({'width':834,'height':1194})
 page.locator('.rd-inspector-toggle').click()
 assert page.locator('.rd-inspector').is_visible()
 page.screenshot(path=str(report/'ipad-controls.png'))
 page.locator('.rd-inspector-toggle').click()

 page.locator('.rd-nav [data-screen=playlist]').click()
 page.get_by_text('Browse transitions',exact=True).click()
 page.get_by_role('searchbox',name='Search transitions',exact=True).fill('shutters')
 assert page.locator('.pl-transition-tool:visible').count()==1
 page.get_by_role('searchbox',name='Search transitions',exact=True).fill('')

 # Focus must preview every registry entry without selecting or applying it.
 before=page.evaluate('JSON.stringify({playlist:plPlaylist,filename:currentFilename,config:configIdx,armed:plPaletteArmed,type:plPaletteType})')
 page.evaluate("document.querySelectorAll('.pl-transition-category').forEach(e=>e.open=true)")
 transition_types=page.evaluate('Object.entries(TRANSITION_NAMES)')
 for transition_type, transition_name in transition_types:
  tool=page.get_by_role('button',name='Select '+transition_name+' transition',exact=True)
  tool.focus()
  page.wait_for_function('(type)=>document.querySelector(".rd-transition-preview").dataset.transition===type',arg=transition_type)
  page.wait_for_function('()=>!document.querySelector(".rd-transition-preview-status").textContent.includes("Loading") && (document.querySelector(".rd-transition-preview-status").textContent.includes(" · ") || document.querySelector(".rd-transition-preview-status").textContent.includes("Using Cross Dissolve"))')
  assert page.locator('.rd-transition-preview-name').inner_text()==transition_name
  if transition_type in ['shutters','liquid-chrome']:
   page.wait_for_timeout(400)
   page.screenshot(path=str(report/f'transition-{transition_type}.png'))
 after=page.evaluate('JSON.stringify({playlist:plPlaylist,filename:currentFilename,config:configIdx,armed:plPaletteArmed,type:plPaletteType})')
 assert before==after,'Focus preview altered editor or playlist state'
 page.locator('.rd-nav [data-screen=prepare]').click()
 assert page.locator('.rd-transition-preview').get_attribute('data-playing')=='false'
 print('ALL',len(transition_types),'FOCUS PREVIEWS passed',flush=True)
 page.emulate_media(reduced_motion='reduce')
 page.locator('.rd-nav [data-screen=playlist]').click()
 page.get_by_role('button',name='Select Shutters transition',exact=True).focus()
 page.wait_for_function('()=>document.querySelector(".rd-transition-preview-status").textContent.includes("Reduced motion")')
 assert page.locator('.rd-transition-preview').get_attribute('data-playing')=='false'
 page.get_by_role('button',name='Replay example',exact=True).click()
 page.wait_for_function('()=>document.querySelector(".rd-transition-preview-status").textContent.includes("Shutters")')
 page.emulate_media(reduced_motion='no-preference')
 page.evaluate('updateControlOwnership({remote:true,owner:"test-ipad"})')
 assert page.locator('#macEditorControls').evaluate('(e)=>e.inert')
 assert page.locator('#controlReturn').is_visible()
 page.evaluate('updateControlOwnership({remote:false,owner:null})')
 original_ids=page.evaluate('[...document.querySelectorAll("[id]")].map(e=>e.id)')
 assert len(original_ids)==len(set(original_ids)), 'duplicate DOM IDs'
 print('WORKFLOWS passed',flush=True)


 for width,height in [(1440,1050),(1194,834),(834,1194),(390,844)]:
  page.set_viewport_size({'width':width,'height':height})
  for key in ['prepare','playlist','library','auto','capture','settings']:
   page.locator(f'.rd-nav [data-screen={key}]').click();page.wait_for_timeout(150)
   overflow=page.evaluate('document.documentElement.scrollWidth > innerWidth')
   assert not overflow,(width,key,'horizontal overflow')
   page.screenshot(path=str(report/f'{width}-{key}.png'))
  print('VIEWPORT',width,height,'passed',flush=True)
 print('ERRORS final',errors,flush=True)
 assert not errors,errors

 browser.close()
httpd.shutdown();httpd.server_close()
