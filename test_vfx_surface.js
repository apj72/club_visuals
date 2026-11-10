const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('vfx_engine.js','utf8'),context);
const Engine = context.window.VfxEngine;

// A ring has a real hole. Distances must distinguish its counter, its ink,
// and exterior; errors here fill letter counters or invert extrusion normals.
const w=31,h=31,rgba=new Uint8ClampedArray(w*h*4);
for(let y=0;y<h;y++) for(let x=0;x<w;x++) {
  const r=Math.hypot(x-15,y-15);
  if(r<=12 && r>=6) rgba[(y*w+x)*4+3]=255;
}
const field=Engine.distanceField(w,h,rgba);
assert(field[15*w+15]>0,'Letter counter must remain empty');
assert(field[15*w+24]<0,'Ink must have a negative signed distance');
assert(field[0]>0,'Exterior must have a positive distance');
for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
  assert(Number.isFinite(field[y*w+x]));
  assert(Math.abs(field[y*w+x]-field[y*w+(w-1-x)])<1e-6,'Distance field must stay symmetric');
}
const empty=Engine.distanceField(w,h,new Uint8ClampedArray(w*h*4));
assert([...empty].every(value=>Number.isFinite(value)&&value>0));

// Rotations must preserve lengths and return to the chosen endpoint: side
// reflections otherwise shear, and the ray box no longer encloses the text.
for(const axis of ['x','y','z']) {
  const logo={rotX:13,rotY:-22,rotZ:9,motion:.5,axis,startAngle:-45,endAngle:65};
  const matrix=Engine.rotationMatrix(logo,2.3);
  for(let a=0;a<3;a++)for(let b=0;b<3;b++) {
    let dot=0;for(let row=0;row<3;row++)dot+=matrix[a*3+row]*matrix[b*3+row];
    assert(Math.abs(dot-(a===b?1:0))<1e-6);
  }
}
assert.equal(new Set(Engine.materials).size,9);
assert(Engine.materials.includes('mirror'));
assert(Engine.materials.includes('chrome'));
const legacy=Object.create(Engine.prototype);
legacy.logo3d={kind:'logo',text:'',skin:'chrome',font:'modern',quality:'high',axis:'y',motion:0};
legacy.setLogo3d({depth:0,roughness:NaN,exposure:Infinity,skin:'missing',quality:'missing'});
assert.equal(legacy.logo3d.depth,.02,'Legacy zero depth must remain renderable');
assert.equal(legacy.logo3d.roughness,.14);
assert.equal(legacy.logo3d.exposure,1);
assert.equal(legacy.logo3d.skin,'chrome');
assert.equal(legacy.logo3d.quality,'high');
console.log('Signed-distance counters, symmetry, empty text, rotation, and material catalogue passed.');
