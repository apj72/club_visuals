import {layout,setupPreview} from './preview.js';
import {patternIds,recommendedIds,tileFlips} from './patterns.js';
import {setupRemote} from './remote.js';
// Private media preparation; explicit live actions are isolated in remote.js.
const $ = selector => document.querySelector(selector);
document.querySelector('#prepare-workspace').innerHTML='<section class="panel" id="stage-panel"><div class="panel-heading"><strong id="name">Choose a video below</strong><span>PRIVATE PREVIEW</span></div><div class="stage"><video id="video" muted playsinline preload="metadata" hidden></video><canvas id="composition" width="1280" height="720" aria-label="Private composed video preview"></canvas></div><div class="transport"><button id="play">Play preview</button><input id="seek" type="range" min="0" max="0" step=".01" value="0" aria-label="Preview playhead"><button id="mute">Unmute preview</button><button id="expand">Preview fullscreen</button></div><p id="status" role="status">Loading copied media…</p></section><aside class="panel inspector" id="inspector"><h2>Layout & playback</h2><span class="private">Private · Settings</span><label>Composition<select data-layout="view"><option value="single">Single</option><option value="dual">Dual</option><option value="triple">3×</option><option value="quad">4×</option><option value="octo">8×</option></select></label><fieldset class="pattern-picker"><legend>Mirror pattern <small id="pattern-count"></small></legend><div id="patterns" role="group" aria-label="Patterns for the selected composition"></div></fieldset><label>Playback<select data-layout="loopMode"><option value="0">Once</option><option value="1">Loop</option></select></label><p>Bounce and creative effects are coming in a later milestone.</p>'+['speed','zoom','panX','panY'].map((key,i)=>`<label>${['Speed','Zoom','Pan X','Pan Y'][i]} <output>${[1,1,0,0][i]}</output><input data-layout="${key}" ${i?'data-crop':''} type="range" min="${[.25,1,-1,-1][i]}" max="${[2,4,1,1][i]}" step="${[.25,.1,.05,.05][i]}" value="${[1,1,0,0][i]}"></label>`).join('')+'<p>Single view fits the source. Crop controls apply to tiled layouts.</p><div id="tags"></div></aside>';
const redraw=setupPreview($('#video'),$('#composition'));
const remote=setupRemote(()=>selected?{filename:selected,layout:{...layout},time:$('#video').ended?0:$('#video').currentTime||0}:null);
let videos = [], selected = null, generation = 0;
let showAllPatterns=false;
function patternIcon(){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 40 40');svg.setAttribute('aria-hidden','true');const colors=['#c1f477','#79d8e5','#b99af8','#ffbe75'];for(let i=0;i<4;i++){const g=document.createElementNS(svg.namespaceURI,'g');g.setAttribute('transform',`rotate(${i*90} 20 20)`);const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d','M20 20 C17 16 12 9 13 4 C18 4 23 10 20 20Z');path.setAttribute('fill',colors[i]);g.append(path);svg.append(g)}const hub=document.createElementNS(svg.namespaceURI,'circle');hub.setAttribute('cx','20');hub.setAttribute('cy','20');hub.setAttribute('r','2');hub.setAttribute('fill','#f1f3ed');svg.append(hub);return svg}
function renderPatterns(){const all=patternIds(layout.view),curated=recommendedIds(layout.view),ids=showAllPatterns?all:(curated.length?curated:all),count={dual:2,triple:3,quad:4,octo:8}[layout.view]||0;$('#pattern-count').textContent=all.length?`${ids.length} shown · ${all.length} available`:'Not used in Single';const gridHost=$('#patterns');gridHost.replaceChildren();if(!count)return;gridHost.style.setProperty('--cols',layout.view==='dual'?2:layout.view==='triple'?3:layout.view==='quad'?2:4);const options=document.createElement('div');options.className='pattern-options';ids.forEach((id,index)=>{const button=document.createElement('button');button.type='button';button.className='pattern'+(layout.preset===id?' selected':'');button.setAttribute('aria-pressed',String(layout.preset===id));button.setAttribute('aria-label',`Pattern ${index+1} of ${ids.length} for ${layout.view}`);const mosaic=document.createElement('span');mosaic.className='pattern-grid';const flips=tileFlips(id,count);flips.forEach(([x,y])=>{const tile=document.createElement('span');tile.className='pattern-tile';tile.style.transform=`scale(${x?-1:1},${y?-1:1})`;tile.append(patternIcon());mosaic.append(tile)});button.append(mosaic);const name=document.createElement('span');name.textContent=`${showAllPatterns||!curated.includes(id)?'Pattern '+(all.indexOf(id)+1):'Balanced '+(curated.indexOf(id)+1)}`;button.append(name);button.onclick=()=>{layout.preset=id;renderPatterns();redraw()};options.append(button)});gridHost.append(options);const toggle=document.createElement('button');toggle.type='button';toggle.className='show-all';toggle.textContent=showAllPatterns?'Show recommended patterns':`Show all ${all.length} patterns`;toggle.setAttribute('aria-expanded',String(showAllPatterns));toggle.onclick=()=>{showAllPatterns=!showAllPatterns;renderPatterns()};gridHost.append(toggle)}
function setPage(page){const settings=page==='settings';document.querySelector('#prepare-page').hidden=settings;document.querySelector('#settings-page').hidden=!settings;const stage=document.querySelector('#stage-panel'),inspector=document.querySelector('#inspector');document.querySelector(settings?'#settings-workspace':'#prepare-workspace').append(stage,inspector);document.querySelectorAll('[data-page]').forEach(button=>{if(button.dataset.page==='prepare'||button.dataset.page==='settings'){button.classList.toggle('active',button.dataset.page===page);if(button.matches('nav button'))button.setAttribute('aria-current',button.dataset.page===page?'page':'false')}});if(settings)document.querySelector('#settings-page h1').focus?.()}

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
  $('#count').textContent = `${shown.length} copied videos`;
  $('#clips').replaceChildren(...shown.map(clip => {
    const button = document.createElement('button');button.className='clip';
    button.setAttribute('aria-pressed', String(selected === clip.filename));
    const image=document.createElement('img'); image.alt='';image.loading='lazy';
    image.src='/thumbnail/'+encodeURIComponent(clip.filename);
    const title=document.createElement('strong');title.textContent=clip.filename;
    const meta=document.createElement('span');meta.textContent=tags(clip).join(' · ') || 'Untagged';
    button.append(image,title,meta);button.onclick=()=>select(clip);return button;
  }));
  if (!shown.length) $('#clips').textContent = videos.length ? 'No matching videos.' : 'No copied videos yet. Seed the isolated media folder, then reload.';
}
async function select(clip) {
  const token=++generation;selected=clip.filename;remote.refresh();render();
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
document.querySelector('[data-layout=view]').addEventListener('change',event=>{layout.view=event.target.value;const ids=patternIds(layout.view);if(ids.length&&!ids.includes(layout.preset))layout.preset=(recommendedIds(layout.view)[0]||ids[0]);renderPatterns();redraw()});
document.querySelectorAll('[data-page]').forEach(button=>button.addEventListener('click',()=>setPage(button.dataset.page)));
setPage('prepare');renderPatterns();
try {
  const info=await json('/api/ui-preview-info');
  if(info.label!=='TEST LIBRARY')throw new Error('An isolated trial server is required');
  videos=await json('/api/videos');render();$('#status').textContent='Choose a copied video to begin.';
}catch(error){$('#status').textContent=error.message;$('#count').textContent='Library unavailable';}
