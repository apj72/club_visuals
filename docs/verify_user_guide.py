"""Validate every guide link/figure and render a printable PDF for review."""
from html.parser import HTMLParser
import json
from pathlib import Path
import sys
from urllib.parse import unquote,urlsplit
from playwright.sync_api import sync_playwright
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parent.parent
HERE=ROOT/'docs/user-guide';OUT=ROOT/'output/pdf/club-visuals-user-guide.pdf';QA=ROOT/'.runtime/guide-qa';QA.mkdir(parents=True,exist_ok=True)
class Parse(HTMLParser):
    def __init__(self):super().__init__();self.links=[];self.images=[];self.ids=set()
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if a.get('id'):self.ids.add(a['id'])
        if tag=='a' and a.get('href'):self.links.append(a['href'])
        if tag=='img':self.images.append(a)

files=list(HERE.glob('*.html'));parsed={}
for path in files:
    parsed[path]=Parse();parsed[path].feed(path.read_text())
for path,data in parsed.items():
    for src in [i['src'] for i in data.images]+data.links:
        url=urlsplit(src)
        if url.scheme or url.netloc:continue
        target=(path.parent/unquote(url.path)).resolve() if url.path else path
        if target==OUT:continue
        assert target.is_file(),(path.name,src)
        if url.fragment and target.suffix=='.html':
            p=parsed.get(target)
            if p is None:p=Parse();p.feed(target.read_text())
            assert unquote(url.fragment) in p.ids,(path.name,src,'missing anchor')

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':1050})
    for name in ('index','playlists','logo-animation','reference'):
        page.goto((HERE/(name+'.html')).as_uri(),wait_until='load')
        page.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')")
        page.wait_for_function('[...document.images].every(i=>i.complete&&i.naturalWidth>0)')
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),name
        page.screenshot(path=str(QA/(name+'-desktop.png')))
        page.set_viewport_size({'width':390,'height':844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(name,'mobile overflow')
        page.screenshot(path=str(QA/(name+'-mobile.png')))
        page.set_viewport_size({'width':1440,'height':1050})
    page.goto((HERE/'complete.html').as_uri(),wait_until='load')
    page.evaluate("document.querySelectorAll('img').forEach(i=>i.loading='eager')")
    page.wait_for_function('[...document.images].every(i=>i.complete&&i.naturalWidth>0)')
    # Keep PDF illustration/source links useful after downloading from GitHub,
    # rather than embedding this machine's absolute file URLs.
    page.evaluate('''(root)=>{for(const a of document.querySelectorAll('a[href]')){
      const u=new URL(a.href);if(u.protocol!=='file:')continue;
      if(u.pathname.endsWith('/complete.html')&&u.hash){a.setAttribute('href',u.hash);continue;}
      if(decodeURIComponent(u.pathname).startsWith(root+'/'))a.href='https://github.com/apj72/club_visuals/blob/main/'+decodeURIComponent(u.pathname).slice(root.length+1)+u.hash;
    }}''',str(ROOT))
    OUT.parent.mkdir(parents=True,exist_ok=True)
    page.pdf(path=str(OUT),format='A4',print_background=True,prefer_css_page_size=True,display_header_footer=True,header_template='<span></span>',footer_template='<div style="font:9px Arial;width:100%;padding:0 14mm;color:#637169;display:flex;justify-content:space-between"><span>CLUB VISUALS - USER GUIDE - 20 NOVEMBER 2026</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>')
    browser.close()
reader=PdfReader(OUT);pages=[page.extract_text() or '' for page in reader.pages]
assert len(pages)>20
for phrase in ('Play playlist','All panels upright','Show Builder','Connect camera','Where your work is stored'):
    assert phrase in '\n'.join(pages),phrase
assert not any('\ufffd' in page for page in pages)
(HERE/'verification.json').write_text(json.dumps({'htmlPages':len(files),'links':'all local links and anchors valid','screenshots':len(list((HERE/'assets/screenshots').glob('*.png'))),'pdfPages':len(pages),'pdfBytes':OUT.stat().st_size,'responsiveChecks':['1440px','390px'],'pdf':str(OUT.relative_to(ROOT))},indent=2))
print('PASS guide links/images/responsive layout; PDF:',len(pages),'pages,',OUT.stat().st_size,'bytes; QA:',QA)
