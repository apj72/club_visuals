import fs from 'node:fs';
import assert from 'node:assert/strict';
const code=fs.readFileSync(new URL('./ui/v2/preview.js',import.meta.url),'utf8');
const {flipFor,drawFrame}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
assert.deepEqual(flipFor(1,0),[0,0]);
assert.deepEqual(flipFor(8,3),[1,1]);
assert.deepEqual(flipFor(32,4),[1,1]);
const draws=[],scales=[];
const ctx={canvas:{width:1280,height:720},fillRect(){},save(){},restore(){},translate(){},scale(...v){scales.push(v)},drawImage(...v){draws.push(v)}};
const source={videoWidth:1920,videoHeight:1080};
drawFrame(ctx,source,{view:'quad',preset:8,zoom:2,panX:1,panY:-1});
assert.equal(draws.length,4);assert.deepEqual(scales,[[1,-1],[1,-1],[1,-1],[1,-1]]);
// A zoomed tile at maximum positive X and negative Y reaches the source's bottom-right edge.
for(const [video,x,y,w,h] of draws){assert.equal(video,source);assert.equal(x+w,1920);assert.equal(y+h,1080)}
draws.length=0;
drawFrame(ctx,source,{view:'single',preset:1,zoom:4,panX:1,panY:1});
assert.equal(draws.length,1);assert.equal(draws[0].length,5);
console.log('V2 mirror maps, tile crop bounds and Single contain rendering passed.');
