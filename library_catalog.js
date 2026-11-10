// Shared tags organise the library; filters never change the live player.
const catalogueFields = ['themes', 'colours', 'types'];
const catalogueTools = document.createElement('section');
catalogueTools.className = 'catalog-tools';
catalogueTools.setAttribute('aria-label', 'Browse video categories');
catalogueTools.innerHTML = `<input id="catalogSearch" type="search" placeholder="Search videos and tags…" aria-label="Search videos and tags">
  <button id="catalogManage" type="button" style="width:100%;min-height:44px;margin-top:8px">Manage classification tags</button>
  <div class="catalog-filters"><label>Theme<select id="catalogThemes"></select></label>
  <label>Colour<select id="catalogColours"></select></label><label>Visual type<select id="catalogTypes"></select></label>
  <label>Arrange by<select id="catalogSort"><option value="manual">My order</option><option value="themes">Theme</option><option value="colours">Colour</option><option value="types">Visual type</option><option value="name">Name</option><option value="newest">Newest first</option></select></label>
  <label>Tag status<select id="catalogReview"><option value="">All videos</option><option value="draft">Initial labels</option><option value="reviewed">Reviewed</option><option value="untagged">Untagged</option></select></label>
  <button id="catalogClear" type="button">Clear filters</button></div>
  <p id="catalogCount" role="status"></p><p id="catalogHint">Initial labels are suggestions from sampled frames. Edit any clip’s tags to refine them.</p>`;
libraryGrid.before(catalogueTools);
const catalogueDialog = document.createElement('dialog');
catalogueDialog.className = 'catalog-dialog';
catalogueDialog.setAttribute('aria-labelledby', 'catalogEditTitle');
catalogueDialog.innerHTML = `<form id="catalogForm"><h3 id="catalogEditTitle">Edit video tags</h3><p id="catalogEditName"></p>
  <div class="catalog-editor-grid"><section><video id="catalogEditVideo" controls muted playsinline loop preload="metadata"></video><p id="catalogPreviewStatus" role="status"></p><p id="catalogReviewPosition"></p><button id="catalogPrevious" type="button">Previous video</button><button id="catalogNext" type="button">Next video</button></section><section>
  <p>Remove a label with ×, pick an existing tag, or edit the comma-separated list. Changes are shared by Mac and iPad.</p>
  <label>Themes<input id="catalogEditThemes" maxlength="480" placeholder="Psychedelic, Portraits & people"></label><div id="catalogChipsThemes" class="catalog-chips"></div><select id="catalogPickThemes" aria-label="Add an existing theme"></select>
  <label>Colours<input id="catalogEditColours" maxlength="480" placeholder="Purple, Blue, Multicolour"></label><div id="catalogChipsColours" class="catalog-chips"></div><select id="catalogPickColours" aria-label="Add an existing colour"></select>
  <label>Visual types<input id="catalogEditTypes" maxlength="480" placeholder="3D animation, Mixed media"></label><div id="catalogChipsTypes" class="catalog-chips"></div><select id="catalogPickTypes" aria-label="Add an existing visual type"></select>
  <label>Notes<textarea id="catalogEditNotes" maxlength="300" rows="2"></textarea></label>
  <label class="catalog-check"><input type="checkbox" id="catalogEditReviewed" checked> Reviewed these labels</label>
  </section></div><p id="catalogEditStatus" role="status"></p><div><button type="submit" id="catalogSave">Save tags</button><button type="submit" id="catalogSaveNext">Save & next video</button>
  <button type="button" id="catalogReload">Reload saved tags</button><button type="button" id="catalogCancel">Cancel</button></div></form>`;
document.body.append(catalogueDialog);
const catalogueStyle = document.createElement('style');
catalogueStyle.textContent = `.catalog-tools{padding:10px;background:#111b30;border:1px solid #35465d;border-radius:8px;margin-bottom:10px;font:12px system-ui}.catalog-tools input,.catalog-tools select{width:100%;min-width:0;padding:8px;background:#1c2c46;color:#eee;border:1px solid #536278;border-radius:4px;font:inherit}.catalog-filters{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.catalog-filters label{min-width:0;display:grid;gap:4px}.catalog-tools button,.catalog-edit{background:#213a46;color:#b9f5e5;border:1px solid #558c8c;border-radius:4px;padding:8px;font:inherit;cursor:pointer}.catalog-tools p{margin-top:8px}#catalogHint{font-size:11px;color:#93a7bf}.library-item[hidden]{display:none}.catalog-summary{display:block;white-space:normal;color:#83cbbd;font-size:10px;line-height:1.4;margin-top:4px}.catalog-edit{display:block;margin-top:5px;min-height:32px;padding:5px 8px;font-size:11px}.catalog-dialog{width:min(520px,94vw);max-height:90vh;overflow:auto;margin:auto;padding:20px;border:1px solid #5fcab2;border-radius:10px;background:#182333;color:white}.catalog-dialog::backdrop{background:#000a}.catalog-dialog label{display:grid;gap:5px;margin:12px 0}.catalog-dialog input:not([type=checkbox]),.catalog-dialog textarea{padding:10px;border:1px solid #73849d;border-radius:4px;background:#101b2c;color:white;font:inherit;width:100%}.catalog-dialog p{font-size:12px;margin:8px 0;color:#b8cbd8}.catalog-dialog .catalog-check{display:flex;align-items:center;gap:8px}.catalog-dialog button{padding:10px;margin-right:8px;border-radius:5px;cursor:pointer}.catalog-dialog h3{margin-bottom:8px}`;
document.head.append(catalogueStyle);
const editorStyle=document.createElement('style');
editorStyle.textContent='.catalog-dialog{width:min(1000px,96vw)}.catalog-editor-grid{display:grid;grid-template-columns:minmax(240px,1fr) minmax(260px,1fr);gap:20px}.catalog-editor-grid video{width:100%;max-height:52vh;object-fit:contain;background:#000;border-radius:8px}.catalog-editor-grid select{width:100%;padding:8px;background:#101b2c;color:white;border:1px solid #73849d;border-radius:4px}.catalog-chips{display:flex;flex-wrap:wrap;gap:4px;margin:6px 0}.catalog-chips button{margin:0;padding:6px 8px;font-size:12px;background:#254a48;color:#c7fff0;border:1px solid #658d89}@media(max-width:720px){.catalog-editor-grid{grid-template-columns:1fr}.catalog-editor-grid video{max-height:30vh}}';
document.head.append(editorStyle);
const catElement = id => document.getElementById(id);
let catalogueEditing = null;
let catalogueEditingRevision = null, catalogueEditorToken = 0, catalogueQueue = [], catalogueQueueIndex = -1, catalogueOriginalForm = '';
const catSelects = {themes:catElement('catalogThemes'), colours:catElement('catalogColours'), types:catElement('catalogTypes')};
const catSort = catElement('catalogSort');
function catalogueRestricted() {
  return !!catElement('catalogSearch').value.trim() || !!catElement('catalogReview').value
    || catalogueFields.some(field => catSelects[field].value) || catSort.value !== 'manual';
}
window.libraryCanReorder = () => !catalogueRestricted();
function applyCatalogueFilters() {
  const search = catElement('catalogSearch').value.trim().toLocaleLowerCase();
  const review = catElement('catalogReview').value;
  const entries = new Map(videoListCache.map(video => [video.filename, video]));
  let visible = 0;
  const cards = [...libraryGrid.children];
  const manual = new Map(videoListCache.map((video,index) => [video.filename,index]));
  cards.sort((a,b) => {
    const va=entries.get(a.dataset.filename), vb=entries.get(b.dataset.filename);
    if (!va || !vb) return 0;
    if (catSort.value === 'newest') return vb.modified - va.modified;
    if (catSort.value === 'name') return va.filename.localeCompare(vb.filename);
    if (catalogueFields.includes(catSort.value)) {
      const key = video => [...(video.catalog?.[catSort.value] || [])].sort().join(', ') || '\uffff';
      return key(va).localeCompare(key(vb)) || manual.get(va.filename) - manual.get(vb.filename);
    }
    return manual.get(va.filename) - manual.get(vb.filename);
  });
  for (const card of cards) {
    const video = entries.get(card.dataset.filename);
    if (!video) continue;
    const tags = video.catalog || {};
    const hasTags = catalogueFields.some(field => tags[field]?.length);
    const text = [video.filename, video.uploader, tags.notes, ...catalogueFields.flatMap(field=>tags[field]||[])].join(' ').toLocaleLowerCase();
    const matches = (!search || text.includes(search)) && catalogueFields.every(field=>!catSelects[field].value || tags[field]?.includes(catSelects[field].value))
      && (!review || (review==='untagged' ? !hasTags : review==='reviewed' ? !!tags.reviewed : hasTags && !tags.reviewed));
    card.hidden = !matches;
    if (matches) visible++;
    card.draggable = !catalogueRestricted() || document.body.classList.contains('playlist-mode');
    card.querySelector('.library-drag-handle').hidden = catalogueRestricted();
    libraryGrid.append(card);
  }
  catElement('catalogCount').textContent = `${visible} of ${videoListCache.length} videos${visible===0 ? ' · Try clearing a filter.' : ''}${catalogueRestricted() ? ' · Clear filters and choose My order to reorder.' : ''}`;
}
window.updateLibraryCatalogue = () => {
  for (const field of catalogueFields) {
    const selected = catSelects[field].value;
    const values = [...new Set(videoListCache.flatMap(video=>video.catalog?.[field] || []))].sort((a,b)=>a.localeCompare(b));
    catSelects[field].replaceChildren(new Option('All '+field,''), ...values.map(value=>new Option(value,value)));
    if (values.includes(selected)) catSelects[field].value = selected;
  }
  for (const card of libraryGrid.children) {
    const video = videoListCache.find(video=>video.filename===card.dataset.filename);
    if (!video) continue;
    card.querySelectorAll('.catalog-summary,.catalog-edit').forEach(element=>element.remove());
    const summary = document.createElement('span'); summary.className='catalog-summary';
    summary.textContent = catalogueFields.flatMap(field=>video.catalog?.[field] || []).join(' · ') || 'Untagged';
    const edit = document.createElement('button'); edit.type='button';edit.className='catalog-edit'; edit.textContent='Edit tags';
    edit.setAttribute('aria-label','Edit tags for '+video.filename);
    edit.onclick = event => {event.stopPropagation();openCatalogueEditor(video);};
    card.querySelector('.label').append(summary,edit);
  }
  applyCatalogueFilters();
};
function catalogueFormData() {
  const data={filename:catalogueEditing,notes:catElement('catalogEditNotes').value,reviewed:catElement('catalogEditReviewed').checked};
  for(const field of catalogueFields)data[field]=catElement('catalogEdit'+field[0].toUpperCase()+field.slice(1)).value.split(',').map(value=>value.trim()).filter(Boolean);
  return data;
}
function syncCatalogueChips(field) {
  const suffix=field[0].toUpperCase()+field.slice(1), input=catElement('catalogEdit'+suffix), host=catElement('catalogChips'+suffix);
  host.replaceChildren();
  const values=input.value.split(',').map(value=>value.trim()).filter(Boolean);
  values.forEach((value,index)=>{
    const remove=document.createElement('button');remove.type='button';remove.textContent=value+' ×';remove.setAttribute('aria-label','Remove '+value+' from '+field);
    remove.onclick=()=>{values.splice(index,1);input.value=values.join(', ');syncCatalogueChips(field);};host.append(remove);
  });
}
async function openCatalogueEditor(video, queue=null) {
  const token=++catalogueEditorToken;
  catalogueEditing = video.filename;
  catalogueEditingRevision=null;
  catalogueQueue=queue||window.tagManagerReviewQueue?.()||[...libraryGrid.children].filter(card=>!card.hidden).map(card=>card.dataset.filename);
  if(!catalogueQueue.includes(video.filename))catalogueQueue=[video.filename,...catalogueQueue];
  catalogueQueueIndex=catalogueQueue.indexOf(video.filename);
  catElement('catalogEditName').textContent = video.filename;
  catElement('catalogReviewPosition').textContent=`Video ${catalogueQueueIndex+1} of ${catalogueQueue.length}`;
  catElement('catalogPrevious').disabled=catalogueQueueIndex<=0;catElement('catalogNext').disabled=catalogueQueueIndex>=catalogueQueue.length-1;
  catElement('catalogSaveNext').textContent=catalogueQueueIndex>=catalogueQueue.length-1?'Save & finish':'Save & next video';
  catElement('catalogEditStatus').textContent='Loading latest saved tags…';
  catalogueDialog.querySelectorAll('input,textarea,select,button[type=submit],.catalog-chips button').forEach(element=>element.disabled=true);
  const preview=catElement('catalogEditVideo');preview.pause();preview.removeAttribute('src');preview.poster='/thumbnail/'+encodeURIComponent(video.filename);preview.load();
  if(!catalogueDialog.open)catalogueDialog.showModal();
  catElement('catalogPreviewStatus').textContent='Loading preview…';
  compatibleVideoSource(video.filename,message=>{if(token===catalogueEditorToken)catElement('catalogPreviewStatus').textContent=message;}).then(url=>{
    if(token!==catalogueEditorToken)return;preview.src=url;preview.load();preview.play().then(()=>{if(token===catalogueEditorToken)catElement('catalogPreviewStatus').textContent='Private review preview · does not affect playout.';}).catch(()=>{if(token===catalogueEditorToken)catElement('catalogPreviewStatus').textContent='Tap Play to review this video.';});
  }).catch(error=>{if(token===catalogueEditorToken)catElement('catalogPreviewStatus').textContent=error.message;});
  try {
    const response=await fetch('/api/library-catalog');if(!response.ok)throw new Error('Could not load saved tags.');
    const snapshot=await response.json();if(token!==catalogueEditorToken)return;
    const saved=snapshot.videos[video.filename]||{};catalogueEditingRevision=snapshot.revision??0;
    for(const field of catalogueFields){
      const suffix=field[0].toUpperCase()+field.slice(1);catElement('catalogEdit'+suffix).value=(saved[field]||[]).join(', ');syncCatalogueChips(field);
      const known=[...new Set(Object.values(snapshot.videos).flatMap(entry=>entry[field]||[]))].sort((a,b)=>a.localeCompare(b));
      catElement('catalogPick'+suffix).replaceChildren(new Option('Add an existing '+({themes:'theme',colours:'colour',types:'visual type'}[field])+'…',''),...known.map(tag=>new Option(tag,tag)));
    }
    catElement('catalogEditNotes').value=saved.notes||'';catElement('catalogEditReviewed').checked=!!saved.reviewed;
    catalogueDialog.querySelectorAll('input,textarea,select,button[type=submit]').forEach(element=>element.disabled=false);
    catalogueOriginalForm=JSON.stringify(catalogueFormData());catElement('catalogEditStatus').textContent=saved.source==='visual-draft'?'Initial visual suggestions · correct any labels that do not fit.':'';
  }catch(error){if(token===catalogueEditorToken)catElement('catalogEditStatus').textContent=error.message;}
}
catElement('catalogCancel').onclick=()=>catalogueDialog.close();
catalogueDialog.addEventListener('close',()=>{catalogueEditorToken++;const video=catElement('catalogEditVideo');video.pause();video.removeAttribute('src');video.load();});
function nextCatalogueVideo(direction){
  if(catalogueEditingRevision!==null&&JSON.stringify(catalogueFormData())!==catalogueOriginalForm){catElement('catalogEditStatus').textContent='Save these changes first, or Cancel to discard them.';return;}
  const filename=catalogueQueue[catalogueQueueIndex+direction];const video=window.tagManagerVideo?.(filename)||videoListCache.find(video=>video.filename===filename);if(video)openCatalogueEditor(video,catalogueQueue);
}
catElement('catalogPrevious').onclick=()=>nextCatalogueVideo(-1);catElement('catalogNext').onclick=()=>nextCatalogueVideo(1);
catElement('catalogReload').onclick=()=>{const video=window.tagManagerVideo?.(catalogueEditing)||videoListCache.find(video=>video.filename===catalogueEditing);if(video)openCatalogueEditor(video,catalogueQueue);};
for(const field of catalogueFields){const suffix=field[0].toUpperCase()+field.slice(1);catElement('catalogEdit'+suffix).oninput=()=>syncCatalogueChips(field);catElement('catalogPick'+suffix).onchange=event=>{const input=catElement('catalogEdit'+suffix), values=input.value.split(',').map(value=>value.trim()).filter(Boolean);if(event.target.value&&!values.some(value=>value.toLocaleLowerCase()===event.target.value.toLocaleLowerCase()))values.push(event.target.value);input.value=values.join(', ');event.target.value='';syncCatalogueChips(field);};}
catElement('catalogManage').onclick=()=>window.openTagManager?.();
catElement('catalogForm').onsubmit=async event=>{
  event.preventDefault();
  if(catalogueEditingRevision===null)return;
  const advance=event.submitter?.id==='catalogSaveNext';
  const filename = catalogueEditing;
  const data={...catalogueFormData(),expectedRevision:catalogueEditingRevision};
  catElement('catalogSave').disabled=true;
  catElement('catalogSaveNext').disabled=true;
  try {
    const response=await fetch('/api/library-catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if(response.status===409){const result=await response.json();throw new Error(result.error+' Use Reload saved tags to review the latest version.');}
    if(!response.ok) throw new Error('Could not save tags. Use up to 12 tags per field, each at most 40 characters.');
    const result=await response.json();
    const video=videoListCache.find(video=>video.filename===filename);
    if(video) video.catalog=result.catalog;
    updateLibraryCatalogue();await window.onCatalogueSaved?.(filename,result.catalog);
    if(advance&&catalogueQueueIndex<catalogueQueue.length-1){const next=catalogueQueue[catalogueQueueIndex+1];const entry=window.tagManagerVideo?.(next)||videoListCache.find(video=>video.filename===next);if(entry){openCatalogueEditor(entry,catalogueQueue);return;}}
    catalogueDialog.close();
  } catch(error){catElement('catalogEditStatus').textContent=error.message;}
  finally{if(catalogueEditingRevision!==null){catElement('catalogSave').disabled=false;catElement('catalogSaveNext').disabled=false;}}
};
catElement('catalogSearch').oninput=applyCatalogueFilters;
for(const select of [...Object.values(catSelects),catSort,catElement('catalogReview')])select.onchange=applyCatalogueFilters;
catElement('catalogClear').onclick=()=>{
  catElement('catalogSearch').value='';catElement('catalogReview').value='';catSort.value='manual';
  Object.values(catSelects).forEach(select=>select.value='');applyCatalogueFilters();
};
updateLibraryCatalogue();
