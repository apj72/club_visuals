/* Presentation only. All video, data and live actions remain owned by V1. */
(() => {
  'use strict';
  if (isMacEngine) return;
  document.head.append(document.getElementById('redesignStyles'));
  const $ = id => document.getElementById(id);
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    node.className = className;
    if (text) node.textContent = text;
    return node;
  };
  const action = (text, callback) => {
    const button = make('button', 'rd-button', text);
    button.type = 'button';
    button.addEventListener('click', callback);
    return button;
  };
  const header = make('header', 'rd-header');
  header.append(make('strong', 'rd-brand', '⅄  CLUB VISUALS'));
  const nav = make('nav', 'rd-nav');
  nav.setAttribute('aria-label', 'Workspaces');
  const screens = {prepare:'Prepare', builder:'Show Builder', playlist:'Playlists', library:'Library', auto:'Auto Perform', capture:'Capture', settings:'Settings'};
  for (const [key, label] of Object.entries(screens)) {
    const button = action(label, () => navigate(key));
    button.dataset.screen = key;
    nav.append(button);
  }
  const fallback = make('a', 'rd-fallback', 'Classic interface ↗');
  fallback.href = '/classic';
  header.append(nav, fallback);
  document.body.prepend(header);
  const title = make('div', 'rd-workspace-title');
  const heading = make('h1', '', 'Prepare a look');
  const description = make('p', '', 'Audition privately, save a layout, add it to a playlist, or send it to the Mac.');
  title.append(heading, description);
  $('macEditorControls').prepend(title);
  const libraryToolbar = make('div', 'rd-library-toolbar');
  const order = $('catalogSort');
  const orderLabel = order.closest('label');
  orderLabel.firstChild.textContent = 'Library order';
  const reload = document.querySelector('[data-reload-library]');
  const reloadStatus = $('libraryReloadStatus');
  libraryToolbar.append(orderLabel, reload, reloadStatus);
  const downloadImport = document.querySelector('.header');
  const instagram = make('details', 'rd-instagram-download');
  instagram.id = 'instagramDownloads';
  instagram.append(make('summary', '', 'Download from Instagram'), downloadImport);
  downloadImport.querySelector('h1').textContent = 'Instagram downloads';
  $('libraryTab').prepend(instagram);
  function openInstagramDownload() {
    navigate('library');
    instagram.open = true;
    instagram.scrollIntoView({block:'nearest'});
    $('url').focus({preventScroll:true});
  }
  const downloadAccess = action('Download from Instagram', openInstagramDownload);
  downloadAccess.id = 'instagramDownloadAccess';
  downloadAccess.title = 'Open Library’s Instagram downloader. Paste a reel or post URL and download it into your library.';
  libraryToolbar.append(downloadAccess);
  title.after(libraryToolbar);


  const left = document.querySelector('.left-col');
  const right = document.querySelector('.right-col');
  left.append($('libraryTab'));
  const inspector = make('section', 'rd-inspector');
  inspector.setAttribute('aria-label', 'Prepare controls');
  right.prepend(inspector);
  const inspectorTitle = make('h2', '', 'Edit this look');
  inspector.append(inspectorTitle);
  const editToggle = action('Edit controls', () => {
    const open = document.body.classList.toggle('rd-controls-open');
    editToggle.setAttribute('aria-expanded', String(open));
    editToggle.textContent = open ? 'Close controls' : 'Edit controls';
  });
  editToggle.classList.add('rd-inspector-toggle');
  editToggle.setAttribute('aria-expanded', 'false');
  $('macEditorControls').append(editToggle);
  const accordion = (label, open = false) => {
    const details = make('details', 'rd-details');
    details.open = open;
    details.append(make('summary', '', label));
    const content = make('div', 'rd-detail-content');
    details.append(content);
    inspector.append(details);
    return content;
  };
  const move = (id, target) => { const node = $(id); if (node) target.append(node); };
  const layout = accordion('Layout & mirror patterns', true);
  move('viewBtn', layout); // Move its popup wrapper as a unit below.
  const layoutWrapper = $('layoutMenu').parentElement;
  layoutWrapper.prepend($('viewBtn'));
  layout.append(layoutWrapper);
  move('sliderWrap', layout);
  const patternGrid = make('div', 'rd-pattern-grid');
  const patternStatus = make('p', 'rd-muted');
  const allPatterns = action('Show all patterns', () => { showAll = !showAll; renderPatterns(); });
  layout.append(patternStatus, patternGrid, allPatterns);
  const framing = accordion('Zoom & position');
  move('zoomWrap', framing);
  framing.append(make('p', 'rd-muted', 'Zoom below 1× to shrink the video against black with dust-faded edges, or above 1× to crop in. X/Y position works in single and tiled layouts.'));
  const transition = accordion('Playback & incoming transition');
  const loopWrapper = $('loopBtn').parentElement;
  transition.append(loopWrapper);
  transition.append($('manualTransitionType').closest('.manual-transition') || $('manualTransitionType').parentElement);
  transition.append(document.querySelector('.speed-control'));
  const creative = accordion('Colour, VFX & 3D text');
  creative.append(make('p', 'rd-muted', 'Open the existing effect controllers to edit the full set of finishes, reflections, lighting and motion.'));
  ['fxBtn','vfxBtn','cameraMotionBtn','mirrorBtn','logo3dBtn','reflectionLogoBtn','text3dBtn'].forEach(id => move(id, creative));
  const cues = accordion('Cue ranges', true);
  move('videoCuePanel', cues);
  const saved = accordion('Saved layouts');
  move('videoPresetPanel', saved);
  const utility = accordion('Preview options');
  ['captionBtn','resetControlsBtn','fsBtn'].forEach(id => move(id, utility));
  // Fit the entire existing preview uniformly, preserving its original stage
  // geometry and media rules. Transport remains full-size outside that frame.
  const previewFrame = make('div', 'rd-preview-frame');
  const wrap = $('videoWrap');
  const transport = $('controls');
  wrap.before(previewFrame);
  previewFrame.append(wrap);
  previewFrame.after(transport);
  function fitPreview() {
    if (document.fullscreenElement) return;
    const available = previewFrame.clientHeight;
    const natural = wrap.offsetHeight;
    const scale = natural && available ? Math.min(1, available / natural) : 1;
    wrap.style.setProperty('--rd-preview-scale', scale);
  }
  const fitObserver = new ResizeObserver(fitPreview);
  fitObserver.observe(previewFrame); fitObserver.observe(wrap);
  window.addEventListener('club-preview-fullscreen', event => { if (!event.detail) fitPreview(); });
  // Keep the original progress, play/mute/fullscreen transport in the player.
  // No stage/media styles or rendering functions are replaced.
  const capture = $('capturePanel');
  const captureSection = make('section', 'rd-capture-section');
  const captureIntro = make('p', 'rd-muted', 'Capture this private editor. Recording does not capture the remote Mac output.');
  captureSection.append(captureIntro, capture);
  captureSection.prepend($('captureToggle'));
  const recording = action('Record editor', () => $('recordBtn').click());
  captureSection.append(recording);
  right.append(captureSection);
  // Keep the original authentication and downloader together in Library.
  const settingsImport = action('Open Instagram downloads', openInstagramDownload);
  settingsImport.id = 'settingsInstagramDownload';
  $('settingsTab').append(settingsImport);
  const prefs = make('section', 'rd-pattern-settings');
  prefs.append(make('h2', '', 'Featured mirror patterns'));
  prefs.append(make('p', 'rd-muted', 'Choose which existing V1 orientations appear first in Prepare. Show all reveals the full list. Preferences save on this browser.'));
  $('settingsTab').prepend(prefs);
  // Preserve the complete playlist editor while grouping its longer tools.
  function groupExisting(label, nodes, open = false) {
    const details = make('details', 'rd-details');
    details.open = open;
    details.append(make('summary', '', label));
    nodes[0].before(details);
    nodes.forEach(node => details.append(node));
    return details;
  }
  groupExisting('Add a playlist entry', [document.querySelector('.pl-add-form')]);
  const transitions = groupExisting('Browse transitions', [document.querySelector('.pl-palette-heading'), $('plTransitionPalette')]);
  const transitionSearch = document.createElement('input');
  transitionSearch.type = 'search';
  transitionSearch.placeholder = 'Search all 61 transitions…';
  transitionSearch.setAttribute('aria-label', 'Search transitions');
  transitions.querySelector('summary').after(transitionSearch);
  function filterTransitions() {
    const query = transitionSearch.value.toLowerCase().trim();
    $('plTransitionPalette').querySelectorAll('.pl-transition-category').forEach(category => {
      let found = false;
      category.querySelectorAll('.pl-transition-tool').forEach(tool => {
        tool.hidden = !`${tool.textContent} ${tool.title}`.toLowerCase().includes(query);
        if (!tool.hidden) found = true;
      });
      category.hidden = !found;
      if (query && found) category.open = true;
    });
  }
  transitionSearch.addEventListener('input', filterTransitions);
  new MutationObserver(filterTransitions).observe($('plTransitionPalette'), {childList:true, subtree:true});
  let featured;
  try { featured = JSON.parse(localStorage.getItem('clubRedesignFeaturedPatterns') || '{}'); }
  catch { featured = {}; }
  if (!featured || typeof featured !== 'object' || Array.isArray(featured)) featured = {};
  let showAll = false;
  let screen = 'prepare';
  let lastPatternState = '';
  // Use exactly the maps consumed by V1 drawCompositeFrame/applyTransforms.
  const maps = {0:[0], 1:DUAL_POS_MAP, 2:TRIPLE_POS_MAP, 3:QUAD_POS_MAP, 4:[0,1,2,3,4,5,6,7], 5:SIX_POS_MAP};
  const columns = [1,2,3,2,4,3];
  const names = ['Single','2×','3×','4×','8×','6×'];
  function patterns(mode) {
    const unique = new Map();
    CONFIGS.forEach((config, index) => {
      const signature = maps[mode].map(position => config[position] || '');
      const key = JSON.stringify(signature);
      if (!unique.has(key)) unique.set(key, {id:index + 1, signature});
    });
    return [...unique.values()];
  }
  function icon(pattern, mode) {
    const grid = make('span', 'rd-pattern-icon');
    grid.style.setProperty('--columns', columns[mode]);
    grid.setAttribute('aria-hidden', 'true');
    pattern.signature.forEach((transform, index) => {
      const cell = make('span', 'rd-pattern-cell');
      const marker = make('span', 'rd-orientation', 'F');
      marker.style.transform = transform;
      const number = make('small', 'rd-tile-number', String(index + 1));
      cell.append(marker, number);
      grid.append(cell);
    });
    return grid;
  }
  function isFeatured(mode, id) { return Array.isArray(featured[mode]) && featured[mode].includes(id); }
  function renderPatterns() {
    patternGrid.replaceChildren();
    const mode = viewMode;
    if (mode === 0) {
      patternStatus.textContent = 'Single view fits the original source. Choose a tiled layout for mirror patterns.';
      allPatterns.hidden = true;
      lastPatternState = `${viewMode}:${configIdx}`;
      return;
    }
    allPatterns.hidden = false;
    const items = patterns(mode);
    const selectedSignature = JSON.stringify(maps[mode].map(p => CONFIGS[configIdx][p] || ''));
    const anyFeatured = items.some(p => isFeatured(mode, p.id));
    let shown = 0;
    for (const pattern of items) {
      const selected = JSON.stringify(pattern.signature) === selectedSignature;
      if (!showAll && anyFeatured && !isFeatured(mode, pattern.id) && !selected) continue;
      const button = action('', () => { setConfig(pattern.id); renderPatterns(); });
      button.classList.add('rd-pattern');
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
      button.setAttribute('aria-label', `${names[mode]} pattern ${pattern.id}`);
      button.append(icon(pattern, mode), make('span', '', `Pattern ${pattern.id}`));
      patternGrid.append(button);
      shown++;
    }
    patternStatus.textContent = `${shown} shown · ${items.length} unique V1 orientations`;
    allPatterns.textContent = showAll ? 'Show featured patterns' : 'Show all patterns';
    allPatterns.disabled = !anyFeatured;
    lastPatternState = `${viewMode}:${configIdx}`;
  }
  function renderPreferences() {
    prefs.querySelectorAll('details').forEach(node => node.remove());
    for (const mode of [1,3,5,4]) {
      const details = make('details', 'rd-details');
      details.append(make('summary', '', `${names[mode]} · ${patterns(mode).length} orientations`));
      const grid = make('div', 'rd-preference-grid');
      for (const pattern of patterns(mode)) {
        const label = make('label', 'rd-preference');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = isFeatured(mode, pattern.id);
        input.setAttribute('aria-label', `Feature ${names[mode]} pattern ${pattern.id}`);
        input.addEventListener('change', () => {
          const selected = new Set(Array.isArray(featured[mode]) ? featured[mode] : []);
          input.checked ? selected.add(pattern.id) : selected.delete(pattern.id);
          featured[mode] = [...selected];
          try { localStorage.setItem('clubRedesignFeaturedPatterns', JSON.stringify(featured)); }
          catch { patternStatus.textContent = 'Browser storage is unavailable; preferences last for this session.'; }
          renderPatterns();
        });
        label.append(input, icon(pattern, mode), make('span', '', `Pattern ${pattern.id}`));
        grid.append(label);
      }
      details.append(grid);
      prefs.append(details);
    }
  }

  // Replace native select presentation with an anchored menu, retaining the
  // actual select and dispatching its existing change/input listeners.
  const menu = make('div', 'rd-select-menu');
  menu.hidden = true;
  menu.setAttribute('role', 'listbox');
  document.body.append(menu);
  let activeSelect = null;
  function closeSelect() { menu.hidden = true; activeSelect?.button.setAttribute('aria-expanded', 'false'); activeSelect = null; }
  function positionSelect(button) {
    const rect = button.getBoundingClientRect();
    const width = Math.min(Math.max(rect.width, 220), innerWidth - 24);
    menu.style.width = `${width}px`;
    menu.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - width - 12))}px`;
    const below = innerHeight - rect.bottom - 12;
    const above = rect.top - 12;
    const down = below >= 180 || below >= above;
    menu.style.maxHeight = `${Math.min(320, Math.max(70, down ? below : above))}px`;
    menu.style.top = down ? `${rect.bottom + 4}px` : 'auto';
    menu.style.bottom = down ? 'auto' : `${innerHeight - rect.top + 4}px`;
  }
  function openSelect(select, button) {
    const wasOpen = activeSelect?.select === select;
    closeSelect();
    if (wasOpen) return;
    activeSelect = {select, button};
    menu.replaceChildren();
    menu.setAttribute('aria-label', select.getAttribute('aria-label') || select.closest('label')?.textContent.split('\n')[0] || 'Choose option');
    for (const option of select.options) {
      const choice = action(option.textContent, () => {
        select.value = option.value;
        select.dispatchEvent(new Event('input', {bubbles:true}));
        select.dispatchEvent(new Event('change', {bubbles:true}));
        closeSelect();
        button.focus();
      });
      choice.dataset.controlHint = window.ControlHints?.hint(option) || option.title || '';
      choice.disabled = option.disabled || option.parentElement.disabled;
      choice.setAttribute('role', 'option');
      choice.setAttribute('aria-selected', String(option.selected));
      choice.tabIndex = option.selected ? 0 : -1;
      menu.append(choice);
    }
    menu.hidden = false;
    positionSelect(button);
    button.setAttribute('aria-expanded', 'true');
    (menu.querySelector('[aria-selected="true"]') || menu.querySelector('button'))?.focus();
  }
  const selects = new Map();
  function syncSelects() {
    if (activeSelect && (activeSelect.select.disabled || activeSelect.select.closest('[inert]'))) closeSelect();
    for (const [select] of selects) if (!select.isConnected) selects.delete(select);
    document.querySelectorAll('select').forEach(select => {
      // Multiple selects retain native multi-selection semantics.
      if (select.multiple || select.size > 1) return;
      let button = selects.get(select);
      if (!button) {
        button = action('', () => openSelect(select, button));
        button.classList.add('rd-select-trigger');
        button.setAttribute('aria-haspopup', 'listbox');
        button.setAttribute('aria-expanded', 'false');
        select.classList.add('rd-native-select');
        select.setAttribute('aria-hidden', 'true');
        select.tabIndex = -1;
        select.addEventListener('focus', () => button.focus());
        select.after(button);
        selects.set(select, button);
        button.setAttribute('aria-label', select.getAttribute('aria-label') || select.labels?.[0]?.textContent.trim() || select.title || select.id || 'Choose option');
      }
      const text = (select.selectedOptions[0]?.textContent || 'Choose…') + ' ▾';
      if (button.textContent !== text) button.textContent = text;
      button.dataset.controlHint = window.ControlHints?.hint(select) || select.title || '';
      button.disabled = select.disabled;
      button.hidden = select.hidden || select.style.display === 'none';
    });
  }
  document.addEventListener('click', event => {
    if (activeSelect && !menu.contains(event.target) && event.target !== activeSelect.button) closeSelect();
  });
  document.addEventListener('keydown', event => {
    if (!activeSelect) return;
    if (event.key === 'Escape') { const button = activeSelect.button; closeSelect(); button.focus(); event.preventDefault(); event.stopImmediatePropagation(); }
    if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
      const options = [...menu.querySelectorAll('button:not(:disabled)')];
      const index = options.indexOf(document.activeElement);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? options.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length;
      options[next]?.focus(); event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('resize', closeSelect);
  window.addEventListener('club-show-seek', closeSelect);
  document.addEventListener('scroll', event => {
    if (activeSelect && !menu.contains(event.target)) positionSelect(activeSelect.button);
  }, true);
  // Menus opened within an existing modal must join that modal's top layer.
  document.addEventListener('click', event => {
    const trigger = event.target.closest('.rd-select-trigger');
    if (trigger) (trigger.closest('dialog') || document.body).append(menu);
  }, true);

  const titles = {
    builder:['Build a show, make it yours','Assemble reusable bricks. Choose a DJ. Generate hours of editable visuals.'],
    prepare:['Prepare a look','Audition privately, save a layout, add it to a playlist, or send it to the Mac.'],
    playlist:['Build the sequence','Edit the timeline, transitions and timed cues. Save and send are separate actions.'],
    library:['Your video library','Find, arrange and classify your original videos. Selecting a video auditions it privately.'],
    auto:['Perform with the music','Use the existing Mac audio engine, curated video pool and 3D text lists.'],
    capture:['Capture this editor','Record a reusable logo video or crop a social clip from the private preview.'],
    settings:['Settings','Choose featured patterns and manage your existing folders, import and playback preferences.']
  };
  function displayScreen(key) {
    screen = key;
    document.body.dataset.workspace = key;
    heading.textContent = titles[key][0]; description.textContent = titles[key][1];
    nav.querySelectorAll('button').forEach(button => {
      button.classList.toggle('selected', button.dataset.screen === key);
      if (button.dataset.screen === key) button.setAttribute('aria-current', 'page'); else button.removeAttribute('aria-current');
    });
    if (key === 'capture') {
      if (!capture.classList.contains('visible')) toggleInstagramCapturePanel();
    } else if (capture.classList.contains('visible')) toggleInstagramCapturePanel();
    closeSelect();
    fitPreview();
    window.dispatchEvent(new CustomEvent('club-workspace', {detail: key}));
  }
  function navigate(key) {
    if (!screens[key]) key = 'prepare';
    switchTab(key === 'playlist' ? 'playlist' : key === 'settings' ? 'settings' : 'library');
    displayScreen(key);
    history.replaceState(null, '', `${location.pathname}${location.search}#${key}`);
    renderPatterns();
  }
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
  // V1 can navigate to Playlist from a card or saved layout action. Reflect
  // that transition without replacing or wrapping its switchTab function.
  new MutationObserver(() => {
    if ($('playlistTab').classList.contains('active') && screen !== 'playlist') displayScreen('playlist');
    else if ($('settingsTab').classList.contains('active') && screen !== 'settings') displayScreen('settings');
    else if ($('libraryTab').classList.contains('active') && ['playlist','settings'].includes(screen)) displayScreen('prepare');
  }).observe(document.querySelector('.main-layout'), {subtree:true, attributes:true, attributeFilter:['class']});
  renderPreferences();
  navigate(location.hash.slice(1) || 'prepare');
  syncSelects();
  setInterval(() => {
    nav.inert = macControlsLocked;
    const recordLabel = `${$('recordBtn').textContent} · this editor`;
    if (recording.textContent !== recordLabel) recording.textContent = recordLabel;
    recording.disabled = $('recordBtn').disabled;
    syncSelects();
    if (`${viewMode}:${configIdx}` !== lastPatternState) renderPatterns();
  }, 250);
})();
