import {layout,setupPreview} from './preview.js';
import {setupRemote} from './remote.js';
// Private media preparation; explicit live actions are isolated in remote.js.
const $ = selector => document.querySelector(selector);
const redraw=setupPreview($('#video'),$('#composition'));
const remote=setupRemote(()=>selected?{filename:selected,layout:{...layout},time:$('#video').ended?0:$('#video').currentTime||0}:null);
let videos = [], selected = null, generation = 0;
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
try {
  const info=await json('/api/ui-preview-info');
  if(info.label!=='TEST LIBRARY')throw new Error('An isolated trial server is required');
  videos=await json('/api/videos');render();$('#status').textContent='Choose a copied video to begin.';
}catch(error){$('#status').textContent=error.message;$('#count').textContent='Library unavailable';}
