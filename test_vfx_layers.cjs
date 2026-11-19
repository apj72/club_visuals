const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({window:{}});vm.runInContext(fs.readFileSync('vfx_engine.js','utf8'),context);const E=context.window.VfxEngine;
test('legacy logo scenes and explicit independent layers remain compatible',()=>{
  assert(E.logoEnabled({scene:6}));assert(!E.baseEnabled({scene:6}));assert(E.logoOnly({scene:6}));
  for(const scene of [4,7]){assert(E.logoEnabled({scene,logoEnabled:true}));assert(E.baseEnabled({scene}));assert(!E.logoOnly({scene,logoEnabled:true}));}
  assert(!E.logoEnabled({scene:6,logoEnabled:false}));assert(E.baseEnabled({scene:6,baseEnabled:true}));
});
test('snake phases follow separated letters and the complete chip',()=>{
  const width=32,height=8,pixels=new Uint8ClampedArray(width*height*4);
  for(let id=0;id<8;id++)for(let y=2;y<6;y++)for(let x=id*4;x<id*4+2;x++)pixels[(y*width+x)*4+3]=255;
  const phases=E.letterPhases(width,height,pixels);
  assert.equal(new Set(Array.from({length:8},(_,i)=>phases[i*4])).size,8);
  assert.equal(phases[0],0);assert.equal(phases[28],1);
});
test('snake and fly-along share the independent clock and keep bounded camera distance',()=>{
  const logo={depth:.45,snake:{enabled:true,depth:.6,speed:.25,pulse:.35},fly:{enabled:true,speed:.5,distance:.28}};
  const a=E.sampleLogoDynamics(logo,0,6),b=E.sampleLogoDynamics(logo,1,6);
  assert(a.amplitude>0);assert.notEqual(a.phase,b.phase);assert.notEqual(a.cameraX,b.cameraX);
  assert(b.cameraDistance>=logo.depth*.5+b.amplitude+.05);
  const paused={...logo,animationClock:{time:1,startedAt:1000,playing:false}};
  assert.deepEqual(E.sampleLogoDynamics(paused,E.animationSeconds(paused,5000)),E.sampleLogoDynamics(paused,E.animationSeconds(paused,9000)));
  const normal=E.sampleLogoDynamics({depth:.45},4);assert.equal(normal.amplitude,0);assert.equal(normal.flyEnabled,false);
});
test('oblique fly-along aims at the moving letters while keeping 0-degree and reverse views available',()=>{
  for(const angle of [0,45,75])for(const reverse of [false,true]){
    const pose=E.sampleLogoDynamics({depth:.45,fly:{enabled:true,angle,distance:1.2,reverse}},3);
    assert.ok(Math.abs(pose.cameraAngle-angle*Math.PI/180*(reverse?-1:1))<1e-9);
    assert.ok(Math.abs(pose.cameraOriginX+Math.tan(pose.cameraAngle)*pose.cameraDistance-pose.cameraX)<1e-9);
  }
  assert.equal(E.normaliseFly().angle,45);
  assert.equal(E.normaliseFly({angle:100}).angle,75);
  assert.equal(E.normaliseFly({angle:-10}).angle,0);
});
test('full flight approaches from distance, clears the frame and supports bounce/repeat/once',()=>{
  const settings={depth:.45,fly:{enabled:true,speed:1,distance:.7,angle:45,mode:'once'}};
  const far=E.sampleLogoDynamics(settings,0),close=E.sampleLogoDynamics(settings,.5),off=E.sampleLogoDynamics(settings,1);
  assert.ok(far.cameraDistance>close.cameraDistance*100);
  assert.ok(off.cameraX>6.22/2);
  for(const key of ['cameraX','cameraOriginX','cameraDistance','progress'])assert.equal(E.sampleLogoDynamics(settings,1)[key],E.sampleLogoDynamics(settings,5)[key]);
  const bounced={...settings,fly:{...settings.fly,mode:'bounce'}};
  for(const key of ['cameraX','cameraOriginX','cameraDistance','progress'])assert.ok(Math.abs(E.sampleLogoDynamics(bounced,.35)[key]-E.sampleLogoDynamics(bounced,1.65)[key])<1e-9);
  const repeated={...settings,fly:{...settings.fly,mode:'repeat'}};
  assert.ok(Math.abs(E.sampleLogoDynamics(repeated,.25).cameraX-E.sampleLogoDynamics(repeated,1.25).cameraX)<1e-9);
  assert.equal(E.normaliseFly({loop:false}).mode,'once');
  assert.equal(E.normaliseFly({loop:true}).mode,'bounce');
  assert.equal(E.normaliseFly({mode:'repeat',loop:false}).mode,'repeat');
  assert.equal(E.normaliseFly({mode:'once'}).loop,false);
});
test('vertical flight departure also moves towards the left edge of the screen',()=>{
  for(const [orientation,sign] of [['top-bottom',1],['bottom-top',-1]]){
    const pose=E.sampleLogoDynamics({depth:.45,orientation,fly:{enabled:true,mode:'once',speed:1}},1,6.22,.5625);
    assert.ok(pose.cameraOriginY*sign>.5);
  }
});
