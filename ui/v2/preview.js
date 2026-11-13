// Ported from baseline bfe7912: CONFIGS, position maps and drawCompositeFrame.
export const layout={view:'single',preset:1,loopMode:0,speed:1,zoom:1,panX:0,panY:0,effects:{hueRotate:0,saturate:100,contrast:100,brightness:100,blur:0,invert:0,sepia:0}};
const hRules=[[0,0,0,0],[0,0,1,1],[1,0,0,1],[0,1,1,0],[1,1,1,1],[1,1,0,0],[0,1,0,1],[1,0,1,0]],vRules=[[0,0],[0,1],[1,0],[1,1]];
export function flipFor(preset,position){return[hRules[Math.floor((preset-1)/4)][position%4],vRules[(preset-1)%4][position>>2]]}
export function drawFrame(ctx,source,state=layout){
 const w=ctx.canvas.width,h=ctx.canvas.height,vw=source.videoWidth||source.width,vh=source.videoHeight||source.height;
 ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);if(!vw||!vh)return;
 const [cols,rows]={single:[1,1],dual:[2,1],triple:[3,1],quad:[2,2],octo:[4,2]}[state.view];
 const tw=w/cols,th=h/rows;
 const fx=state.effects||{};
 ctx.filter=`hue-rotate(${fx.hueRotate||0}deg) saturate(${fx.saturate??100}%) contrast(${fx.contrast??100}%) brightness(${fx.brightness??100}%) blur(${fx.blur||0}px) invert(${fx.invert||0}%) sepia(${fx.sepia||0}%)`;
 for(let i=0;i<cols*rows;i++){
  const pos=state.view==='dual'?[0,3][i]:state.view==='quad'?[0,1,4,5][i]:i;
  const [fx,fy]=state.view==='single'?[0,0]:flipFor(state.preset,pos);
  ctx.save();ctx.translate((i%cols+.5)*tw,(Math.floor(i/cols)+.5)*th);ctx.scale(fx?-1:1,fy?-1:1);
  if(state.view==='single'){const scale=Math.min(tw/vw,th/vh);ctx.drawImage(source,-vw*scale/2,-vh*scale/2,vw*scale,vh*scale)}
  else {const scale=Math.max(tw/vw,th/vh)*state.zoom,sw=Math.min(vw,tw/scale),sh=Math.min(vh,th/scale);ctx.drawImage(source,(vw-sw)*(1+state.panX)/2,(vh-sh)*(1-state.panY)/2,sw,sh,-tw/2,-th/2,tw,th)}
  ctx.restore();
 }
 ctx.filter='none';
}
export function setupPreview(video,canvas,vfxCanvas,getVfxState){
 const ctx=canvas.getContext('2d');let frame;
 const stage=canvas.parentElement;
 let vfxEngine=null;
 try{if(window.VfxEngine&&vfxCanvas)vfxEngine=new window.VfxEngine(vfxCanvas)}catch(error){document.querySelector('#status').textContent=`Creative effects unavailable in this browser: ${error.message}`}
 function resizeCanvas(){
  const vw=video.videoWidth,vh=video.videoHeight,portrait=layout.view==='single'&&vw>0&&vh>vw;
  if(portrait){let width=720,height=Math.round(width*vh/vw);if(height>1440){width=Math.round(width*1440/height);height=1440}canvas.width=width;canvas.height=height;stage.classList.add('portrait-preview');stage.style.aspectRatio=`${width} / ${height}`}
  else{canvas.width=1280;canvas.height=720;stage.classList.remove('portrait-preview');stage.style.aspectRatio='16 / 9'}
 }
 resizeCanvas();
 function draw(){drawFrame(ctx,video);const vfx=getVfxState?.();if(vfx?.enabled&&vfxEngine){try{vfxEngine.render(canvas,vfx);stage.classList.add('vfx-active')}catch(error){stage.classList.remove('vfx-active');document.querySelector('#status').textContent=`Creative effect preview failed: ${error.message}`}}else stage.classList.remove('vfx-active');if(!video.paused&&!video.ended)frame=requestAnimationFrame(draw)}
 const redraw=()=>{cancelAnimationFrame(frame);draw()};
 for(const event of ['play','seeked','loadeddata','pause'])video.addEventListener(event,redraw);
 document.querySelectorAll('[data-layout]').forEach(input=>input.addEventListener('input',()=>{
  layout[input.dataset.layout]=input.dataset.layout==='view'?input.value:Number(input.value);
  if(input.dataset.layout==='view')resizeCanvas();
  video.playbackRate=layout.speed;video.loop=layout.loopMode===1;
  const output=input.parentElement.querySelector('output');if(output)output.value=input.value;
  document.querySelectorAll('[data-crop]').forEach(el=>el.disabled=layout.view==='single');redraw();
 }));
 video.addEventListener('loadedmetadata',()=>{resizeCanvas();redraw()});
 document.querySelectorAll('[data-effect]').forEach(input=>input.addEventListener('input',()=>{
  const key=input.dataset.effect,value=Number(input.value);layout.effects[key]=value;
  const output=document.querySelector(`[data-effect-output="${key}"]`);if(output)output.value=value+(key==='hueRotate'?'°':'%');
  document.querySelector('#look').value='custom';redraw();
 }));
 document.querySelectorAll('[data-crop]').forEach(el=>el.disabled=true);
 const play=document.querySelector('#play');play.onclick=()=>video.paused?video.play().catch(e=>document.querySelector('#status').textContent=e.message):video.pause();
 video.addEventListener('play',()=>play.textContent='Pause preview');video.addEventListener('pause',()=>play.textContent='Play preview');
 const seek=document.querySelector('#seek');video.addEventListener('timeupdate',()=>{seek.max=Number.isFinite(video.duration)?video.duration:0;seek.value=video.currentTime});seek.oninput=()=>video.currentTime=Number(seek.value);
 document.querySelector('#mute').onclick=event=>{video.muted=!video.muted;event.target.textContent=video.muted?'Unmute preview':'Mute preview'};
 document.querySelector('#expand').onclick=()=>canvas.parentElement.requestFullscreen?.().catch(e=>document.querySelector('#status').textContent=e.message);
 redraw.resizeCanvas=resizeCanvas;
 redraw.syncVfx=()=>{if(vfxEngine){const vfx=getVfxState?.()||{};vfxEngine.setShape(vfx.shape||{});vfxEngine.setLogo3d(vfx.logo3d||{})}redraw()};
 redraw.vfxAvailable=!!vfxEngine;
 return redraw;
}
