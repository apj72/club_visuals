"""Create three portable studies with the app's actual canvas/WebGL processing.

Reads originals. Writes only new showcase assets; never opens a physical input or
contacts the running playout server. Requires developer Playwright and Chrome.
"""
import json
from pathlib import Path
import subprocess
import sys
import threading
import tempfile
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'ui-redesign'))
import launch
from playwright.sync_api import sync_playwright
v1=launch.v1
work=ROOT/'.runtime'/'showcase-work';work.mkdir(parents=True,exist_ok=True)
fixture=Path(tempfile.mkdtemp(prefix='club-showcase-render-'))
for name in ('thumbs','playlists','presets','previews'):(fixture/name).mkdir()
config=fixture/'config.json';config.write_text(json.dumps({'download_dir':str(ROOT/'downloads')}))
v1.CONFIG_FILE=config;v1.THUMB_DIR=fixture/'thumbs';v1.PLAYLIST_DIR=fixture/'playlists';v1.VIDEO_PRESET_DIR=fixture/'presets'
v1.LIBRARY_CATALOG=v1.LibraryCatalog(fixture/'catalog.json');v1.LIBRARY_ORDER_FILE=fixture/'order.json';v1.VIDEO_CUES=v1.VideoCues(fixture/'cues');v1.PREVIEW_CACHE=v1.PreviewCache(fixture/'previews',v1.find_working_ffmpeg)
launch.SHOW_LIBRARY=launch.ShowLibrary(fixture/'models.json')
class Output:
    def status(self):return {'connected':False,'fullscreen':False}
v1.MAC_OUTPUT=Output();launch.RedesignHandler.log_message=lambda *args:None
httpd=v1.ThreadedHTTPServer(('127.0.0.1',0),launch.RedesignHandler);threading.Thread(target=httpd.serve_forever,daemon=True).start()
media={m['index']:m['filename'] for m in json.loads((ROOT/'showcase/source-media.json').read_text())}
jobs=[{'kind':'colour','seconds':32,'source':media[7],'filename':'version1_showcase_colour_and_trails.mp4'},
      {'kind':'motion','seconds':32,'source':media[24],'movement':media[10],'filename':'version1_showcase_recorded_motion.mp4'},
      {'kind':'ripple','seconds':16,'source':media[17],'filename':'version1_showcase_ripple_study.mp4'}]
results=[]
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding'],downloads_path=str(work))
        for job in jobs:
            target=ROOT/'downloads'/job['filename']
            if target.exists():
                print('Keeping existing showcase asset',target.name,flush=True);results.append(job);continue
            page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
            page.goto(f'http://127.0.0.1:{httpd.server_port}/',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
            page.add_script_tag(path=str(ROOT/'showcase'/'render_studies.js'))
            print('Rendering',job['kind'],job['seconds'],'seconds',flush=True)
            with page.expect_download(timeout=90000) as pending:
                page.evaluate('(job)=>{window.studyPromise=renderShowcaseStudy(job);return true;}',job)
            raw=work/(job['kind']+'.webm');pending.value.save_as(str(raw))
            if errors:raise RuntimeError(errors)
            subprocess.run([v1.find_working_ffmpeg(),'-v','error','-y','-i',str(raw),'-an','-vf','fps=30,tpad=stop_mode=clone:stop_duration=1','-t',str(job['seconds']),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(target)],check=True)
            info={'channel':'VERSION1 Showcase','uploader':'VERSION1','duration':job['seconds'],'description':'App-rendered showcase study. '+('Recorded movement from an existing library clip processed by CameraMotion.Processor; this is replay, not a live camera capture.' if job['kind']=='motion' else 'Created with Club Visuals colour/trails or ripple renderer.'),'showcaseSources':{k:v for k,v in job.items() if k in ('source','movement')}}
            target.with_suffix('.info.json').write_text(json.dumps(info,indent=2))
            result=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration:stream=width,height','-of','json',str(target)]))
            assert abs(float(result['format']['duration'])-job['seconds'])<.05
            print('Saved',target.name,target.stat().st_size,'bytes',flush=True);results.append(job);page.close()
        browser.close()
    (work/'studies.json').write_text(json.dumps(results,indent=2))
finally:
    httpd.shutdown();httpd.server_close()
