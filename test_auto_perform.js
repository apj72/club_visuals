const assert = require('node:assert/strict');
const { AutoPerformanceEngine } = require('./auto_perform.js');

const engine = new AutoPerformanceEngine({ changeBars: 4 });
const actions = [];
let last;
for (let index = 0; index < 900; index++) {
  const time = index * .025;
  const kick = time % .5 < .025;
  last = engine.process({ time, rms: kick ? .65 : .12, bass: kick ? .8 : .1,
    mid: kick ? .2 : .1, high: kick ? .2 : .1 });
  actions.push(...last.actions);
}
assert.ok(Math.abs(last.bpm - 120) <= 3, 'tempo should lock to a 120 BPM kick');
assert.ok(last.confidence >= .7, 'regular kick should produce a confident beat grid');
assert.ok(actions.some(action => action.kind === 'vfx'), 'eight-beat VFX changes should occur');
assert.ok(actions.some(action => action.kind === 'layout'), 'four-bar layout changes should occur');
assert.ok(actions.some(action => action.kind === 'change-video'), 'phrase changes should occur');

const changesBeforeSilence = actions.filter(action => action.kind === 'change-video').length;
for (let index = 900; index < 1120; index++) {
  last = engine.process({ time: index * .025, rms: 0, bass: 0, mid: 0, high: 0 });
  actions.push(...last.actions);
}
assert.equal(last.section, 'quiet', 'lost input should hold a quiet state');
assert.equal(actions.filter(action => action.kind === 'change-video').length, changesBeforeSilence,
  'silence should not trigger clip changes');

const resumed = [];
for (let index = 1120; index < 1170; index++) {
  const result = engine.process({ time: index * .025, rms: .45, bass: .65, mid: .25, high: .2 });
  resumed.push(...result.actions);
}
assert.equal(resumed.filter(action => action.reason === 'drop').length, 1,
  'a strong bass return after silence should trigger one drop change');

const tapped = new AutoPerformanceEngine();
for (const time of [0, .5, 1, 1.5]) tapped.tap(time);
assert.equal(tapped.bpm, 120, 'tap tempo should supply a beat estimate');
tapped.resync(2);
assert.equal(tapped.beatCount, 0, 'resync should reset the bar count');
console.log('Auto Perform tempo, musical actions, silence, and operator controls passed.');
