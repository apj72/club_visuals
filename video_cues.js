/* Saved ranges are metadata; playlist entries keep their own range snapshots. */
(() => {
  'use strict';
  const panel = document.createElement('section');
  panel.id = 'videoCuePanel'; panel.className = 'video-cue-panel';
  panel.setAttribute('aria-label', 'Video cue ranges');
  panel.innerHTML = `<h3>Cue ranges</h3>
    <p>Mark a section of this video to start and loop. Times refer to the original source; the video file is unchanged.</p>
    <label>Saved range<select id="videoCueSelect" aria-label="Saved cue range"></select></label>
    <div class="cue-source-bar"><span id="videoCueHighlight"></span><input id="videoCueSeek" aria-label="Source video playhead" type="range" min="0" max="1" step="0.01" value="0"></div>
    <output id="videoCueClock">Choose a video</output>
    <div class="cue-time-fields"><label>In · seconds<input id="videoCueIn" type="number" min="0" step="0.01" value="0"></label><button type="button" id="videoCueMarkIn">Set In here</button>
    <label>Out · seconds<input id="videoCueOut" type="number" min="0.1" step="0.01" placeholder="Video end"></label><button type="button" id="videoCueMarkOut">Set Out here</button></div>
    <div class="cue-actions"><button type="button" id="videoCueApply">Use range</button><button type="button" id="videoCuePreview">Preview loop</button><button type="button" id="videoCueFull">Full video</button><button type="button" id="videoCuePlaylist">Add range to playlist…</button></div>
    <label>Range name<input id="videoCueName" type="text" maxlength="80" placeholder="e.g. Build-up, main loop, ending"></label>
    <div class="cue-actions"><button type="button" id="videoCueSave">Save new range</button><button type="button" id="videoCueUpdate">Update selected</button><button type="button" id="videoCueDelete">Delete selected</button><button type="button" id="videoCueReload">Reload saved ranges</button></div>
    <p id="videoCueStatus" role="status" aria-live="polite"></p>`;
  document.getElementById('videoPresetPanel').before(panel);
  const style = document.createElement('style');
  style.textContent = `.video-cue-panel{padding:12px;margin:12px 0;border:1px solid #43594f;border-radius:8px;font:12px/1.5 system-ui;width:100%;min-width:0}.video-cue-panel p{margin:6px 0;color:#a4b2a8}.video-cue-panel label{display:grid;gap:4px;margin:7px 0;min-width:0}.video-cue-panel input:not([type=range]),.video-cue-panel select{width:100%;min-width:0;background:#111b24;color:#eee;border:1px solid #52655b;border-radius:5px;padding:8px;font:inherit}.video-cue-panel button{min-height:40px;padding:7px 9px;background:#23392e;color:#eee;border:1px solid #52655b;border-radius:5px;cursor:pointer;font:inherit}.video-cue-panel button:disabled{opacity:.45;cursor:default}.cue-time-fields{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px;align-items:end}.cue-time-fields label{margin:0}.cue-actions{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.cue-source-bar{position:relative;height:28px;margin-top:10px;background:#111b18;border-radius:5px}.cue-source-bar span{position:absolute;top:4px;bottom:4px;background:#547d35;border-radius:3px;pointer-events:none}.cue-source-bar input{position:relative;width:100%;height:100%;margin:0;accent-color:#b8ee70}.video-cue-panel output{display:block;color:#b8ee70;font-variant-numeric:tabular-nums}.cue-range-summary{color:#b8ee70;font-size:11px}`;
  document.head.append(style);
  const $ = id => document.getElementById(id);
  let filename = null, snapshot = null, token = 0, busy = false;
  const clock = value => `${Math.floor(value / 60)}:${(value % 60).toFixed(2).padStart(5, '0')}`;
  const status = text => { $('videoCueStatus').textContent = text; };
  const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  function controls() {
    panel.querySelectorAll('input,select,button').forEach(control => { control.disabled = !filename || busy; });
    for (const id of ['videoCueSave', 'videoCueUpdate', 'videoCueDelete']) $(id).disabled = !snapshot || busy;
    const selected = snapshot?.ranges.some(item => item.id === $('videoCueSelect').value);
    $('videoCueUpdate').disabled ||= !selected;
    $('videoCueDelete').disabled ||= !selected;
  }
  function populate() {
    const select = $('videoCueSelect');
    select.replaceChildren(new Option('Full video', ''), new Option('Custom / unsaved range', '__custom'),
      ...(snapshot?.ranges || []).map(item => new Option(`${item.name} · ${clock(item.sourceRange.start)} → ${item.sourceRange.end === null ? 'end' : clock(item.sourceRange.end)}`, item.id)));
  }
  window.syncVideoCueFields = () => {
    if (filename !== currentFilename) return;
    $('videoCueIn').value = sourceRange?.start ?? 0;
    $('videoCueOut').value = sourceRange?.end ?? '';
    const selected = snapshot?.ranges.find(item => same(item.sourceRange, sourceRange));
    $('videoCueSelect').value = selected?.id || (sourceRange ? '__custom' : '');
    if (selected) $('videoCueName').value = selected.name;
    controls(); updateClock();
  };
  window.fetchVideoCues = async name => {
    const response = await fetch('/api/video-cues/' + encodeURIComponent(name), {cache: 'no-store'});
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'Could not load cue ranges.');
    return data;
  };
  let choiceRun = 0;
  window.populateVideoCueSelect = async (select, name, range) => {
    const run = String(++choiceRun); select.dataset.cueRequest = run;
    select.replaceChildren(new Option('Full video', ''));
    if (range) select.add(new Option(`Custom · ${clock(range.start)} → ${range.end === null ? 'end' : clock(range.end)}`, JSON.stringify(range)));
    select.value = range ? JSON.stringify(range) : '';
    try {
      const data = await window.fetchVideoCues(name);
      if (select.dataset.cueRequest !== run || !select.isConnected) return;
      select.replaceChildren(new Option('Full video', ''), ...data.ranges.map(item => new Option(item.name, JSON.stringify(item.sourceRange))));
      const key = range ? JSON.stringify(range) : '';
      if (range && ![...select.options].some(option => option.value === key)) select.add(new Option(`Custom · ${clock(range.start)} → ${range.end === null ? 'end' : clock(range.end)}`, key));
      select.value = key;
      select.title = 'Saved source ranges for this video';
    } catch (error) { select.title = error.message; }
  };
  window.loadVideoCues = async name => {
    const run = ++token; filename = name; snapshot = null; busy = true;
    $('videoCueName').value = ''; populate(); controls(); status('Loading saved ranges…');
    try {
      const data = await window.fetchVideoCues(name);
      if (run !== token) return;
      snapshot = data; populate(); status('Choose a saved range, or mark In and Out at the playhead.');
    } catch (error) { if (run === token) status(error.message); }
    finally { if (run === token) { busy = false; window.syncVideoCueFields(); } }
  };
  function readRange() {
    if (!filename || !Number.isFinite(video.duration)) throw new Error('Wait for the video to load before marking a range.');
    const range = SourceRange.validate({start: $('videoCueIn').value === '' ? NaN : Number($('videoCueIn').value), end: $('videoCueOut').value === '' ? null : Number($('videoCueOut').value)});
    if (range.start >= video.duration - .099 || (range.end !== null && range.end > video.duration + .001)) throw new Error('Keep In and Out within this video.');
    return range;
  }
  function apply() {
    const range = readRange(); setPlaybackRange(range, true);
    status(`Using ${clock(range.start)} → ${range.end === null ? 'video end' : clock(range.end)}. Choose Loop or Preview loop to repeat it.`);
    return range;
  }
  function act(callback) { return async () => { try { await callback(); } catch (error) { status(error.message); } }; }
  $('videoCueApply').onclick = act(apply);
  $('videoCuePreview').onclick = act(() => { apply(); setLoopMode(1); return video.play(); });
  $('videoCueFull').onclick = () => { setPlaybackRange(null, true); status('Using the full video. Saved ranges are kept.'); };
  $('videoCueMarkIn').onclick = () => { $('videoCueIn').value = video.currentTime.toFixed(2); };
  $('videoCueMarkOut').onclick = () => { $('videoCueOut').value = video.currentTime.toFixed(2); };
  $('videoCueSeek').oninput = () => { video.pause(); stopBounce(); video.currentTime = Number($('videoCueSeek').value); };
  $('videoCueSelect').onchange = act(() => {
    const selected = snapshot?.ranges.find(item => item.id === $('videoCueSelect').value);
    if (selected) { setPlaybackRange(selected.sourceRange, true); $('videoCueName').value = selected.name; status(`Using saved range “${selected.name}”.`); }
    else if (!$('videoCueSelect').value) $('videoCueFull').click();
    controls();
  });
  $('videoCuePlaylist').onclick = act(() => { apply(); openLibraryPlaylistDialog(filename); });
  $('videoCueReload').onclick = () => window.loadVideoCues(currentFilename);
  async function save(action) {
    if (!snapshot || busy) return;
    const target = filename, run = token, selected = $('videoCueSelect').value;
    let ranges = snapshot.ranges;
    if (action === 'delete') ranges = ranges.filter(item => item.id !== selected);
    else {
      const name = $('videoCueName').value.trim();
      if (!name) throw new Error('Give this range a name.');
      const source = readRange();
      const item = {id: action === 'update' ? selected : globalThis.crypto?.randomUUID?.() || `range-${Date.now()}`, name, sourceRange: source};
      ranges = action === 'update' ? ranges.map(old => old.id === selected ? item : old) : [...ranges, item];
    }
    busy = true; controls(); status('Saving cue ranges…');
    try {
      const response = await fetch('/api/video-cues/' + encodeURIComponent(target), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({expectedRevision: snapshot.revision, ranges})});
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not save the cue range.');
      if (run !== token) return;
      snapshot = data; populate();
      if (action !== 'delete') setPlaybackRange(readRange(), true);
      window.syncVideoCueFields(); status(action === 'delete' ? 'Saved range deleted. Existing playlist clips keep their In and Out times.' : 'Range saved for this video and shared with other screens.');
    } finally { if (run === token) { busy = false; controls(); } }
  }
  $('videoCueSave').onclick = act(() => save('new'));
  $('videoCueUpdate').onclick = act(() => save('update'));
  $('videoCueDelete').onclick = act(() => save('delete'));
  function updateClock() {
    const duration = Number.isFinite(video.duration) ? video.duration : 0;
    $('videoCueClock').textContent = `${clock(video.currentTime || 0)} / ${clock(duration)}`;
    $('videoCueSeek').max = duration || 1; $('videoCueSeek').value = video.currentTime || 0;
    const range = SourceRange.bounds(sourceRange, duration);
    $('videoCueHighlight').style.left = `${duration ? range.start / duration * 100 : 0}%`;
    $('videoCueHighlight').style.width = `${duration ? ((range.end ?? duration) - range.start) / duration * 100 : 100}%`;
  }
  video.addEventListener('timeupdate', updateClock);
  video.addEventListener('loadedmetadata', updateClock);
  populate(); controls();
  if (currentFilename) window.loadVideoCues(currentFilename);
})();
