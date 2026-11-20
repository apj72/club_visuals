const {test} = require('node:test');
const assert = require('node:assert/strict');
const {Processor, settings, Input} = require('./camera_motion.js');
const w=20,h=12;
function frame(value=0,box=false) {
  const p=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
    const i=(y*w+x)*4,v=box&&x>=3&&x<8&&y>=3&&y<8?255:value;
    p[i]=p[i+1]=p[i+2]=v;p[i+3]=255;
  }
  return p;
}
test('first frames and a static camera do not invent movement',()=>{
  const p=new Processor(w,h);
  for(let t=0;t<2000;t+=50)p.process(frame(60),t);
  assert.equal(p.energy,0);assert(p.mask.every((v,i)=>i%4===3?v===255:v===0));
});
test('a delayed comparison detects changing pixels without filling the background',()=>{
  const p=new Processor(w,h),config={delay:.1,compensate:false,trails:0};
  p.process(frame(),0,config);p.process(frame(),100,config);p.process(frame(0,true),150,config);
  assert(p.energy>.09&&p.energy<.12);
  assert.equal(p.mask[(4*w+4)*4],255);assert.equal(p.mask[0],0);
  p.process(frame(0,true),300,config);assert.equal(p.energy,0);
});
test('comparison delay is measured in time, not display frame count',()=>{
  const p=new Processor(w,h),config={delay:1,trails:0,compensate:false};
  p.process(frame(),0,config);p.process(frame(0,true),500,config);assert.equal(p.energy,0);
  p.process(frame(0,true),1000,config);assert(p.energy>.09);
  p.process(frame(0,true),1600,config);assert.equal(p.energy,0);
});
test('noise threshold and uniform lighting compensation suppress unwanted signals',()=>{
  const p=new Processor(w,h);
  p.process(frame(60),0);p.process(frame(140),300);assert.equal(p.energy,0);
  p.reset();p.process(frame(60),0,{compensate:false});p.process(frame(65),300,{compensate:false});assert.equal(p.energy,0);
  p.reset();p.process(frame(60),0,{compensate:false});p.process(frame(140),300,{compensate:false});assert(p.energy>.8);
});
test('motion trails decay and reset clears both history and output',()=>{
  const p=new Processor(w,h),config={delay:.05,trails:1,compensate:false};
  p.process(frame(),0,config);p.process(frame(0,true),100,config);const energy=p.energy;
  p.process(frame(0,true),300,config);assert(p.energy>0&&p.energy<energy);
  p.process(frame(0,true),2500,config);assert(p.energy<.01);
  p.reset();assert.equal(p.energy,0);assert.equal(p.history.length,0);assert.equal(p.mask[4],0);
});
test('lighting compensation does not turn a moving foreground into a full-frame mask',()=>{
  const p=new Processor(w,h);
  p.process(frame(),0);p.process(frame(0,true),300);
  assert(p.energy>.09&&p.energy<.12);assert.equal(p.mask[0],0);
});
test('long runs have bounded memory and settings reject unsafe values',()=>{
  const p=new Processor(w,h);
  for(let i=0;i<400;i++)p.process(frame(),i*50,{delay:2});
  assert(p.history.length<=48);
  const s=settings({mode:'invalid',threshold:Infinity,delay:99,trails:-10,strength:NaN});
  assert.equal(s.mode,'video');assert.equal(s.threshold,.08);assert.equal(s.delay,2);assert.equal(s.trails,0);assert.equal(s.strength,1);
  assert.equal(settings(null).mode,'video');
});
test('receivers reject other sources and old frames, and expire disconnected inputs',()=>{
  const input=Object.create(Input.prototype); input.id='receiver'; input.getSourceId=()=>undefined;
  assert.equal(input.frame().image,null);
  input.getSourceId=()=>'selected';
  input.receive({type:'cameraMotionFrame',sourceId:'other',seq:1,image:null});assert.equal(input.remote,undefined);
  input.receive({type:'cameraMotionFrame',sourceId:'selected',seq:2,image:null});
  input.receive({type:'cameraMotionFrame',sourceId:'selected',seq:1,image:null});assert.equal(input.remote.seq,2);
  input.remote.image={};input.remote.at=performance.now()-2000;assert.equal(input.frame().image,null);
  input.remote.at=performance.now();assert.equal(input.frame().image,input.remote.image);
});
