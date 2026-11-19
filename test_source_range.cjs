const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('./source_range.js');

test('range bounds support a cue to the natural end and shorten safely for replaced media', () => {
  assert.deepEqual(R.bounds({start: 8, end: null}, 30), {start: 8, end: 30});
  assert.deepEqual(R.bounds({start: 8, end: 40}, 30), {start: 8, end: 30});
  assert.deepEqual(R.bounds({start: 40, end: 50}, 30), {start: 0, end: 30});
  assert.deepEqual(R.bounds(null, 30), {start: 0, end: 30});
  for (const value of [{start: -1, end: 4}, {start: 4, end: 3}, {start: 0, end: .01}, {start: NaN, end: 5}, {start: 0, end: Infinity}, {start: '2', end: 5}]) assert.throws(() => R.validate(value));
});

test('source positions stay inside the chosen range for loops, once, bounce and changed speed', () => {
  const entry = {sourceRange: {start: 12, end: 18}, loopMode: 1, speed: 1};
  assert.equal(R.sourceTime(entry, 0, 100), 12);
  assert.equal(R.sourceTime(entry, 5, 100), 17);
  assert.equal(R.sourceTime(entry, 6, 100), 12);
  assert.equal(R.sourceTime({...entry, speed: .5}, 6, 100), 15);
  assert.equal(R.sourceTime({...entry, loopMode: 2}, 9, 100), 15);
  assert.equal(R.sourceTime({...entry, loopMode: 2}, 12, 100), 12);
  assert.ok(R.sourceTime({...entry, loopMode: 0}, 50, 100) < 18);
  assert.equal(R.sourceTime({loopMode: 1}, 13, 10), 3);
});
