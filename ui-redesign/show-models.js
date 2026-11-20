/* Reusable show recipes. Pure compiler shared by the editor and Node checks. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.ShowModels = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  const views = ['single', 'dual', 'triple', 'quad', 'octo', 'six'];
  const effects = ['off', 'scene-0', 'scene-1', 'scene-2', 'mirror', 'scene-4', 'scene-5', 'logo', 'text', 'dj', 'camera', 'video'];
  function check(condition, message) { if (!condition) throw new Error(message); }
  function number(value, min, max, label) {
    check(typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max, `${label} must be between ${min} and ${max}.`);
    return value;
  }
  function named(value, label) { check(typeof value === 'string' && value.trim() && value.length <= 120, `${label} needs a name (up to 120 characters).`); }
  function layout(value) {
    check(views.includes(value.view), 'Choose a supported layout.');
    check(Number.isInteger(value.preset) && value.preset >= 1 && value.preset <= 32, 'Pattern must be 1–32.');
    for (const [key, min, max, fallback] of [['zoom', .25, 4, 1], ['panX', -1, 1, 0], ['panY', -1, 1, 0]]) number(value[key] ?? fallback, min, max, key);
  }
  function validate(library, transitionIds) {
    check(library && library.version === 1, 'Unsupported show library version.');
    for (const kind of ['bricks', 'models', 'profiles']) {
      check(Array.isArray(library[kind]) && library[kind].length <= 200, `Keep up to 200 ${kind}.`);
      const ids = new Set();
      for (const item of library[kind]) {
        named(item.id, 'Component ID'); named(item.name, 'Component');
        check(!ids.has(item.id), `Duplicate ${kind} ID: ${item.id}.`); ids.add(item.id);
      }
    }
    for (const brick of library.bricks) {
      check(Array.isArray(brick.steps) && brick.steps.length > 0 && brick.steps.length <= 100, `${brick.name} needs 1–100 steps.`);
      for (const step of brick.steps) {
        named(step.slot, 'Video slot'); number(step.seconds, 1, 3600, 'Step seconds'); layout(step);
        number(step.speed ?? 1, .25, 4, 'Playback speed');
        check([0, 1, 2].includes(step.loopMode ?? 1), 'Invalid playback mode.');
        const transition = step.transition;
        check(transition && typeof transition.type === 'string', 'Choose an incoming transition.');
        if (transitionIds) check(transitionIds.includes(transition.type), `Unknown transition: ${transition.type}.`);
        number(transition.duration, .15, 10, 'Transition seconds');
        check(['steady', 'accelerate', 'decelerate', 'ease'].includes(transition.pace), 'Choose a transition pace.');
        check(transition.type === 'cut' || transition.duration <= step.seconds, 'Transition must fit inside its step.');
        check(Array.isArray(step.layoutCues || []) && (step.layoutCues || []).length <= 100, 'Too many layout changes.');
        const times = new Set();
        for (const cue of step.layoutCues || []) {
          number(cue.at, .001, step.seconds - .001, 'Layout change time'); layout({...step, ...cue});
          check(!times.has(cue.at), 'Two layout changes cannot share a time.'); times.add(cue.at);
        }
        check(Array.isArray(step.effects || []) && (step.effects || []).length <= 100, 'Too many effects.');
        let end = 0;
        for (const effect of [...step.effects || []].sort((a, b) => a.at - b.at)) {
          number(effect.at, 0, step.seconds, 'Effect start'); number(effect.seconds, .1, step.seconds, 'Effect duration');
          check(effect.at + effect.seconds <= step.seconds + .0001, 'Effect must fit inside its step.');
          check(effect.at >= end, 'Effect windows cannot overlap: the player has one effect scene.');
          check(effects.includes(effect.effect) && effect.effect !== 'off', 'Choose a supported effect.');
          end = effect.at + effect.seconds;
        }
      }
    }
    for (const model of library.models) {
      number(model.minutes, 1, 1440, 'Show minutes');
      check(Array.isArray(model.sections) && model.sections.length > 0 && model.sections.length <= 100, `${model.name} needs 1–100 sections.`);
      const ids = new Set();
      for (const section of model.sections) {
        named(section.id, 'Section ID'); named(section.name, 'Section');
        check(!ids.has(section.id), 'Section IDs must be unique.'); ids.add(section.id);
        number(section.weight, .1, 100, 'Section share');
        check(Array.isArray(section.bricks) && section.bricks.length > 0 && section.bricks.length <= 100, `${section.name} needs at least one brick.`);
        for (const id of section.bricks) check(library.bricks.some(b => b.id === id), `${section.name} refers to a missing brick.`);
      }
    }
    for (const profile of library.profiles) {
      number(profile.pace, .5, 2, 'Pacing');
      check(Number.isInteger(profile.avoidRepeat) && profile.avoidRepeat >= 0 && profile.avoidRepeat <= 100, 'Repeat window must be 0–100.');
      for (const field of ['themes', 'colours', 'types', 'exclude']) check(Array.isArray(profile[field]) && profile[field].length <= 200 && profile[field].every(s => typeof s === 'string' && s.length <= 200), `Invalid ${field} filter.`);
      check(typeof profile.reviewedOnly === 'boolean', 'Invalid review filter.');
      const brand = profile.branding;
      check(brand && typeof brand.text === 'string' && brand.text.length <= 80, 'Branding text must be up to 80 characters.');
      number(brand.every, 0, 3600, 'Branding interval'); number(brand.seconds, 1, 60, 'Branding duration');
      check(!brand.every || brand.every > brand.seconds, 'Branding interval must exceed its duration.');
    }
    return library;
  }
  const step = (slot, seconds, view, preset, type = 'cross-dissolve') => ({slot, seconds, view, preset, loopMode: 1, speed: 1, zoom: 1, panX: 0, panY: 0, transition: {type, duration: 1.5, pace: 'ease'}, effects: [], layoutCues: []});
  function defaults() {
    const opening = step('Main', 30, 'quad', 15, 'fade-in');
    opening.layoutCues = [{at: 15, view: 'dual', preset: 7, zoom: 1, panX: 0, panY: 0}];
    return {version: 1, bricks: [
      {id: 'opening', name: 'Gentle opening', colour: 'sage', steps: [opening, step('Next', 30, 'quad', 15)]},
      {id: 'build', name: 'Mirror build', colour: 'blue', steps: [step('Main', 20, 'dual', 7), step('Next', 20, 'quad', 15), step('Third', 20, 'octo', 27, 'fluid-ripple')]},
      {id: 'peak', name: 'Peak energy', colour: 'coral', steps: [step('Main', 15, 'octo', 27, 'zoom-spin'), step('Next', 15, 'quad', 15, 'whip-pan'), step('Third', 30, 'octo', 27)]},
      {id: 'close', name: 'Slow landing', colour: 'purple', steps: [step('Main', 30, 'quad', 15), step('Next', 30, 'single', 1)]}
    ], models: [{id: 'journey', name: 'Three-hour journey', minutes: 180, sections: [
      {id: 'open', name: 'Opening', weight: 1, bricks: ['opening']},
      {id: 'develop', name: 'Develop', weight: 4, bricks: ['build', 'opening']},
      {id: 'peak', name: 'Peak', weight: 3, bricks: ['build', 'peak']},
      {id: 'land', name: 'Landing', weight: 1, bricks: ['close']}
    ]}], profiles: [{id: 'house', name: 'My first DJ', pace: 1, avoidRepeat: 3, themes: [], colours: [], types: [], exclude: [], reviewedOnly: false, similar: true, branding: {text: '', every: 300, seconds: 8}}]};
  }
  function random(seed) {
    let value = 2166136261;
    for (const c of String(seed)) value = Math.imul(value ^ c.charCodeAt(0), 16777619);
    return () => { value += 0x6D2B79F5; let n = value; n = Math.imul(n ^ n >>> 15, n | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 4294967296; };
  }
  const folded = values => values.map(s => s.trim().toLowerCase()).filter(Boolean);
  function eligible(videos, profile, excluded = []) {
    const names = new Set(excluded);
    const terms = folded(profile.exclude);
    return videos.filter(v => !names.has(v.filename) && !terms.some(term => v.filename.toLowerCase().includes(term))
      && (!profile.reviewedOnly || v.catalog?.reviewed)
      && ['themes', 'colours', 'types'].every(field => !profile[field].length || folded(profile[field]).some(tag => folded(v.catalog?.[field] || []).includes(tag))))
      .sort((a, b) => a.filename.localeCompare(b.filename, 'en'));
  }
  function sectionTimes(model, minutes) {
    const total = Math.round(minutes * 60000), weight = model.sections.reduce((sum, s) => sum + s.weight, 0);
    let start = 0, share = 0;
    return model.sections.map((s, i) => {
      share += s.weight;
      const end = i === model.sections.length - 1 ? total : Math.round(total * share / weight);
      const range = {id: s.id, name: s.name, start: start / 1000, end: end / 1000}; start = end; return range;
    });
  }
  function generate(library, modelId, profileId, videos, options = {}) {
    validate(library, options.transitionIds);
    const model = library.models.find(m => m.id === modelId), profile = library.profiles.find(p => p.id === profileId);
    check(model && profile, 'Choose a show model and a DJ profile.');
    const minutes = options.minutes ?? model.minutes;
    number(minutes, 1, 1440, 'Show minutes');
    const seed = String(options.seed ?? '1'); check(seed.length <= 120, 'Variation name is too long.');
    const rng = random(seed), pool = eligible(videos, profile, options.excluded || []), history = [], uses = new Map();
    check(pool.length > 0, 'No eligible videos. Adjust the DJ filters or previous-show exclusion.');
    const bindings = options.bindings || {}, warnings = new Set(), occupied = [], entries = [];
    const previous = options.previous;
    const keep = new Set(options.keepSections || []);
    const mediaOnly = options.mode === 'media';
    if (mediaOnly || keep.size) {
      check(previous?.generation?.sections && previous.entries?.length, 'Generate a show before keeping sections or replacing its videos.');
      check(Math.abs(previous.entries.reduce((s, e) => s + e.duration.value, 0) - minutes * 60) < .002, 'Keep the same show duration when preserving an existing version.');
    }
    const tags = v => ['themes', 'colours', 'types'].flatMap(f => folded(v?.catalog?.[f] || []));
    let lastVideo;
    function choose(key) {
      if (bindings[key]) {
        const match = pool.find(v => v.filename === bindings[key]);
        check(match, `Pinned video for ${key} is missing or excluded by this DJ profile.`);
        history.push(match.filename); uses.set(match.filename, (uses.get(match.filename) || 0) + 1); lastVideo = match; return match.filename;
      }
      const recent = new Set(profile.avoidRepeat ? history.slice(-profile.avoidRepeat) : []);
      const available = pool.filter(v => !recent.has(v.filename));
      check(available.length, `The ${pool.length}-video pool cannot satisfy a repeat window of ${profile.avoidRepeat}. Reduce it, add videos or pin a slot explicitly.`);
      const priorTags = new Set(tags(lastVideo));
      // Balance a multi-hour show before applying local tag similarity. Otherwise
      // a connected tag cluster could monopolize an entire performance.
      const ranked = available.map(v => ({v, uses: uses.get(v.filename) || 0, score: (profile.similar ? tags(v).filter(t => priorTags.has(t)).length : 0), tie: rng()}));
      ranked.sort((a, b) => a.uses - b.uses || b.score - a.score || a.tie - b.tie);
      const picked = ranked[0].v;
      history.push(picked.filename); uses.set(picked.filename, (uses.get(picked.filename) || 0) + 1); lastVideo = picked; return picked.filename;
    }
    const sections = mediaOnly ? clone(previous.generation.sections) : sectionTimes(model, minutes);
    check(sections.every(s => s.end - s.start >= 1), 'Each section needs at least one second. Increase its share or the show duration.');
    if (mediaOnly) check(previous.generation.modelId === modelId, 'Select the model used by this version before replacing its videos.');
    let time = 0;
    function append(entry, section, isKept = false) {
      check(entries.length < 10000, 'Show exceeds 10,000 clips. Increase brick step durations.');
      entries.push(entry);
      if (isKept) for (const cue of entry.cues || []) if (cue.effect !== 'off') {
        const off = (entry.cues || []).find(c => c.effect === 'off' && c.at > cue.at);
        occupied.push([time + cue.at, time + (off?.at ?? entry.duration.value)]);
      }
      time = Math.round((time + entry.duration.value) * 1000) / 1000;
    }
    for (const section of sections) {
      const first = entries.length;
      const old = previous?.generation?.sections.find(s => s.id === section.id);
      if (keep.has(section.id)) {
        check(old && old.start === section.start && old.end === section.end, `Section ${section.name} changed length. Unlock it before regenerating.`);
        const saved = previous.entries.slice(old.entryStart, old.entryStart + old.entryCount);
        check(Math.abs(saved.reduce((s, e) => s + e.duration.value, 0) - (section.end - section.start)) < .002, `Section ${section.name} was edited. Regenerate without keeping it.`);
        for (const e of saved) {
          check(videos.some(v => v.filename === e.video), `Kept section ${section.name} contains a missing video.`);
          append(clone(e), section, true); history.push(e.video); uses.set(e.video, (uses.get(e.video) || 0) + 1); lastVideo = videos.find(v => v.filename === e.video);
        }
        section.keptFrom = clone(old.keptFrom || {seed: previous.generation.seed, model: previous.generation.model, profile: previous.generation.profile, bricks: previous.generation.bricks});
      } else if (mediaOnly) {
        check(Math.abs(previous.entries.slice(section.entryStart, section.entryStart + section.entryCount).reduce((sum, e) => sum + e.duration.value, 0) - (section.end - section.start)) < .002, `Section ${section.name} was edited. Generate from the model instead.`);
        delete section.keptFrom;
        const bound = new Map();
        for (const source of previous.entries.slice(section.entryStart, section.entryStart + section.entryCount)) {
          const e = clone(source), key = e.build?.binding || `entry-${entries.length}`;
          if (!bound.has(key)) bound.set(key, choose(e.build?.slotKey || key));
          if (e.video !== bound.get(key)) delete e.sourceRange;
          e.video = bound.get(key);
          // Profile branding is regenerated below; brick effect choreography stays.
          e.cues = (e.cues || []).filter(c => c.source !== 'profile');
          for (const c of e.cues) if (c.djText) c.text = profile.branding.text || profile.name;
          append(e, section, true);
        }
      } else {
        const definition = model.sections.find(s => s.id === section.id);
        let cycle = 0;
        while (time < section.end - .0001) {
          for (const id of definition.bricks) {
            const brick = library.bricks.find(b => b.id === id), bound = new Map();
            for (const [stepIndex, s] of brick.steps.entries()) {
              if (time >= section.end - .0001) break;
              const duration = Math.min(Math.round(s.seconds * profile.pace * 1000), Math.round((section.end - time) * 1000)) / 1000;
              const slotKey = `${id}:${s.slot}`;
              if (!bound.has(s.slot)) bound.set(s.slot, choose(slotKey));
              const e = {video: bound.get(s.slot), view: s.view, preset: s.preset, loopMode: s.loopMode ?? 1, speed: s.speed ?? 1, zoom: s.zoom ?? 1, panX: s.panX ?? 0, panY: s.panY ?? 0,
                duration: {type: 'seconds', value: duration}, transition: clone(s.transition), cues: [{at: 0, effect: 'off'}],
                layoutCues: (s.layoutCues || []).map(c => ({...clone(c), at: Math.round(c.at * profile.pace * 1000) / 1000})).filter(c => c.at < duration),
                build: {sectionId: section.id, brickId: id, step: stepIndex, slot: s.slot, slotKey, binding: `${section.id}:${cycle}:${id}:${s.slot}`}};
              if (e.transition.duration > duration) {
                e.transition.duration = duration;
                if (duration < .15) { e.transition.type = 'cut'; warnings.add('A section ending under 0.15 seconds uses a Cut to fit the remaining time.'); }
                else warnings.add('Transitions at trimmed section endings were shortened to fit.');
              }
              for (const fx of [...s.effects || []].sort((a, b) => a.at - b.at)) {
                const at = Math.round(fx.at * profile.pace * 1000) / 1000, end = Math.min(duration, Math.round((fx.at + fx.seconds) * profile.pace * 1000) / 1000);
                if (at >= duration) { warnings.add('Some brick effects fall after a trimmed section ending and were omitted.'); continue; }
                const djText = fx.effect === 'dj';
                e.cues.push({...clone(fx), at, effect: djText ? 'text' : fx.effect, text: djText ? profile.branding.text || profile.name : fx.text || '', djText});
                e.cues.push({at: end, effect: 'off'}); occupied.push([time + at, time + end]);
              }
              e.cues.sort((a, b) => a.at - b.at); append(e, section);
            }
            cycle++;
            if (time >= section.end - .0001) break;
          }
        }
      }
      section.entryStart = first; section.entryCount = entries.length - first;
    }
    check(Math.abs(time - minutes * 60) < .002, 'Section timing is inconsistent. Generate from the model instead.');
    if (profile.branding.text && profile.branding.every) {
      let skipped = 0;
      for (let start = 6; start < time; start += profile.branding.every) {
        const end = Math.min(time, start + profile.branding.seconds);
        if (occupied.some(([a, b]) => a < end && b > start)) { skipped++; continue; }
        let cursor = 0;
        for (const e of entries) {
          const next = cursor + e.duration.value;
          if (cursor < end && next > start && !keep.has(e.build?.sectionId)) {
            e.cues.push({at: Math.max(0, start - cursor), effect: 'text', text: profile.branding.text, skin: 'chrome', source: 'profile'});
            e.cues.push({at: Math.min(e.duration.value, end - cursor), effect: 'off', source: 'profile'});
            e.cues.sort((a, b) => a.at - b.at);
          }
          cursor = next;
        }
      }
      if (skipped) warnings.add(`${skipped} branding appearances overlap brick effects or kept sections and were skipped.`);
    }
    return {name: options.name || `${model.name} · ${profile.name} · ${seed}`, entries,
      generation: {version: 1, seed, modelId, profileId, minutes, sections, bindings: clone(bindings), model: clone(mediaOnly ? previous.generation.model : model), profile: clone(profile), bricks: clone(mediaOnly ? previous.generation.bricks : library.bricks.filter(b => model.sections.some(s => s.bricks.includes(b.id)))), warnings: [...warnings], mode: options.mode || 'fresh', eligibleVideos: pool.length}};
  }
  function showTimeline(playlist) {
    let ms = 0;
    const segments = playlist.entries.map((entry, index) => {
      check(entry.duration?.type === 'seconds', 'Show review needs fixed-second clips. Generate from the model to resolve loop durations.');
      const length = Math.round(Number(entry.duration.value) * 1000);
      check(Number.isFinite(length) && length > 0, 'Each clip needs a positive duration.');
      const segment = {index, start: ms / 1000, end: (ms + length) / 1000}; ms += length; return segment;
    });
    return {segments, total: ms / 1000};
  }
  function showPosition(timeline, seconds) {
    if (!timeline.segments.length) return null;
    const at = Math.max(0, Math.min(timeline.total, Number(seconds) || 0));
    let lo = 0, hi = timeline.segments.length - 1;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (at < timeline.segments[mid].end) hi = mid; else lo = mid + 1; }
    const segment = timeline.segments[lo];
    return {...segment, time: at, local: at - segment.start};
  }
  function reindexShow(playlist) {
    const timeline = showTimeline(playlist), old = playlist.generation.sections;
    playlist.generation.sections = [];
    for (const segment of timeline.segments) {
      const entry = playlist.entries[segment.index], id = entry.build?.sectionId;
      let section = playlist.generation.sections.at(-1);
      if (!section || section.id !== id) {
        const source = old.find(s => s.id === id);
        section = {id: id || `edited-${segment.index}`, name: source?.name || 'Edited clips', start: segment.start, end: segment.end, entryStart: segment.index, entryCount: 0};
        playlist.generation.sections.push(section);
      }
      section.end = segment.end; section.entryCount++;
    }
    playlist.generation.minutes = timeline.total / 60;
    playlist.generation.edited = true;
    return timeline;
  }
  return {clone, defaults, validate, eligible, sectionTimes, generate, step, views, effects, showTimeline, showPosition, reindexShow};
});
