"""Check source-border cropping and containment of inspector panel numbers."""
import base64
import io
import json
from pathlib import Path
import sys
from PIL import Image
sys.path.insert(0,str(Path(__file__).resolve().parent.parent/'showcase'))
from runtime import fixture
from playwright.sync_api import sync_playwright

v1,httpd,origin,work=fixture();errors=[]
def seam(image):
    image=image.convert('RGB');w,h=image.size
    # The source's black edge runs through the entire join. Count dark samples
    # in the two centre columns, avoiding captions and the frame's outer edges.
    return sum(sum(image.getpixel((x,y)))<30 for y in range(h//5,4*h//5) for x in (w//2-1,w//2))/(2*(4*h//5-h//5))
def join_ratio(image):
    image=image.convert('RGB');w,h=image.size
    def light(columns):return sum(sum(image.getpixel((x,y))) for y in range(h//5,4*h//5) for x in columns)/len(columns)
    return light((w//2-1,w//2))/max(1,light((w//2-5,w//2-4,w//2+3,w//2+4)))

try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
        page=browser.new_page(viewport={'width':1600,'height':1100});page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(origin+'/redesign#playlist',wait_until='domcontentloaded');page.wait_for_function('video.readyState>=2')
        page.evaluate("if(captionEnabled)toggleCaption();loadPlaylistBySlug('version1-showcase-signal-to-spectacle-12min')")
        page.wait_for_function('timelineSegments.length===29')
        page.evaluate("plPlaylist.entries[2].view='dual';plPlaylist.entries[2].preset=3;renderPlaylistEntries()")
        page.evaluate('()=>setTimelinePlayhead(64.2,{transitionPreview:false})')
        page.wait_for_function('video.paused&&!video.seeking&&clones.length===2&&clones.every(c=>c.width>0)')
        page.evaluate("document.getElementById('playlistPreviewAspect').value='16:9';applyPlaylistPreviewAspect()")
        page.wait_for_timeout(150)
        before=Image.open(io.BytesIO(page.locator('#videoStage').screenshot()))
        before.save(work/'before.png');before_seam=seam(before)
        page.locator('#insZoom').fill('1.02');page.locator('#insZoom').press('Tab')
        page.wait_for_function('tileZoom===1.02&&!video.seeking&&video.paused')
        assert page.locator('#insZoom').evaluate('e=>e.checkValidity()')
        page.wait_for_timeout(150)
        after=Image.open(io.BytesIO(page.locator('#videoStage').screenshot()))
        after.save(work/'after.png');after_seam=seam(after)
        assert before_seam>.8 and after_seam<before_seam*.25 and join_ratio(after)>.85,(before_seam,after_seam,join_ratio(after))
        encoded=page.evaluate('''()=>{const c=document.createElement('canvas');c.width=1280;c.height=720;drawCompositeFrame(c,c.getContext('2d'),true,false,false);return c.toDataURL('image/png').split(',')[1]}''')
        composite=Image.open(io.BytesIO(base64.b64decode(encoded)));composite.save(work/'composite.png')
        assert join_ratio(composite)>.85,join_ratio(composite)
        page.evaluate('savePlaylist()')
        saved=json.loads((work/'playlists/version1-showcase-signal-to-spectacle-12min.json').read_text())
        assert saved['entries'][2]['zoom']==1.02
        # Small labels must remain contained by their own tile before and after
        # scrolling, and after changing the number of panels.
        for view,count in [('dual',2),('quad',4),('six',6),('octo',8)]:
            page.locator('#insView').evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("change",{bubbles:true}));}',view)
            page.wait_for_function('(count)=>document.querySelectorAll(".ins-pattern-tile").length===count',arg=count)
            for offset in (0,220,650):
                page.locator('.right-col').evaluate('(e,y)=>e.scrollTop=y',offset)
                assert page.evaluate('''()=>[...document.querySelectorAll('.ins-pattern-tile small')].every(e=>{
                  const r=e.getBoundingClientRect(),t=e.parentElement.getBoundingClientRect();
                  return e.offsetParent===e.parentElement&&r.left>=t.left&&r.right<=t.right&&r.top>=t.top&&r.bottom<=t.bottom;
                })''')
        page.locator('.right-col').evaluate('e=>e.scrollTop=220');page.screenshot(path=str(work/'numbers-contained.png'))
        assert not errors,errors
        browser.close()
    print('PASS: 1.02 zoom closes the source seam in preview/composite and persists; panel numbers stay contained while scrolling. Artifacts:',work,'seam before/after',before_seam,after_seam,flush=True)
finally:
    httpd.shutdown();httpd.server_close()
