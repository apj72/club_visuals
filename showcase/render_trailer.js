window.recordShowcaseTrailer=async function(){
  if(plPlaying)stopPlaylist();captionEnabled=false;captionOverlay.classList.remove('visible');setTrailsEnabled(false);applyEffectsFromController({hueRotate:0,saturate:100,contrast:100,brightness:100,blur:0,invert:0,sepia:0});
  await loadPlaylistBySlug('version1-showcase-trailer');
  const output=document.createElement('canvas');output.width=1280;output.height=720;const context=output.getContext('2d');window.trailerCanvas=output;
  const stream=output.captureStream(30),mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9')?'video/webm;codecs=vp9':'video/webm';
  const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:7000000}),chunks=[];
  recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
  const done=new Promise((resolve,reject)=>{recorder.onerror=reject;recorder.onstop=()=>{const blob=new Blob(chunks,{type:recorder.mimeType}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='showcase-trailer.webm';a.click();stream.getTracks().forEach(t=>t.stop());setTimeout(()=>URL.revokeObjectURL(url),10000);resolve({bytes:blob.size});};});
  await startPlaylist();await document.fonts.ready;
  let frame,finishAt=null,start=performance.now();recorder.start();
  const draw=now=>{
    try{if(vfxState.enabled)renderVfxFrame();drawCompositeFrame(output,context,true,false,true);}
    catch(error){window.trailerRenderError=error.message;}
    window.trailerSeconds=(now-start)/1000;window.trailerClip=plEntryIdx;
    if(!plPlaying&&finishAt===null)finishAt=now+1000;
    if((finishAt!==null&&now>=finishAt)||now-start>115000){cancelAnimationFrame(frame);if(plPlaying)stopPlaylist();recorder.stop();}
    else frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);return done;
};
