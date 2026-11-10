// Shared tags organise the library; filters never change the live player.
const catalogueFields = ['themes', 'colours', 'types'];
const catalogueTools = document.createElement('section');
catalogueTools.className = 'catalog-tools';
catalogueTools.setAttribute('aria-label', 'Browse video categories');
catalogueTools.innerHTML = `<input id="catalogSearch" type="search" placeholder="Search videos and tags…" aria-label="Search videos and tags">
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
  <p>Separate multiple tags with commas. Tags are shared by the Mac and iPad.</p>
  <label>Themes<input id="catalogEditThemes" maxlength="480" placeholder="Psychedelic, Portraits & people"></label>
  <label>Colours<input id="catalogEditColours" maxlength="480" placeholder="Purple, Blue, Multicolour"></label>
  <label>Visual types<input id="catalogEditTypes" maxlength="480" placeholder="3D animation, Mixed media"></label>
  <label>Notes<textarea id="catalogEditNotes" maxlength="300" rows="2"></textarea></label>
  <label class="catalog-check"><input type="checkbox" id="catalogEditReviewed" checked> Reviewed these labels</label>
  <p id="catalogEditStatus" role="status"></p><div><button type="submit" id="catalogSave">Save tags</button>
  <button type="button" id="catalogCancel">Cancel</button></div></form>`;
document.body.append(catalogueDialog);
const catalogueStyle = document.createElement('style');
catalogueStyle.textContent = `.catalog-tools{padding:10px;background:#111b30;border:1px solid #35465d;border-radius:8px;margin-bottom:10px;font:12px system-ui}.catalog-tools input,.catalog-tools select{width:100%;min-width:0;padding:8px;background:#1c2c46;color:#eee;border:1px solid #536278;border-radius:4px;font:inherit}.catalog-filters{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.catalog-filters label{min-width:0;display:grid;gap:4px}.catalog-tools button,.catalog-edit{background:#213a46;color:#b9f5e5;border:1px solid #558c8c;border-radius:4px;padding:8px;font:inherit;cursor:pointer}.catalog-tools p{margin-top:8px}#catalogHint{font-size:11px;color:#93a7bf}.library-item[hidden]{display:none}.catalog-summary{display:block;white-space:normal;color:#83cbbd;font-size:10px;line-height:1.4;margin-top:4px}.catalog-edit{display:block;margin-top:5px;min-height:32px;padding:5px 8px;font-size:11px}.catalog-dialog{width:min(520px,94vw);max-height:90vh;overflow:auto;margin:auto;padding:20px;border:1px solid #5fcab2;border-radius:10px;background:#182333;color:white}.catalog-dialog::backdrop{background:#000a}.catalog-dialog label{display:grid;gap:5px;margin:12px 0}.catalog-dialog input:not([type=checkbox]),.catalog-dialog textarea{padding:10px;border:1px solid #73849d;border-radius:4px;background:#101b2c;color:white;font:inherit;width:100%}.catalog-dialog p{font-size:12px;margin:8px 0;color:#b8cbd8}.catalog-dialog .catalog-check{display:flex;align-items:center;gap:8px}.catalog-dialog button{padding:10px;margin-right:8px;border-radius:5px;cursor:pointer}.catalog-dialog h3{margin-bottom:8px}`;
document.head.append(catalogueStyle);
const catElement = id => document.getElementById(id);
let catalogueEditing = null;
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
function openCatalogueEditor(video) {
  catalogueEditing = video.filename;
  catElement('catalogEditName').textContent = video.filename;
  for (const field of catalogueFields) catElement('catalogEdit'+field[0].toUpperCase()+field.slice(1)).value=(video.catalog?.[field]||[]).join(', ');
  catElement('catalogEditNotes').value=video.catalog?.notes || '';
  catElement('catalogEditReviewed').checked=!!video.catalog?.reviewed;
  catElement('catalogEditStatus').textContent='';
  catalogueDialog.showModal();
}
catElement('catalogCancel').onclick=()=>catalogueDialog.close();
catElement('catalogForm').onsubmit=async event=>{
  event.preventDefault();
  const filename = catalogueEditing;
  const data={filename,notes:catElement('catalogEditNotes').value,reviewed:catElement('catalogEditReviewed').checked};
  for (const field of catalogueFields) data[field]=catElement('catalogEdit'+field[0].toUpperCase()+field.slice(1)).value.split(',').map(value=>value.trim()).filter(Boolean);
  catElement('catalogSave').disabled=true;
  try {
    const response=await fetch('/api/library-catalog',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    if(!response.ok) throw new Error('Could not save tags. Use up to 12 tags per field, each at most 40 characters.');
    const result=await response.json();
    const video=videoListCache.find(video=>video.filename===filename);
    if(video) video.catalog=result.catalog;
    updateLibraryCatalogue();catalogueDialog.close();
  } catch(error){catElement('catalogEditStatus').textContent=error.message;}
  finally{catElement('catalogSave').disabled=false;}
};
catElement('catalogSearch').oninput=applyCatalogueFilters;
for(const select of [...Object.values(catSelects),catSort,catElement('catalogReview')])select.onchange=applyCatalogueFilters;
catElement('catalogClear').onclick=()=>{
  catElement('catalogSearch').value='';catElement('catalogReview').value='';catSort.value='manual';
  Object.values(catSelects).forEach(select=>select.value='');applyCatalogueFilters();
};
updateLibraryCatalogue();
