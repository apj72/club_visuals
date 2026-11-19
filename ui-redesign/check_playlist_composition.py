"""Preview transport rehearsals: the visible buttons must run the whole show."""
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'showcase'))
from runtime import fixture
from playwright.sync_api import sync_playwright

v1,httpd,origin,work=fixture();errors=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        page=browser.new_page(viewport={'width':1600,'height':1100});page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(origin+'/redesign#playlist',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
        page.evaluate('if(captionEnabled)toggleCaption()')
        page.evaluate("loadPlaylistBySlug('version1-showcase-signal-to-spectacle-12min')");page.wait_for_function('timelineSegments.length===29')
        def seek(time):page.evaluate('(t)=>setTimelinePlayhead(t,{transitionPreview:false})',time)
        def play():page.locator('#playBtn').click();page.wait_for_function('plPlaying&&plEntryReady')
        def pause():page.locator('#playBtn').click();page.wait_for_function('!plPlaying&&video.paused&&!timelineOverlay.hidden&&timelineStatus.textContent.startsWith("Playlist composition paused")')
        # Main transport starts at the playhead and crosses a timed layout cue.
        seek(23.7);play();page.wait_for_function('plEntryIdx===0&&viewMode===2&&timelineTime>=24',timeout=10000)
        assert page.locator('#playBtn').inner_text()=='Pause playlist'
        pause();held=page.evaluate('timelineTime');page.wait_for_timeout(350)
        assert page.evaluate('timelineTime')==held
        assert page.evaluate('plCueTimers.length===0&&viewMode===2')
        page.locator('#plPlayBtn').click();page.wait_for_function('(t)=>plPlaying&&plEntryReady&&timelineTime>=t',arg=held)
        assert page.evaluate('plEntryIdx')==0
        pause()
        assert page.locator('#logoMotionPlayBtn').is_disabled()
        page.locator('#restartVideoBtn').click();page.wait_for_function('!plPlaying&&timelineTime===0&&video.paused')
        # Resuming inside a logo cue starts the independent animation clock too.
        seek(2);play();page.wait_for_function('vfxState.logoEnabled&&vfxState.logo3d.text==="SIGNAL"&&vfxState.logo3d.animationClock.playing&&timelineTime>2.1')
        pause();assert page.evaluate('vfxState.logo3d.animationClock.playing') is False
        image_hash=page.evaluate('''()=>{const a=timelineOverlay.getContext('2d').getImageData(0,0,timelineOverlay.width,timelineOverlay.height).data;return [...a].reduce((s,v,i)=>(s+v*(i%101))%1000000007,0)}''')
        page.wait_for_timeout(350)
        assert page.evaluate('''()=>{const a=timelineOverlay.getContext('2d').getImageData(0,0,timelineOverlay.width,timelineOverlay.height).data;return [...a].reduce((s,v,i)=>(s+v*(i%101))%1000000007,0)}''')==image_hash
        page.screenshot(path=str(work/'paused-composition.png'))
        # Timed VFX Off fires while playing, rather than leaving a frozen title.
        seek(7.7);play();page.wait_for_function('timelineTime>=8&&!vfxState.enabled',timeout=10000);pause()
        # Full playlist progression selects the next source and keeps running.
        seek(31.8);play();page.wait_for_function('plPlaying&&plEntryReady&&plEntryIdx===1&&currentFilename===plPlaylist.entries[1].video',timeout=15000);pause()
        # An effect inherited from an earlier clip survives a direct jump.
        page.evaluate('''()=>{window.originalShow=JSON.parse(JSON.stringify(plPlaylist));plPlaylist={name:'Composition transport test',entries:[
          {video:originalShow.entries[0].video,view:'single',duration:{type:'seconds',value:2},transition:{type:'cut'},cues:[{at:0,effect:'text',text:'INHERITED',backdrop:'black',motion:0}]},
          {video:originalShow.entries[2].video,view:'dual',duration:{type:'seconds',value:3},transition:{type:'pixel-scatter',duration:1.2},cues:[]}]};renderPlaylistEntries();}''')
        seek(2.4);play();page.wait_for_function('plPlaying&&plEntryIdx===1&&vfxState.logoEnabled&&vfxState.logo3d.text==="INHERITED"')
        assert page.evaluate('video.currentTime')<.05
        page.wait_for_function('!pixelHolding&&!video.paused',timeout=10000)
        pause();assert page.evaluate('timelineTime')>2.4
        # A normal ending holds the final composition; Play then replays from 0.
        page.evaluate('plPlaylist=originalShow;renderPlaylistEntries()');seek(719.7);play()
        page.wait_for_function('!plPlaying&&video.paused&&timelineTime>=720&&!timelineOverlay.hidden',timeout=15000)
        assert page.evaluate('''()=>{const a=timelineOverlay.getContext('2d').getImageData(0,0,timelineOverlay.width,timelineOverlay.height).data;return ![...a].some((v,i)=>i%4!==3&&v>15);}''')
        play();assert page.evaluate('plEntryIdx')==0;pause()
        page.locator('.rd-nav [data-screen=prepare]').click()
        assert page.locator('#playBtn').inner_text()=='Play'
        assert not errors,errors
        browser.close()
    print('PASS main/sidebar transport, playhead resume, layout/VFX cues, frozen pause, clip progression, inherited effects, pixel-scatter resume and black ending. Artifacts:',work,flush=True)
finally:
    httpd.shutdown();httpd.server_close()
