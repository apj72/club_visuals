"""Verify the directed edition and capture representative app-rendered stills."""
import base64
import concurrent.futures
import json
from pathlib import Path
import subprocess
from runtime import ROOT,fixture
from playwright.sync_api import sync_playwright
main=json.loads((ROOT/'showcase/version1-showcase-signal-to-spectacle-12min.json').read_text())
manifest=json.loads((ROOT/'showcase/manifest.json').read_text())
assert sum(e['duration']['value'] for e in main['entries'])==720
assert len(main['generation']['sections'])==7 and len(main['entries'])==29
files=set();references=set()
for entry in main['entries']:
    files.add(entry['video']);duration=entry['duration']['value']
    assert entry['transition']['duration']<=duration
    assert all(0<=c['at']<=duration for c in entry['cues'])
    assert all(0<c['at']<duration for c in entry['layoutCues'])
    for c in entry['cues']:
        for obj in [c,c.get('logoLayer',{})]:
            if obj.get('reflectionSource',{}).get('filename'):references.add(obj['reflectionSource']['filename'])
def probe(name):
    path=ROOT/'downloads'/name;assert path.is_file(),name
    value=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=codec_type,width,height','-of','json',str(path)]))
    assert any(s.get('width',0)>0 for s in value['streams']);return name,float(value['format']['duration'])
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:lengths=dict(pool.map(probe,files|references))
for e in main['entries']:
    if e.get('sourceRange'):assert 0<=e['sourceRange']['start']<e['sourceRange']['end']<=lengths[e['video']]+.01
assert main['entries'][-1]['video']==manifest['assets']['black']
print('PASS source files, references, source ranges and exact 12-minute structure',flush=True)
v1,httpd,origin,work=fixture();stills=ROOT/'showcase'/'stills';stills.mkdir(exist_ok=True)
errors=[];report=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        page=browser.new_page(viewport={'width':1440,'height':1050});page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(origin+'/redesign#playlist',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
        page.evaluate("captionEnabled=false;document.getElementById('playlistPreviewAspect').value='16:9';document.getElementById('playlistPreviewAspect').dispatchEvent(new Event('change',{bubbles:true}));loadPlaylistBySlug('version1-showcase-signal-to-spectacle-12min')")
        page.wait_for_function('plPlaylist.entries.length===29&&timelineSegments.length===29')
        checkpoints=[];total=0
        hero={0:4,6:18,8:18,13:8,15:13,17:9,28:12};hero_names={0:'01-signal',6:'02-refraction',8:'03-matter',13:'04-identity',15:'05-human',17:'06-singularity',28:'07-home'}
        for i,e in enumerate(main['entries']):
            points=[hero.get(i,e['duration']['value']/2)]
            for j,c in enumerate(e['cues']):
                if c['effect']=='off':continue
                end=next((v['at'] for v in e['cues'][j+1:] if v['at']>c['at']),e['duration']['value'])
                if end-c['at']>.2:points.append(c['at']+(end-c['at'])/2)
            for local in sorted(set(points)):checkpoints.append((i,total+local,local))
            total+=e['duration']['value']
        for number,(i,time,local) in enumerate(checkpoints):
            page.evaluate('(time)=>setTimelinePlayhead(time)',time)
            page.wait_for_function('!video.seeking&&video.readyState>=2')
            # Source load's initial seek completes separately; seek again on the settled source.
            page.evaluate('(time)=>setTimelinePlayhead(time)',time)
            page.wait_for_function('!video.seeking&&video.readyState>=2')
            page.wait_for_function('!vfxState.enabled||!VfxEngine.logoEnabled(vfxState)||vfxEngine?.logoSurfaceReady')
            page.wait_for_function('!vfxState.logo3d.reflectionSource?.filename||reflectionVideo.frame()!==null')
            frame=page.evaluate('''()=>{
              if(vfxState.enabled)renderVfxFrame();
              const c=document.createElement('canvas');c.width=1280;c.height=720;drawCompositeFrame(c,c.getContext('2d'),true,false,false);
              const p=c.getContext('2d').getImageData(0,0,1280,720).data;let light=0;for(let i=0;i<p.length;i+=16)if(p[i]+p[i+1]+p[i+2]>30)light++;
              return {image:c.toDataURL('image/jpeg',.9).split(',')[1],light,scene:vfxState.scene,enabled:vfxState.enabled,fly:vfxEngine?.lastLogoDynamics,view:VIEW_NAMES[viewMode],glError:vfxEngine?.gl.getError()||0};
            }''')
            assert frame['glError']==0,(i,local,frame['glError'])
            expected_exit=bool(frame.get('fly',{}).get('flyEnabled')) and frame.get('fly',{}).get('progress',0)>.95
            if not frame['light'] and not expected_exit:
                (stills/'failed-checkpoint.jpg').write_bytes(base64.b64decode(frame['image']))
                print('FAILED STATE',page.evaluate('({filename:currentFilename,time:video.currentTime,videoWidth:video.videoWidth,vfx:vfxState,ready:vfxFrameReady,stage:[videoStage.clientWidth,videoStage.clientHeight],canvas:[vfxCanvas.width,vfxCanvas.height]})'),flush=True)
            assert frame['light']>0 or expected_exit,(i,local,'Unexpected blank checkpoint',frame.get('fly'))
            if i in hero and local==hero[i]:(stills/(hero_names[i]+'.jpg')).write_bytes(base64.b64decode(frame['image']))
            report.append({'clip':i+1,'time':time,'view':frame['view'],'scene':frame['scene'],'litSamples':frame['light']})
            if number%12==0:print('Checked',number+1,'/',len(checkpoints),flush=True)
        page.evaluate('()=>setTimelinePlayhead(719)');page.wait_for_function('!video.seeking&&video.readyState>=2')
        black=page.evaluate("()=>{renderVfxFrame();const c=document.createElement('canvas');c.width=320;c.height=180;drawCompositeFrame(c,c.getContext('2d'),true,false,false);return [...c.getContext('2d').getImageData(0,0,320,180).data].filter((v,i)=>i%4!==3&&v>15).length;}")
        assert black==0,black
        page.evaluate('()=>startPlaylist(719.6)');page.wait_for_function('!plPlaying&&video.paused',timeout=10000)
        assert page.evaluate("currentFilename==='version1_showcase_black_stage.mp4'")
        # Confirm the edition can be resumed in Show Builder, retaining its chapter journey.
        page.goto(origin+'/redesign#builder',wait_until='domcontentloaded');page.locator('#sbGenerate').wait_for();page.locator('[data-builder-tab=generated]').click()
        page.locator('#sbResume').evaluate('(s)=>{s.value="version1-showcase-signal-to-spectacle-12min";s.dispatchEvent(new Event("change",{bubbles:true}));}')
        page.get_by_role('button',name='Load edition',exact=True).click()
        page.wait_for_function('document.querySelectorAll(".sb-summary strong").length===4')
        assert '12:00' in page.locator('.sb-summary').inner_text()
        assert not errors,errors
        browser.close()
    (ROOT/'showcase'/'verification.json').write_text(json.dumps({'checkpoints':report,'sourceCount':len(files),'reflectionSources':len(references),'runtime':720,'blackEnding':True,'errors':errors},indent=2))
    print('PASS all native checkpoints, black ending and Show Builder resume. Artifacts:',work,flush=True)
finally:
    httpd.shutdown();httpd.server_close()
