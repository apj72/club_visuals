import {layout,setupPreview} from './preview.js';
import {patternIds,recommendedIds,tileFlips} from './patterns.js';
import {setupRemote} from './remote.js';
// Private media preparation; explicit live actions are isolated in remote.js.
const $ = selector => document.querySelector(selector);
document.querySelector('#prepare-workspace').innerHTML='<section class="panel" id="stage-panel"><div class="panel-heading"><strong id="name">Choose a video below</strong><span>PRIVATE PREVIEW</span></div><div class="stage"><video id="video" muted playsinline preload="metadata" hidden></video><canvas id="composition" width="1280" height="720" aria-label="Private composed video preview"></canvas></div><div class="transport"><button id="play">Play preview</button><input id="seek" type="range" min="0" max="0" step=".01" value="0" aria-label="Preview playhead"><button id="mute">Unmute preview</button><button id="expand">Preview fullscreen</button></div><p id="status" role="status">Loading original video library…</p></section><aside class="panel inspector" id="inspector"><h2>Layout & playback</h2><span class="private">Private · Settings</span><label>Composition<select data-layout="view"><option value="single">Single</option><option value="dual">Dual</option><option value="triple">3×</option><option value="quad">4×</option><option value="octo">8×</option></select></label><fieldset class="pattern-picker"><legend>Mirror pattern <small id="pattern-count"></small></legend><div id="patterns" role="group" aria-label="Patterns for the selected composition"></div></fieldset><label>Playback<select data-layout="loopMode"><option value="0">Once</option><option value="1">Loop</option></select></label><p>Bounce and creative effects are coming in a later milestone.</p>'+['speed','zoom','panX','panY'].map((key,i)=>`<label>${['Speed','Zoom','Pan X','Pan Y'][i]} <output>${[1,1,0,0][i]}</output><input data-layout="${key}" ${i?'data-crop':''} type="range" min="${[.25,1,-1,-1][i]}" max="${[2,4,1,1][i]}" step="${[.25,.1,.05,.05][i]}" value="${[1,1,0,0][i]}"></label>`).join('')+'<p>Single view fits the source. Crop controls apply to tiled layouts.</p><fieldset class="looks"><legend>Colour look</legend><label>Look<select id="look"><option value="custom">Custom</option><option value="neutral">Neutral</option><option value="neon">Neon</option><option value="warm">Warm film</option><option value="acid">Acid</option><option value="mono">Monochrome</option></select></label><label>Hue <output data-effect-output="hueRotate">0°</output><input data-effect="hueRotate" type="range" min="0" max="360" step="1" value="0"></label><label>Saturation <output data-effect-output="saturate">100%</output><input data-effect="saturate" type="range" min="0" max="300" step="1" value="100"></label><label>Contrast <output data-effect-output="contrast">100%</output><input data-effect="contrast" type="range" min="50" max="200" step="1" value="100"></label><label>Brightness <output data-effect-output="brightness">100%</output><input data-effect="brightness" type="range" min="50" max="200" step="1" value="100"></label></fieldset><fieldset class="saved-layouts"><legend>Saved layouts</legend><div class="preset-row"><select id="saved-layout" aria-label="Saved layouts"><option value="">Choose saved layout</option></select><button id="load-layout">Load</button></div><div class="preset-row"><input id="preset-name" placeholder="Name this layout" aria-label="Name this layout"><button id="save-layout">Save</button></div><p>Saved in this browser for the selected video.</p></fieldset><div id="tags"></div></aside>';
const stagePanel=document.querySelector('#stage-panel'),libraryPanel=document.querySelector('.library');libraryPanel.classList.add('library-panel');document.querySelector('#prepare-workspace').append(stagePanel,libraryPanel);document.querySelector('#settings-workspace').append(document.querySelector('#inspector'));
function installDropdowns(){
 let serial=0;
 const close=menu=>{menu.hidden=true;menu.owner.trigger.setAttribute('aria-expanded','false');menu.owner.classList.remove('open')};
 document.querySelectorAll('select').forEach(select=>{
  const root=document.createElement('div'),trigger=document.createElement('button'),menu=document.createElement('div');root.className='menu-select';root.dataset.menuSelect='';
  for(const attr of select.attributes)root.setAttribute(attr.name,attr.value);
  trigger.type='button';trigger.className='menu-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');if(select.getAttribute('aria-label'))trigger.setAttribute('aria-label',select.getAttribute('aria-label'));
  menu.className='menu-list';menu.hidden=true;menu.id=`menu-select-list-${++serial}`;menu.setAttribute('role','listbox');trigger.setAttribute('aria-controls',menu.id);root.append(trigger);document.body.append(menu);menu.owner=root;root.trigger=trigger;root.menu=menu;
  let selected='';
  const refresh=()=>{const option=[...menu.querySelectorAll('[role=option]')].find(item=>item.dataset.value===selected);trigger.textContent=option?.textContent||'Choose…';for(const item of menu.querySelectorAll('[role=option]'))item.setAttribute('aria-selected',String(item.dataset.value===selected))};
  Object.defineProperty(root,'value',{get:()=>selected,set:value=>{selected=String(value??'');refresh()}});
  root.add=option=>{const item=document.createElement('button');item.type='button';item.className='menu-option';item.setAttribute('role','option');item.dataset.value=option.value;item.textContent=option.textContent;item.onclick=()=>{root.value=item.dataset.value;close(menu);root.dispatchEvent(new Event('input',{bubbles:true}));root.dispatchEvent(new Event('change',{bubbles:true}))};menu.append(item);if(menu.querySelectorAll('[role=option]').length===1)root.value=item.dataset.value};
  root.replaceChildren=(...options)=>{menu.replaceChildren();options.forEach(option=>root.add(option));root.value=options[0]?.value??''};
  [...select.options].forEach(option=>root.add(option));root.value=select.value;select.replaceWith(root);
  const position=()=>{const r=trigger.getBoundingClientRect(),maxH=Math.min(menu.scrollHeight,innerHeight*.42),top=innerHeight-r.bottom>maxH+8?r.bottom+4:Math.max(8,r.top-maxH-4);menu.style.left=`${Math.max(8,Math.min(r.left,innerWidth-r.width-8))}px`;menu.style.top=`${top}px`;menu.style.width=`${Math.min(r.width,innerWidth-16)}px`};
  trigger.onclick=()=>{document.querySelectorAll('.menu-list:not([hidden])').forEach(other=>close(other));const opening=menu.hidden;menu.hidden=!opening;root.classList.toggle('open',opening);trigger.setAttribute('aria-expanded',String(opening));if(opening)position()};
  trigger.onkeydown=event=>{if(event.key==='Escape')close(menu)};
  menu.addEventListener('keydown',event=>{if(event.key==='Escape'){close(menu);trigger.focus()}});
 });
 document.addEventListener('click',event=>{document.querySelectorAll('.menu-list:not([hidden])').forEach(menu=>{if(!menu.owner.contains(event.target)&&!menu.contains(event.target))close(menu)})});
 window.addEventListener('scroll',()=>document.querySelectorAll('.menu-list:not([hidden])').forEach(menu=>close(menu)),true);
}
installDropdowns();
const measureHeader=()=>document.documentElement.style.setProperty('--header-height',`${document.querySelector('header').offsetHeight}px`);if(window.ResizeObserver)new ResizeObserver(measureHeader).observe(document.querySelector('header'));else window.addEventListener('resize',measureHeader);measureHeader();
const redraw=setupPreview($('#video'),$('#composition'));
const remote=setupRemote(()=>selected?{filename:selected,layout:{...layout},time:$('#video').ended?0:$('#video').currentTime||0}:null);
let videos = [], selected = null, generation = 0;
let showAllPatterns=false;
function patternIcon(){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 40 40');svg.setAttribute('aria-hidden','true');const el=(tag,attrs)=>{const node=document.createElementNS(svg.namespaceURI,tag);Object.entries(attrs).forEach(([key,value])=>node.setAttribute(key,value));svg.append(node)};el('rect',{x:10,y:3,width:20,height:34,rx:3,fill:'#28352f',stroke:'#c1f477','stroke-width':1.4});el('rect',{x:12,y:5,width:16,height:4,rx:1,fill:'#c1f477'});el('path',{d:'M13 13 L21 18 L13 23 Z',fill:'#79d8e5'});el('circle',{cx:25,cy:29,r:2.2,fill:'#b99af8'});el('path',{d:'M20 32h7',stroke:'#ffbe75','stroke-width':1.5});return svg}
function renderPatterns(){const all=patternIds(layout.view),curated=recommendedIds(layout.view),ids=showAllPatterns?all:(curated.length?curated:all),count={dual:2,triple:3,quad:4,octo:8}[layout.view]||0;$('#pattern-count').textContent=all.length?`${ids.length} shown · ${all.length} unique`:'Not used in Single';const gridHost=$('#patterns');gridHost.dataset.view=layout.view;gridHost.replaceChildren();if(!count)return;gridHost.style.setProperty('--cols',layout.view==='dual'?2:layout.view==='triple'?3:layout.view==='quad'?2:4);const options=document.createElement('div');options.className='pattern-options';ids.forEach((id,index)=>{const button=document.createElement('button');button.type='button';button.className='pattern'+(layout.preset===id?' selected':'');button.setAttribute('aria-pressed',String(layout.preset===id));button.setAttribute('aria-label',`Pattern ${index+1} of ${ids.length} for ${layout.view}`);const mosaic=document.createElement('span');mosaic.className='pattern-grid';const flips=tileFlips(id,layout.view);flips.forEach(([x,y])=>{const tile=document.createElement('span');tile.className='pattern-tile';tile.style.transform=`scale(${x?-1:1},${y?-1:1})`;tile.append(patternIcon());mosaic.append(tile)});button.append(mosaic);const name=document.createElement('span');name.textContent=`${showAllPatterns||!curated.includes(id)?'Pattern '+(index+1):'Balanced '+(curated.indexOf(id)+1)}`;button.append(name);button.onclick=()=>{layout.preset=id;renderPatterns();redraw()};options.append(button)});gridHost.append(options);const toggle=document.createElement('button');toggle.type='button';toggle.className='show-all';toggle.textContent=showAllPatterns?'Show recommended patterns':`Show all ${all.length} unique patterns`;toggle.setAttribute('aria-expanded',String(showAllPatterns));toggle.onclick=()=>{showAllPatterns=!showAllPatterns;renderPatterns()};gridHost.append(toggle)}
const looks={neutral:{hueRotate:0,saturate:100,contrast:100,brightness:100},neon:{hueRotate:12,saturate:190,contrast:125,brightness:105},warm:{hueRotate:345,saturate:115,contrast:105,brightness:103},acid:{hueRotate:75,saturate:230,contrast:140,brightness:105},mono:{hueRotate:0,saturate:0,contrast:120,brightness:100}};
function syncSettings(){document.querySelectorAll('[data-layout]').forEach(el=>{el.value=layout[el.dataset.layout];const output=el.parentElement.querySelector('output');if(output)output.value=el.value;});document.querySelector('[data-layout=view]').value=layout.view;document.querySelectorAll('[data-effect]').forEach(el=>{el.value=layout.effects[el.dataset.effect];const out=document.querySelector(`[data-effect-output="${el.dataset.effect}"]`);if(out)out.value=el.value+(el.dataset.effect==='hueRotate'?'°':'%')});$('#look').value='custom';}
function syncSavedLayouts(){const select=$('#saved-layout'),key=selected?'clubVisuals.uiV2.layouts:'+selected:null;select.replaceChildren(new Option('Choose saved layout',''));if(!key)return;try{const items=JSON.parse(localStorage.getItem(key)||'[]');items.forEach((item,index)=>select.add(new Option(item.name,String(index))))}catch{}}
function applyLayout(value){Object.assign(layout,value);layout.effects={...looks.neutral,...(value.effects||{})};showAllPatterns=false;syncSettings();renderPatterns();redraw.resizeCanvas?.();redraw()}
function setPage(page){const settings=page==='settings';document.querySelector('#prepare-page').hidden=settings;document.querySelector('#settings-page').hidden=!settings;const stage=document.querySelector('#stage-panel'),inspector=document.querySelector('#inspector');if(settings)document.querySelector('#settings-workspace').append(stage,inspector);else document.querySelector('#prepare-workspace').prepend(stage);document.querySelectorAll('[data-page]').forEach(button=>{if(button.dataset.page==='prepare'||button.dataset.page==='settings'){button.classList.toggle('active',button.dataset.page===page);if(button.matches('nav button'))button.setAttribute('aria-current',button.dataset.page===page?'page':'false')}});if(settings)document.querySelector('#settings-page h1').focus?.()}

const params = new URLSearchParams(location.search);
if (params.get('remote') === '1') $('#back').href = '/?remote=1';
const tags = clip => ['themes','colours','types'].flatMap(key => clip.catalog?.[key] || []);
async function json(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json();
}
function render() {
  const query = $('#search').value.toLowerCase();
  const shown = videos.filter(clip => [clip.filename, clip.uploader, ...tags(clip)].join(' ').toLowerCase().includes(query));
  $('#count').textContent = `${shown.length} videos`;
  $('#clips').replaceChildren(...shown.map(clip => {
    const button = document.createElement('button');button.className='clip';
    button.setAttribute('aria-pressed', String(selected === clip.filename));
    const image=document.createElement('img'); image.alt='';image.loading='lazy';
    image.src='/thumbnail/'+encodeURIComponent(clip.filename);
    const title=document.createElement('strong');title.textContent=clip.filename;
    const meta=document.createElement('span');meta.textContent=tags(clip).join(' · ') || 'Untagged';
    button.append(image,title,meta);button.onclick=()=>select(clip);return button;
  }));
  if (!shown.length) $('#clips').textContent = videos.length ? 'No matching videos.' : 'No videos found in the configured media library.';
}
async function select(clip) {
  const token=++generation;selected=clip.filename;remote.refresh();render();
  syncSavedLayouts();
  const video=$('#video');video.pause();video.removeAttribute('src');video.load();redraw();
  $('#name').textContent=clip.filename;
  $('#tags').replaceChildren(...tags(clip).map(tag=>{const span=document.createElement('span');span.textContent=tag;return span}));
  try {
    let url='/video/'+encodeURIComponent(clip.filename);
    const safari=/Safari/.test(navigator.userAgent)&&!/Chrome|Chromium|Android/.test(navigator.userAgent);
    if(safari){
      for(;;){
        if(token!==generation)return;
        $('#status').textContent='Preparing a compatible iPad preview…';
        const result=await json('/api/preview/'+encodeURIComponent(clip.filename));
        if(result.ready){url=result.url;break}
        if(result.error)throw new Error(result.error||'Preview conversion failed');
        await new Promise(resolve=>setTimeout(resolve,1000));
      }
    }
    if(token!==generation)return;
    video.src=url;$('#status').textContent='Ready. Press Play to audition privately.';
  }catch(error){if(token===generation)$('#status').textContent=error.message;}
}
$('#video').addEventListener('error',()=>{$('#status').textContent='Video could not play. Choose another clip or retry by selecting this one.'});
$('#search').addEventListener('input',render);
document.querySelector('[data-layout=view]').addEventListener('change',event=>{layout.view=event.target.value;showAllPatterns=false;const ids=patternIds(layout.view);if(ids.length&&!ids.includes(layout.preset))layout.preset=(recommendedIds(layout.view)[0]||ids[0]);renderPatterns();redraw()});
$('#look').addEventListener('change',event=>{if(!looks[event.target.value])return;layout.effects={...layout.effects,...looks[event.target.value]};syncSettings();redraw()});
$('#save-layout').addEventListener('click',()=>{if(!selected){$('#status').textContent='Choose a video before saving a layout.';return}const name=$('#preset-name').value.trim();if(!name){$('#preset-name').focus();return}const key='clubVisuals.uiV2.layouts:'+selected;try{const items=JSON.parse(localStorage.getItem(key)||'[]');items.push({name,view:layout.view,preset:layout.preset,loopMode:layout.loopMode,speed:layout.speed,zoom:layout.zoom,panX:layout.panX,panY:layout.panY,effects:{...layout.effects}});localStorage.setItem(key,JSON.stringify(items));$('#preset-name').value='';syncSavedLayouts();$('#saved-layout').value=String(items.length-1);$('#status').textContent=`Saved “${name}” in this browser for this video.`}catch{$('#status').textContent='Could not save this layout in browser storage.'}});
$('#load-layout').addEventListener('click',()=>{if(!selected||$('#saved-layout').value==='')return;try{const items=JSON.parse(localStorage.getItem('clubVisuals.uiV2.layouts:'+selected)||'[]');const preset=items[Number($('#saved-layout').value)];if(preset){applyLayout(preset);$('#status').textContent=`Loaded “${preset.name}”.`}}catch{$('#status').textContent='Could not load the saved layout.'}});
document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>setPage(button.dataset.page)));
setPage('prepare');renderPatterns();
try {
  const info=await json('/api/ui-preview-info');
  if(info.label!=='ISOLATED TRIAL')throw new Error('An isolated trial server is required');
  $('#source-label').textContent=info.mediaSource==='reference'?'ORIGINAL MEDIA · READ ONLY TRIAL':'SAMPLE MEDIA · ISOLATED TRIAL';
  videos=await json('/api/videos');render();$('#status').textContent=videos.length?`Choose from ${videos.length} videos to preview.`:'No videos found in this library.';
}catch(error){$('#status').textContent=error.message;$('#count').textContent='Library unavailable';}
