/* Visual recipe authoring; generated results use the ordinary playlist player. */
(() => {
  'use strict';
  if (isMacEngine) return;
  const C = ShowModels, $ = id => document.getElementById(id);
  const uid = () => globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const root = document.createElement('section'); root.id = 'showBuilder'; root.setAttribute('aria-label', 'Show Builder');
  $('macEditorControls').append(root);
  let library, revision = 0, dirty = false, videos = [], playlists = [], tab = 'assemble';
  let modelId, profileId, brickId, stepIndex = 0, selectedSection = 0, result = null, savedSlug = '', editorBackup = null;
  let mode = 'fresh', seed = '1', excludedSlug = '', bindings = {}, kept = new Set(), message = '', error = false, busy = false;
  let currentFileInput;
  const reviewPlayer = document.querySelector('.player-section');
  const playerHome = document.createComment('Show review player home'); reviewPlayer.before(playerHome);
  const review = {time: 0, scale: 3, active: false, nodes: null, timer: 0, run: 0, undo: null, previous: null,
    playing: false, starting: false, frame: 0, boundResult: null, drafts: new Map()};
  video.addEventListener('play', () => { if (review.active && (!review.playing || review.starting)) video.pause(); });
  const model = () => library.models.find(m => m.id === modelId);
  const profile = () => library.profiles.find(p => p.id === profileId);
  const brick = () => library.bricks.find(b => b.id === brickId);
  const viewNames = {single: '1× · single', dual: '2× · dual', triple: '3× · triple', quad: '4× · four tiles', six: '6× · six tiles', octo: '8× · eight tiles'};
  const time = seconds => {
    const n = Math.round(seconds); return `${Math.floor(n / 3600) ? Math.floor(n / 3600) + ':' + String(Math.floor(n % 3600 / 60)).padStart(2, '0') : Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
  };
  const duration = seconds => { const minutes = Math.round(seconds / 60); return minutes >= 60 ? `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}m` : ''}` : `${minutes} min`; };
  function el(tag, className = '', text = '') {
    const node = document.createElement(tag); node.className = className; if (text !== '') node.textContent = text; return node;
  }
  function report(text, isError = false) {
    message = text; error = isError;
    const status = $('sbStatus');
    if (status) { status.textContent = text; status.classList.toggle('sb-error', isError); }
  }
  function run(callback) {
    return async event => { try { await callback(event); } catch (e) { report(e.message || 'The action could not be completed.', true); } };
  }
  function button(text, callback, className = '', label = '') {
    const node = el('button', className, text); node.type = 'button'; if (label) node.setAttribute('aria-label', label);
    node.addEventListener('click', run(callback)); return node;
  }
  function input(value, callback, type = 'text', attrs = {}) {
    const node = el('input'); node.type = type; node.value = value;
    Object.assign(node, attrs);
    node.addEventListener('change', run(() => callback(type === 'number' ? Number(node.value) : node.value))); return node;
  }
  function select(value, options, callback) {
    const node = el('select');
    for (const [key, text] of options) node.add(new Option(text, key));
    node.value = value; node.addEventListener('change', run(() => callback(node.value))); return node;
  }
  function field(text, control, className = '') {
    control.setAttribute('aria-label', text);
    const label = el('label', `sb-field ${className}`); label.append(el('span', '', text), control); return label;
  }
  function check(text, value, callback) {
    const node = el('input'); node.type = 'checkbox'; node.checked = value;
    node.addEventListener('change', run(() => callback(node.checked)));
    const label = el('label', 'sb-check'); label.append(node, document.createTextNode(text)); return label;
  }
  function row(...children) { const node = el('div', 'sb-row'); node.append(...children); return node; }
  function panel(title, subtitle = '') {
    const node = el('section', 'sb-panel'); node.append(el('h2', '', title));
    if (subtitle) node.append(el('p', 'sb-muted', subtitle)); return node;
  }
  function changed(renderNow = true) {
    dirty = true; message = '';
    if (renderNow) render();
    else {
      if($('sbSave'))$('sbSave').textContent='Save changes •';
      const state=root.querySelector('.sb-save-state');if(state)state.textContent='Unsaved changes';
    }
  }
  function pool() { return orderedLibraryVideos(C.eligible(videos, profile())); }
  function layoutIcon(view, preset = 1) {
    const mode = C.views.indexOf(view), maps = {0: [0], 1: DUAL_POS_MAP, 2: TRIPLE_POS_MAP, 3: QUAD_POS_MAP, 4: [0, 1, 2, 3, 4, 5, 6, 7], 5:SIX_POS_MAP};
    const node = el('span', 'sb-layout-icon'); node.style.setProperty('--cols', [1, 2, 3, 2, 4, 3][mode] || 1); node.setAttribute('aria-hidden', 'true');
    for (const i of maps[mode] || [0]) {
      const cell = el('span'), marker = el('b', '', 'F'); marker.style.transform = CONFIGS[preset - 1]?.[i] || ''; cell.append(marker); node.append(cell);
    }
    return node;
  }
  async function request(path, options) {
    const response = await fetch(path, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`); return data;
  }
  async function refreshMedia() {
    [videos, playlists] = await Promise.all([request('/api/videos'), request('/api/playlists')]);
  }
  async function load() {
    const data = await request('/api/show-library');
    const incoming = data.library || C.defaults();
    C.validate(incoming, Object.keys(TRANSITION_NAMES));
    library = incoming; revision = data.revision;
    modelId = library.models[0]?.id; profileId = library.profiles[0]?.id; brickId = library.bricks[0]?.id;
    if (!modelId || !profileId || !brickId) throw new Error('Library needs at least one model, brick and DJ profile. Import a complete library.');
    dirty = !data.library; bindings = {}; kept.clear();
    render();
  }
  async function save() {
    C.validate(library, Object.keys(TRANSITION_NAMES));
    const data = await request('/api/show-library', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({revision, library})});
    revision = data.revision; dirty = false; render(); report('Saved models, bricks and DJ profiles on this Mac.');
  }
  function download(value, name) {
    const a = el('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify(value, null, 2)], {type: 'application/json'})); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function move(items, from, to) {
    if (to < 0 || to >= items.length) return;
    items.splice(to, 0, items.splice(from, 1)[0]); changed();
  }
  function resetVersion() { kept.clear(); bindings = {}; selectedSection = 0; }
  function render() {
    if (!library) return;
    parkReviewPlayer();
    if (tab !== 'generated' || document.body.dataset.workspace !== 'builder') releaseReview();
    root.replaceChildren();
    const toolbar = el('div', 'sb-toolbar');
    const chooseModel = select(modelId, library.models.map(m => [m.id, m.name]), value => { modelId = value; resetVersion(); render(); }); chooseModel.id = 'sbModel';
    toolbar.append(field('Show model', chooseModel), button('+ New model', () => {
      const next = {id: uid(), name: 'Untitled show', minutes: 180, sections: [{id: uid(), name: 'Opening', weight: 1, bricks: [brickId]}]};
      library.models.push(next); modelId = next.id; resetVersion(); tab = 'assemble'; changed();
    }), button('Duplicate model', () => {
      const next = C.clone(model()); next.id = uid(); next.name += ' copy'; next.sections.forEach(s => { s.id = uid(); });
      library.models.push(next); modelId = next.id; resetVersion(); changed();
    }));
    const saveButton = button(dirty ? 'Save changes •' : 'Save library', save, 'sb-primary'); saveButton.id = 'sbSave';
    toolbar.append(el('span', 'sb-spacer'), el('span', 'sb-save-state', dirty ? 'Unsaved changes' : `Saved library · revision ${revision}`), saveButton);
    const nav = el('nav', 'sb-tabs'); nav.setAttribute('aria-label', 'Show Builder tools');
    for (const [key, text] of [['assemble', '1  Assemble'], ['bricks', '2  Edit bricks'], ['profiles', '3  DJ profiles'], ['generated', '4  Generated show']]) {
      const b = button(text, () => { tab = key; render(); root.scrollTop = 0; }, tab === key ? 'selected' : ''); b.dataset.builderTab = key; b.setAttribute('aria-current', tab === key ? 'page' : 'false'); nav.append(b);
    }
    const status = el('p', `sb-status${error ? ' sb-error' : ''}`, message); status.id = 'sbStatus'; status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    root.append(toolbar, nav, status);
    const content = el('div', 'sb-workspace');
    if (tab === 'assemble') content.append(shelf(), assembly(), generator());
    if (tab === 'bricks') content.append(shelf(), brickEditor());
    if (tab === 'profiles') content.append(profiles());
    if (tab === 'generated') content.append(generated());
    root.append(content);
    const footer = el('div', 'sb-footer');
    footer.append(el('span', '', 'Models → reusable structure   ·   DJ profiles → taste and branding   ·   Playlists → fixed, editable performances'),
      button('Download library', () => download(library, 'club-visuals-show-models.json')),
      button('Import library', () => currentFileInput.click()),
      button('Reload saved', async () => { if (dirty) download(library, 'club-visuals-unsaved-draft.json'); await load(); report('Loaded the saved library. Any unsaved draft was downloaded first.'); }));
    currentFileInput = el('input'); currentFileInput.type = 'file'; currentFileInput.accept = '.json,application/json'; currentFileInput.hidden = true;
    currentFileInput.addEventListener('change', run(async () => {
      const file = currentFileInput.files[0]; if (!file) return;
      if (file.size > 4000000) throw new Error('Library must be under 4 MB.');
      const incoming = JSON.parse(await file.text()); C.validate(incoming, Object.keys(TRANSITION_NAMES));
      if (!incoming.models.length || !incoming.bricks.length || !incoming.profiles.length) throw new Error('Import needs a model, a brick and a DJ profile.');
      if (dirty) download(library, 'club-visuals-before-import.json');
      library = incoming; modelId = library.models[0].id; brickId = library.bricks[0].id; profileId = library.profiles[0].id; resetVersion(); changed(); report('Imported as a draft. Save changes to share it with other screens.');
    }));
    footer.append(currentFileInput); root.append(footer);
  }
  function shelf() {
    const node = panel('Your bricks', 'Drag into a section, or use +. Edit a brick once and reuse it across shows.'); node.classList.add('sb-shelf');
    node.append(button('+ New brick', () => {
      const next = {id: uid(), name: 'New brick', colour: 'sage', steps: [C.step('Main', 30, 'quad', 15)]};
      library.bricks.push(next); brickId = next.id; stepIndex = 0; tab = 'bricks'; changed();
    }));
    for (const b of library.bricks) {
      const card = el('article', `sb-brick sb-${b.colour || 'sage'}${b.id === brickId ? ' selected' : ''}`); card.draggable = true; card.dataset.brick = b.id;
      card.addEventListener('dragstart', event => { event.dataTransfer.setData('application/x-show-brick', b.id); event.dataTransfer.effectAllowed = 'copy'; });
      const art = el('div', 'sb-brick-art'); for (const s of b.steps.slice(0, 4)) art.append(layoutIcon(s.view, s.preset));
      card.append(art, el('strong', '', b.name), el('small', '', `${time(b.steps.reduce((sum, s) => sum + s.seconds, 0))} · ${b.steps.length} steps · ${new Set(b.steps.map(s => s.slot)).size} video slots`));
      card.append(row(button('Edit', () => { brickId = b.id; stepIndex = 0; tab = 'bricks'; render(); }, '', `Edit ${b.name}`), button('+', () => {
        model().sections[Math.min(selectedSection, model().sections.length - 1)].bricks.push(b.id); tab = 'assemble'; changed();
      }, '', `Add ${b.name} to selected section`)));
      node.append(card);
    }
    return node;
  }
  function assembly() {
    const m = model(), node = panel('The show model', 'Sections divide the total show time by their shares. The arranged bricks repeat within each section; the last step trims to fit exactly.'); node.classList.add('sb-assembly');
    const name = input(m.name, value => { m.name = value; changed(); }); name.id = 'sbModelName';
    const minutes = input(m.minutes, value => { m.minutes = value; kept.clear(); changed(); }, 'number', {min: 1, max: 1440, step: 1}); minutes.id = 'sbMinutes';
    node.append(row(field('Model name', name), field('Show length · minutes', minutes)));
    const ranges = m.minutes > 0 && m.sections.every(s => s.weight > 0) ? C.sectionTimes(m, m.minutes) : [];
    const overview = el('div', 'sb-overview'); overview.setAttribute('aria-label', 'Show section proportions');
    m.sections.forEach((s, i) => {
      const b = button(`${s.name} · ${duration((ranges[i]?.end || 0) - (ranges[i]?.start || 0))}`, () => { selectedSection = i; render(); }, `sb-section-colour-${i % 4}`);
      b.style.flex = `${Math.max(.1, s.weight)} 1 0`; overview.append(b);
    }); node.append(overview);
    m.sections.forEach((s, index) => {
      const section = el('article', `sb-section${selectedSection === index ? ' selected' : ''}`); section.dataset.section = s.id;
      section.addEventListener('click', event => { if (event.target.closest('button,input,select,label')) return; selectedSection = index; render(); });
      section.addEventListener('dragover', event => { if (event.dataTransfer.types.includes('application/x-show-brick') || event.dataTransfer.types.includes('application/x-show-placement')) { event.preventDefault(); section.classList.add('sb-drop'); } });
      section.addEventListener('dragleave', event => { if (!section.contains(event.relatedTarget)) section.classList.remove('sb-drop'); });
      section.addEventListener('drop', run(event => {
        event.preventDefault(); section.classList.remove('sb-drop');
        const id = event.dataTransfer.getData('application/x-show-brick');
        if (library.bricks.some(b => b.id === id)) { s.bricks.push(id); selectedSection = index; changed(); return; }
        const placement = event.dataTransfer.getData('application/x-show-placement');
        if (placement) {
          const {sectionId, at} = JSON.parse(placement), source = m.sections.find(s => s.id === sectionId);
          if (!source || !Number.isInteger(at) || !source.bricks[at]) return;
          if (source !== s && source.bricks.length === 1) throw new Error('Keep at least one brick in each section.');
          const targetChip = event.target.closest('[data-placement]');
          let destination = targetChip ? Number(targetChip.dataset.placement) : s.bricks.length;
          if (source === s && at < destination) destination--;
          s.bricks.splice(destination, 0, source.bricks.splice(at, 1)[0]); selectedSection = index; changed();
        }
      }));
      const title = input(s.name, value => { s.name = value; changed(); }); title.setAttribute('aria-label', `Section ${index + 1} name`);
      const weight = input(s.weight, value => { s.weight = value; kept.clear(); changed(); }, 'number', {min: .1, max: 100, step: .5});
      section.append(row(el('span', 'sb-section-number', String(index + 1).padStart(2, '0')), field('Section name', title), field('Shares', weight), el('strong', 'sb-range', ranges[index] ? `${time(ranges[index].start)} – ${time(ranges[index].end)}` : 'Check duration')));
      const chain = el('div', 'sb-chain');
      s.bricks.forEach((id, at) => {
        const b = library.bricks.find(b => b.id === id), chip = el('div', `sb-placement sb-${b?.colour || 'sage'}`); chip.draggable = true; chip.dataset.placement = at;
        chip.addEventListener('dragstart', event => { event.stopPropagation(); event.dataTransfer.setData('application/x-show-placement', JSON.stringify({sectionId: s.id, at})); event.dataTransfer.effectAllowed = 'move'; });
        chip.append(layoutIcon(b?.steps[0].view || 'single', b?.steps[0].preset), el('strong', '', b?.name || 'Missing brick'));
        chip.append(field('Swap brick', select(id, library.bricks.map(b => [b.id, b.name]), value => { s.bricks[at] = value; changed(); })));
        chip.append(row(button('←', () => move(s.bricks, at, at - 1), '', `Move brick ${at + 1} earlier`), button('→', () => move(s.bricks, at, at + 1), '', `Move brick ${at + 1} later`), button('Edit', () => { brickId = id; stepIndex = 0; tab = 'bricks'; render(); }), button('×', () => {
          if (s.bricks.length === 1) throw new Error('Add another brick before removing this one.'); s.bricks.splice(at, 1); changed();
        }, '', `Remove brick ${at + 1} from ${s.name}`)));
        chain.append(chip);
      });
      chain.append(button('+ Add brick', () => { s.bricks.push(brickId); selectedSection = index; changed(); }, 'sb-add-brick'));
      section.append(chain, row(el('span', 'sb-muted', '↻ Repeat this chain to fill the section'), el('span', 'sb-spacer'), button('↑', () => move(m.sections, index, index - 1), '', `Move ${s.name} earlier`), button('↓', () => move(m.sections, index, index + 1), '', `Move ${s.name} later`), button('Save chain as brick', () => {
        const steps = s.bricks.flatMap((id, i) => C.clone(library.bricks.find(b => b.id === id).steps).map(step => ({...step, slot: `${i + 1} ${step.slot}`})));
        if (steps.length > 100) throw new Error('A reusable brick can contain up to 100 steps.');
        const b = {id: uid(), name: `${s.name} chain`, colour: 'blue', steps}; library.bricks.push(b); brickId = b.id; changed(); report('Saved the arranged chain as a reusable brick.');
      }), button('Remove section', () => {
        if (m.sections.length === 1) throw new Error('Keep at least one section.'); m.sections.splice(index, 1); selectedSection = 0; kept.clear(); changed();
      })));
      node.append(section);
    });
    node.append(button('+ Add section', () => { m.sections.push({id: uid(), name: 'New section', weight: 1, bricks: [brickId]}); selectedSection = m.sections.length - 1; kept.clear(); changed(); }));
    return node;
  }
  function generator() {
    const p = profile(), node = panel('Make an edition', 'Choose a DJ and a variation. Generating creates a private draft; saving and sending to the Mac remain separate actions.'); node.classList.add('sb-generator');
    const chooseProfile = select(profileId, library.profiles.map(p => [p.id, p.name]), value => { profileId = value; render(); }); chooseProfile.id = 'sbProfile';
    const variant = input(seed, value => { seed = value; }, 'text', {maxLength: 120}); variant.id = 'sbSeed';
    node.append(field('DJ profile', chooseProfile), button('Edit DJ profile', () => { tab = 'profiles'; render(); }), field('Variation / seed', variant), button('New variation', () => { seed = String(Date.now()); render(); }));
    const modes = [['fresh', 'Generate from this model'], ['media', 'Replace videos · keep choreography']];
    node.append(field('Generation mode', select(mode, modes, value => { mode = value; render(); })));
    if (mode === 'media') node.append(el('p', 'sb-muted', 'Uses the last generated or loaded edition. Timing, layout and effect choreography stay fixed; profile pacing is ignored.'));
    node.append(field('Exclude videos used in', select(excludedSlug, [['', 'No previous-show exclusion'], ...playlists.map(p => [p.slug, p.name])], value => { excludedSlug = value; render(); })));
    const count = pool().length;
    const stats = el('div', 'sb-pool'); stats.append(el('strong', '', String(count)), el('span', '', `eligible videos · ${p.avoidRepeat} slot repeat window`)); node.append(stats);
    node.append(el('p', 'sb-muted', 'Pool count is before previous-show exclusion. Reused slots inside a brick deliberately share one video. A new brick occurrence selects again.'));
    const pins = el('details', 'sb-pins'); pins.append(el('summary', '', 'Pin video slots (optional)'));
    pins.append(el('p', 'sb-muted', 'Auto chooses fresh videos per brick occurrence. A pinned slot uses that video every time, overriding the repeat window.'));
    const ids = new Set(model().sections.flatMap(s => s.bricks));
    for (const id of ids) {
      const b = library.bricks.find(b => b.id === id);
      for (const slot of new Set(b.steps.map(s => s.slot))) {
        const key = `${id}:${slot}`;
        pins.append(field(`${b.name} / ${slot}`, select(bindings[key] || '', [['', 'Auto · use DJ profile'], ...pool().map(v => [v.filename, playlistVideoName(v.filename)])], value => { if (value) bindings[key] = value; else delete bindings[key]; })));
      }
    }
    node.append(pins);
    const generate = button(busy ? 'Generating…' : result ? 'Generate new version' : 'Generate show', makeShow, 'sb-primary'); generate.id = 'sbGenerate'; generate.disabled = busy; node.append(generate);
    if (result) node.append(button('View generated show', () => { tab = 'generated'; render(); }), el('p', 'sb-muted', `${kept.size} sections kept from the last generated version.`));
    return node;
  }
  async function makeShow() {
    if (busy) return;
    requireAppliedChanges();
    busy = true; report('Resolving videos and building the show…');
    try {
      await refreshMedia();
      let excluded = [];
      if (excludedSlug) excluded = (await request('/api/playlist/' + encodeURIComponent(excludedSlug))).entries.map(e => e.video);
      const next = C.generate(library, modelId, profileId, videos, {seed, minutes: mode === 'media' && result ? result.generation.minutes : model().minutes, mode, bindings, excluded, previous: result, keepSections: [...kept], transitionIds: Object.keys(TRANSITION_NAMES)});
      result = next; savedSlug = ''; review.time = 0; review.undo = null; tab = 'generated'; render(); root.scrollTop = 0;
      report(`Generated ${duration(next.entries.reduce((sum, e) => sum + e.duration.value, 0))} with ${next.entries.length} clips. Nothing has been sent to the Mac.`);
    } finally { busy = false; render(); }
  }
  function brickEditor() {
    const b = brick(); stepIndex = Math.max(0, Math.min(stepIndex, b.steps.length - 1));
    const node = panel('Edit a reusable brick', 'Steps describe choreography and named video slots. Every use of this brick gets your changes on its next generation; saved playlists keep their existing version.'); node.classList.add('sb-brick-editor');
    node.append(row(field('Brick name', input(b.name, value => { b.name = value; changed(); })), field('Colour', select(b.colour || 'sage', ['sage', 'blue', 'coral', 'purple'].map(s => [s, s]), value => { b.colour = value; changed(); })), button('Duplicate brick', () => {
      const next = C.clone(b); next.id = uid(); next.name += ' copy'; library.bricks.push(next); brickId = next.id; changed();
    }), button('Remove brick', () => {
      const uses = library.models.flatMap(m => m.sections).filter(s => s.bricks.includes(b.id));
      if (uses.length) throw new Error(`This brick is used in ${uses.length} sections. Swap it out there first.`);
      if (library.bricks.length === 1) throw new Error('Keep at least one brick.');
      library.bricks = library.bricks.filter(x => x.id !== b.id); brickId = library.bricks[0].id; changed();
    })));
    const strip = el('div', 'sb-step-strip');
    b.steps.forEach((s, i) => {
      const card = button('', () => { stepIndex = i; render(); }, `sb-step${i === stepIndex ? ' selected' : ''}`);
      card.append(layoutIcon(s.view, s.preset), el('strong', '', `${i + 1}. ${s.slot}`), el('small', '', `${s.seconds}s · ${TRANSITION_NAMES[s.transition.type] || s.transition.type}`)); strip.append(card);
    }); node.append(strip);
    node.append(row(button('+ Add step', () => { b.steps.push(C.step('Next', 30, 'quad', 15)); stepIndex = b.steps.length - 1; changed(); }), button('Capture playlist clips as brick', capturePlaylist)));
    const s = b.steps[stepIndex], form = el('div', 'sb-step-form');
    const update = (key, value) => { s[key] = value; changed(); };
    form.append(el('h3', '', `Step ${stepIndex + 1}`), row(button('← Earlier', () => { if (stepIndex > 0) { const previous = stepIndex--; move(b.steps, previous, stepIndex); } }), button('Later →', () => { if (stepIndex < b.steps.length - 1) { const previous = stepIndex++; move(b.steps, previous, stepIndex); } }), button('Duplicate step', () => { b.steps.splice(stepIndex + 1, 0, C.clone(s)); stepIndex++; changed(); }), button('Remove step', () => {
      if (b.steps.length === 1) throw new Error('Keep at least one step.'); b.steps.splice(stepIndex, 1); changed();
    })));
    const grid = el('div', 'sb-fields');
    grid.append(field('Video slot name', input(s.slot, value => update('slot', value))), field('Step length · seconds', input(s.seconds, value => update('seconds', value), 'number', {min: 1, max: 3600, step: .5})),
      field('Layout', select(s.view, Object.entries(viewNames), value => update('view', value))), field('Mirror pattern', input(s.preset, value => update('preset', value), 'number', {min: 1, max: 32, step: 1})),
      field('Incoming transition', select(s.transition.type, Object.entries(TRANSITION_NAMES), value => { s.transition.type = value; changed(); })),
      field('Transition · seconds', input(s.transition.duration, value => { s.transition.duration = value; changed(); }, 'number', {min: .15, max: 10, step: .05})),
      field('Transition pace', select(s.transition.pace, Object.entries(TRANSITION_PACE_NAMES), value => { s.transition.pace = value; changed(); })),
      field('Playback', select(s.loopMode ?? 1, [['0', 'Once · hold last frame'], ['1', 'Loop'], ['2', 'Bounce']], value => update('loopMode', Number(value)))));
    for (const [key, label, min, max, fallback] of [['speed', 'Video speed', .25, 4, 1], ['zoom', 'Zoom', .25, 4, 1], ['panX', 'Pan X', -1, 1, 0], ['panY', 'Pan Y', -1, 1, 0]]) grid.append(field(label, input(s[key] ?? fallback, value => update(key, value), 'number', {min, max, step: .05})));
    form.append(grid, el('p', 'sb-muted', 'Give steps the same slot name to reuse the same chosen video within this brick. Each step is a new clip and starts its video again. Use a timed layout change below to change the composition without restarting.'));
    const layouts = panel('Timed layout changes', 'Changes happen instantly on the same running video. Smooth animated tile motion is not available in this version.');
    (s.layoutCues || []).forEach((cue, i) => {
      layouts.append(row(field('At · seconds', input(cue.at, value => { cue.at = value; changed(); }, 'number', {min: .1, max: s.seconds, step: .1})), field('Layout', select(cue.view, Object.entries(viewNames), value => { cue.view = value; changed(); })), field('Pattern', input(cue.preset, value => { cue.preset = value; changed(); }, 'number', {min: 1, max: 32})), button('Remove', () => { s.layoutCues.splice(i, 1); changed(); })));
    });
    layouts.append(button('+ Layout change', () => { (s.layoutCues ||= []).push({at: Math.max(.1, s.seconds / 2), view: 'dual', preset: 7, zoom: s.zoom ?? 1, panX: s.panX ?? 0, panY: s.panY ?? 0}); changed(); })); form.append(layouts);
    const fx = panel('Timed effects and branding', 'Effect windows are local to this step. DJ profile branding substitutes the selected DJ’s text.');
    (s.effects || []).forEach((effect, i) => {
      fx.append(row(field('At · seconds', input(effect.at, value => { effect.at = value; changed(); }, 'number', {min: 0, max: s.seconds, step: .1})), field('For · seconds', input(effect.seconds, value => { effect.seconds = value; changed(); }, 'number', {min: .1, max: s.seconds, step: .1})), field('Effect', select(effect.effect, Object.entries({...EffectCatalog.cueChoices(effect.effect), dj:'DJ profile branding'}).filter(([id]) => id !== 'off'), value => { effect.effect = value; changed(); })), field('Text (for text effects)', input(effect.text || '', value => { effect.text = value; changed(); }, 'text', {maxLength: 80})), button('Remove', () => { s.effects.splice(i, 1); changed(); })));
      if (['logo', 'text', 'dj'].includes(effect.effect)) {
        const motion = el('details'); motion.append(el('summary', '', 'Object appearance, reflections and choreography'));
        window.LogoMotionControls?.mount(motion, {settings: effect,showAppearance:true,showReflection:true,showText:false,showPreview:true,
          getPreviewCue:()=>({...effect,...(effect.effect==='dj'?{effect:'text',text:profile().branding.text||profile().name}:{})}),
          onChange: patch => { Object.assign(effect, patch); changed(false); }});
        fx.append(motion);
      } else {
        fx.append(check('3D logo overlay', !!effect.logoLayer, enabled => {
          effect.logoLayer = enabled ? normalisePlaylistCue({...vfxState.logo3d,effect:vfxState.logo3d.kind==='text'?'text':'logo',logoLayer:null}) : null; changed();
        }));
        if (effect.logoLayer) {
          const motion = el('details'); motion.append(el('summary','','Logo overlay appearance, reflections and motion'));
          window.LogoMotionControls?.mount(motion,{settings:effect.logoLayer,showAppearance:true,showReflection:true,showPreview:true,getPreviewCue:()=>effect,onChange:patch=>{Object.assign(effect.logoLayer,patch);changed(false);}}); fx.append(motion);
        }
      }

    });
    fx.append(button('+ Effect window', () => { (s.effects ||= []).push({at: 0, seconds: Math.min(8, s.seconds), effect: 'dj'}); changed(); })); form.append(fx); node.append(form);
    return node;
  }
  async function capturePlaylist() {
    if (!plPlaylist.entries.length) throw new Error('Open a playlist in the playlist editor first.');
    const dialog = el('dialog', 'sb-dialog');
    dialog.append(el('h2', '', 'Capture playlist clips as a reusable brick'), el('p', '', 'Choose up to 100 consecutive clips. Layouts, transitions and effects are kept; the videos become replaceable slots.'));
    const first = input(1, () => {}, 'number', {min: 1, max: plPlaylist.entries.length});
    const last = input(Math.min(100, plPlaylist.entries.length), () => {}, 'number', {min: 1, max: plPlaylist.entries.length});
    const status = el('p'); status.setAttribute('role', 'status');
    dialog.append(row(field('First clip', first), field('Last clip', last)), status, row(button('Cancel', () => dialog.close()), button('Create brick', async () => {
      try {
        const from = Number(first.value) - 1, to = Number(last.value);
        if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to > plPlaylist.entries.length || to <= from || to - from > 100) throw new Error('Choose a valid range of up to 100 clips.');
        const slots = new Map(), steps = [];
        status.textContent = 'Reading clip durations…';
        for (const e of plPlaylist.entries.slice(from, to)) {
          const seconds = playlistEntrySeconds(e, e.duration.type === 'seconds' ? 0 : await playlistSourceSeconds(e.video));
          if (!Number.isFinite(seconds) || seconds < 1 || seconds > 3600) throw new Error('Each captured clip needs an available duration between 1 second and 1 hour.');
          if (!slots.has(e.video)) slots.set(e.video, `Video ${slots.size + 1}`);
          const s = {...C.step(slots.get(e.video), seconds, e.view, e.preset || 1), ...C.clone(e)};
          delete s.video; delete s.duration; delete s.build; delete s.cues; delete s.sourceRange;
          s.slot = slots.get(e.video); s.seconds = seconds; s.transition = normaliseTransition(e.transition); s.effects = [];
          const cues = [...e.cues || []].sort((a, b) => a.at - b.at);
          cues.forEach((cue, i) => {
            const end = Math.min(seconds, cues[i + 1]?.at ?? seconds);
            if (cue.effect !== 'off' && end > cue.at) { const fx = {...C.clone(cue), seconds: end - cue.at}; delete fx.source; s.effects.push(fx); }
          });
          steps.push(s);
        }
        const b = {id: uid(), name: (plPlaylist.name || 'Playlist') + ' brick', colour: 'blue', steps};
        const draft = C.clone(library); draft.bricks.push(b); C.validate(draft, Object.keys(TRANSITION_NAMES));
        library.bricks.push(b); brickId = b.id; stepIndex = 0; dialog.close(); changed(); report(`Captured ${steps.length} clips with replaceable video slots.`);
      } catch (e) { status.textContent = e.message; }
    }, 'sb-primary')));
    document.body.append(dialog); dialog.addEventListener('close', () => dialog.remove()); dialog.showModal();
  }
  function profiles() {
    const node = panel('DJ profiles', 'Keep the show structure and give another DJ their own media preferences, pacing and branding. Tag filters use OR within a category and AND between categories.'); node.classList.add('sb-profiles');
    const p = profile();
    node.append(row(field('DJ profile', select(profileId, library.profiles.map(p => [p.id, p.name]), value => { profileId = value; render(); })), button('+ New DJ', () => {
      const next = C.clone(C.defaults().profiles[0]); next.id = uid(); next.name = 'New DJ'; library.profiles.push(next); profileId = next.id; changed();
    }), button('Duplicate DJ', () => { const next = C.clone(p); next.id = uid(); next.name += ' copy'; library.profiles.push(next); profileId = next.id; changed(); })));
    const grid = el('div', 'sb-profile-grid'), preferences = panel('Taste and pacing');
    const name = input(p.name, value => { p.name = value; changed(); }); name.id = 'sbDJName'; preferences.append(field('DJ name', name));
    for (const [key, label] of [['themes', 'Preferred themes'], ['colours', 'Preferred colours'], ['types', 'Preferred video types']]) {
      preferences.append(field(`${label} · comma separated`, input(p[key].join(', '), value => { p[key] = value.split(',').map(t => t.trim()).filter(Boolean); changed(); })));
      const known = [...new Set(videos.flatMap(v => v.catalog?.[key] || []))].sort();
      const tags = el('div', 'sb-tag-list');
      for (const tag of known.slice(0, 50)) {
        const b = button(tag, () => { const at = p[key].findIndex(t => t.toLowerCase() === tag.toLowerCase()); if (at < 0) p[key].push(tag); else p[key].splice(at, 1); changed(); }, p[key].some(t => t.toLowerCase() === tag.toLowerCase()) ? 'selected' : ''); b.setAttribute('aria-pressed', String(p[key].some(t => t.toLowerCase() === tag.toLowerCase()))); tags.append(b);
      } preferences.append(tags);
    }
    preferences.append(field('Exclude filename terms · comma separated', input(p.exclude.join(', '), value => { p.exclude = value.split(',').map(t => t.trim()).filter(Boolean); changed(); })),
      field('Pacing', select(p.pace, [['0.5', 'Brisk · half-length steps'], ['0.75', 'Upbeat · shorter steps'], ['1', 'As designed'], ['1.5', 'Spacious · longer steps'], ['2', 'Slow · double-length steps']], value => { p.pace = Number(value); changed(); })),
      field('Avoid repeats across the last N new video slots', input(p.avoidRepeat, value => { p.avoidRepeat = value; changed(); }, 'number', {min: 0, max: 100, step: 1})),
      check('Use reviewed videos only', p.reviewedOnly, value => { p.reviewedOnly = value; changed(); }),
      check('Prefer videos with similar library tags', p.similar, value => { p.similar = value; changed(); }));
    const brand = panel('Branding and matching videos', 'Leave the text empty to turn off recurring branding. A brick’s explicit DJ branding window still uses the DJ name.');
    const text = input(p.branding.text, value => { p.branding.text = value; changed(); }, 'text', {maxLength: 80}); text.id = 'sbBrandText';
    brand.append(field('DJ branding text', text), field('Repeat every · seconds (0 = off)', input(p.branding.every, value => { p.branding.every = value; changed(); }, 'number', {min: 0, max: 3600})), field('Show for · seconds', input(p.branding.seconds, value => { p.branding.seconds = value; changed(); }, 'number', {min: 1, max: 60})), el('p', 'sb-muted', 'Recurring text uses the shared 3D text renderer. It yields to explicit brick effects; skipped appearances are reported after generation.'));
    brand.append(el('h3', '', `${pool().length} matching videos`));
    const samples = el('div', 'sb-media-grid');
    for (const v of pool().slice(0, 12)) {
      const card = el('div'), img = el('img'); img.src = '/thumbnail/' + encodeURIComponent(v.filename); img.alt = ''; img.loading = 'lazy'; card.append(img, el('small', '', playlistVideoName(v.filename))); samples.append(card);
    } brand.append(samples, button('Reload library', async () => { if (await reloadLibrary()) report('Updated available videos and tags.'); else report('Could not reload the library. Try again.', true); }));
    grid.append(preferences, brand); node.append(grid, row(button('Back to assembly', () => { tab = 'assemble'; render(); }), button('Save library', save, 'sb-primary'))); return node;
  }
  async function saveResult() {
    if (!result) return;
    requireAppliedChanges();
    if (!result.entries.length) throw new Error('Add clips by generating a show before saving.');
    if (!result.name.trim()) throw new Error('Give the generated playlist a name.');
    // A version always gets its own file; an existing performance is never replaced.
    const slug = result.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'show';
    const nextSlug = `${slug}-${uid()}`;
    await request('/api/playlist/' + encodeURIComponent(nextSlug), {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(result)});
    savedSlug = nextSlug;
    await refreshMedia(); loadPlaylists(); render(); report('Saved a new playlist version. It is available in Playlists and ready for the usual Send to Mac action.');
  }
  async function openResult(seconds = review.time) {
    if (!result) return;
    requireAppliedChanges();
    if (!editorBackup) editorBackup = {playlist: C.clone(plPlaylist), slug: plSlug, name: plNameInput.value};
    releaseReview(true);
    if (plPlaying) stopPlaylist();
    restoreTimelineVfxPreview(); plPlaylist = C.clone(result); plSlug = savedSlug; plNameInput.value = result.name; plPreviewIdx = -1; timelineTime = 0;
    renderPlaylistEntries(); document.querySelector('.rd-nav [data-screen="playlist"]').click();
    await setTimelinePlayhead(seconds);
  }
  function parkReviewPlayer() {
    if (review.playing) pauseReview(false);
    clearTimeout(review.timer); review.run++; review.nodes = null;
    if (reviewPlayer.parentNode !== playerHome.parentNode) playerHome.after(reviewPlayer);
  }
  function releaseReview(handoff = false) {
    parkReviewPlayer();
    if (!review.active) return;
    review.active = false; review.boundResult = null; timelinePreviewRun++;
    video.pause(); restoreTimelineVfxPreview();
    if (!handoff && review.previous) {
      plPlaylist = review.previous.playlist; plSlug = review.previous.slug; plNameInput.value = review.previous.name;
      plPreviewIdx = review.previous.previewIndex; timelineTime = review.previous.time; renderPlaylistEntries();
    }
    review.previous = null;
  }
  function reviewClock(seconds) {
    const ms = Math.max(0, Math.round(seconds * 1000));
    return `${time(Math.floor(ms / 1000))}.${String(ms % 1000).padStart(3, '0')}`;
  }
  function readReviewClock(value) {
    const parts = value.trim().split(':');
    if (!parts.length || parts.length > 3 || parts.some(p => !/^\d+(?:\.\d{1,3})?$/.test(p))) throw new Error('Enter seconds, m:ss or h:mm:ss, optionally with milliseconds.');
    if (parts.slice(0, -1).some(p => !/^\d+$/.test(p))) throw new Error('Use whole hours and minutes; milliseconds belong after the seconds.');
    if (parts.length > 1 && (Number(parts.at(-1)) >= 60 || (parts.length === 3 && Number(parts[1]) >= 60))) throw new Error('Minutes and seconds after a colon must be below 60.');
    return parts.reduce((sum, p) => sum * 60 + Number(p), 0);
  }
  function updateReviewPosition(seconds, follow = true) {
    const nodes = review.nodes; if (!nodes || !result) return;
    const position = C.showPosition(nodes.timeline, seconds); if (!position) return;
    review.time = position.time;
    nodes.slider.value = review.time;
    nodes.slider.setAttribute('aria-valuetext', `${reviewClock(review.time)} of ${reviewClock(nodes.timeline.total)}`);
    nodes.clock.value = reviewClock(review.time); nodes.total.textContent = `/ ${reviewClock(nodes.timeline.total)}`;
    nodes.head.style.left = `${100 * review.time / nodes.timeline.total}%`;
    nodes.detailHead.style.left = `${review.time * review.scale}px`;
    nodes.track.setAttribute('aria-valuenow', String(review.time)); nodes.track.setAttribute('aria-valuetext', reviewClock(review.time));
    nodes.track.querySelector('.sb-review-clip.selected')?.classList.remove('selected');
    nodes.track.querySelector(`[data-review-clip="${position.index}"]`)?.classList.add('selected');
    if (follow) {
      const x = review.time * review.scale, left = nodes.scroll.scrollLeft, width = nodes.scroll.clientWidth;
      if (x < left + 40 || x > left + width - 40) nodes.scroll.scrollLeft = Math.max(0, x - width * .35);
    }
    fillReviewInspector(position);
    return position;
  }
  function seekReview(seconds, reveal = false, follow = true) {
    if (review.playing) pauseReview(false);
    const nodes = review.nodes; if (!nodes) return;
    const position = updateReviewPosition(seconds, follow); if (!position) return;
    if (reveal) root.scrollTop += nodes.panel.getBoundingClientRect().top - root.getBoundingClientRect().top;
    nodes.status.textContent = `Seeking ${reviewClock(review.time)}…`;
    clearTimeout(review.timer);
    const runId = ++review.run;
    review.timer = setTimeout(async () => {
      if (!review.active || review.nodes !== nodes || runId !== review.run) return;
      try {
        await setTimelinePlayhead(review.time);
        if (review.nodes !== nodes || runId !== review.run) return;
        nodes.status.textContent = timelineStatus.textContent.startsWith('Could not') ? timelineStatus.textContent : `Paused · clip ${position.index + 1} · ${reviewClock(position.local)} into this clip`;
        if ($('previewVideoStatus').textContent.startsWith('Preview ready.')) $('previewVideoStatus').textContent = '';
      } catch (e) { if (review.nodes === nodes && runId === review.run) nodes.status.textContent = `Preview unavailable: ${e.message}`; }
    }, 65);
  }
  function requireAppliedChanges() {
    if (review.drafts.size) throw new Error('Apply or Reset the preview changes before generating, loading, saving or opening another edition.');
  }
  function workingEntry(index) { return review.drafts.get(index)?.entry || result.entries[index]; }
  function workingPlaylist() { return {...result, entries: result.entries.map((e, i) => workingEntry(i))}; }
  function refreshReviewWorkingCopy() {
    if (!review.active) return;
    plPlaylist = workingPlaylist();
  }
  function updateDraftActions() {
    const pending = review.drafts.size;
    if (!review.nodes) return;
    for (const node of root.querySelectorAll('[data-review-apply],[data-review-reset]')) node.disabled = !pending;
    for (const node of root.querySelectorAll('[data-review-draft-status]')) node.textContent = pending ? `${pending} clip${pending === 1 ? '' : 's'} with preview changes · Apply to update the show` : 'All changes applied';
    if ($('sbReviewUndo')) $('sbReviewUndo').disabled = !review.undo || !!pending;
  }
  function stageReview(index, callback, live = false) {
    const before = review.drafts.get(index), candidate = C.clone(before?.entry || result.entries[index]);
    const oldDuration = candidate.duration.value;
    callback(candidate);
    review.drafts.set(index, {entry: candidate, remove: before?.remove || false});
    if (JSON.stringify(candidate) === JSON.stringify(result.entries[index]) && !before?.remove) review.drafts.delete(index);
    refreshReviewWorkingCopy(); updateDraftActions();
    const position = C.showPosition(review.nodes.timeline, review.time);
    if (live && position?.index === index) {
      const look = playlistLayoutAt(candidate, position.local);
      if (C.views.indexOf(look.view) !== viewMode) setViewModeTo(Math.max(0, C.views.indexOf(look.view)));
      if (look.preset !== configIdx + 1) setConfig(look.preset || 1);
      applyZoomPan(look.zoom ?? 1, look.panX ?? 0, look.panY ?? 0);
      setPlaybackSpeed(candidate.speed ?? 1);
      if (review.playing && candidate.duration.value !== oldDuration) {
        clearTimeout(plTimer); plTimer = setTimeout(onEntryComplete, Math.max(0, candidate.duration.value - position.local) * 1000);
      }
      if (!review.playing && !timelineOverlay.hidden) seekReview(review.time);
    } else {
      review.nodes.inspectorKey = '';
      if (review.playing) pauseReview(false);
      review.nodes.rebuild();
    }
  }
  async function applyReviewChanges() {
    if (!review.drafts.size) return;
    const wasPlaying = review.playing;
    pauseReview(false);
    const next = C.clone(result);
    for (const [index, draft] of review.drafts) next.entries[index] = C.clone(draft.entry);
    next.entries = next.entries.filter((e, i) => !review.drafts.get(i)?.remove);
    if (!next.entries.length) throw new Error('Keep at least one clip in the show.');
    if (C.reindexShow(next).total > 86400) throw new Error('Keep the show within 24 hours.');
    review.undo = C.clone(result); result = next; savedSlug = ''; kept.clear(); review.drafts.clear();
    const scroll = root.scrollTop; render(); root.scrollTop = scroll;
    report('Applied preview changes to this show. Save as a new playlist to keep this edition.');
    if (wasPlaying) await playReview();
  }
  async function resetReviewChanges() {
    const wasPlaying = review.playing; pauseReview(false);
    review.drafts.clear();
    const scroll = root.scrollTop; render(); root.scrollTop = scroll;
    report('Reset preview changes to the show’s last applied settings.');
    if (wasPlaying) await playReview();
  }
  function pauseReview(preview = true) {
    if (!review.playing && !review.starting) return;
    const segment = review.nodes?.timeline.segments[plEntryIdx];
    if (segment && !review.starting) review.time = Math.min(segment.end, segment.start + Math.max(0, (performance.now() - timelineEntryStartedAt) / 1000));
    review.playing = false; review.starting = false; cancelAnimationFrame(review.frame);
    if (plPlaying) stopPlaylist(); else video.pause();
    updateReviewTransport();
    if (preview && review.nodes) seekReview(review.time);
  }
  function updateReviewTransport() {
    if (!review.nodes) return;
    review.nodes.play.textContent = review.playing ? '❚❚ Pause' : '▶ Play from playhead';
    review.nodes.play.setAttribute('aria-label', review.playing ? 'Pause show preview' : 'Play show from playhead');
    review.nodes.play.setAttribute('aria-pressed', String(review.playing));
  }
  async function playReview() {
    if (!review.active || !review.nodes) return;
    if (review.playing) { pauseReview(); return; }
    clearTimeout(review.timer); review.run++; timelinePreviewRun++;
    refreshReviewWorkingCopy(); renderPlaylistTimeline();
    if (review.time >= review.nodes.timeline.total) review.time = 0;
    review.playing = true; review.starting = true; updateReviewTransport();
    review.nodes.status.textContent = `Starting preview at ${reviewClock(review.time)}…`;
    try {
      await startPlaylist(review.time);
      if (!review.playing || !review.active || !plPlaying) { review.playing = false; review.starting = false; updateReviewTransport(); return; }
      review.starting = false;
      timelineOverlay.hidden = true;
      await video.play();
      const tick = () => {
        if (!review.playing || !review.nodes) return;
        if (!plPlaying) {
          review.playing = false; review.time = review.nodes.timeline.total; updateReviewPosition(review.time); updateReviewTransport(); review.nodes.status.textContent = 'End of show · drag the playhead or press Play to replay.'; return;
        }
        const segment = review.nodes.timeline.segments[plEntryIdx];
        if (segment) updateReviewPosition(Math.min(segment.end, segment.start + Math.max(0, (performance.now() - timelineEntryStartedAt) / 1000)));
        review.nodes.status.textContent = `Playing privately · clip ${plEntryIdx + 1} · ${reviewClock(review.time)}`;
        review.frame = requestAnimationFrame(tick);
      }; tick();
    } catch (e) { pauseReview(false); if (review.nodes) review.nodes.status.textContent = 'Could not play preview: ' + e.message; }
  }
  function fillReviewInspector(position) {
    const nodes = review.nodes; if (!nodes || !position) return;
    const index = position.index, e = workingEntry(index), section = result.generation.sections.find(s => index >= s.entryStart && index < s.entryStart + s.entryCount);
    const source = result.generation.bricks?.find(b => b.id === e.build?.brickId);
    const activeCue = [...e.layoutCues || []].sort((a, b) => a.at - b.at).filter(c => c.at <= position.local).at(-1);
    const key = `${position.index}:${activeCue?.at ?? 'initial'}`;
    if (nodes.inspectorKey === key) return;
    nodes.inspectorKey = key;
    window.dispatchEvent(new CustomEvent('club-show-seek'));
    nodes.inspector.replaceChildren(el('h3', '', 'At the playhead'), el('p', 'sb-review-context', `${section?.name || 'Show'} / ${source?.name || 'Edited clip'} / clip ${position.index + 1}`));
    const actions = el('div', 'sb-review-actions');
    const apply = button('Apply changes', applyReviewChanges, 'sb-primary'); apply.id = 'sbReviewApply'; apply.dataset.reviewApply = '';
    const reset = button('Reset changes', resetReviewChanges); reset.id = 'sbReviewReset'; reset.dataset.reviewReset = '';
    const draftStatus = el('p', 'sb-review-draft-status'); draftStatus.dataset.reviewDraftStatus = ''; draftStatus.setAttribute('role', 'status');
    actions.append(row(apply, reset), draftStatus); nodes.inspector.append(actions);
    nodes.inspector.append(el('p', 'sb-muted', `${reviewClock(position.start)} – ${reviewClock(position.end)} · ${playlistVideoName(e.video)}`));
    const grid = el('div', 'sb-review-fields');
    const media = select(e.video, orderedLibraryVideos(videos).map(v => [v.filename, playlistVideoName(v.filename)]), value => stageReview(index, entry => { entry.video = value; delete entry.sourceRange; if (entry.build) entry.build.binding = uid(); })); media.id = 'sbReviewVideo';
    grid.append(field('Video for this clip', media));
    const rangeChoice = select('', [['', 'Full video']], value => stageReview(index, entry => {
      if (value) entry.sourceRange = SourceRange.validate(JSON.parse(value)); else delete entry.sourceRange;
    })); rangeChoice.id = 'sbReviewSourceRange';
    grid.append(field('Source cue range', rangeChoice));
    window.populateVideoCueSelect?.(rangeChoice, e.video, e.sourceRange);

    const currentLook = entry => [...entry.layoutCues || []].sort((a, b) => a.at - b.at).filter(c => c.at <= review.time - nodes.timeline.segments[index].start).at(-1) || entry;
    const look = playlistLayoutAt(e, position.local);
    const view = select(look.view, Object.entries(viewNames), value => stageReview(index, entry => { currentLook(entry).view = value; }, true)); view.id = 'sbReviewLayout';
    grid.append(field('Layout at playhead', view));
    const slider = (key, label, value, min, max, step, mutate, format = value => String(value), hint = '') => {
      const control = el('input'); control.type = 'range'; Object.assign(control, {min, max, step, value}); control.id = key === 'length' ? 'sbReviewLength' : `sbReview-${key}`; control.setAttribute('aria-label', label);
      const readout = el('output', 'sb-live-value', format(Number(control.value))); readout.htmlFor = control.id;
      const wrap = el('label', 'sb-field sb-live-field'); wrap.append(row(el('span', '', label), readout), control);
      if (hint) wrap.append(el('small', 'sb-muted', hint));
      control.addEventListener('input', run(() => {
        const number = Number(control.value); readout.textContent = format(number); control.setAttribute('aria-valuetext', format(number));
        stageReview(index, entry => mutate(entry, number), true);
      }));
      control.addEventListener('change', () => {
        if (key === 'length') nodes.rebuild();
      });
      grid.append(wrap);
    };
    const percent = value => `${value > 0 ? '+' : ''}${Math.round(value * 100)}%`;
    slider('panY', 'Vertical position (Y)', look.panY ?? 0, -1, 1, .01, (entry, value) => { currentLook(entry).panY = value; }, percent, 'Down ← drag → Up · moves the crop and mirror meeting point. Zoom out to place the image against black.');
    slider('panX', 'Horizontal position (X)', look.panX ?? 0, -1, 1, .01, (entry, value) => { currentLook(entry).panX = value; }, percent, 'Left ← drag → Right');
    slider('zoom', 'Zoom', look.zoom ?? 1, .25, 4, .01, (entry, value) => { currentLook(entry).zoom = value; }, value => `${value.toFixed(2)}×`);
    slider('preset', 'Mirror pattern', look.preset || 1, 1, 32, 1, (entry, value) => { currentLook(entry).preset = value; });
    slider('speed', 'Video speed', e.speed ?? 1, .25, 2, .25, (entry, value) => { entry.speed = value; }, value => `${value}×`);
    slider('length', 'Clip length · seconds', e.duration.value, Math.min(1, e.duration.value), Math.min(86400, Math.max(120, Math.ceil(e.duration.value * 2))), .1, (entry, value) => {
      entry.duration.value = value;
      entry.layoutCues = (entry.layoutCues || []).filter(c => c.at < value);
      entry.cues = (entry.cues || []).filter(c => c.at <= value);
      if (entry.cues.at(-1)?.effect !== 'off') entry.cues.push({at: value, effect: 'off'});
      if (entry.transition?.duration > value) { entry.transition.duration = value; if (value < .15) entry.transition.type = 'cut'; }
    }, value => `${value.toFixed(1)}s`);
    const transition = normaliseTransition(e.transition);
    grid.append(field('Incoming transition', select(transition.type, Object.entries(TRANSITION_NAMES), value => stageReview(index, entry => {
      if (value !== 'cut' && entry.duration.value < .15) throw new Error('This short clip can only use a Cut. Increase its length to add a transition.');
      entry.transition = {...normaliseTransition(entry.transition), type: value, duration: Math.min(transition.duration, entry.duration.value), params: {}};
    }))));
    slider('transitionDuration', 'Transition length', Math.min(transition.duration, e.duration.value), Math.min(.15, e.duration.value), Math.min(10, e.duration.value), .05, (entry, value) => { entry.transition = {...normaliseTransition(entry.transition), duration: value}; }, value => `${value.toFixed(2)}s`);
    grid.append(field('Transition pace', select(transition.pace, Object.entries(TRANSITION_PACE_NAMES), value => stageReview(index, entry => { entry.transition = {...normaliseTransition(entry.transition), pace: value}; }))));
    nodes.inspector.append(grid, el('p', 'sb-muted', activeCue ? `Layout edits update the timed change at ${reviewClock(activeCue.at)} inside this clip. Earlier layout settings stay intact.` : 'Layout edits update this clip’s initial look. Add a timed change to start a different look at the playhead.'));
    const addChange = button('New layout change here', () => stageReview(index, entry => {
      const local = review.time - position.start;
      if (local <= 0 || local >= entry.duration.value) throw new Error('Move inside the clip to add a layout change.');
      if ((entry.layoutCues || []).some(c => Math.abs(c.at - local) < .001)) throw new Error('There is already a layout change here; edit its settings above.');
      (entry.layoutCues ||= []).push({at: Math.round(local * 1000) / 1000, view: look.view, preset: look.preset, zoom: look.zoom ?? 1, panX: look.panX ?? 0, panY: look.panY ?? 0});
      entry.layoutCues.sort((a, b) => a.at - b.at);
    })); addChange.id = 'sbReviewAddLayout'; nodes.inspector.append(addChange);
    if (activeCue) nodes.inspector.append(button('Remove this timed layout change', () => stageReview(index, entry => { entry.layoutCues = entry.layoutCues.filter(c => c.at !== activeCue.at); })));
    nodes.inspector.append(button('Edit timed effects', () => {
      if (review.playing) pauseReview();
      if (!review.drafts.has(index)) review.drafts.set(index, {entry: C.clone(e), remove: false});
      refreshReviewWorkingCopy();
      const before = JSON.stringify(workingEntry(index).cues); openPlaylistCueEditor(position.index);
      plCueDialog.addEventListener('close', () => {
        if (JSON.stringify(workingEntry(index).cues) === before && JSON.stringify(workingEntry(index)) === JSON.stringify(result.entries[index])) review.drafts.delete(index);
        updateDraftActions(); nodes.inspectorKey = ''; seekReview(review.time);
      }, {once: true});
    }));
    const reusable = library.bricks.find(b => b.id === e.build?.brickId);
    const editBrick = button('Edit reusable brick', () => { brickId = reusable.id; stepIndex = e.build.step || 0; tab = 'bricks'; render(); root.scrollTop = 0; }); editBrick.disabled = !reusable;
    nodes.inspector.append(editBrick, el('p', 'sb-muted', 'Changes above affect this edition. Edit the reusable brick to change future generations.'));
    const remove = button('Remove this clip on Apply', () => {
      if (result.entries.length <= 1) throw new Error('Keep at least one clip in the show.');
      review.drafts.set(index, {entry: C.clone(workingEntry(index)), remove: true}); updateDraftActions(); report('Clip marked for removal. Apply to remove it, or Reset to keep it.');
    }); remove.id = 'sbReviewRemove'; nodes.inspector.append(remove);
    updateDraftActions();
  }
  function showReview() {
    const panel = el('section', 'sb-review'); panel.id = 'sbShowReview'; panel.setAttribute('aria-label', 'Review and edit show');
    if (document.body.dataset.workspace !== 'builder') return panel;
    let timeline = C.showTimeline(workingPlaylist());
    if (!timeline.segments.length) { panel.append(el('p', '', 'Generate a show to review its timeline.')); return panel; }
    if (review.active && review.boundResult !== result) releaseReview();
    if (!review.active) {
      if (!editorBackup && plPlaylist !== result) editorBackup = {playlist: C.clone(plPlaylist), slug: plSlug, name: plNameInput.value};
      review.previous = {playlist: C.clone(plPlaylist), slug: plSlug, name: plNameInput.value, previewIndex: plPreviewIdx, time: timelineTime};
      if (plPlaying) stopPlaylist();
      plSlug = savedSlug; plNameInput.value = result.name; plPreviewIdx = -1; timelineTime = review.time;
      review.active = true; review.boundResult = result;
    }
    refreshReviewWorkingCopy();
    renderPlaylistEntries();
    panel.append(el('h2', '', 'Review the show'), el('p', 'sb-muted', 'Drag the playhead across the full show, then use the detailed timeline to inspect individual clips. Changes here update this playlist edition.'));
    const clock = input(reviewClock(review.time), value => seekReview(readReviewClock(value))); clock.id = 'sbReviewTime'; clock.inputMode = 'decimal';
    const total = el('output', 'sb-review-total');
    const jump = delta => seekReview(review.time + delta);
    const nextClip = direction => {
      const p = C.showPosition(timeline, review.time), i = Math.max(0, Math.min(timeline.segments.length - 1, p.index + direction)); seekReview(timeline.segments[i].start);
    };
    const undo = button('Undo last edit', () => { requireAppliedChanges(); if (!review.undo) return; result = review.undo; review.undo = null; savedSlug = ''; render(); report('Restored the edition before the last edit.'); }); undo.id = 'sbReviewUndo'; undo.disabled = !review.undo || !!review.drafts.size;
    panel.append(row(button('Previous clip', () => nextClip(-1)), button('−1s', () => jump(-1)), field('Show time · h:mm:ss.mmm', clock), total, button('+1s', () => jump(1)), button('Next clip', () => nextClip(1)), undo));
    const overview = el('div', 'sb-review-overview'), colours = el('div', 'sb-review-sections');
    for (const [i, section] of result.generation.sections.entries()) {
      const block = el('div', `sb-section-colour-${i % 4}`); block.style.width = `${100 * (section.end - section.start) / timeline.total}%`; block.append(el('span', '', section.name)); colours.append(block);
    }
    const slider = el('input'); slider.type = 'range'; slider.min = 0; slider.max = timeline.total; slider.step = .1; slider.id = 'sbShowPlayhead'; slider.setAttribute('aria-label', 'Show playhead');
    slider.addEventListener('input', () => seekReview(Number(slider.value)));
    const head = el('div', 'sb-review-head'); head.setAttribute('aria-hidden', 'true'); overview.append(colours, head, slider); panel.append(overview);
    const zoom = el('input'); zoom.type = 'range'; zoom.min = .5; zoom.max = 12; zoom.step = .5; zoom.value = review.scale; zoom.id = 'sbReviewZoom';
    const scroll = el('div', 'sb-review-scroll'), track = el('div', 'sb-review-track'); track.id = 'sbReviewTrack'; track.tabIndex = 0; track.setAttribute('role', 'slider'); track.setAttribute('aria-label', 'Detailed show playhead'); track.setAttribute('aria-valuemin', '0'); track.setAttribute('aria-valuemax', String(timeline.total));
    const detailHead = el('div', 'sb-review-detail-head'); detailHead.setAttribute('aria-hidden', 'true');
    function drawTrack() {
      track.replaceChildren(); track.style.width = `${Math.max(1, timeline.total * review.scale)}px`;
      const interval = review.scale >= 5 ? 10 : review.scale >= 2 ? 30 : 120;
      for (let seconds = 0; seconds <= timeline.total; seconds += interval) {
        const tick = el('span', 'sb-review-tick', time(seconds)); tick.style.left = `${seconds * review.scale}px`; track.append(tick);
      }
      for (const segment of timeline.segments) {
        const e = workingEntry(segment.index), clip = el('div', 'sb-review-clip', `${segment.index + 1} · ${playlistVideoName(e.video)}`);
        clip.dataset.reviewClip = segment.index; clip.style.left = `${segment.start * review.scale}px`; clip.style.width = `${(segment.end - segment.start) * review.scale}px`;
        clip.title = `${reviewClock(segment.start)} – ${reviewClock(segment.end)} · ${playlistVideoName(e.video)}`; track.append(clip);
        for (const cue of e.layoutCues || []) { const mark = el('span', 'sb-review-cue'); mark.style.left = `${(segment.start + cue.at) * review.scale}px`; mark.title = `Layout change · ${reviewClock(segment.start + cue.at)}`; track.append(mark); }
      }
      track.append(detailHead);
    }
    zoom.addEventListener('input', () => { review.scale = Number(zoom.value); drawTrack(); seekReview(review.time); });
    const position = event => Math.max(0, (event.clientX - track.getBoundingClientRect().left) / review.scale);
    let dragging = false;
    scroll.addEventListener('pointerdown', event => { if (event.button !== 0) return; event.preventDefault(); dragging = true; scroll.setPointerCapture(event.pointerId); seekReview(position(event), false, false); });
    scroll.addEventListener('pointermove', event => { if (dragging) seekReview(position(event), false, false); });
    const finish = event => { if (!dragging) return; dragging = false; if (event.type !== 'pointercancel') seekReview(position(event), false, false); };
    scroll.addEventListener('pointerup', finish); scroll.addEventListener('pointercancel', finish);
    track.addEventListener('keydown', event => {
      const deltas = {ArrowLeft: -1, ArrowRight: 1, PageUp: -60, PageDown: 60};
      if (event.key in deltas) { event.preventDefault(); seekReview(review.time + deltas[event.key]); }
      else if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); seekReview(event.key === 'Home' ? 0 : timeline.total); }
    });
    drawTrack(); scroll.append(track); panel.append(row(field('Timeline zoom', zoom), el('span', 'sb-muted', 'Click or drag to seek · arrows = 1s · Page Up/Down = 1m · gold marks = layout changes')), scroll);
    const workspace = el('div', 'sb-review-workspace'), preview = el('div', 'sb-review-preview'), inspector = el('aside', 'sb-review-inspector');
    const status = el('p', 'sb-review-status'); status.id = 'sbReviewStatus'; status.setAttribute('role', 'status');
    const play = button('▶ Play from playhead', playReview, 'sb-primary'); play.id = 'sbReviewPlay'; play.setAttribute('aria-label', 'Play show from playhead');
    const transport = el('div', 'sb-review-transport'); transport.append(play, button('Clip start', () => { const p = C.showPosition(timeline, review.time); seekReview(p.start); }), el('span', 'sb-muted', 'Private show preview'));
    preview.append(transport, reviewPlayer, status); workspace.append(preview, inspector); panel.append(workspace);
    const rebuild = () => {
      refreshReviewWorkingCopy(); timeline = C.showTimeline(plPlaylist); review.nodes.timeline = timeline;
      slider.max = timeline.total; track.setAttribute('aria-valuemax', String(timeline.total));
      [...colours.children].forEach((block, i) => {
        const section = result.generation.sections[i], first = timeline.segments[section.entryStart], last = timeline.segments[section.entryStart + section.entryCount - 1];
        if (first && last) block.style.width = `${100 * (last.end - first.start) / timeline.total}%`;
      });
      renderPlaylistTimeline(); drawTrack();
      if (review.playing) updateReviewPosition(review.time); else seekReview(review.time);
    };
    review.nodes = {panel, timeline, slider, head, detailHead, track, scroll, clock, total, inspector, status, play, rebuild};
    requestAnimationFrame(() => { if (review.nodes?.panel === panel && panel.isConnected && !review.playing) seekReview(review.time); });
    return panel;
  }
  function generated() {
    const node = panel('Your generated show', 'A resolved performance with fixed video choices and timings. Save each edition separately, or open a copy in the playlist editor for individual adjustments.'); node.classList.add('sb-generated');
    let chosen = playlists[0]?.slug || '';
    const resume = select(chosen, [['', 'Choose a saved generated playlist'], ...playlists.map(p => [p.slug, p.name])], value => { chosen = value; }); resume.id = 'sbResume';
    node.append(row(field('Resume a saved edition', resume), button('Load edition', async () => {
      requireAppliedChanges();
      if (!chosen) throw new Error('Choose a saved generated playlist.');
      const next = await request('/api/playlist/' + encodeURIComponent(chosen));
      if (!next.generation?.sections || !next.entries?.length) throw new Error('This is an ordinary playlist. Capture its clips as a brick in Edit bricks, or choose a Show Builder edition.');
      if (!library.models.some(m => m.id === next.generation.modelId) || !library.profiles.some(p => p.id === next.generation.profileId)) throw new Error('Import the model library used for this edition before resuming it.');
      result = next; savedSlug = chosen; review.time = 0; review.undo = null; modelId = next.generation.modelId; profileId = next.generation.profileId; seed = next.generation.seed; bindings = C.clone(next.generation.bindings || {}); kept.clear(); render(); report('Loaded a saved edition. Keep sections or replace its videos to make another version.');
    })));
    if (!result) { node.append(el('div', 'sb-empty', 'Your show will appear here: section overview, video samples and quick preview points.'), button('Assemble a show', () => { tab = 'assemble'; render(); }, 'sb-primary')); return node; }
    const g = result.generation, total = result.entries.reduce((sum, e) => sum + e.duration.value, 0), unique = new Set(result.entries.map(e => e.video)).size;
    const summary = el('div', 'sb-summary');
    for (const [value, label] of [[time(total), 'exact runtime'], [result.entries.length, 'clips'], [g.sections.length, 'sections'], [unique, 'different videos']]) { const stat = el('div'); stat.append(el('strong', '', String(value)), el('span', '', label)); summary.append(stat); }
    node.append(summary, row(field('Playlist version name', input(result.name, value => { result.name = value; savedSlug = ''; })), button('Save as new playlist', saveResult, 'sb-primary'), button('Open in playlist editor', () => openResult()), button('Download playlist', () => { requireAppliedChanges(); download(result, 'club-visuals-generated-show.json'); })));
    node.append(el('p', 'sb-muted', `${g.profile.name} · ${g.model.name} · variation ${g.seed} · ${g.eligibleVideos} eligible videos at generation. ${savedSlug ? 'Saved as a new playlist.' : 'This version is an unsaved draft.'}`));
    if (editorBackup) node.append(button('Restore previous editor playlist', () => {
      releaseReview(true);
      if (plPlaying) stopPlaylist(); restoreTimelineVfxPreview(); plPlaylist = editorBackup.playlist; plSlug = editorBackup.slug; plNameInput.value = editorBackup.name; plPreviewIdx = -1; timelineTime = 0; editorBackup = null; renderPlaylistEntries();
      document.querySelector('.rd-nav [data-screen="playlist"]').click();
      render(); report('Restored the playlist that was in the editor before previewing this show.');
    }));
    if (g.warnings.length) { const warnings = el('ul', 'sb-warnings'); for (const w of g.warnings) warnings.append(el('li', '', w)); node.append(warnings); }
    node.append(showReview());
    for (const s of g.sections) {
      const section = panel(s.name, `${time(s.start)} – ${time(s.end)} · ${s.entryCount} clips`); section.classList.add('sb-result-section');
      section.append(row(check('Keep this section exactly when regenerating', kept.has(s.id), value => { if (value) kept.add(s.id); else kept.delete(s.id); }), button('Preview section', () => seekReview(s.start, true))));
      const samples = el('div', 'sb-samples'), count = Math.min(6, s.entryCount);
      for (let i = 0; i < count; i++) {
        const index = s.entryStart + Math.floor(i * s.entryCount / count), e = result.entries[index];
        const at = result.entries.slice(0, index).reduce((sum, e) => sum + e.duration.value, 0);
        const card = button('', () => seekReview(at, true));
        const img = el('img'); img.src = '/thumbnail/' + encodeURIComponent(e.video); img.alt = ''; img.loading = 'lazy';
        card.append(img, el('small', '', `${time(at)} · ${viewNames[e.view]} · ${e.duration.value}s`), el('span', '', playlistVideoName(e.video))); card.setAttribute('aria-label', `Preview clip ${index + 1} at ${time(at)}`); samples.append(card);
      } section.append(samples); node.append(section);
    }
    node.append(generator()); return node;
  }
  window.addEventListener('club-library-changed', event => {
    videos = event.detail;
    // Reflection pickers update themselves. Keep the active brick form and its
    // open sections/focus intact when rescanning files during an edit.
    if (library && tab !== 'bricks') render();
  });
  window.addEventListener('club-workspace', event => { if (event.detail === 'builder' && library) render(); else releaseReview(); });
  root.append(el('p', '', 'Loading show models and your library…'));
  Promise.all([load(), refreshMedia()]).then(() => render()).catch(e => {
    if (!library) { root.replaceChildren(el('p', 'sb-error', e.message), button('Retry loading', async () => { await load(); await refreshMedia(); render(); })); }
    else report(e.message, true);
  });
})();
