"""Exercise actual timeline clicks, source switches and paused review in isolation."""
import json
from pathlib import Path
import subprocess
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent/'showcase'))
from runtime import ROOT, fixture
from playwright.sync_api import sync_playwright

v1, httpd, origin, work = fixture()
diagnose = '--diagnose' in sys.argv
errors = []
states = []
try:
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True, executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        page = browser.new_page(viewport={'width':1600,'height':1100})
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.goto(origin+'/redesign#playlist', wait_until='domcontentloaded')
        page.wait_for_function('video.readyState>=2')
        page.evaluate("loadPlaylistBySlug('version1-showcase-signal-to-spectacle-12min')")
        page.wait_for_function('plPlaylist.entries.length===29&&timelineSegments.length===29')
        # Click the body, not its transition badge. No forced seeks or manual renders.
        for index in range(7):
            page.locator(f'.timeline-clip[data-index="{index}"] .timeline-clip-label').click()
            page.wait_for_function('!video.seeking&&video.readyState>=2')
            page.wait_for_function('timelineStatus.textContent.startsWith("Clip ")') if not diagnose else page.wait_for_timeout(300)
            state=page.evaluate('''()=>({index:plPreviewIdx,time:timelineTime,currentTime:video.currentTime,paused:video.paused,
                filename:currentFilename,expected:plPlaylist.entries[plPreviewIdx].video,view:VIEW_NAMES[viewMode],
                overlay:!timelineOverlay.hidden,status:timelineStatus.textContent,clones:clones.length,
                canvas:[vfxCanvas.width,vfxCanvas.height],stage:[videoStage.clientWidth,videoStage.clientHeight],
                logo:vfxEngine?.logo3d.text,logoAspect:vfxEngine?.logoAspect,
                layers:[...videoStage.children].map(e=>({type:e.tagName,cls:e.className,hidden:e.hidden,display:getComputedStyle(e).display,
                  rect:[e.getBoundingClientRect().x,e.getBoundingClientRect().width,e.getBoundingClientRect().height],transform:getComputedStyle(e).transform}))})''')
            states.append(state)
            page.locator('.rd-preview-frame').screenshot(path=str(work/f'clip-{index+1}.png'))
            if not diagnose:
                assert state['filename']==state['expected'], state
                assert state['paused'], state
                assert not state['overlay'], state
                assert state['view']==page.evaluate(f'plPlaylist.entries[{index}].view'),state
        if not diagnose:
            # Each layout's transition audition must cover the entire stage.
            for index in range(1,7):
                page.locator(f'.timeline-clip[data-index="{index}"] .timeline-transition-chip').click()
                page.wait_for_function('!timelineOverlay.hidden&&!video.seeking&&video.paused')
                dimensions=page.evaluate('''()=>{const a=videoStage.getBoundingClientRect(),b=timelineOverlay.getBoundingClientRect();return [a.width,a.height,b.width,b.height];}''')
                assert abs(dimensions[0]-dimensions[2])<1 and abs(dimensions[1]-dimensions[3])<1,dimensions
            # A new selection must win over a still-loading transition request.
            page.evaluate('''()=>{setTimelinePlayhead(timeForTransition(2));setTimelinePlayhead(timeForTransition(3));document.querySelector('.timeline-clip[data-index="5"] .timeline-clip-label').click();}''')
            page.wait_for_function('plPreviewIdx===5&&timelineOverlay.hidden&&video.paused&&!video.seeking&&video.readyState>=2&&timelineStatus.textContent.startsWith("Clip 6")')
            page.wait_for_timeout(400)
            assert page.evaluate('timelineOverlay.hidden&&currentFilename===plPlaylist.entries[5].video&&video.paused')
            # Seek a loaded source to a specific time, then change source and
            # seek again. A late initial In-point handler must not overwrite it.
            for time in (38,73,4,42):
                page.evaluate('(t)=>setTimelinePlayhead(t,{transitionPreview:false})',time)
                result=page.evaluate('''()=>({actual:video.currentTime,expected:timelineSourceTime(plPlaylist.entries[plPreviewIdx],timelineTime-timelineSegments[plPreviewIdx].start,video.duration),paused:video.paused,seeking:video.seeking})''')
                assert abs(result['actual']-result['expected'])<.05 and result['paused'] and not result['seeking'],result
            # Change actual inspector settings and keep reviewing the same clip.
            page.evaluate('''()=>{document.getElementById('insZoom').value='.7';document.getElementById('insZoom').dispatchEvent(new Event('change',{bubbles:true}));}''')
            page.wait_for_function('tileZoom===.7&&!video.seeking')
            page.evaluate('''()=>{document.getElementById('insPanX').value='.2';document.getElementById('insPanX').dispatchEvent(new Event('change',{bubbles:true}));}''')
            page.wait_for_function('video.paused&&!video.seeking&&tileZoom===.7&&tilePanX===.2&&timelineOverlay.hidden')
            # Known solid colours expose any panel retaining the previous source.
            media=work/'media';media.mkdir()
            colours=[('red','red',0),('green','lime',1),('blue','blue',2)]
            for name,colour,channel in colours:
                subprocess.run([v1.find_working_ffmpeg(),'-v','error','-y','-f','lavfi','-i',f'color=c={colour}:size=320x180:rate=24:duration=8','-c:v','libx264','-pix_fmt','yuv420p',str(media/(name+'.mp4'))],check=True)
            v1.CONFIG_FILE.write_text(json.dumps({'download_dir':str(media)}))
            page.evaluate('''()=>{restoreTimelineVfxPreview();plPlaylist={name:'Source isolation check',entries:['red','green','blue'].map((name,i)=>({video:name+'.mp4',view:['triple','dual','six'][i],preset:1,zoom:1,loopMode:1,duration:{type:'seconds',value:8},transition:{type:'cross-dissolve',duration:2},cues:[{at:0,effect:'off'}]}))};renderPlaylistEntries();}''')
            for index,(_,_,channel) in enumerate(colours):
                page.locator(f'.timeline-clip[data-index="{index}"] .timeline-clip-label').click()
                page.wait_for_function('(channel)=>video.paused&&!video.seeking&&timelineOverlay.hidden&&clones.length>0&&clones.every(c=>{const p=c.getContext("2d").getImageData(c.width/2,c.height/2,1,1).data;return p[channel]>200&&p[(channel+1)%3]<20&&p[(channel+2)%3]<20;})',arg=channel)
            print('PASS full-frame transition previews, rapid selection, precise seeking, inspector edits and panel source colours',flush=True)
        (work/'states.json').write_text(json.dumps(states,indent=2))
        assert not errors, errors
        browser.close()
    print('PASS' if not diagnose else 'DIAGNOSIS', 'timeline review; artifacts:', work, flush=True)
finally:
    (work/'states.json').write_text(json.dumps({'states':states,'errors':errors},indent=2))
    httpd.shutdown();httpd.server_close()
