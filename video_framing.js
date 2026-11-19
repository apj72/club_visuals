/* Shared source-to-frame geometry for preview, playout and exported videos. */
(function(root) {
  'use strict';
  const zoomValue = value => Math.max(.25, Math.min(4, Number(value) || 1));
  const panValue = value => Math.max(-1, Math.min(1, Number(value) || 0));
  const surfaces = new WeakMap(), masks = new Map();
  function dustMask(width, height, amount) {
    const size = Math.min(1, 512 / Math.max(width,height));
    const w = Math.max(8,Math.round(width*size)), h = Math.max(8,Math.round(height*size));
    const strength = Math.round(amount*20)/20, key = `${w}:${h}:${strength}`;
    if (masks.has(key)) return masks.get(key);
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d'), image=ctx.createImageData(w,h), band=Math.max(2,Math.min(w,h)*.12);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++) {
      const distance=Math.min(x+.5,w-x-.5,y+.5,h-y-.5)/band;
      const fade=Math.min(1,distance), smooth=fade*fade*(3-2*fade);
      const seed=Math.sin(x*127.1+y*311.7)*43758.5453, noise=seed-Math.floor(seed);
      // Random holes soften into intact video over the inner edge band. The
      // stable seed avoids flicker and reproduces the same dissolve on export.
      const dust=noise<smooth ? Math.min(1,smooth*1.5) : smooth*.12;
      image.data[(y*w+x)*4+3]=Math.round(255*(1-strength+strength*dust));
    }
    ctx.putImageData(image,0,0);masks.set(key,canvas);
    if(masks.size>48)masks.delete(masks.keys().next().value);
    return canvas;
  }
  function rectangle(vw, vh, width, height, zoom = 1, panX = 0, panY = 0, fit = 'cover') {
    const scale = (fit === 'contain' ? Math.min(width / vw, height / vh) : Math.max(width / vw, height / vh)) * zoomValue(zoom);
    const w = vw * scale, h = vh * scale;
    // Cropped axes select the source area; smaller axes position the complete image
    // within the black space. Preserve the established X/Y crop directions.
    return {x:(width-w)*(1+panValue(panX))/2, y:(height-h)*(1-panValue(panY))/2, width:w, height:h, scale};
  }
  function draw(ctx, source, vw, vh, width, height, zoom, panX, panY, fit = 'cover', left = 0, top = 0) {
    if (!(vw > 0 && vh > 0 && width > 0 && height > 0)) return;
    const r = rectangle(vw,vh,width,height,zoom,panX,panY,fit);
    if (zoomValue(zoom)<1 && typeof document!=='undefined') {
      let layer=surfaces.get(ctx);
      if(!layer){layer=document.createElement('canvas');surfaces.set(ctx,layer);}
      const ratio=Math.min(1,2048/Math.max(r.width,r.height));
      const lw=Math.max(1,Math.round(r.width*ratio)),lh=Math.max(1,Math.round(r.height*ratio));
      if(layer.width!==lw||layer.height!==lh){layer.width=lw;layer.height=lh;}
      const paint=layer.getContext('2d');paint.clearRect(0,0,lw,lh);paint.drawImage(source,0,0,lw,lh);
      paint.globalCompositeOperation='destination-in';
      paint.drawImage(dustMask(lw,lh,Math.min(1,(1-zoomValue(zoom))/.2)),0,0,lw,lh);
      paint.globalCompositeOperation='source-over';
      ctx.save();ctx.beginPath();ctx.rect(left,top,width,height);ctx.clip();
      ctx.drawImage(layer,left+r.x,top+r.y,r.width,r.height);ctx.restore();
      return;
    }
    const x = Math.max(0,r.x), y = Math.max(0,r.y);
    const w = Math.min(width,r.x+r.width)-x, h = Math.min(height,r.y+r.height)-y;
    if (w > 0 && h > 0) ctx.drawImage(source,(x-r.x)/r.scale,(y-r.y)/r.scale,w/r.scale,h/r.scale,left+x,top+y,w,h);
  }
  function transform(vw,vh,width,height,zoom,panX,panY) {
    if (!(vw > 0 && vh > 0 && width > 0 && height > 0)) return '';
    const r = rectangle(vw,vh,width,height,zoom,panX,panY,'contain');
    return `translate(${r.x+r.width/2-width/2}px, ${r.y+r.height/2-height/2}px) scale(${zoomValue(zoom)})`;
  }
  const api = {zoomValue, rectangle, draw, transform};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.VideoFraming = api;
})(globalThis);
