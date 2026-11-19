"""Edit the real showcase's timed changes without touching the user's edition."""
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'showcase'))
from runtime import ROOT,fixture
from playwright.sync_api import sync_playwright

v1,httpd,origin,work=fixture();errors=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        page=browser.new_page(viewport={'width':1600,'height':1100});page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(origin+'/redesign#playlist',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
        slug='version1-showcase-signal-to-spectacle-12min'
        page.evaluate('(s)=>loadPlaylistBySlug(s)',slug);page.wait_for_function('timelineSegments.length===29')
        before=page.evaluate('JSON.parse(JSON.stringify(plPlaylist.entries[0]))')
        assert page.locator('.timeline-clip[data-index="0"] .layout-event').count()==3
        assert page.locator('.timeline-clip[data-index="0"] .effect-event').count()==2
        def settled():page.wait_for_function('video.paused&&!video.seeking&&video.readyState>=2&&timelineOverlay.hidden')
        def change(control,value):
            page.locator(control).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("change",{bubbles:true}));}',str(value));settled()
        def choose(control,value):
            select=page.locator(control);label=select.evaluate('(e,v)=>[...e.options].find(o=>o.value===v).textContent',value)
            select.locator('..').locator('.rd-select-trigger').click();page.locator('.rd-select-menu:visible').get_by_role('option',name=label,exact=True).click();settled()
        # Edit the exact 24-second event, not the clip's initial layout.
        page.locator('.timeline-clip[data-index="0"] .layout-event[data-at="24"]').click();settled()
        assert page.locator('#insView').input_value()=='triple'
        choose('#insView','dual');page.wait_for_function('viewMode===1')
        choose('#insView','quad');page.wait_for_function('viewMode===3')
        assert page.evaluate('plPlaylist.entries[0].view')=='single'
        assert page.evaluate('plPlaylist.entries[0].layoutCues.find(c=>c.at===24).view')=='quad'
        page.locator('#insUpright').click();settled()
        assert page.evaluate('configIdx===0&&clones.every(c=>!c.style.transform.includes("-1"))')
        assert page.locator('#insPatternPreview .ins-pattern-tile').count()==4
        change('#insHue','90');page.wait_for_function('currentEffects.hueRotate===90')
        change('#insPanY','.25');page.wait_for_function('tilePanY===.25')
        page.screenshot(path=str(work/'editing-24-seconds.png'))
        # Other sections retain their own values; scrubbing selects active settings.
        page.evaluate('()=>setTimelinePlayhead(13,{transitionPreview:false})');settled()
        assert page.evaluate('currentEffects.hueRotate===0&&tileZoom===.7')
        assert page.locator('#insChangeSelect').input_value()=='12'
        change('#insZoom','.55');page.wait_for_function('tileZoom===.55')
        assert page.evaluate('plPlaylist.entries[0].zoom')==before['zoom']
        # Add a new event, exercise real playback through it, then remove it.
        page.evaluate('()=>setTimelinePlayhead(20,{transitionPreview:false})');settled();page.locator('#insAddChange').click();settled()
        choose('#insView','dual');choose('#insTrails','true');change('#insTrailAmount','.3')
        page.evaluate('()=>startPlaylist(19.8)');page.wait_for_function('plPlaying&&viewMode===1&&trailsEnabled&&trailAmount===.3',timeout=10000)
        page.evaluate('stopPlaylist()')
        page.evaluate('()=>setTimelinePlayhead(20.01,{transitionPreview:false})');settled();page.locator('#insRemoveChange').click();settled()
        assert page.evaluate('plPlaylist.entries[0].layoutCues.some(c=>c.at===20)') is False
        page.locator('.timeline-clip[data-index="0"] .layout-event[data-at="24"]').click();settled();change('#insChangeAt','26')
        assert page.evaluate('plPlaylist.entries[0].layoutCues.some(c=>c.at===26&&c.view==="quad")')
        assert page.locator('#insChangeSelect').input_value()=='26'
        # Single-panel orientation must agree with its preview diagram too.
        page.evaluate('()=>setTimelinePlayhead(13,{transitionPreview:false})');settled();choose('#insPreset','4')
        assert page.evaluate('viewMode===0&&clones[0].style.transform.includes("scaleY(-1)")')
        page.locator('#insUpright').click();settled()
        assert page.evaluate('!clones[0].style.transform.includes("-1")')
        change('#insSpeed','.8');assert page.evaluate('plPlaylist.entries[0].speed')==.8
        choose('#insMuted','true');assert page.evaluate('plPlaylist.entries[0].muted&&video.muted')
        # The effect block opens its actual cue, including the full logo editor.
        page.locator('.timeline-clip[data-index="0"] .effect-event').first.click();page.locator('#playlistCueDialog').wait_for(state='visible')
        row=page.locator('#playlistCueList .playlist-cue-row').nth(1)
        row.locator('[data-appearance-field]').evaluate('e=>{for(let p=e;p;p=p.parentElement)if(p.tagName==="DETAILS")p.open=true;}')
        row.locator('[data-look=text]').fill('MY SIGNAL');row.locator('[data-look=text]').press('Tab')
        page.get_by_role('button',name='Done',exact=True).click();settled()
        assert page.evaluate('plPlaylist.entries[0].cues.some(c=>c.text==="MY SIGNAL")')
        # Mirror and camera settings that were previously absent are editable.
        page.evaluate('()=>openPlaylistCueEditor(8)');page.locator('[data-cue-field=depth]').fill('.9');page.locator('[data-cue-field=depth]').press('Tab');page.get_by_role('button',name='Done',exact=True).click();settled()
        assert page.evaluate('plPlaylist.entries[8].cues.some(c=>c.effect==="mirror"&&c.depth===.9)')
        page.evaluate('''()=>{plPlaylist.entries[0].cues.push(normalisePlaylistCue({at:30,effect:'camera'}));openPlaylistCueEditor(0);}''')
        change_camera=page.locator('[data-cue-field="cameraMotion.delay"]');change_camera.fill('1.5');change_camera.press('Tab')
        page.get_by_role('button',name='Done',exact=True).click();settled()
        assert page.evaluate('plPlaylist.entries[0].cues.at(-1).cameraMotion.delay')==1.5
        page.evaluate('plNameInput.value="Timeline editing regression";savePlaylist()')
        saved=json.loads((work/'playlists'/f'{slug}.json').read_text())
        assert saved['entries'][0]['layoutCues'][0]['zoom']==.55
        assert saved['entries'][0]['layoutCues'][1]['at']==26
        assert saved['entries'][0]['layoutCues'][1]['effects']['hueRotate']==90
        page.evaluate('(s)=>loadPlaylistBySlug(s)',slug);page.wait_for_function('timelineSegments.length===29')
        page.evaluate('()=>setTimelinePlayhead(27,{transitionPreview:false})');settled()
        assert page.evaluate('viewMode===3&&configIdx===0&&currentEffects.hueRotate===90&&tilePanY===.25')
        page.set_viewport_size({'width':834,'height':1194});page.locator('.timeline-clip[data-index="0"]').scroll_into_view_if_needed();page.screenshot(path=str(work/'timeline-ipad.png'))
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
        assert not errors,errors
        browser.close()
    print('PASS timed sections, orientation, colour, add/move/remove, playback, full cue editing, save/reload and iPad. Artifacts:',work,flush=True)
finally:
    httpd.shutdown();httpd.server_close()
