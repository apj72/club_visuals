const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const values = new Map();
const context = {
  localStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  },
};
context.window = context;
vm.runInNewContext(fs.readFileSync('transition_engine.js', 'utf8'), context);

const catalogue = context.TRANSITION_CATALOGUE;
assert.equal(Object.keys(catalogue).length, 61);
assert.equal(Object.values(catalogue).filter(effect => effect.implementationKind === 'shader').length, 50);
for (const type of ['rgb-split', 'infinite-zoom', 'neon-shockwave', 'digital-glitch',
  'spiral-vortex', 'liquid-morph', 'kaleidoscope-morph', 'pixel-explosion',
  'motion-blur-whip', 'hexagonal-mosaic', 'plasma-dissolve', 'geometric-shatter',
  'tunnel-warp', 'dimensional-portal', 'bass-impact-distortion']) {
  assert.equal(catalogue[type].implementationKind, 'shader');
  assert.ok(catalogue[type].supportedParameters.includes('intensity'));
}
for (const effect of Object.values(catalogue).filter(item => item.implementationKind === 'shader')) {
  const normalised = context.normaliseTransition({ type: effect.id });
  assert.equal(normalised.type, effect.id);
  assert.equal(JSON.stringify(normalised.params), JSON.stringify(effect.defaultParameters));
}
assert.ok(catalogue['strobe-cut'].safetyTags.includes('flash'));
assert.ok(catalogue['white-flash'].safetyTags.includes('flash'));

const configured = context.normaliseTransition({
  type: 'neon-shockwave', duration: 99, pace: 'ease', seed: 83,
  params: { intensity: 4, centerX: -2, centerY: 0.7, color: '#FF0044', ignored: 12 },
});
assert.equal(configured.duration, 10);
assert.equal(configured.seed, 83);
assert.equal(configured.pace, 'ease');
assert.equal(JSON.stringify(configured.params), JSON.stringify({
  intensity: 1, centerX: 0, centerY: 0.7, color: '#ff0044',
}));
assert.equal(JSON.stringify(context.normaliseTransition(JSON.parse(JSON.stringify(configured)))),
  JSON.stringify(configured));

assert.equal(context.normaliseTransition({ type: 'unknown', seed: null }).type, 'cut');
assert.equal(context.normaliseTransition({ type: 'rgb-split', seed: null }).seed, 1);
assert.equal(context.normaliseTransition({ type: 'rgb-split', params: { direction: 'diagonal' } }).params.direction,
  'horizontal');
assert.equal(context.getTransitionReduceFlashes(), true);
context.setTransitionReduceFlashes(false);
assert.equal(context.normaliseTransition(configured).reduceFlashes, false);
context.setTransitionReduceFlashes(true);
assert.equal(context.normaliseTransition({ reduceFlashes: false }).reduceFlashes, true);

console.log('Transition catalogue, validation, round-trip, and flash setting passed.');
