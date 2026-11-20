/* Focus previews use V1's complete transition controller, including classics. */
(() => {
  'use strict';
  const palette = document.getElementById('plTransitionPalette');
  const browser = palette.closest('details');
  const panel = document.createElement('section');
  panel.className = 'rd-transition-preview';
  panel.setAttribute('aria-label', 'Transition example');
  panel.innerHTML = `<strong class="rd-transition-preview-name">Preview a transition</strong>
    <div class="rd-transition-preview-stage"><canvas width="480" height="270" aria-label="Transition example between library stills"></canvas></div>
    <p class="rd-transition-preview-status" role="status">Hover, focus or tap an effect to see it here.</p>
    <button type="button" class="rd-transition-replay" disabled>Replay example</button>
    <p class="rd-muted">Examples use stills from two library videos. Audition opens the full video preview.</p>`;
  browser.querySelector('summary').after(panel);
  const stage = panel.querySelector('.rd-transition-preview-stage');
  const canvas = stage.querySelector('canvas');
  const context = canvas.getContext('2d');
  const heading = panel.querySelector('strong');
  const status = panel.querySelector('[role=status]');
  const replay = panel.querySelector('button');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const nameToType = new Map(Object.entries(TRANSITION_NAMES).map(([type, name]) => [`Select ${name} transition`, type]));
  const imageCache = new Map();
  let controller = null, outgoing = null, incoming = null;
  let activeType = '', generation = 0, timer = 0;
  function visible() {
    return !document.hidden && browser.open && document.body.dataset.workspace === 'playlist'
      && !document.getElementById('macEditorControls').inert;
  }
  function stop() {
    generation++;
    clearTimeout(timer);
    controller?.cancel();
    panel.dataset.playing = 'false';
  }
  function loadStill(filename) {
    if (!imageCache.has(filename)) {
      const promise = new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error('Could not load the example image. Focus the effect again to retry.'));
        image.src = '/thumbnail/' + encodeURIComponent(filename);
      });
      imageCache.set(filename, promise);
      promise.catch(() => imageCache.delete(filename));
      if (imageCache.size > 4) imageCache.delete(imageCache.keys().next().value);
    }
    return imageCache.get(filename);
  }
  function frame(image) {
    const result = document.createElement('canvas');
    result.width = canvas.width; result.height = canvas.height;
    const ctx = result.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, result.width, result.height);
    const scale = Math.min(result.width / image.naturalWidth, result.height / image.naturalHeight);
    const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
    ctx.drawImage(image, (result.width - width) / 2, (result.height - height) / 2, width, height);
    return result;
  }
  async function preview(type, explicitReplay = false) {
    if (!TRANSITION_CATALOGUE[type] || !visible()) return;
    stop();
    const run = generation;
    activeType = type;
    panel.dataset.transition = type;
    heading.textContent = TRANSITION_NAMES[type];
    replay.disabled = false;
    if (reducedMotion.matches && !explicitReplay) {
      status.textContent = 'Reduced motion is on. Press Replay example to preview this effect.';
      return;
    }
    status.textContent = 'Loading example…';
    try {
      const first = currentFilename || videoListCache[0]?.filename;
      const second = videoListCache.find(video => video.filename !== first)?.filename || first;
      if (!first) throw new Error('Add a video to the library to preview transitions.');
      const images = await Promise.all([loadStill(first), loadStill(second)]);
      if (run !== generation || !visible()) return;
      outgoing = frame(images[0]); incoming = frame(images[1]);
      controller ||= createTransitionController(stage, () => outgoing, () => incoming);
      const settings = normaliseTransition({type, duration:1.2, pace:'steady', seed:1});
      function play() {
        if (run !== generation || !visible()) return;
        context.drawImage(outgoing, 0, 0);
        panel.dataset.playing = 'true';
        timer = setTimeout(() => {
          if (run !== generation || !visible()) return;
          // Cut is immediate; V1 intentionally does not create its overlay.
          controller.prepare(settings);
          context.drawImage(incoming, 0, 0);
          const fallback = controller.getFallbackReason();
          status.textContent = fallback || `${TRANSITION_NAMES[type]} · ${settings.duration}s example`;
          if (type === 'cut') {
            panel.dataset.playing = 'false';
            if (!reducedMotion.matches) timer = setTimeout(play, 1000);
          } else controller.start(() => {
            if (run !== generation) return;
            panel.dataset.playing = 'false';
            if (!reducedMotion.matches) timer = setTimeout(play, 650);
          });
        }, 300);
      }
      play();
    } catch (error) {
      if (run === generation) { status.textContent = error.message; panel.dataset.playing = 'false'; }
    }
  }
  function onEffect(event) {
    const tool = event.target.closest('.pl-transition-tool');
    if (!tool || !palette.contains(tool)) return;
    const type = nameToType.get(tool.getAttribute('aria-label'));
    if (!type) return;
    clearTimeout(timer);
    controller?.cancel();
    // Debounce pointer travel across a row; keyboard and touch start promptly.
    stop();
    timer = setTimeout(() => preview(type), event.type === 'pointerover' ? 100 : 0);
  }
  palette.addEventListener('focusin', onEffect);
  palette.addEventListener('pointerover', event => {
    if (event.pointerType !== 'touch' && !event.target.closest('.pl-transition-tool')?.contains(event.relatedTarget)) onEffect(event);
  });
  palette.addEventListener('click', onEffect);
  browser.addEventListener('pointerleave', () => {
    if (!browser.contains(document.activeElement)) stop();
  });
  browser.addEventListener('focusout', event => {
    if (!browser.contains(event.relatedTarget)) stop();
  });
  replay.addEventListener('click', () => preview(activeType, true));
  browser.addEventListener('toggle', () => { if (!browser.open) stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  reducedMotion.addEventListener('change', stop);
  new MutationObserver(() => { if (!visible()) stop(); })
    .observe(document.body, {attributes:true, attributeFilter:['data-workspace']});
  new MutationObserver(() => { if (!visible()) stop(); })
    .observe(document.getElementById('macEditorControls'), {attributes:true, attributeFilter:['inert']});
})();
