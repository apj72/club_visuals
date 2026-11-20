/* Runs only in the isolated showcase renderer; no physical inputs or playout. */
window.renderShowcaseStudy = async function(job) {
  const load = (element,name,start=0) => new Promise((resolve,reject)=>{
    element.muted=true;element.playsInline=true;element.loop=true;
    element.onloadeddata=async()=>{element.onloadeddata=null;try{element.currentTime=start;await element.play();resolve();}catch(e){reject(e);}};
    element.onerror=()=>reject(new Error('Cannot read '+name));
    element.src='/video/'+encodeURIComponent(name);element.load();
  });
  captionEnabled=false;captionOverlay.classList.remove('visible');
  const target=document.createElement('canvas');target.width=1280;target.height=720;
  const ctx=target.getContext('2d');window.studyCanvas=target;
  let render, cleanup=()=>{};
  if(job.kind==='motion') {
    const movement=document.createElement('video'),background=document.createElement('video');
    await Promise.all([load(movement,job.movement,10),load(background,job.source)]);
    const sample=document.createElement('canvas');sample.width=160;sample.height=90;const sampleCtx=sample.getContext('2d',{willReadFrequently:true});
    const processor=new CameraMotion.Processor(160,90),mask=document.createElement('canvas');mask.width=160;mask.height=90;const maskCtx=mask.getContext('2d');
    const source=document.createElement('canvas');source.width=1280;source.height=720;const sourceCtx=source.getContext('2d');
    const gpu=document.createElement('canvas'),engine=new VfxEngine(gpu);let version=0,lastSample=-Infinity;
    render=(seconds,now)=>{
      if(now-lastSample>=45){lastSample=now;sampleCtx.drawImage(movement,0,0,160,90);const pixels=sampleCtx.getImageData(0,0,160,90);const rgba=processor.process(pixels.data,now,{threshold:.07,gain:5,delay:.18,trails:.6,compensate:true});maskCtx.putImageData(new ImageData(rgba,160,90),0,0);version++;}
      sourceCtx.fillStyle='#000';sourceCtx.fillRect(0,0,1280,720);VideoFraming.draw(sourceCtx,background,background.videoWidth,background.videoHeight,1280,720,1,0,0);
      engine.setMotionMask({image:mask,version});engine.render(source,{scene:7,baseEnabled:true,logoEnabled:false,intensity:1,feedback:0,motion:{mode:seconds<10?'video':seconds<20?'glow':'distort',strength:1.1}});
      ctx.drawImage(gpu,0,0,1280,720);
      window.studyEnergy=processor.energy;
    };
    cleanup=()=>{movement.pause();background.pause();engine.dispose();};
  } else {
    const loaded=new Promise(resolve=>video.addEventListener('loadeddata',resolve,{once:true}));showVideo(job.source,{type:'cut'});await loaded;
    setPlaybackRange(null);setLoopMode(1);setViewModeTo(2);setConfig(7);applyZoomPan(1,0,0);video.muted=true;await video.play();
    setVfxState({enabled:job.kind==='ripple',scene:0,intensity:.95,feedback:.16,baseEnabled:true,logoEnabled:false});
    const neutral={hueRotate:0,saturate:100,contrast:100,brightness:100,blur:0,invert:0,sepia:0};
    const presets=[neutral,{...neutral,saturate:250,contrast:130,brightness:110},{...neutral,hueRotate:180,saturate:300,contrast:150,brightness:120},{...neutral,hueRotate:120,saturate:150,contrast:140,brightness:130},{...neutral,hueRotate:30,saturate:60,contrast:110,brightness:90,blur:.5,sepia:60},{...neutral,invert:100},{...neutral,saturate:80,contrast:80,brightness:120,blur:2,sepia:20},neutral];
    let phase=-1,pulse=-1;
    render=(seconds)=>{
      if(job.kind==='colour'){
        const next=Math.min(7,Math.floor(seconds/4));if(next!==phase){phase=next;applyEffectsFromController(presets[phase]);setTrailsEnabled([1,2,3,6,7].includes(phase));setTrailAmount(phase===7?.06:.13);}
      } else {
        const next=Math.floor(seconds/2.5);if(next!==pulse){pulse=next;vfxEngine.pulse(.25+(pulse%3)*.25,.35+(pulse%2)*.3);}
        renderVfxFrame();
      }
      drawCompositeFrame(target,ctx,true,false,false);
    };
    cleanup=()=>{video.pause();setTrailsEnabled(false);};
  }
  const chunks=[],mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
  const stream=target.captureStream(30),recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6000000});
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const done=new Promise((resolve,reject)=>{recorder.onerror=reject;recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=job.kind+'.webm';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);stream.getTracks().forEach(t=>t.stop());cleanup();resolve({bytes:blob.size});};});
  render(0,performance.now());recorder.start();const start=performance.now();let frame;
  const tick=now=>{const elapsed=(now-start)/1000;render(elapsed,now);window.studySeconds=elapsed;if(elapsed<job.seconds)frame=requestAnimationFrame(tick);else{cancelAnimationFrame(frame);recorder.stop();}};
  frame=requestAnimationFrame(tick);return done;
};
