// Design study only. No production APIs or rendering engine are used.
const EXAMPLES = {
  "existing": "# Proposed language: this example is intended to compile to existing V1 JSON.\nshow \"VERSION1 — one-minute opening\" {\n  language 1\n  duration 60s\n  seed 1501\n  output 16:9\n}\n\nmedia liquid = file \"Video by pigmentsunbound_DdMlp9ITPhu.mp4\"\nmedia neon = file \"Video by hellothoughtpalace_DbMzTEclnhS.mp4\"\nmedia dancer = file \"Video by riebschlager_Da4LyKzRrEB.mp4\"\n\nlook mirror4 {\n  layout 4x pattern 15\n  crop pan (50%, 50%) zoom 1\n  playback loop speed 1\n}\nlook mirror8 {\n  layout 8x pattern 27\n  crop pan (50%, 50%) zoom 1\n  playback loop speed 1\n}\noverlay brand = logo version1 {\n  material chrome\n  position (50%, 50%)\n  scale 46%\n  quality high\n  reflection 1.3\n  roughness 0.07\n  rotate y -18deg\n  sweep y from -25deg to 25deg amount 0.22\n}\n\nsequence main {\n  clip liquid for 20s use mirror4 {\n    enter fade-in over 1.5s ease smooth\n  }\n  clip neon for 20s use mirror8 {\n    enter cross-dissolve over 2s ease smooth\n  }\n  clip dancer for 20s use mirror4 {\n    enter fluid-ripple over 2s ease smooth\n  }\n}\nschedule {\n  every 60s from 6s for 8s show brand\n  at 52s for 6s show brand\n}\n",
  "motion": "# Requires the proposed layout-motion runtime; not exportable faithfully to V1.\nshow \"VERSION1 — continuous layout study\" {\n  language 1\n  duration 60s\n  seed 1501\n  output 16:9\n}\nmedia liquid = file \"Video by pigmentsunbound_DdMlp9ITPhu.mp4\"\nmedia neon = file \"Video by hellothoughtpalace_DbMzTEclnhS.mp4\"\n\nlook mirror4 {\n  layout 4x pattern 15\n  crop pan (50%, 50%) zoom 1\n  playback loop speed 1\n}\nlook mirror8 {\n  layout 8x pattern 27\n  crop pan (50%, 50%) zoom 1\n  playback loop speed 1\n}\noverlay brand = logo version1 {\n  material chrome\n  position (50%, 50%)\n  scale 46%\n  quality high\n  reflection 1.3\n  roughness 0.07\n}\nsequence main {\n  clip liquid for 30s use mirror4 {\n    enter fade-in over 1.5s ease smooth\n    at 8s layout 2x pattern 7 over 1.2s motion zoom-in anchor top-row\n    at 18s layout 4x pattern 15 over 1.2s motion zoom-out anchor top-row\n  }\n  clip neon for 30s use mirror8 {\n    enter cross-dissolve over 2s ease smooth\n    at 8s layout 4x pattern 15 over 1.2s motion zoom-in anchor left-block\n    at 18s layout 8x pattern 27 over 1.2s motion zoom-out anchor left-block\n  }\n}\nschedule {\n  every 60s from 6s for 8s show brand\n  at 52s for 6s show brand\n}\n"
};

(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const source = $('source'), canvas = $('canvas'), ctx = canvas.getContext('2d');
  const media = {
    'Video by pigmentsunbound_DdMlp9ITPhu.mp4': '../assets/library-stills/library-05.jpg',
    'Video by hellothoughtpalace_DbMzTEclnhS.mp4': '../assets/library-stills/library-02.jpg',
    'Video by riebschlager_Da4LyKzRrEB.mp4': '../assets/library-stills/library-03.jpg',
  };
  const images = {};
  for (const [name, url] of Object.entries(media)) {
    const img = new Image(); img.onload = () => draw(); img.src = url; images[name] = img;
  }
  let plan = null, playhead = 0, playing = false, lastFrame = 0, selectedClip = null;
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const smooth = p => p * p * (3 - 2 * p);
  const fmt = v => `${Math.floor(v / 60).toString().padStart(2, '0')}:${Math.floor(v % 60).toString().padStart(2, '0')}`;
  const fail = (line, message) => { throw new Error(`Line ${line}: ${message}`); };
  function numberLines() {
    $('numbers').textContent = source.value.split('\n').map((_, i) => i + 1).join('\n');
    $('numbers').scrollTop = source.scrollTop;
  }
  function stripComment(line) {
    let quoted = false, escaped = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (escaped) { escaped = false; continue; }
      if (c === '\\' && quoted) { escaped = true; continue; }
      if (c === '"') quoted = !quoted;
      if (c === '#' && !quoted) return line.slice(0, i).trim();
    }
    return line.trim();
  }
  function parse(text) {
    if (text.length > 524288) fail(1, 'Sketch source limit is 512 KiB.');
    const p = {clips: [], media: {}, looks: {}, overlays: {}, schedules: [], duration: 0};
    let cursor = 0, declared = null, sawShow = false, sawSequence = false;
    const stack = [], lines = text.split('\n');
    const percent = n => Number(n) / 100;
    lines.forEach((raw, i) => {
      const line = i + 1, s = stripComment(raw); if (!s) return;
      const top = stack.at(-1); let m;
      if (s === '}') { if (!top) fail(line, 'Unexpected closing brace.'); stack.pop(); return; }
      if (!top) {
        if (/^show ".*" \{$/.test(s)) {
          if (sawShow) fail(line, 'Only one show is supported.'); sawShow = true;
          stack.push({kind: 'show'}); return;
        }
        if ((m = s.match(/^media ([\w-]+) = file ("(?:[^"\\]|\\.)*")$/))) {
          if (p.media[m[1]]) fail(line, 'Duplicate media alias.');
          const name = JSON.parse(m[2]); if (!media[name]) fail(line, 'Sketch has a still for only the three example videos.');
          p.media[m[1]] = name; return;
        }
        if ((m = s.match(/^look ([\w-]+) \{$/))) {
          if (p.looks[m[1]]) fail(line, 'Duplicate look.');
          const look = {layout: 4, pattern: 15, line}; p.looks[m[1]] = look;
          stack.push({kind: 'look', value: look}); return;
        }
        if ((m = s.match(/^overlay ([\w-]+) = logo version1 \{$/))) {
          if (p.overlays[m[1]]) fail(line, 'Duplicate overlay.');
          const o = {x: .5, y: .5, scale: .46, line}; p.overlays[m[1]] = o;
          stack.push({kind: 'overlay', value: o}); return;
        }
        if (s === 'sequence main {') {
          if (sawSequence) fail(line, 'Only one main sequence is supported.'); sawSequence = true;
          stack.push({kind: 'sequence'}); return;
        }
        if (s === 'schedule {') { stack.push({kind: 'schedule'}); return; }
      } else if (top.kind === 'show') {
        if ((m = s.match(/^duration ([\d.]+)s$/))) { declared = Number(m[1]); return; }
        if (s === 'language 1' || s === 'output 16:9' || /^seed \d+$/.test(s)) return;
      } else if (top.kind === 'look') {
        if ((m = s.match(/^layout (2|4|8)x pattern (\d+)$/))) {
          Object.assign(top.value, {layout: Number(m[1]), pattern: Number(m[2])}); return;
        }
        // Only centered, unzoomed examples are illustrated; other values are rejected.
        if (/^crop pan \(50%, 50%\) zoom 1$/.test(s) || s === 'playback loop speed 1') return;
      } else if (top.kind === 'overlay') {
        if ((m = s.match(/^position \(([\d.]+)%,\s*([\d.]+)%\)$/))) {
          top.value.x = percent(m[1]); top.value.y = percent(m[2]); return;
        }
        if ((m = s.match(/^scale ([\d.]+)%$/))) { top.value.scale = percent(m[1]); return; }
        // These known metadata lines are accepted, but the UI explicitly says 3D is not rendered.
        if (s === 'material chrome' || s === 'quality high' || /^reflection [\d.]+$/.test(s) || /^roughness [\d.]+$/.test(s) || /^rotate y -?[\d.]+deg$/.test(s) || /^sweep y from -?[\d.]+deg to -?[\d.]+deg amount [\d.]+$/.test(s)) return;
      } else if (top.kind === 'sequence') {
        if ((m = s.match(/^clip ([\w-]+) for ([\d.]+)s use ([\w-]+) \{$/))) {
          const length = Number(m[2]); if (!(length > 0)) fail(line, 'Clip duration must be positive.');
          const c = {alias: m[1], look: m[3], start: cursor, length, line, events: [], enter: null};
          cursor += length; if (cursor > 86400 || p.clips.length >= 10000) fail(line, 'Sketch expansion limit reached.');
          p.clips.push(c); stack.push({kind: 'clip', value: c}); return;
        }
      } else if (top.kind === 'clip') {
        if ((m = s.match(/^enter (fade-in|cross-dissolve|fluid-ripple) over ([\d.]+)s ease (smooth|linear|in|out)$/))) {
          if (top.value.enter) fail(line, 'Duplicate incoming transition.');
          top.value.enter = {type: m[1], duration: Number(m[2]), line}; return;
        }
        if ((m = s.match(/^at ([\d.]+)s layout (2|4|8)x pattern (\d+) over ([\d.]+)s motion (zoom-in|zoom-out) anchor (top-row|left-block)(?: accent ([\d.]+)%)?$/))) {
          top.value.events.push({at: Number(m[1]), layout: Number(m[2]), pattern: Number(m[3]), duration: Number(m[4]), motion: m[5], anchor: m[6], accent: m[7] === undefined ? .12 : Number(m[7]) / 100, line}); return;
        }
      } else if (top.kind === 'schedule') {
        if ((m = s.match(/^every ([\d.]+)s from ([\d.]+)s for ([\d.]+)s show ([\w-]+)$/))) {
          const period = Number(m[1]); if (!(period > 0)) fail(line, 'Period must be positive.');
          p.schedules.push({period, at: Number(m[2]), duration: Number(m[3]), alias: m[4], line}); return;
        }
        if ((m = s.match(/^at ([\d.]+)s for ([\d.]+)s show ([\w-]+)$/))) {
          p.schedules.push({at: Number(m[1]), duration: Number(m[2]), alias: m[3], line}); return;
        }
      }
      fail(line, 'Unsupported syntax in this sketch. See its supported subset or load an example.');
    });
    if (stack.length) fail(lines.length, 'Missing closing brace.');
    if (!sawShow || !sawSequence || !p.clips.length) fail(1, 'A show and a nonempty main sequence are required.');
    p.duration = cursor;
    if (!Number.isFinite(declared) || Math.abs(declared - cursor) > .000001) fail(1, `Declared duration must equal the ${cursor}s sequence.`);
    const checkPattern = (o, line) => { if (o.pattern < 1 || o.pattern > 32) fail(line, 'Saved pattern ID must be 1–32.'); };
    p.clips.forEach(c => {
      if (!p.media[c.alias]) fail(c.line, 'Unknown media alias.');
      if (!p.looks[c.look]) fail(c.line, 'Unknown look.');
      c.file = p.media[c.alias]; c.initial = p.looks[c.look]; checkPattern(c.initial, c.initial.line);
      if (c.enter && (!(c.enter.duration > 0) || c.enter.duration > c.length)) fail(c.enter.line, 'Transition must fit inside the clip.');
      c.events.sort((a, b) => a.at - b.at);
      let current = c.initial, end = c.enter?.duration || 0;
      c.events.forEach(e => {
        if (![e.at, e.duration, e.accent].every(Number.isFinite) || e.accent < 0 || e.accent > .4) fail(e.line, 'Invalid motion values; accent must be 0–40%.');
        if (!(e.duration > 0) || e.at < end || e.at + e.duration > c.length) fail(e.line, 'Layout motion overlaps a transition/motion or exceeds its clip.');
        const key = `${current.layout}-${e.layout}`;
        if (!['4-2', '2-4', '8-4', '4-8'].includes(key)) fail(e.line, 'Sketch supports 4↔2 and 8↔4 only.');
        if ((key.includes('2') ? 'top-row' : 'left-block') !== e.anchor) fail(e.line, 'Use top-row for 4↔2, left-block for 8↔4.');
        if ((current.layout > e.layout ? 'zoom-in' : 'zoom-out') !== e.motion) fail(e.line, 'Motion name must match the layout direction.');
        checkPattern(e, e.line); e.from = current;
        for (const [a, b] of pairs(current.layout, e.layout)) {
          if (flips(current.layout, current.pattern, a).join() !== flips(e.layout, e.pattern, b).join()) fail(e.line, 'Survivor flips differ. Use the supplied compatible pattern pair.');
        }
        current = e; end = e.at + e.duration;
      });
    });
    p.cues = [];
    p.schedules.forEach(s => {
      if (!p.overlays[s.alias]) fail(s.line, 'Unknown overlay.');
      const o = p.overlays[s.alias];
      if (![o.x, o.y, o.scale, s.at, s.duration, s.period ?? 1].every(Number.isFinite)) fail(s.line, 'Invalid numeric value.');
      if (o.x < 0 || o.x > 1 || o.y < 0 || o.y > 1 || o.scale < .1 || o.scale > 2) fail(o.line, 'Position must be 0–100%; scale 10–200%.');
      if (!(s.duration > 0)) fail(s.line, 'Cue duration must be positive.');
      for (let at = s.at; at < cursor; at += s.period || cursor + 1) {
        if (at + s.duration > cursor + .000001) fail(s.line, 'Brand cue extends beyond the show.');
        if (p.cues.length > 10000) fail(s.line, 'Too many sketch cues.');
        p.cues.push({...s, at, overlay: o});
      }
    });
    p.cues.sort((a, b) => a.at - b.at);
    for (let i = 1; i < p.cues.length; i++) if (p.cues[i].at < p.cues[i - 1].at + p.cues[i - 1].duration) fail(p.cues[i].line, 'Overlapping branding cues are not supported.');
    p.source = text;
    return p;
  }
  function rects(layout) {
    const cols = layout === 8 ? 4 : 2, rows = layout === 2 ? 1 : 2;
    return Array.from({length: layout}, (_, i) => [i % cols / cols, Math.floor(i / cols) / rows, 1 / cols, 1 / rows]);
  }
  function pairs(from, to) {
    if (from === 4 && to === 2 || from === 2 && to === 4) return [[0, 0], [1, 1]];
    if (from === 8 && to === 4) return [[0, 0], [1, 1], [4, 2], [5, 3]];
    return [[0, 0], [1, 1], [2, 4], [3, 5]];
  }
  function flips(layout, pattern, i) {
    const h = [[0,0,0,0],[0,0,1,1],[1,0,0,1],[0,1,1,0],[1,1,1,1],[1,1,0,0],[0,1,0,1],[1,0,1,0]];
    const v = [[0,0],[0,1],[1,0],[1,1]], id = pattern - 1;
    const pos = layout === 2 ? [0,3][i] : layout === 4 ? [0,1,4,5][i] : i;
    return [h[Math.floor(id / 4)][pos % 4] ? -1 : 1, v[id % 4][Math.floor(pos / 4)] ? -1 : 1];
  }
  function drawTile(img, r, flip, alpha = 1, zoom = 1) {
    if (!img?.complete || !img.naturalWidth) return;
    const [x, y, w, h] = r.map((v, i) => v * (i % 2 ? canvas.height : canvas.width));
    if (w <= 0 || h <= 0) return;
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight) * zoom;
    const sw = w / scale, sh = h / scale;
    ctx.save(); ctx.globalAlpha = alpha; ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    ctx.translate(x + w / 2, y + h / 2); ctx.scale(...flip);
    ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, -w / 2, -h / 2, w, h);
    ctx.restore();
  }
  function drawLayout(img, layout, pattern) { rects(layout).forEach((r, i) => drawTile(img, r, flips(layout, pattern, i))); }
  function stateAt(c, t) {
    let current = c.initial;
    for (const e of c.events) {
      if (t < e.at) break;
      if (t < e.at + e.duration) return {current, active: e, p: smooth((t - e.at) / e.duration)};
      current = e;
    }
    return {current, active: null};
  }
  function draw() {
    ctx.fillStyle = '#050705'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (!plan) return;
    const index = Math.max(0, plan.clips.findIndex(c => playhead < c.start + c.length));
    const c = plan.clips[index], local = playhead - c.start, img = images[c.file], s = stateAt(c, local);
    if (s.active) {
      const e = s.active, a = rects(s.current.layout), b = rects(e.layout), map = pairs(s.current.layout, e.layout);
      // Illustrative bounded geometry: destination underlay prevents holes.
      drawLayout(img, e.layout, e.pattern);
      const survivors = new Set(map.map(pair => pair[0]));
      a.forEach((r, i) => { if (!survivors.has(i)) drawTile(img, r, flips(s.current.layout, s.current.pattern, i), 1 - s.p); });
      map.forEach(([i, j]) => drawTile(img, a[i].map((v, k) => v + (b[j][k] - v) * s.p), flips(s.current.layout, s.current.pattern, i), 1, 1 + e.accent * Math.sin(Math.PI * s.p)));
    } else drawLayout(img, s.current.layout, s.current.pattern);
    const cue = plan.cues.find(q => playhead >= q.at && playhead < q.at + q.duration);
    if (cue) {
      const o = cue.overlay;
      ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.font = `800 ${Math.round(120 * o.scale / .46)}px system-ui`;
      ctx.shadowColor = '#000'; ctx.shadowBlur = 12; ctx.fillStyle = '#e4e9e6';
      ctx.fillText('VERSION1', o.x * canvas.width, o.y * canvas.height);
      ctx.restore();
    }
    const label = s.active ? `${s.current.layout}× → ${s.active.layout}× · ${Math.round(s.p * 100)}%` : `${s.current.layout}× · Pattern ${s.current.pattern}`;
    $('layoutBadge').textContent = label; $('currentLayout').textContent = label;
    $('initialLayout').textContent = `${c.initial.layout}× · Pattern ${c.initial.pattern}`;
    $('clipNumber').textContent = `CLIP ${(index + 1).toString().padStart(2, '0')}`;
    $('clipTitle').textContent = c.alias; $('fileName').textContent = c.file;
    $('incoming').textContent = c.enter ? `${c.enter.type} · ${c.enter.duration}s (not rendered)` : 'Cut';
    $('brandPosition').textContent = cue ? `${cue.overlay.x * 100}%, ${cue.overlay.y * 100}% · illustration` : 'No active branding';
    $('time').textContent = `${fmt(playhead)} / ${fmt(plan.duration)}`; $('seek').value = playhead;
    document.querySelectorAll('.playhead').forEach(el => { el.style.left = `${playhead / plan.duration * 100}%`; });
    selectedClip = c;
  }
  function reveal(line) {
    showPane('source');
    const lines = source.value.split('\n');
    const start = lines.slice(0, line - 1).reduce((n, l) => n + l.length + 1, 0);
    source.focus(); source.setSelectionRange(start, start + lines[line - 1].length);
    source.scrollTop = Math.max(0, (line - 5) * parseFloat(getComputedStyle(source).lineHeight));
    $('numbers').scrollTop = source.scrollTop;
  }
  function block(lane, start, length, text, line, type = '') {
    const b = document.createElement('button'); b.className = `block ${type}`;
    b.style.left = `${start / plan.duration * 100}%`; b.style.width = `${length / plan.duration * 100}%`;
    b.textContent = text; b.title = `${text} · ${start}s · source line ${line}`;
    b.addEventListener('click', () => { setTime(start); reveal(line); }); $(lane).append(b);
  }
  function timeline() {
    for (const id of ['videoLane', 'layoutLane', 'brandLane', 'jumps', 'ruler']) $(id).replaceChildren();
    for (let i = 0; i <= 6; i++) { const t = document.createElement('span'); t.textContent = fmt(plan.duration * i / 6); $('ruler').append(t); }
    plan.clips.forEach(c => {
      block('videoLane', c.start, c.length, `${c.alias} · ${c.length}s`, c.line);
      c.events.forEach(e => {
        block('layoutLane', c.start + e.at, e.duration, `${e.from.layout}→${e.layout}`, e.line, 'motion');
        const b = document.createElement('button'); b.textContent = `${fmt(c.start + e.at)} ${e.from.layout}× → ${e.layout}×`;
        b.addEventListener('click', () => { setTime(c.start + e.at + e.duration / 2); }); $('jumps').append(b);
      });
    });
    plan.cues.forEach(c => block('brandLane', c.at, c.duration, c.alias, c.line, 'brand'));
    for (const id of ['videoLane', 'layoutLane', 'brandLane']) { const p = document.createElement('span'); p.className = 'playhead'; $(id).append(p); }
    const motions = plan.clips.reduce((n, c) => n + c.events.length, 0);
    $('durationBadge').textContent = `${fmt(plan.duration)} · ${plan.clips.length} CLIPS · ${motions} MOVES`;
    $('capabilityTitle').textContent = motions ? 'New engine capability: layout motion' : 'Designed to compile into existing playlist data';
    $('capabilityDetail').textContent = motions ? 'Continuous source playback; layout geometry animation requires a shared engine addition.' : 'Fixed layouts, incoming transitions and single-scene chrome logo cues reuse V1 contracts.';
    if (!motions) $('jumps').textContent = 'No layout-motion events in this example.';
  }
  function setTime(t) { playhead = clamp(t, 0, Math.max(0, plan.duration - .00001)); draw(); }
  function stop() { playing = false; $('play').textContent = 'Play'; $('play').setAttribute('aria-label', 'Play illustration'); }
  function build() {
    try {
      const next = parse(source.value); stop(); plan = next;
      $('seek').max = plan.duration; timeline(); setTime(0);
      $('status').className = 'status'; $('status').textContent = `Sketch built · ${plan.duration}s · ${plan.clips.length} clips. No playlist saved or sent.`;
    } catch (e) {
      stop(); $('status').className = 'status error';
      $('status').textContent = `${e.message} ${plan ? 'Preview remains the last successful build.' : ''}`;
    }
  }
  function showPane(name) {
    document.querySelector('main').dataset.pane = name;
    document.querySelectorAll('[data-pane][aria-pressed]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.pane === name)));
  }
  document.querySelectorAll('[data-pane][aria-pressed]').forEach(b => b.addEventListener('click', () => showPane(b.dataset.pane)));
  function sourceSelection() {
    if (!plan || plan.source !== source.value) return;
    const line = source.value.slice(0, source.selectionStart).split('\n').length;
    for (const c of plan.clips) {
      const event = c.events.find(e => e.line === line);
      if (event) { stop(); setTime(c.start + event.at + event.duration / 2); return; }
      if (c.line === line) { stop(); setTime(c.start); return; }
    }
    const cue = plan.cues.find(q => q.line === line);
    if (cue) { stop(); setTime(cue.at); }
  }
  function tick(now) {
    if (playing && plan) {
      const delta = Math.min((now - lastFrame) / 1000, .1); playhead += delta;
      if (playhead >= plan.duration) { playhead = plan.duration - .00001; stop(); }
      draw();
    }
    lastFrame = now; requestAnimationFrame(tick);
  }
  $('build').addEventListener('click', build);
  $('example').addEventListener('change', () => { source.value = EXAMPLES[$('example').value]; numberLines(); build(); });
  source.addEventListener('input', () => { numberLines(); stop(); $('status').className = 'status'; $('status').textContent = 'Source changed. Build to update; preview is the previous revision.'; });
  source.addEventListener('scroll', () => { $('numbers').scrollTop = source.scrollTop; });
  source.addEventListener('click', sourceSelection);
  source.addEventListener('keyup', e => { if (e.key.startsWith('Arrow')) sourceSelection(); });
  source.addEventListener('keydown', e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); build(); } });
  $('seek').addEventListener('input', e => { stop(); setTime(Number(e.target.value)); });
  $('play').addEventListener('click', () => {
    if (!plan) return;
    if (playing) stop(); else { if (playhead >= plan.duration - .02) setTime(0); playing = true; lastFrame = performance.now(); $('play').textContent = 'Pause'; $('play').setAttribute('aria-label', 'Pause illustration'); }
  });
  $('previous').addEventListener('click', () => { if (plan) { stop(); setTime([...plan.clips].reverse().find(c => c.start < playhead - .1)?.start || 0); } });
  $('reveal').addEventListener('click', () => { if (selectedClip) reveal(selectedClip.line); });
  $('download').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([source.value], {type: 'text/plain;charset=utf-8'}));
    const a = document.createElement('a'); a.href = url; a.download = 'version1-study.cvseq'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  source.value = EXAMPLES.motion; numberLines(); build(); requestAnimationFrame(tick);
})();
