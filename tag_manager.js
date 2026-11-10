/* Review classification independently of the live player. */
const tagManager = document.createElement('dialog');
tagManager.id = 'tagManagerDialog';
tagManager.className = 'tag-manager';
tagManager.setAttribute('aria-labelledby','tagManagerTitle');
tagManager.innerHTML = `<header class="tm-header"><div><h2 id="tagManagerTitle">Classification manager</h2><p>Review the video, correct its labels, or manage a tag across the library.</p></div><button id="tmClose" type="button">Done</button></header>
  <nav class="tm-tabs" aria-label="Classification views"><button id="tmVideosTab" type="button">Videos & review</button><button id="tmTagsTab" type="button">All tags & usage</button><button id="tmRefresh" type="button">Refresh</button><button id="tmUndo" type="button" disabled>Undo last tag change</button></nav>
  <input id="tmSearch" class="tm-search" type="search" placeholder="Search videos, tags or notes…" aria-label="Search classification manager">
  <p id="tmStatus" role="status"></p><p id="tmUndoLabel" class="tm-muted"></p>
  <section id="tmVideosPanel"><div class="tm-filters"><label>Theme<select id="tmTheme"></select></label><label>Colour<select id="tmColour"></select></label><label>Visual type<select id="tmType"></select></label><label>Review status<select id="tmReview"><option value="">All videos</option><option value="draft">Needs review</option><option value="reviewed">Reviewed</option><option value="untagged">Untagged</option></select></label></div>
  <div class="tm-selection"><button id="tmSelectShown" type="button">Select shown</button><button id="tmClearSelection" type="button">Clear selection</button><span id="tmVideoCount"></span></div>
  <details class="tm-bulk"><summary>Change tags on selected videos</summary><div class="tm-bulk-controls"><select id="tmBulkMode" aria-label="Tag change"><option value="add">Add tag</option><option value="remove">Remove tag</option></select><select id="tmBulkField" aria-label="Tag category"><option value="themes">Theme</option><option value="colours">Colour</option><option value="types">Visual type</option></select><input id="tmBulkTag" maxlength="40" list="tmBulkSuggestions" placeholder="Tag name" aria-label="Tag to add or remove"><datalist id="tmBulkSuggestions"></datalist><button id="tmBulkApply" type="button">Apply to selected</button><button id="tmReviewed" type="button">Mark reviewed</button><button id="tmNeedsReview" type="button">Mark for review</button></div><p class="tm-muted">Other labels and notes are preserved. Selected videos stay selected when you change filters; check the selected count before applying.</p></details>
  <div id="tmVideoList" class="tm-video-list"></div></section>
  <section id="tmTagsPanel" hidden><label>Category<select id="tmTagCategory"><option value="">All categories</option><option value="themes">Themes</option><option value="colours">Colours</option><option value="types">Visual types</option></select></label><p id="tmTagCount" class="tm-muted"></p><div class="tm-tag-grid"><div id="tmTagList"></div><section id="tmTagDetail" class="tm-tag-detail"><p>Choose a tag to see the videos using it.</p></section></div></section>`;
document.body.append(tagManager);
const tmStyle=document.createElement('style');
tmStyle.textContent=`.tag-manager{width:min(1320px,96vw);max-height:94vh;overflow:auto;margin:auto;padding:20px;border:1px solid #65ccb8;border-radius:12px;background:#142033;color:#edf3f7;font:14px system-ui}.tag-manager::backdrop{background:#000b}.tag-manager [hidden]{display:none!important}.tm-header{display:flex;justify-content:space-between;gap:15px;align-items:start}.tm-header p,.tm-muted{color:#9db2c8;font-size:12px;margin:8px 0}.tag-manager button{padding:9px 12px;min-height:40px;border:1px solid #56748c;border-radius:6px;background:#20364b;color:#e6f8ff;font:inherit;cursor:pointer}.tag-manager button:disabled{opacity:.4;cursor:default}.tag-manager button:focus-visible{outline:2px solid #8df4d4;outline-offset:2px}.tm-tabs,.tm-selection,.tm-bulk-controls{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:12px 0}.tm-tabs .active{background:#24645c;border-color:#8df4d4}.tag-manager input,.tag-manager select{background:#0d1828;color:white;border:1px solid #5f758e;border-radius:5px;padding:9px;font:inherit;min-width:0}.tm-search{width:100%}.tm-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin:12px 0}.tag-manager label{display:grid;gap:5px}.tm-selection span{margin-left:auto;color:#b4d5d8}.tm-bulk{padding:10px;border:1px solid #344e65;border-radius:7px}.tm-bulk summary{cursor:pointer}.tm-video-list{margin-top:12px;display:grid;gap:8px}.tm-video-row{display:grid;grid-template-columns:24px 140px minmax(0,1fr) auto;gap:12px;align-items:start;padding:12px;border:1px solid #30445d;border-radius:8px;background:#192a40}.tm-video-row input[type=checkbox]{width:20px;height:20px;margin-top:5px}.tm-video-row .tm-thumb{padding:0;border:0;background:#000;overflow:hidden}.tm-thumb img{display:block;width:140px;height:92px;object-fit:contain}.tm-video-info{min-width:0}.tm-video-info h3{font-size:13px;overflow-wrap:anywhere;margin-bottom:6px}.tm-badge{font-size:11px;color:#e9cc91}.tm-badge.reviewed{color:#84e0ba}.tm-tag-line{margin:5px 0;font-size:12px;color:#98b7d0}.tm-tag-line strong{margin-right:6px}.tag-manager .tm-chip{min-height:29px;margin:2px;padding:4px 7px;font-size:12px;background:#24443f;border-color:#52776f}.tm-tag-grid{display:grid;grid-template-columns:minmax(220px,.8fr) minmax(0,1.2fr);gap:16px;margin-top:10px}.tm-tag-list-button{display:flex!important;justify-content:space-between;gap:8px;width:100%;margin:5px 0;text-align:left}.tm-tag-list-button.active{background:#24645c}.tm-tag-list-button small{display:block;color:#a9c4d2;font-size:11px}.tm-tag-detail{padding:16px;background:#1a2b40;border:1px solid #3f5b70;border-radius:8px;align-self:start}.tm-tag-detail h3{overflow-wrap:anywhere}.tm-tag-detail label{margin:15px 0}.tm-tag-detail input{width:100%}.tm-tag-detail button{margin:5px 5px 5px 0}.tm-tag-thumbs{display:grid;grid-template-columns:repeat(auto-fill,minmax(95px,1fr));gap:8px;margin-top:12px}.tm-tag-thumbs img{width:100%;height:75px;object-fit:contain;background:#000;border-radius:4px}.tm-tag-thumbs button{padding:2px;min-width:0;margin:0}.tm-empty{padding:24px;color:#adc3d5;text-align:center}#tmStatus{color:#f1d298;min-height:18px;margin:10px 0}@media(max-width:760px){.tag-manager{padding:12px}.tm-filters{grid-template-columns:repeat(2,minmax(0,1fr))}.tm-tag-grid{grid-template-columns:1fr}.tm-video-row{grid-template-columns:24px 88px minmax(0,1fr);gap:8px}.tm-thumb img{width:88px;height:72px}.tm-video-row>button:last-child{grid-column:3}.tm-selection span{margin-left:0;width:100%}}`;
document.head.append(tmStyle);
const tm=id=>document.getElementById(id);
const tmFieldNames={themes:'Theme',colours:'Colour',types:'Visual type'};
const tmFilterIds={themes:'tmTheme',colours:'tmColour',types:'tmType'};
const tmState={videos:[],snapshot:{revision:null,undoAvailable:false,videos:{}},selected:new Set(),tab:'videos',tag:null,busy:false,search:{videos:'',tags:''}};
const tmSame=(a,b)=>String(a).toLocaleLowerCase()===String(b).toLocaleLowerCase();
function tmVisibleVideos(){
  const search=tm('tmSearch').value.trim().toLocaleLowerCase(), review=tm('tmReview').value;
  return tmState.videos.filter(video=>{
    const tags=video.catalog||{},hasTags=catalogueFields.some(field=>tags[field]?.length);
    const text=[video.filename,video.uploader,tags.notes,...catalogueFields.flatMap(field=>tags[field]||[])].join(' ').toLocaleLowerCase();
    return (!search||text.includes(search))&&catalogueFields.every(field=>!tm(tmFilterIds[field]).value||(tags[field]||[]).some(tag=>tmSame(tag,tm(tmFilterIds[field]).value)))
      &&(!review||(review==='untagged'?!hasTags:review==='reviewed'?!!tags.reviewed:!tags.reviewed));
  });
}
function tmTagIndex(){
  const tags=new Map();
  for(const video of tmState.videos)for(const field of catalogueFields)for(const label of video.catalog?.[field]||[]){
    const key=field+':'+label.toLocaleLowerCase();if(!tags.has(key))tags.set(key,{key,field,label,videos:[]});tags.get(key).videos.push(video);
  }
  return [...tags.values()].sort((a,b)=>a.field.localeCompare(b.field)||a.label.localeCompare(b.label));
}
function tmUpdateSelection(){
  const visible=tmVisibleVideos(), shown=new Set(visible.map(video=>video.filename));
  const hidden=[...tmState.selected].filter(name=>!shown.has(name)).length;
  tm('tmVideoCount').textContent=`${visible.length} of ${tmState.videos.length} videos · ${tmState.selected.size} selected${hidden?' ('+hidden+' outside these filters)':''}`;
  for(const id of ['tmBulkApply','tmReviewed','tmNeedsReview'])tm(id).disabled=tmState.busy||tmState.selected.size===0;
  tm('tmBulkApply').textContent=`Apply to ${tmState.selected.size} selected video(s)`;
  tm('tmUndo').disabled=tmState.busy||!tmState.snapshot.undoAvailable;
  tm('tmUndoLabel').textContent=tmState.snapshot.undoAvailable?'Last change: '+tmState.snapshot.undoLabel:'';
}
function tmOpenVideo(video){openCatalogueEditor(video,tmVisibleVideos().map(entry=>entry.filename));}
function tmRenderVideos(){
  const list=tm('tmVideoList');list.replaceChildren();
  for(const video of tmVisibleVideos()){
    const row=document.createElement('article');row.className='tm-video-row';
    const select=document.createElement('input');select.type='checkbox';select.checked=tmState.selected.has(video.filename);select.setAttribute('aria-label','Select '+video.filename);
    select.onchange=()=>{if(select.checked)tmState.selected.add(video.filename);else tmState.selected.delete(video.filename);tmUpdateSelection();};
    const thumb=document.createElement('button');thumb.type='button';thumb.className='tm-thumb';thumb.setAttribute('aria-label','Preview and edit '+video.filename);thumb.onclick=()=>tmOpenVideo(video);
    const image=document.createElement('img');image.src='/thumbnail/'+encodeURIComponent(video.filename);image.alt='';image.loading='lazy';thumb.append(image);
    const info=document.createElement('div');info.className='tm-video-info';const name=document.createElement('h3');name.textContent=video.filename.replace(/^Video by /,'').replace(/\.mp4$/i,'');info.append(name);
    const badge=document.createElement('span');badge.className='tm-badge'+(video.catalog?.reviewed?' reviewed':'');badge.textContent=video.catalog?.reviewed?'Reviewed':'Needs review · initial or incomplete labels';info.append(badge);
    for(const field of catalogueFields){const line=document.createElement('div');line.className='tm-tag-line';const label=document.createElement('strong');label.textContent=tmFieldNames[field]+':';line.append(label);
      const values=video.catalog?.[field]||[];if(!values.length)line.append(document.createTextNode(' —'));
      for(const value of values){const chip=document.createElement('button');chip.type='button';chip.className='tm-chip';chip.textContent=value;chip.setAttribute('aria-label','Manage '+tmFieldNames[field].toLocaleLowerCase()+' '+value);chip.onclick=()=>{tmState.tag=field+':'+value.toLocaleLowerCase();tmState.search.tags='';tmSetTab('tags');};line.append(chip);}info.append(line);}
    const edit=document.createElement('button');edit.type='button';edit.textContent='Review / edit';edit.disabled=tmState.busy;edit.onclick=()=>tmOpenVideo(video);row.append(select,thumb,info,edit);list.append(row);
  }
  if(!list.children.length){const empty=document.createElement('p');empty.className='tm-empty';empty.textContent='No videos match these filters.';list.append(empty);}
  tmUpdateSelection();
}
function tmRenderTags(){
  const all=tmTagIndex(),search=tm('tmSearch').value.trim().toLocaleLowerCase(),category=tm('tmTagCategory').value;
  const tags=all.filter(tag=>(!category||tag.field===category)&&(!search||tag.label.toLocaleLowerCase().includes(search)));
  tm('tmTagCount').textContent=`${tags.length} tag(s) shown · counts include the whole library`;
  const list=tm('tmTagList');list.replaceChildren();
  for(const tag of tags){const button=document.createElement('button');button.type='button';button.className='tm-tag-list-button'+(tag.key===tmState.tag?' active':'');
    const label=document.createElement('span');label.textContent=tag.label;const categoryName=document.createElement('small');categoryName.textContent=tmFieldNames[tag.field];label.append(categoryName);const count=document.createElement('span');count.textContent=tag.videos.length+' videos';button.append(label,count);button.onclick=()=>{tmState.tag=tag.key;tmRenderTags();};list.append(button);}
  const detail=tm('tmTagDetail');detail.replaceChildren();const tag=all.find(tag=>tag.key===tmState.tag);
  if(!tag){const hint=document.createElement('p');hint.textContent='Choose a tag to see every video using it, rename it, or remove it.';detail.append(hint);return;}
  const title=document.createElement('h3');title.textContent=tag.label;const count=document.createElement('p');count.textContent=`${tmFieldNames[tag.field]} · assigned to ${tag.videos.length} video(s) across the whole library.`;
  const label=document.createElement('label');label.textContent='New tag name';const input=document.createElement('input');input.id='tmRenameInput';input.maxLength=40;input.value=tag.label;label.append(input);
  const rename=document.createElement('button');rename.type='button';rename.textContent=`Rename on ${tag.videos.length} video(s)`;rename.disabled=tmState.busy;rename.onclick=()=>tmApply({action:'rename',field:tag.field,tag:tag.label,newTag:input.value});
  const remove=document.createElement('button');remove.type='button';remove.textContent=`Remove from ${tag.videos.length} video(s)`;remove.disabled=tmState.busy;remove.onclick=()=>tmApply({action:'delete',field:tag.field,tag:tag.label});
  const hint=document.createElement('p');hint.className='tm-muted';hint.textContent='Renaming to an existing tag merges the labels without duplicates. These actions change only this category; the last tag change can be undone.';
  const show=document.createElement('button');show.type='button';show.textContent='Show assigned videos';show.onclick=()=>{for(const field of catalogueFields)tm(tmFilterIds[field]).value=field===tag.field?tag.label:'';tm('tmReview').value='';tmState.search.videos='';tmSetTab('videos');};
  const thumbs=document.createElement('div');thumbs.className='tm-tag-thumbs';for(const video of tag.videos.slice(0,24)){const button=document.createElement('button');button.type='button';button.title=video.filename;button.setAttribute('aria-label','Review '+video.filename);const image=document.createElement('img');image.src='/thumbnail/'+encodeURIComponent(video.filename);image.alt=video.filename;image.loading='lazy';button.append(image);button.onclick=()=>openCatalogueEditor(video,tag.videos.map(video=>video.filename));thumbs.append(button);}
  detail.append(title,count,label,rename,remove,hint,show,thumbs);
}
function tmRender(){
  tm('tmVideosPanel').hidden=tmState.tab!=='videos';tm('tmTagsPanel').hidden=tmState.tab!=='tags';tm('tmVideosTab').classList.toggle('active',tmState.tab==='videos');tm('tmTagsTab').classList.toggle('active',tmState.tab==='tags');
  tm('tmSearch').placeholder=tmState.tab==='tags'?'Search tag names…':'Search videos, tags or notes…';
  if(tmState.tab==='videos')tmRenderVideos();else{tmRenderTags();tmUpdateSelection();}
}
function tmSetTab(tab){tmState.search[tmState.tab]=tm('tmSearch').value;tmState.tab=tab;tm('tmSearch').value=tmState.search[tab];tmRender();}
function tmPopulateFilters(){
  for(const field of catalogueFields){const select=tm(tmFilterIds[field]),previous=select.value;const tags=tmTagIndex().filter(tag=>tag.field===field);select.replaceChildren(new Option('All '+field,''),...tags.map(tag=>new Option(tag.label,tag.label)));if(tags.some(tag=>tag.label===previous))select.value=previous;}
  const suggestions=tmTagIndex().filter(tag=>tag.field===tm('tmBulkField').value);tm('tmBulkSuggestions').replaceChildren(...suggestions.map(tag=>new Option(tag.label,tag.label)));
}
async function tmRefresh(){
  const [videoResponse,tagResponse]=await Promise.all([fetch('/api/videos'),fetch('/api/library-catalog')]);
  if(!videoResponse.ok||!tagResponse.ok)throw new Error('Could not load the classification library.');
  const [videos,snapshot]=await Promise.all([videoResponse.json(),tagResponse.json()]);
  tmState.snapshot=snapshot;tmState.videos=videos.map(video=>({...video,catalog:snapshot.videos[video.filename]||{}}));
  const valid=new Set(videos.map(video=>video.filename));for(const name of tmState.selected)if(!valid.has(name))tmState.selected.delete(name);
  for(const video of videoListCache)video.catalog=snapshot.videos[video.filename]||{};
  updateLibraryCatalogue();tmPopulateFilters();tmRender();
}
async function tmApply(action){
  if(tmState.busy||tmState.snapshot.revision===null)return;tmState.busy=true;tmRender();tm('tmStatus').textContent='Saving tag changes…';
  try{const response=await fetch('/api/library-catalog/manage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...action,expectedRevision:tmState.snapshot.revision})});const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not save tag changes.');
    if(action.action==='rename')tmState.tag=action.field+':'+action.newTag.trim().toLocaleLowerCase();if(action.action==='delete')tmState.tag=null;
    await tmRefresh();tm('tmStatus').textContent=result.changed?`${result.label} · ${result.changed} video(s) changed.`:'No tags needed changing.';
  }catch(error){try{await tmRefresh();}catch{}tm('tmStatus').textContent=error.message;}
  finally{tmState.busy=false;tmRender();}
}
window.openTagManager=async()=>{
  tmState.selected.clear();
  tm('tmStatus').textContent='Loading classification tags…';if(!tagManager.open)tagManager.showModal();
  try{await tmRefresh();for(const field of catalogueFields){const root=catSelects[field].value;if([...tm(tmFilterIds[field]).options].some(option=>option.value===root))tm(tmFilterIds[field]).value=root;}
    tm('tmReview').value=catElement('catalogReview').value;tmState.search.videos=catElement('catalogSearch').value;tmState.tab='videos';tm('tmSearch').value=tmState.search.videos;tm('tmStatus').textContent='Initial labels are suggestions. Review the actual clip before marking it reviewed.';tmRender();
  }catch(error){tm('tmStatus').textContent=error.message;}
};
window.tagManagerReviewQueue=()=>tagManager.open?tmVisibleVideos().map(video=>video.filename):null;
window.tagManagerVideo=filename=>tmState.videos.find(video=>video.filename===filename);
window.onCatalogueSaved=async(filename,entry)=>{const video=tmState.videos.find(video=>video.filename===filename);if(video)video.catalog=entry;if(tagManager.open){try{await tmRefresh();tm('tmStatus').textContent='Video tags saved.';}catch(error){tm('tmStatus').textContent='Tags saved. '+error.message;tmRender();}}};
tm('tmClose').onclick=()=>tagManager.close();tm('tmVideosTab').onclick=()=>tmSetTab('videos');tm('tmTagsTab').onclick=()=>tmSetTab('tags');tm('tmSearch').oninput=tmRender;
for(const id of [...Object.values(tmFilterIds),'tmReview'])tm(id).onchange=tmRender;
tm('tmTagCategory').onchange=()=>{tmState.tag=null;tmRender();};tm('tmBulkField').onchange=tmPopulateFilters;
tm('tmRefresh').onclick=async()=>{try{await tmRefresh();tm('tmStatus').textContent='Loaded the latest saved tags.';}catch(error){tm('tmStatus').textContent=error.message;}};
tm('tmSelectShown').onclick=()=>{for(const video of tmVisibleVideos())tmState.selected.add(video.filename);tmRenderVideos();};tm('tmClearSelection').onclick=()=>{tmState.selected.clear();tmRenderVideos();};
tm('tmBulkApply').onclick=()=>tmApply({action:'bulk',mode:tm('tmBulkMode').value,field:tm('tmBulkField').value,tag:tm('tmBulkTag').value,filenames:[...tmState.selected]});
tm('tmReviewed').onclick=()=>tmApply({action:'review',reviewed:true,filenames:[...tmState.selected]});tm('tmNeedsReview').onclick=()=>tmApply({action:'review',reviewed:false,filenames:[...tmState.selected]});tm('tmUndo').onclick=()=>tmApply({action:'undo'});
