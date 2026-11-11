import {layout,setupPreview} from './preview.js';
import {patternIds,tileFlips} from './patterns.js';
import {setupRemote} from './remote.js';
// Private media preparation; explicit live actions are isolated in remote.js.
const $ = selector => document.querySelector(selector);
const redraw=setupPreview($('#video'),$('#composition'));
const remote=setupRemote(()=>selected?{filename:selected,layout:{...layout},time:$('#video').ended?0:$('#video').currentTime||0}:null);
let videos = [], selected = null, generation = 0;
function renderPatterns(){const ids=patternIds(layout.view);const count={dual:2,triple:3,quad:4,octo:8}[layout.view]||0;$('#pattern-count').textContent=ids.length?`${ids.length} patterns`:'Not used in Single';$('#patterns').replaceChildren(...ids.map((id,index)=>{const button=document.createElement('button');button.type='button';button.className='pattern'+(layout.preset===id?' selected':'');button.setAttribute('aria-pressed',String(layout.preset===id));button.setAttribute('aria-label',`Pattern ${index+1} of ${ids.length} for ${layout.view}, mirror pattern ${id}`);button.dataset.pattern=id;if(count){const grid=document.createElement('span');grid.className='pattern-grid';grid.style.setProperty('--cols',layout.view==='dual'?2:layout.view==='triple'?3:layout.view==='quad'?2:4);const flips=tileFlips(id,count);flips.forEach(([x,y])=>{const tile=document.createElement('i');tile.style.transform=`scale(${x?-1:1},${y?-1:1})`;grid.append(tile)});button.append(grid)}else{const single=document.createElement('span');single.textContent='Single source';button.append(single)}const name=document.createElement('span');name.textContent=`Pattern ${index+1}`;button.append(name);button.onclick=()=>{layout.preset=id;renderPatterns();redraw()};return button}))}
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
document.querySelector('[data-layout=view]').addEventListener('change',event=>{layout.view=event.target.value;const ids=patternIds(layout.view);if(ids.length&&!ids.includes(layout.preset))layout.preset=ids[0];renderPatterns();redraw()});
renderPatterns();
try {
  const info=await json('/api/ui-preview-info');
  if(info.label!=='TEST LIBRARY')throw new Error('An isolated trial server is required');
  videos=await json('/api/videos');render();$('#status').textContent='Choose a copied video to begin.';
}catch(error){$('#status').textContent=error.message;$('#count').textContent='Library unavailable';}
