"""Build the current multipage handbook and its combined print source."""
from html import escape
import importlib.util
import json
from pathlib import Path
from PIL import Image
import re

ROOT=Path(__file__).resolve().parent.parent
HERE=ROOT/'docs/user-guide'
spec=importlib.util.spec_from_file_location('guide_content',HERE/'content.py');content=importlib.util.module_from_spec(spec);spec.loader.exec_module(content)

def navigation(current):
    return ''.join(f'<a href="{c["slug"]}.html"'+(' aria-current="page"' if current==c['slug'] else '')+f'>{escape(c["title"])}</a>' for c in content.CHAPTERS)
def images(body):
    def replace(match):
        source=match.group(1)
        with Image.open(HERE/source) as image:w,h=image.size
        return f'<img src="{source}" width="{w}" height="{h}"'
    return re.sub(r'<img src="([^"]+)"',replace,body)
def shell(title,main,current='',complete=False):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)} | Club Visuals</title><meta name="description" content="Current illustrated Club Visuals handbook: playlist composition, timed editing, effects, Show Builder, capture and Mac/iPad output."><link rel="stylesheet" href="assets/guide.css"></head><body{' class="complete-guide"' if complete else ''}><a class="skip-link" href="#main">Skip to content</a><div class="guide-shell"><header class="guide-nav-wrap"><div class="guide-nav-inner"><a class="guide-brand" href="index.html">CLUB VISUALS / USER GUIDE</a><nav class="guide-nav" aria-label="Guide chapters">{navigation(current)}</nav></div></header><main id="main" class="guide-main">{main}</main><footer class="guide-footer">Club Visuals · Current redesigned interface · 20 November 2026<br>Illustrations captured with Docshots. <a href="complete.html">Complete guide</a> · <a href="../../output/pdf/club-visuals-user-guide.pdf">Printable PDF</a></footer></div></body></html>'''

combined=[]
for index,chapter in enumerate(content.CHAPTERS):
    title=escape(chapter['title']);body=images(chapter['body'])
    if index==0:
        body+='<h2>Chapters and task index</h2><div class="toc-grid">'+''.join(f'<a class="toc-card" href="{c["slug"]}.html"><h2>{escape(c["title"])}</h2><p>{escape(c["lead"])}</p></a>' for c in content.CHAPTERS[1:])+'</div>'
    previous=content.CHAPTERS[index-1] if index else None;next_chapter=content.CHAPTERS[index+1] if index+1<len(content.CHAPTERS) else None
    pager='<nav class="guide-pager" aria-label="Chapter navigation">'+(f'<a href="{previous["slug"]}.html">← {escape(previous["title"])}</a>' if previous else '<span></span>')+(f'<a href="{next_chapter["slug"]}.html">{escape(next_chapter["title"])} →</a>' if next_chapter else '<span></span>')+'</nav>'
    main=f'<article><h1>{title}</h1><p class="lead">{escape(chapter["lead"])}</p>{body}</article>{pager}'
    (HERE/(chapter['slug']+'.html')).write_text(shell(chapter['title'],main,chapter['slug']))
    # Combined links target chapter anchors, so the print edition is self-contained.
    section=f'<section class="print-chapter" id="chapter-{chapter["slug"]}"><h1>{title}</h1><p class="lead">{escape(chapter["lead"])}</p>{body}</section>'
    for c in content.CHAPTERS:section=section.replace(f'href="{c["slug"]}.html"',f'href="#chapter-{c["slug"]}"')
    combined.append(section)
(HERE/'complete.html').write_text(shell('Complete user guide',''.join(combined),complete=True))
words=len(re.sub('<[^>]+>',' ',''.join(c['body'] for c in content.CHAPTERS)).split())
(HERE/'build-manifest.json').write_text(json.dumps({'edition':'2026-11-20','chapters':len(content.CHAPTERS),'approximateWords':words,'screenshots':len(list((HERE/'assets/screenshots').glob('*.png'))),'source':'content.py','captureTool':'docshots'},indent=2))
print('Built',len(content.CHAPTERS),'chapters and combined guide;',words,'words')
