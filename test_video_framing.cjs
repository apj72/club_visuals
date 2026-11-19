const test = require('node:test');
const assert = require('node:assert/strict');
const F = require('./video_framing.js');
test('zoom out preserves source aspect and places the image in available black space', () => {
  const centre = F.rectangle(1920,1080,960,540,.5,0,0);
  assert.deepEqual(centre,{x:240,y:135,width:480,height:270,scale:.25});
  assert.equal(F.rectangle(1920,1080,960,540,.5,1,1).x,480);
  assert.equal(F.rectangle(1920,1080,960,540,.5,1,1).y,0);
});
test('zoom in keeps established crop directions and contain differs from tile cover', () => {
  const right = F.rectangle(1920,1080,960,540,2,1,1);
  assert.equal(right.x,-960); assert.ok(Math.abs(right.y)<1e-9);
  assert.equal(F.rectangle(1920,1080,540,960,1,0,0,'contain').width,540);
  assert.equal(F.rectangle(1920,1080,540,960,1,0,0,'cover').height,960);
});
test('drawing clips at tile boundaries rather than stretching an underfilled video', () => {
  let args;
  F.draw({drawImage(...a){args=a;}},'video',1920,1080,960,540,.5,0,0);
  assert.deepEqual(args,['video',0,0,1920,1080,240,135,480,270]);
  F.draw({drawImage(...a){args=a;}},'video',1920,1080,960,540,2,1,1);
  assert.deepEqual(args,['video',960,0,960,540,0,0,960,540]);
  assert.equal(F.zoomValue(-1),.25); assert.equal(F.zoomValue(10),4);
});
