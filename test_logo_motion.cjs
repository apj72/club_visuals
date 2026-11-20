const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({window: {}});
vm.runInContext(fs.readFileSync('vfx_engine.js', 'utf8'), context);
const E = context.window.VfxEngine;
const logo = {x: .5, y: .5, scale: .3, depth: .45, rotX: 0, rotY: -20, rotZ: 0, motion: .25, axis: 'y', startAngle: -45, endAngle: 45};
const plain = value => JSON.parse(JSON.stringify(value));

test('old effects retain their pose and video backdrop without authored automation', () => {
  const sample = E.sampleAnimation(logo, 8);
  assert.deepEqual(plain(sample.pose), logo);
  assert.equal(sample.sourceX, 0); assert.equal(sample.sourceScale, 1);
  const normal = E.normaliseAnimation({duration: NaN, path: 'bad', sourceScale: Infinity, points: [null, {}]});
  assert.equal(normal.enabled, false); assert.equal(normal.duration, 12); assert.equal(normal.path, 'still');
  assert.equal(normal.points.length, 3); assert.equal(normal.sourceScale, 1);
});
test('paths, zoom and three rotation axes share a repeatable timeline', () => {
  const settings = {...logo, animation: {enabled: true, duration: 12, path: 'figure8', zoomMin: .5, zoomMax: 1.5, turnX: 360, turnY: 720, turnZ: -360}};
  const sample = E.sampleAnimation(settings, 3).pose;
  assert.ok(sample.x > .79 && Math.abs(sample.y - .5) < .0001);
  assert.equal(sample.rotX, 90); assert.equal(sample.rotY, 160); assert.equal(sample.rotZ, -90);
  assert.equal(sample.motion, 0); assert.ok(Math.abs(sample.scale - .3) < 1e-10);
  assert.deepEqual(plain(E.sampleAnimation(settings, 3)), plain(E.sampleAnimation(settings, 27)));
  const stopped = {...settings, animation: {...settings.animation, loop: false}};
  assert.deepEqual(plain(E.sampleAnimation(stopped, 12)), plain(E.sampleAnimation(stopped, 100)));
});
test('custom waypoints interpolate the whole pose and ignore duplicate or unsafe points', () => {
  const settings = {...logo, animation: {enabled: true, path: 'custom', duration: 10, ease: 'linear', loop: false, points: [
    {at: 0, x: .1, y: .2, scale: .2, rotX: 0, rotY: 0, rotZ: 0},
    {at: 1, x: .9, y: .8, scale: .4, rotX: 90, rotY: 180, rotZ: 360}]}};
  const pose = E.sampleAnimation(settings, 5).pose;
  assert.equal(pose.x, .5); assert.equal(pose.y, .5); assert.ok(Math.abs(pose.scale - .3) < 1e-10);
  assert.equal(pose.rotX, 45); assert.equal(pose.rotY, 90); assert.equal(pose.rotZ, 180);
  const a = E.normaliseAnimation({points: [...settings.animation.points, settings.animation.points[0], {at: .5, x: NaN, y: 0}]});
  assert.equal(a.points.length, 2);
});
test('hidden video passes through a finite reflection environment and leaves it again', () => {
  const settings = {...logo, animation: {enabled: true, path: 'still', duration: 8, sourceMotion: 'left-right', sourceTravel: 1.5, sourceScale: .75, loop: false}};
  assert.equal(E.sampleAnimation(settings, 0).sourceX, -1.5);
  assert.equal(E.sampleAnimation(settings, 4).sourceX, 0);
  assert.equal(E.sampleAnimation(settings, 8).sourceX, 1.5);
  assert.equal(E.sampleAnimation(settings, 4).sourceScale, .75);
  assert.equal(E.sampleAnimation(settings, 0).pose.x, E.sampleAnimation(settings, 4).pose.x);
});
test('fitting considers logo width, depth and rotating corners on wide and portrait screens', () => {
  for (const aspect of [16 / 9, 4 / 3, 9 / 16]) for (const path of ['bounce', 'orbit', 'figure8', 'custom']) for (let time = 0; time <= 12; time += .25) {
    const sample = E.sampleAnimation({...logo, scale: .8, animation: {enabled: true, path, spanX: 1, spanY: 1, zoomMin: .5, zoomMax: 1.5, turnX: 360, turnY: 360, turnZ: 360}}, time);
    const r = E.rotationMatrix(sample.pose, 0), fitted = E.fitAnimatedPose(sample.pose, r, 6.22, aspect);
    const [x0, y0, x1, y1] = E.projectedBounds(fitted, r, 6.22, aspect);
    assert.ok(x0 >= .019 && y0 >= .019 && x1 <= .981 && y1 <= .981, `${aspect}/${path}/${time}: ${[x0, y0, x1, y1]}`);
  }
});
test('paused and transferred clocks preserve the authored time', () => {
  assert.equal(E.animationSeconds({animationClock: {time: 7, startedAt: 1000, playing: true}}, 4000), 10);
  assert.equal(E.animationSeconds({animationClock: {time: 7, startedAt: 1000, playing: false}}, 4000), 7);
});

test('large multi-axis zooms remain in front of the camera when fitting is enabled', () => {
  for (const angle of [0, 30, 60, 90, 180, 270]) {
    const pose = {...logo, scale: 8, depth: 2, rotX: angle, rotY: angle, rotZ: angle, motion: 0};
    const rotation = E.rotationMatrix(pose, 0), fit = E.fitAnimatedPose(pose, rotation, 6.22, 9 / 16);
    const bounds = E.projectedBounds(fit, rotation, 6.22, 9 / 16);
    assert.ok(bounds.every(Number.isFinite)); assert.ok(fit.scale > .02);
    assert.ok(bounds[0] >= .019 && bounds[1] >= .019 && bounds[2] <= .981 && bounds[3] <= .981, String(bounds));
  }
});

test('wordmark orientation is independent of authored multi-axis rotation', () => {
  const base = {...logo, motion: 0, rotX: 0, rotY: 0, rotZ: 0};
  const down = E.rotationMatrix({...base, orientation: 'top-bottom'}, 0);
  const up = E.rotationMatrix({...base, orientation: 'bottom-top'}, 0);
  assert.ok(Math.abs(down[0]) < 1e-6 && Math.abs(down[1] + 1) < 1e-6);
  assert.ok(Math.abs(up[0]) < 1e-6 && Math.abs(up[1] - 1) < 1e-6);
  assert.deepEqual([...E.rotationMatrix(base, 0)], [...E.rotationMatrix({...base, orientation:'invalid'}, 0)]);
  for (const orientation of ['top-bottom','bottom-top']) for (let time=0;time<12;time+=.5) {
    const sample=E.sampleAnimation({...logo,orientation,animation:{enabled:true,path:'orbit',turnX:360,turnY:360,turnZ:360}},time);
    assert.equal(sample.pose.orientation,orientation);
    const r=E.rotationMatrix(sample.pose,0),fit=E.fitAnimatedPose(sample.pose,r,6.22,9/16);
    const [x0,y0,x1,y1]=E.projectedBounds(fit,r,6.22,9/16);
    assert.ok(x0>=.019&&y0>=.019&&x1<=.981&&y1<=.981);
  }
});
