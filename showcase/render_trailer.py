"""Record the short native-player showcase edition; preserve the running output."""
import json
from pathlib import Path
import subprocess
from runtime import ROOT,fixture
from playwright.sync_api import sync_playwright
v1,httpd,origin,work=fixture();target=ROOT/'downloads'/'version1_showcase_signal_to_spectacle_trailer.mp4'
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required','--disable-background-timer-throttling','--disable-renderer-backgrounding'])
        page=browser.new_page(viewport={'width':1440,'height':1050});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(origin+'/redesign#playlist',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
        page.evaluate("document.getElementById('playlistPreviewAspect').value='16:9';document.getElementById('playlistPreviewAspect').dispatchEvent(new Event('change',{bubbles:true}));plLoopPlaylist=false")
        page.add_script_tag(path=str(ROOT/'showcase'/'render_trailer.js'))
        print('Recording the 84-second native showcase trailer',flush=True)
        with page.expect_download(timeout=150000) as pending:page.evaluate('()=>{window.trailerPromise=recordShowcaseTrailer();return true;}')
        raw=ROOT/'.runtime/showcase-work/showcase-trailer.webm';pending.value.save_as(str(raw))
        assert not errors,errors
        assert not page.evaluate('window.trailerRenderError'),page.evaluate('window.trailerRenderError')
        duration=float(json.loads(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(raw)]))['format']['duration'])
        factor=84/duration
        temporary=ROOT/'.runtime/showcase-work/showcase-trailer.mp4'
        subprocess.run([v1.find_working_ffmpeg(),'-v','error','-y','-i',str(raw),'-an','-vf',f'setpts=PTS*{factor:.12f},fps=30','-t','84','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-movflags','+faststart',str(temporary)],check=True)
        assert not target.exists(),'A trailer already exists; retaining it instead of overwriting.'
        temporary.replace(target)
        target.with_suffix('.info.json').write_text(json.dumps({'channel':'VERSION1 Showcase','uploader':'VERSION1','duration':84,'description':'84-second review trailer for From Signal to Spectacle. Recorded with the native Club Visuals player, including its VFX, logo, transitions and recorded-input studies. Silent: supply music separately.'},indent=2))
        streams=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(target)]))
        video=next(s for s in streams['streams'] if s['codec_type']=='video');assert (video['width'],video['height'])==(1280,720)
        assert abs(float(streams['format']['duration'])-84)<.05
        end=subprocess.check_output([v1.find_working_ffmpeg(),'-v','error','-ss','83.5','-i',str(target),'-vf','scale=160:90','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','pipe:1'])
        assert max(end)<20,'Trailer should finish in black.'
        (ROOT/'showcase'/'trailer-verification.json').write_text(json.dumps({'file':target.name,'seconds':84,'width':1280,'height':720,'nativeRecordingSeconds':duration,'blackEnding':True,'errors':errors},indent=2))
        browser.close();print('Saved trailer:',target,'bytes',target.stat().st_size,flush=True)
finally:
    httpd.shutdown();httpd.server_close()
