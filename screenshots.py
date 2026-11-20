"""Docshots scenarios for the current illustrated user guide.

Run through docs/capture_user_guide.py for an isolated documentation session.
"""
import json
import os
from pathlib import Path

ROOT=Path(__file__).resolve().parent
MEDIA={m['index']:m['filename'] for m in json.loads((ROOT/'showcase/source-media.json').read_text())}
SLUG='version1-showcase-signal-to-spectacle-12min'
def js(code):return {'js':code}
def seek(time):return js(f'async()=>{{await setTimelinePlayhead({time},{{transitionPreview:false}});video.pause();}}')
def shot(name,caption,url='/#playlist',actions=None,**extra):
    return {'name':name,'caption':caption,'url':url,'actions':actions or [],**extra}

config={
    'base_url':os.environ.get('CLUB_DOCSHOTS_URL','http://127.0.0.1:8008'),
    'output_dir':'docs/user-guide/assets/screenshots',
    'viewport':[1440,1050],
    'default_wait':'body',
    'init_js':f'''async()=>{{
      if(typeof loadPlaylistBySlug!=='function')return;
      for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();
      if(plPlaying)stopPlaylist();
      for(let n=0;n<100&&video.readyState<2;n++)await new Promise(r=>setTimeout(r,50));
      if(captionEnabled)toggleCaption();video.pause();
      await loadPlaylistBySlug({json.dumps(SLUG)});
      if(document.body.dataset.workspace==='playlist')await setTimelinePlayhead(25,{{transitionPreview:false}});
      document.querySelectorAll('.right-col,.playlist-library-col').forEach(e=>e.scrollTop=0);
    }}'''
}

VFX_SETUP=f'''async()=>{{
 const f=document.createElement('iframe');f.style.cssText='position:absolute;left:-20000px;width:1400px;height:1000px';f.src='/';document.body.append(f);
 await new Promise(r=>f.onload=r);window.docEditor=f.contentWindow;
 for(let n=0;n<100&&docEditor.video?.readyState<2;n++)await new Promise(r=>setTimeout(r,50));
 docEditor.showVideo({json.dumps(MEDIA[24])},{{type:'cut'}},null,{{paused:true}});
 docEditor.setVfxLogo3d({{kind:'logo',backdrop:'video',skin:'chrome',motion:0,scale:.35,reflectionSource:{{filename:{json.dumps(MEDIA[17])},speed:1}},animation:{{enabled:true,path:'orbit',duration:12,spanX:.5,spanY:.4}}}});
 docEditor.setVfxState({{enabled:true,scene:4,baseEnabled:true,logoEnabled:true,intensity:.65,feedback:.2}});
 attachEditor(docEditor,docEditor.getVfxControllerIdentity().owner);
}}'''

scenarios=[
 shot('01-prepare','Prepare: private preview, video library and edit controls.','/#prepare',[seek(65),js("document.querySelector('.rd-nav [data-screen=prepare]').click()")]),
 shot('02-library','Library: newest-first sorting, combined filters and tags.','/#library'),
 shot('03-classification','Classification manager with shared tag vocabulary.','/#library',[js('openTagManager()')]),
 shot('04-cue-ranges','Prepare: named source In/Out ranges and loop preview.','/#prepare',[seek(13),js("document.querySelector('.rd-nav [data-screen=prepare]').click();document.getElementById('videoCuePanel').closest('details').open=true"),{'scroll':'#videoCuePanel'}]),
 shot('05-playlist','Playlist composition, green layout sections and purple effect cues.',actions=[seek(25)]),
 shot('06-section-edit','Edit the 24-second section without changing the earlier composition.',actions=[seek(24.01),js("document.querySelector('.right-col').scrollTop=90")]),
 shot('07-clip-settings','Whole-clip playback, source ranges, framing and colour controls.',actions=[seek(65),js("document.querySelector('.right-col').scrollTop=540")]),
 shot('08-effect-cue','A timed logo cue with appearance, reflection and motion settings.',actions=[seek(260),js("openPlaylistCueEditor(10,1);document.querySelector('#playlistCueList .playlist-cue-row:nth-child(2) details').open=true"),{'screenshot':'#playlistCueDialog'}]),
 shot('09-vfx-layers','Independent video-effect and reflective-logo layers.','/vfx',[js(VFX_SETUP)],viewport=[760,1000]),
 shot('10-camera','Motion-extraction settings with camera explicitly disconnected.','/vfx',[js(VFX_SETUP),js("document.getElementById('cameraControls').open=true"),{'screenshot':'#cameraControls'}],viewport=[760,1100]),
 shot('11-logo-appearance','3D logo orientation, material and reflection controls.','/vfx',[js(VFX_SETUP),{'scroll':'#logo3dControls'}],viewport=[760,1100]),
 shot('12-logo-motion','Path, zoom and multi-axis animation controls.','/vfx',[js(VFX_SETUP),{'screenshot':'#logoMotionControls'}],viewport=[760,1100]),
 shot('13-snake-flight','Letter wave and oblique fly-along controls.','/vfx',[js(VFX_SETUP),js("""document.querySelector('[data-dynamics="snake.enabled"]').closest('details').open=true;document.querySelector('[data-dynamics="fly.enabled"]').closest('details').open=true;document.querySelector('[data-dynamics="snake.enabled"]').closest('details').scrollIntoView()""")],viewport=[760,1100]),
 shot('14-show-builder','Show Builder: reusable model sections and brick shelf.','/#builder'),
 shot('15-generated-show','Resume a saved edition and review its complete journey.','/#builder',[{'click':'[data-builder-tab=generated]'},js(f"document.getElementById('sbResume').value={json.dumps(SLUG)};document.getElementById('sbResume').dispatchEvent(new Event('change',{{bubbles:true}}));[...document.querySelectorAll('button')].find(b=>b.textContent==='Load edition').click()"),{'wait':700}]),
 shot('16-auto-perform','Audio-reactive Auto Perform, kept offline for this documentation capture.','/#auto'),
 shot('17-social-capture','Capture: choose output format, source time, length and loop transition.','/#capture',[seek(65),js("document.querySelector('.rd-nav [data-screen=capture]').click()")]),
 shot('18-logo-render','Reusable 9:16 logo capture and restart-cycle choice.','/#prepare',[seek(260),js("document.querySelector('.rd-nav [data-screen=prepare]').click();setVfxLogo3d({orientation:'top-bottom'});prepareLogoRender()"),{'wait':500}]),
 shot('19-settings','Settings: mirror preferences, folders and Instagram connection.','/#settings'),
 shot('20-ipad-playlist','The same composition editor at iPad size.',actions=[seek(25)],viewport=[834,1194]),
 shot('21-transition-audition','Transition audition using actual neighbouring library videos.',actions=[seek(65),js("openTransitionAudition('cross-dissolve',2)"),{'wait':600},{'screenshot':'#transitionAuditionDialog'}]),
]
