const {test} = require('node:test');
const assert = require('node:assert/strict');
const C = require('./show-models.js');
const videos = Array.from({length: 24}, (_, i) => ({filename: `video-${String(i).padStart(2, '0')}.mp4`, catalog: {themes: [i < 12 ? 'Abstract' : 'Nature'], colours: [i % 2 ? 'Cyan' : 'Blue'], reviewed: i !== 0}}));
const total = p => p.entries.reduce((n, e) => n + e.duration.value, 0);
const generate = (library = C.defaults(), options = {}, media = videos) => C.generate(library, 'journey', library.profiles.at(-1).id, media, options);

test('three-hour compilation has exact duration, contiguous sections and valid local events', () => {
  const show = generate();
  assert.equal(total(show), 10800);
  assert.equal(show.generation.sections[0].start, 0);
  assert.equal(show.generation.sections.at(-1).end, 10800);
  let at = 0;
  for (const s of show.generation.sections) {
    assert.equal(s.start, at); at = s.end;
    assert.equal(total({entries: show.entries.slice(s.entryStart, s.entryStart + s.entryCount)}), s.end - s.start);
  }
  for (const e of show.entries) {
    assert.equal(e.duration.type, 'seconds'); assert.ok(e.duration.value > 0);
    assert.ok(e.transition.duration <= e.duration.value);
    assert.ok(e.layoutCues.every(c => c.at < e.duration.value));
    assert.ok(e.cues.every(c => c.at <= e.duration.value));
  }
});
test('fractional target and profile pacing still end exactly, including trimmed steps', () => {
  const l = C.defaults(); l.profiles[0].pace = .75;
  assert.equal(total(generate(l, {minutes: 181.13})), 10867.8);
});
test('very short final clips cut instead of exceeding runtime with a clamped transition', () => {
  const l = C.defaults(); l.models[0].sections = [{id: 'one', name: 'One', weight: 1, bricks: ['opening']}]; l.bricks[0].steps[1].seconds = 29.99;
  const show = generate(l, {minutes: 1});
  assert.equal(show.entries.reduce((sum, e) => sum + Math.round(e.duration.value * 1000), 0), 60000); assert.equal(show.entries.at(-1).duration.value, .01); assert.equal(show.entries.at(-1).transition.type, 'cut');
});
test('same seed and snapshots reproduce a show, independent of library order', () => {
  assert.deepEqual(generate(undefined, {seed: 'test'}), generate(undefined, {seed: 'test'}, [...videos].reverse()));
  assert.notDeepEqual(generate(undefined, {seed: 'A'}).entries.map(e => e.video), generate(undefined, {seed: 'B'}).entries.map(e => e.video));
});
test('DJ filters intersect categories and exclusions always win', () => {
  const l = C.defaults(), p = l.profiles[0]; p.themes = ['abstract']; p.colours = ['cyan']; p.reviewedOnly = true;
  const show = generate(l, {excluded: ['video-01.mp4']});
  for (const e of show.entries) assert.ok(['video-03.mp4', 'video-05.mp4', 'video-07.mp4', 'video-09.mp4', 'video-11.mp4'].includes(e.video));
});
test('repeat constraints fail with a useful error instead of silently repeating', () => {
  assert.throws(() => generate(undefined, {}, videos.slice(0, 3)), /repeat window of 3/);
  const l = C.defaults(); l.profiles[0].avoidRepeat = 0;
  assert.equal(total(generate(l, {}, videos.slice(0, 1))), 10800);
});
test('similarity does not monopolize hours of playback with one tag cluster', () => {
  const show = generate();
  assert.equal(new Set(show.entries.map(e => e.video)).size, videos.length);
});
test('one slot binds once per brick occurrence; pinned slots override repeats explicitly', () => {
  const l = C.defaults(); l.bricks[0].steps[1].slot = 'Main';
  const p = generate(l, {bindings: {'opening:Main': 'video-00.mp4'}});
  assert.equal(p.entries[0].video, 'video-00.mp4'); assert.equal(p.entries[1].video, 'video-00.mp4');
  l.profiles[0].exclude = ['video-00'];
  assert.throws(() => generate(l, {bindings: {'opening:Main': 'video-00.mp4'}}), /Pinned video/);
});
test('fresh generation does not mutate saved recipe definitions', () => {
  const l = C.defaults(), before = C.clone(l); const p = generate(l);
  p.generation.bricks[0].steps[0].preset = 1; p.entries[0].view = 'octo';
  assert.deepEqual(l, before);
});
test('replacing videos retains exact choreography, including timings and layout events', () => {
  const l = C.defaults(), first = generate(l, {seed: 'A'});
  l.profiles[0].pace = 2; // Media-only intentionally ignores new pacing.
  l.bricks[0].steps[0].view = 'single';
  const next = generate(l, {seed: 'B', mode: 'media', previous: first});
  const choreography = show => show.entries.map(({video, ...entry}) => entry);
  assert.deepEqual(choreography(next), choreography(first));
  assert.notDeepEqual(next.entries.map(e => e.video), first.entries.map(e => e.video));
  assert.deepEqual(next.generation.bricks, first.generation.bricks);
});
test('kept sections survive another DJ and variation byte for byte', () => {
  const l = C.defaults(), first = generate(l, {seed: 'A'}), s = first.generation.sections[0];
  l.profiles[0].branding.text = 'Another DJ';
  const next = generate(l, {seed: 'B', previous: first, keepSections: [s.id]});
  assert.deepEqual(next.entries.slice(0, s.entryCount), first.entries.slice(0, s.entryCount));
  assert.notDeepEqual(next.entries.slice(s.entryCount), first.entries.slice(s.entryCount));
  assert.throws(() => generate(l, {minutes: 60, previous: first, keepSections: [s.id]}), /same show duration/);
});
test('recurring DJ branding is split over clip boundaries and is replaced for another DJ', () => {
  const l = C.defaults(); l.profiles[0].branding = {text: 'DJ Alpha', every: 45, seconds: 15};
  const first = generate(l, {minutes: 1});
  assert.ok(first.entries.flatMap(e => e.cues).some(c => c.text === 'DJ Alpha'));
  l.profiles[0].branding.text = 'DJ Beta';
  const next = generate(l, {minutes: 1, mode: 'media', previous: first});
  assert.ok(next.entries.flatMap(e => e.cues).some(c => c.text === 'DJ Beta'));
  assert.ok(!next.entries.flatMap(e => e.cues).some(c => c.text === 'DJ Alpha'));
  for (const e of next.entries) for (const c of e.cues) assert.ok(c.at >= 0 && c.at <= e.duration.value);
});
test('brick DJ branding follows selected profile and yields priority over recurring branding', () => {
  const l = C.defaults(); l.bricks[0].steps[0].effects = [{at: 0, seconds: 15, effect: 'dj'}]; l.profiles[0].branding.text = 'DJ Alpha';
  const show = generate(l);
  assert.ok(show.entries[0].cues.some(c => c.djText && c.text === 'DJ Alpha'));
  assert.ok(show.generation.warnings.some(w => w.includes('branding appearances')));
});
test('invalid overlapping effect windows, missing bricks and unknown transitions are rejected', () => {
  const l = C.defaults(); l.bricks[0].steps[0].effects = [{at: 1, seconds: 5, effect: 'logo'}, {at: 2, seconds: 5, effect: 'dj'}];
  assert.throws(() => generate(l), /cannot overlap/);
  l.bricks[0].steps[0].effects = []; l.models[0].sections[0].bricks.push('missing');
  assert.throws(() => generate(l), /missing brick/);
  const valid = C.defaults();
  assert.throws(() => generate(valid, {transitionIds: ['cut']}), /Unknown transition/);
});
test('24-hour output stays bounded and source edits are detected before preserving sections', () => {
  assert.equal(total(generate(undefined, {minutes: 1440})), 86400);
  const l = C.defaults(), first = generate(l); first.entries[0].duration.value += 2; first.entries[1].duration.value -= 2;
  first.entries.splice(first.generation.sections[0].entryCount - 1, 1);
  assert.throws(() => generate(l, {previous: first, mode: 'media'}), /same show duration/);
});
test('show playhead finds the incoming clip at boundaries and clamps at show ends', () => {
  const timeline = C.showTimeline({entries: [10, 20, .125].map(value => ({duration: {type: 'seconds', value}}))});
  assert.equal(timeline.total, 30.125);
  assert.equal(C.showPosition(timeline, 10).index, 1);
  assert.equal(C.showPosition(timeline, 10).local, 0);
  assert.equal(C.showPosition(timeline, -10).time, 0);
  assert.equal(C.showPosition(timeline, 9999).index, 2);
  assert.equal(C.showPosition(timeline, 9999).local, .125);
  assert.equal(C.showPosition(C.showTimeline({entries: []}), 0), null);
});
test('review edits recalculate section boundaries without changing recipe snapshots', () => {
  const show = generate(), snapshot = C.clone(show.generation.model), first = show.generation.sections[0];
  const previousEnd = first.end;
  show.entries[0].duration.value += 12.125;
  const timeline = C.reindexShow(show);
  assert.equal(timeline.total, 10812.125);
  assert.equal(show.generation.sections[0].end, previousEnd + 12.125);
  assert.equal(show.generation.sections[1].start, previousEnd + 12.125);
  assert.equal(show.generation.sections.at(-1).end, timeline.total);
  assert.deepEqual(show.generation.model, snapshot);
  assert.equal(show.generation.minutes, timeline.total / 60);
  const remove = show.generation.sections[1];
  show.entries.splice(remove.entryStart, remove.entryCount);
  C.reindexShow(show);
  assert.ok(!show.generation.sections.some(s => s.id === remove.id));
});

test('media replacement clears source-specific ranges while kept sections retain them', () => {
  const library = C.defaults(), first = generate(library);
  first.entries.forEach(e => { e.sourceRange = {start: 12, end: 18}; });
  const kept = first.generation.sections[0];
  const next = generate(library, {mode: 'media', previous: first, seed: 'new-cues', keepSections: [kept.id]});
  assert.deepEqual(next.entries.slice(kept.entryStart, kept.entryStart + kept.entryCount), first.entries.slice(kept.entryStart, kept.entryStart + kept.entryCount));
  for (let i = kept.entryCount; i < next.entries.length; i++) {
    if (next.entries[i].video !== first.entries[i].video) assert.equal(next.entries[i].sourceRange, undefined);
    else assert.deepEqual(next.entries[i].sourceRange, {start: 12, end: 18});
  }
});

test('object choreography remains reusable across generated and replacement editions', () => {
  const library = C.defaults();
  const animation = {enabled: true, path: 'custom', duration: 12, turnX: 360, turnY: 360, turnZ: 360, sourceMotion: 'left-right', points: [{at:0,x:.2,y:.3,scale:.2,rotX:0,rotY:0,rotZ:0},{at:1,x:.8,y:.7,scale:.4,rotX:90,rotY:180,rotZ:360}]};
  library.bricks[0].steps[0].effects = [{at: 0, seconds: 8, effect: 'logo', backdrop: 'black', orientation: 'top-bottom', animation}];
  const first = generate(library), next = generate(library, {mode: 'media', previous: first, seed: 'chrome'});
  for (const show of [first, next]) {
    const cue = show.entries.flatMap(e => e.cues).find(c => c.effect === 'logo' && c.backdrop === 'black');
    assert.deepEqual(cue.animation, animation);
    assert.equal(cue.orientation, 'top-bottom');
  }
  first.entries.flatMap(e => e.cues).find(c => c.effect === 'logo').animation.points[0].x = .9;
  assert.equal(library.bricks[0].steps[0].effects[0].animation.points[0].x, .2);
});

test('camera effect settings survive generated and replacement editions without a saved input binding', () => {
  const library = C.defaults();
  const cameraMotion = {mode:'glow',threshold:.1,gain:5,delay:.4,trails:.8,strength:1,mirror:true,compensate:true};
  library.bricks[0].steps[0].effects = [{at:0,seconds:8,effect:'camera',cameraMotion}];
  const first=generate(library),next=generate(library,{mode:'media',previous:first,seed:'camera'});
  for(const show of [first,next]) {
    const cue=show.entries.flatMap(e=>e.cues).find(c=>c.effect==='camera');
    assert.deepEqual(cue.cameraMotion,cameraMotion);
    assert.equal(cue.cameraMotion.sourceId,undefined);
  }
});

test('combined effects preserve independent logo video, snake and fly settings across replacement editions', () => {
  const library=C.defaults();
  const logoLayer={effect:'logo',backdrop:'black',orientation:'top-bottom',reflectionSource:{filename:'reflection.mp4',speed:.75},
    snake:{enabled:true,speed:.25,depth:.6,pulse:.5},fly:{enabled:true,speed:.1,distance:1.2}};
  library.bricks[0].steps[0].effects=[{at:0,seconds:8,effect:'scene-4',logoLayer}];
  const first=generate(library),next=generate(library,{mode:'media',previous:first,seed:'layers'});
  for(const show of [first,next]) {
    const cue=show.entries.flatMap(e=>e.cues).find(c=>c.effect==='scene-4'&&c.logoLayer);
    assert.deepEqual(cue.logoLayer,logoLayer);
    cue.logoLayer.snake.depth=1.5;
  }
  assert.equal(library.bricks[0].steps[0].effects[0].logoLayer.snake.depth,.6);
});

test('zoom-out framing survives generation and media replacement with source-local layout changes', () => {
  const library = C.defaults();
  for (const brick of library.bricks) for (const step of brick.steps) {
    step.zoom = .5;
    for (const cue of step.layoutCues) cue.zoom = .25;
  }
  const show = generate(library, {minutes: 3, seed: 'zoom-out'});
  assert.ok(show.entries.every(entry => entry.zoom === .5));
  assert.ok(show.entries.flatMap(entry => entry.layoutCues).every(cue => cue.zoom === .25));
  const replaced = generate(library, {minutes: 3, seed: 'another', mode: 'media', previous: show});
  assert.deepEqual(replaced.entries.map(e => [e.zoom,e.layoutCues]),show.entries.map(e => [e.zoom,e.layoutCues]));
  library.bricks[0].steps[0].zoom = .1;
  assert.throws(() => generate(library), /zoom/);
});

test('six-panel layouts and oblique logo flights survive compilation and media replacement',()=>{
  const library=C.defaults();
  for(const brick of library.bricks)for(const step of brick.steps){
    step.view='six';step.layoutCues=[];
    step.effects=[{at:0,seconds:Math.min(8,step.seconds),effect:'logo',fly:{enabled:true,angle:45,mode:'repeat'}}];
  }
  const show=generate(library,{minutes:3,seed:'six'});
  assert.ok(show.entries.every(e=>e.view==='six'));
  assert.ok(show.entries.flatMap(e=>e.cues).filter(c=>c.effect==='logo').every(c=>c.fly.angle===45&&c.fly.mode==='repeat'));
  const next=generate(library,{minutes:3,seed:'six-again',mode:'media',previous:show});
  assert.deepEqual(next.entries.map(e=>[e.view,e.cues]),show.entries.map(e=>[e.view,e.cues]));
  assert.equal(C.views.indexOf('octo'),4);
});

test('colour-only timed changes inherit layout without forcing a panel count', () => {
  const library = C.defaults();
  const step = library.bricks[0].steps[0];
  step.view = 'quad';
  step.layoutCues = [{at: 4, effects: {hueRotate: 180}, trailsEnabled: true}];
  assert.doesNotThrow(() => C.validate(library));
  step.layoutCues[0].view = 'invalid';
  assert.throws(() => C.validate(library), /supported layout/);
});
