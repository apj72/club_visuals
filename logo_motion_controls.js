/* The same choreography authoring controls serve live VFX and saved effect cues. */
(() => {
  'use strict';
  const presets = {
    still: {name: 'Chrome on black', scale: .4, animation: {enabled: false}},
    bounce: {name: 'Bouncing logo', scale: .22, animation: {enabled: true, path: 'bounce', duration: 12, spanX: .9, spanY: .75, turnY: 360}},
    orbit: {name: 'Orbit + tumble', scale: .22, animation: {enabled: true, path: 'orbit', duration: 16, spanX: .7, spanY: .55, turnX: 360, turnY: 360, turnZ: 360, zoomMin: .8, zoomMax: 1.2}},
    breathe: {name: 'Breathing chrome', scale: .4, animation: {enabled: true, path: 'still', duration: 10, zoomMin: .6, zoomMax: 1.1, turnY: 360}},
    sweep: {name: 'Hidden video sweep', scale: .42, animation: {enabled: true, path: 'still', duration: 8, sourceMotion: 'left-right', sourceTravel: 1.5}},
    snake: {name: 'Pulsing letter snake', scale: .45, animation:{enabled:false}, snake:{enabled:true,speed:.25,depth:.6,pulse:.5}},
    fly: {name: 'Fly along Version1', scale:.48,animation:{enabled:false},fly:{enabled:true,speed:.08,distance:1.2,angle:45}}
  };
  const pathNames = {still: 'Stay in place', bounce: 'Bounce around screen', orbit: 'Orbit / ellipse', figure8: 'Figure of eight', sweep: 'Left to right', custom: 'Custom waypoints'};
  let activePreview = null;
  window.addEventListener('pagehide', () => activePreview?.close());
  // Authoring previews own their media, clock and WebGL context. They never use
  // the playout setters or broadcast commands to the resident Mac engine.
  function mountPreview(parent, {getSettings, getCue, getVideo, getVideos, onClock}) {
    const root = document.createElement('section'); root.className = 'lm-preview';
    root.innerHTML = `<button type="button" data-preview="open">Preview this effect</button>
      <div data-preview="panel" hidden>
        <p class="lm-hint">Single-video effect preview. The background starts at its beginning; use the playlist timeline to check cue timing and layouts.</p>
        <div class="lm-grid"><label>Preview background<select data-preview="source"></select></label>
        <label>Preview frame<select data-preview="aspect"><option value="landscape">16:9 · Landscape</option><option value="portrait">9:16 · Portrait</option><option value="square">1:1 · Square</option></select></label></div>
        <canvas aria-label="Saved effect preview"></canvas>
        <div class="lm-transport"><button type="button" data-preview="play">Play preview</button><button type="button" data-preview="restart">Restart preview</button></div>
        <label>Preview time · seconds<input data-preview="time" type="range" min="0" max="60" step="0.01" value="0"></label>
        <output data-preview="status" aria-live="polite"></output>
      </div>`;
    parent.prepend(root);
    const $ = name => root.querySelector(`[data-preview="${name}"]`);
    let engine, reflection, background, canvas, source, raf, running = false, time = 0, startedAt = 0, lastFrame = 0;
    let logoClock = {time:0,startedAt:Date.now(),playing:false}, lastSettings = '', lastReflection = '', lastCue = '', opened = false;
    const seconds = () => time + (running ? (performance.now() - startedAt) / 1000 : 0);
    const publishClock = () => onClock({...logoClock});
    function refreshSources() {
      const selected = $('source').dataset.chosen === 'true' ? $('source').value : getVideo?.() || '';
      const names = getVideos().map(v => v.filename);
      $('source').replaceChildren(new Option('Black background', ''));
      for (const name of names) $('source').add(new Option(name, name));
      if (selected && !names.includes(selected)) $('source').add(new Option(selected + ' · missing from library', selected));
      $('source').value = $('source').dataset.chosen === 'true' ? selected : selected || names[0] || '';
    }
    function seekMedia() {
      if (background?.readyState >= 1 && background.duration) background.currentTime = seconds() % background.duration;
      const settings = getSettings();
      reflection?.configure(settings.reflectionSource, {time:seconds() * (settings.reflectionSource?.speed || 1),startedAt:Date.now(),playing:running});
    }
    function loadSource() {
      background.pause();
      if ($('source').value) { background.src = '/video/' + encodeURIComponent($('source').value); background.load(); }
      else { background.removeAttribute('src'); background.load(); }
    }
    function transport(playing) {
      time = seconds(); startedAt = performance.now(); running = playing;
      logoClock = {time:VfxEngine.animationSeconds({animationClock:logoClock}),startedAt:Date.now(),playing}; publishClock();
      if (running && background?.readyState >= 2) background.play().catch(() => { $('status').textContent='Background playback could not start. Try Play preview again.'; });
      else background?.pause();
      seekMedia(); $('play').textContent = running ? 'Pause preview' : 'Play preview';
    }
    function close() {
      if (!opened) return;
      opened = false; cancelAnimationFrame(raf); running = false;
      background.onloadeddata = background.onerror = null; background.pause(); background.removeAttribute('src'); background.load();
      reflection.dispose(); engine?.dispose(); engine = reflection = background = null;
      logoClock = {time:0,startedAt:Date.now(),playing:false}; publishClock();
      $('panel').hidden = true; $('open').textContent = 'Preview this effect';
      if (activePreview === api) activePreview = null;
    }
    function draw(now) {
      if (!opened) return;
      if (!root.isConnected || root.closest('details:not([open]),dialog:not([open])') || !root.getClientRects().length || !canvas.getClientRects().length) { close(); return; }
      raf = requestAnimationFrame(draw);
      if (now - lastFrame < 65) return; lastFrame = now;
      try {
        const elapsed = seconds(), settings = getSettings();
        const dimensions = {landscape:[640,360],portrait:[270,480],square:[400,400]}[$('aspect').value];
        if (source.width !== dimensions[0] || source.height !== dimensions[1]) [source.width,source.height] = dimensions;
        const ctx = source.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0,0,source.width,source.height);
        if (background.readyState >= 2) {
          const scale = Math.max(source.width/background.videoWidth,source.height/background.videoHeight);
          ctx.drawImage(background,(source.width-background.videoWidth*scale)/2,(source.height-background.videoHeight*scale)/2,background.videoWidth*scale,background.videoHeight*scale);
        }
        const cue = normalisePlaylistCue(getCue?.() || {...settings,effect:settings.kind==='text'?'text':'logo'});
        const primary = ['logo','text'].includes(cue.effect);
        const logo = primary ? cue : cue.logoLayer || settings;
        const authored = JSON.stringify(logo);
        if (lastSettings !== authored) { engine.setLogo3d({...logo,text:logo.text||'@tonyt.dj',kind:logo.effect==='text'?'text':'logo'}); lastSettings = authored; }
        engine.logo3d.animationClock = logoClock;
        const reflectionKey = JSON.stringify(logo.reflectionSource);
        if (lastReflection !== reflectionKey) { lastReflection=reflectionKey; seekMedia(); }
        const scene = primary ? 6 : cue.effect==='camera' ? 7 : cue.effect==='video' ? -1 : Number(cue.effect.slice(6));
        const cueKey = JSON.stringify(cue);
        if (lastCue !== cueKey) { engine.setShape({...cue,kind:cue.image?'image':'text'}); lastCue = cueKey; }
        engine.setReflectionSource(reflection.frame(), !!logo.reflectionSource?.filename);
        engine.render(source, {scene,baseEnabled:!primary,logoEnabled:true,intensity:cue.intensity,feedback:cue.feedback,bass:0,hit:0,motion:cue.cameraMotion,elapsedSeconds:elapsed});
        $('time').max = Math.max(60, VfxEngine.normaliseAnimation(logo.animation).duration, Math.ceil(elapsed));
        if (document.activeElement !== $('time')) $('time').value = elapsed;
        const backgroundMessage = background.error ? 'Background unavailable. Choose another library video.' : $('source').value && background.readyState < 2 ? 'Loading background…' : '';
        $('status').textContent = `${elapsed.toFixed(1)}s · ${backgroundMessage || reflection.message}${scene===7?' · Camera mask is not connected in this preview.':''}`;
        root.dataset.previewTime = elapsed.toFixed(3);
      } catch(error) { close(); $('panel').hidden=false; $('status').textContent='Preview unavailable: '+error.message; }
    }
    function open() {
      activePreview?.close(); refreshSources(); opened = true; activePreview = api;
      $('panel').hidden=false; $('open').textContent='Close preview'; $('play').textContent='Play preview'; time=0; startedAt=performance.now(); lastSettings=lastReflection=lastCue='';
      const oldCanvas=root.querySelector('canvas'); canvas=document.createElement('canvas'); canvas.setAttribute('aria-label','Saved effect preview'); oldCanvas.replaceWith(canvas);
      source=document.createElement('canvas'); background=document.createElement('video'); background.muted=true; background.playsInline=true; background.loop=true;
      reflection=new ReflectionVideo();
      background.onloadeddata=()=>{seekMedia();if(running)background.play().catch(()=>{});};
      background.onerror=()=>{};
      try { engine=new VfxEngine(canvas); loadSource(); seekMedia(); raf=requestAnimationFrame(draw); }
      catch(error) { close(); $('panel').hidden=false; $('status').textContent='Preview unavailable: '+error.message; }
    }
    $('open').onclick=()=>opened?close():open();
    $('source').onchange=()=>{$('source').dataset.chosen='true';if(opened)loadSource();};
    $('play').onclick=()=>transport(!running);
    $('restart').onclick=()=>{time=0;startedAt=performance.now();logoClock={time:0,startedAt:Date.now(),playing:logoClock.playing};publishClock();seekMedia();};
    $('time').oninput=()=>{time=Number($('time').value);startedAt=performance.now();logoClock={time,startedAt:Date.now(),playing:logoClock.playing};publishClock();seekMedia();};
    const api = {close, refreshSources, transport(action) {
      if (!opened) open();
      if (!opened) return;
      const current = VfxEngine.animationSeconds({animationClock:logoClock});
      logoClock={time:action==='restart'?0:current,startedAt:Date.now(),playing:action==='restart'?logoClock.playing:!logoClock.playing}; publishClock();
    }};
    return api;
  }
  function mount(parent, {settings = {}, onChange, onTransport, showOrientation = true, showAppearance = false, showReflection = false, showText = true,
    showPreview = false, getPreviewCue, getPreviewVideo,
    getVideos = () => window.listReflectionVideos?.() || [], reloadVideos = () => window.reloadLibrary?.()} = {}) {
    const sourceSettings = value => showReflection ? ReflectionVideo.normalise(value) : (value || {filename:'',speed:1});
    let state = {...settings, animation: VfxEngine.normaliseAnimation(settings.animation), snake: VfxEngine.normaliseSnake(settings.snake), fly: VfxEngine.normaliseFly(settings.fly),reflectionSource:sourceSettings(settings.reflectionSource)};
    const lookNumbers = [
      ['x','Horizontal position',0,1,.01,.5],['y','Vertical position',0,1,.01,.5],['scale','Size',.1,2,.01,.48],['depth','Extrusion depth',.02,2,.01,.45],
      ['rotX','Rotate X · °',-360,360,1,0],['rotY','Rotate Y · °',-360,360,1,-20],['rotZ','Rotate Z · °',-360,360,1,0],
      ['motion','Auto rotate speed',0,2,.01,.25],['startAngle','Start angle · °',-360,360,1,-45],['endAngle','End angle · °',-360,360,1,45],
      ['bevel','Bevel',0,.1,.0025,.035],['roughness','Roughness',.025,.8,.005,.14],['reflection','Video reflection',0,2,.01,1],
      ['environment','Environment wrap',0,2,.01,1],['exposure','Brightness',.3,2,.01,1]];
    const root = document.createElement('section'); root.className = 'logo-motion-editor';
    root.innerHTML = `<details data-appearance-field><summary>Object appearance</summary>
      <label data-text-value>Text<input data-look="text" type="text" maxlength="80"></label>
      <div class="lm-grid">${lookNumbers.map(([key,label,min,max,step])=>`<label>${label}<input data-look="${key}" type="number" min="${min}" max="${max}" step="${step}"></label>`).join('')}</div>
      <label>Finish<select data-look="skin"><option value="chrome">Chrome</option><option value="mirror">Liquid mirror</option><option value="brushed">Brushed silver</option><option value="gold">Gold</option><option value="rose-gold">Rose gold</option><option value="obsidian">Black chrome</option><option value="pearl">Pearl</option><option value="iridescent">Iridescent</option><option value="original">Original colours</option></select></label>
      <label data-text-font>Typeface<select data-look="font"><option value="modern">Modern sans</option><option value="bungee">Bungee</option><option value="serif">Editorial serif</option></select></label>
      <label>Auto rotation axis<select data-look="axis"><option value="x">X · tip</option><option value="y">Y · turn</option><option value="z">Z · spin</option></select></label>
      <label>Render quality<select data-look="quality"><option value="balanced">Balanced</option><option value="high">High definition</option><option value="ultra">Ultra</option></select></label></details>
      <details data-reflection-field><summary>Independent reflection video</summary>
      <label>Reflection source<select data-reflection="filename"><option value="">Same as playing video</option></select></label>
      <label>Reflection playback speed · ×<input data-reflection="speed" type="number" min=".25" max="4" step=".25"></label>
      <button type="button" data-refresh-reflections>Reload reflection choices</button>
      <p class="lm-hint" data-reflection-status role="status"></p></details>
      <label data-orientation-field>Orientation<select data-motion="orientation"><option value="horizontal">Horizontal · left → right</option><option value="top-bottom">Vertical · top → bottom</option><option value="bottom-top">Vertical · bottom → top</option></select></label>
      <label>Backdrop<select data-motion="backdrop"><option value="video">Playing video</option><option value="black">Black · reflections only</option></select></label>
      <label>Quick look<select data-motion="preset"><option value="">Choose a starting look…</option>${Object.entries(presets).map(([id, p]) => `<option value="${id}">${p.name}</option>`).join('')}</select></label>
      <label class="lm-check"><input type="checkbox" data-motion="enabled">Automate object and hidden video</label>
      <div class="lm-transport"><button type="button" data-transport="restart">Restart cycle</button><button type="button" data-transport="pause">Play logo motion</button></div>
      <div class="lm-grid"><label>Path<select data-motion="path">${Object.entries(pathNames).map(([id, name]) => `<option value="${id}">${name}</option>`).join('')}</select></label>
      <label>Cycle · seconds<input type="number" data-motion="duration" min="0.5" max="600" step="0.5"></label>
      <label>Travel X · %<input type="number" data-motion="spanX" min="0" max="200" step="1"></label><label>Travel Y · %<input type="number" data-motion="spanY" min="0" max="200" step="1"></label>
      <label>Zoom minimum · ×<input type="number" data-motion="zoomMin" min="0.1" max="4" step="0.05"></label><label>Zoom maximum · ×<input type="number" data-motion="zoomMax" min="0.1" max="4" step="0.05"></label>
      <label>X turn · °/cycle<input type="number" data-motion="turnX" min="-1080" max="1080" step="15"></label><label>Y turn · °/cycle<input type="number" data-motion="turnY" min="-1080" max="1080" step="15"></label><label>Z turn · °/cycle<input type="number" data-motion="turnZ" min="-1080" max="1080" step="15"></label>
      <label>Waypoint travel<select data-motion="ease"><option value="smooth">Ease in / out</option><option value="linear">Even speed</option></select></label></div>
      <label class="lm-check"><input type="checkbox" data-motion="loop">Repeat cycle</label><label class="lm-check"><input type="checkbox" data-motion="keepInside">Keep the whole object inside the screen</label>
      <svg class="lm-path" viewBox="0 0 320 180" role="img" aria-label="Object path preview; drag custom waypoints"></svg>
      <p class="lm-hint">Path preview shows the object centre. Keep inside adjusts its position and size for the current screen. Full 360° turns join smoothly when repeated.</p>
      <div class="lm-waypoints"><p class="lm-hint">Drag the numbered dots, or enter precise waypoints. Use matching first and last poses for a closed loop.</p><div class="lm-point-list"></div><button type="button" data-add-point>Add waypoint</button></div>
      <details><summary>Hidden video movement</summary><p class="lm-hint">Moves the video lighting the chrome. With a black backdrop, only its reflections are visible. Areas beyond the moving video are black.</p>
      <label>Video travel<select data-motion="sourceMotion"><option value="still">Stay in place</option><option value="left-right">Pass left → right</option><option value="right-left">Pass right → left</option><option value="back-forth">Sweep back and forth</option></select></label>
      <div class="lm-grid"><label>Video size · ×<input type="number" data-motion="sourceScale" min="0.1" max="4" step="0.05"></label><label>Video travel · frame widths<input type="number" data-motion="sourceTravel" min="0.1" max="4" step="0.1"></label></div></details>
      <details><summary>Pulsing snake · individual letters</summary>
      <label class="lm-check"><input type="checkbox" data-dynamics="snake.enabled">Enable letter depth wave</label>
      <div class="lm-grid"><label>Wave speed · cycles/s<input type="number" data-dynamics="snake.speed" min=".02" max="3" step=".01"></label>
      <label>Depth · letter heights<input type="number" data-dynamics="snake.depth" min="0" max="2" step=".05"></label>
      <label>Pulse strength<input type="number" data-dynamics="snake.pulse" min="0" max="1" step=".05"></label>
      <label>Waves along logo<input type="number" data-dynamics="snake.wavelength" min=".25" max="5" step=".25"></label></div>
      <label class="lm-check"><input type="checkbox" data-dynamics="snake.reverse">Reverse wave direction</label>
      <p class="lm-hint">Letters and chip move separately towards/away from the viewer. Use Play logo motion to run the wave.</p></details>
      <details><summary>Fly along the logo</summary>
      <label class="lm-check"><input type="checkbox" data-dynamics="fly.enabled">Enable fly-along viewpoint</label>
      <div class="lm-grid"><label>Travel speed · passes/s<input type="number" data-dynamics="fly.speed" min=".01" max="1" step=".01"></label>
      <label>Viewing distance · letter heights<input type="number" data-dynamics="fly.distance" min=".28" max="5" step=".01"></label>
      <label>Viewing angle · °<input type="number" data-dynamics="fly.angle" min="0" max="75" step="1"></label></div>
      <label class="lm-check"><input type="checkbox" data-dynamics="fly.reverse">Start from the chip end</label>
      <label>Flight playback<select data-dynamics="fly.mode"><option value="bounce">Back and forth</option><option value="repeat">One way · repeat</option><option value="once">One way · once</option></select></label>
      <p class="lm-hint">The full flight approaches from a tiny distant logo, passes close along the letters, then leaves the screen completely. Back and forth retraces the path; one-way modes repeat from the distant end or finish off-screen. Starting from the chip reverses the pass through the letters. Play/Pause controls its travel.</p></details>
      <p class="lm-status" role="status"></p>`;
    parent.append(root);
    if (!document.getElementById('logoMotionStyles')) {
      const style = document.createElement('style'); style.id = 'logoMotionStyles';
      style.textContent = `.logo-motion-editor{width:100%;min-width:0;font:12px/1.45 system-ui;color:inherit}.logo-motion-editor label{display:grid;gap:5px;margin:9px 0;min-width:0}.logo-motion-editor select,.logo-motion-editor input[type=number],.logo-motion-editor input[type=text]{width:100%;min-width:0;padding:8px;border:1px solid #52645e;border-radius:5px;background:#111b19;color:#eee;font:inherit}.logo-motion-editor button{min-height:40px;padding:7px 9px;border:1px solid #52645e;border-radius:5px;background:#23352b;color:#eee;font:inherit;cursor:pointer}.lm-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:4px 10px}.logo-motion-editor .lm-check{display:flex;align-items:center;gap:8px}.lm-check input{width:18px;height:18px;accent-color:#b8ee70}.lm-transport{display:flex;flex-wrap:wrap;gap:7px;margin:8px 0}.lm-path{display:block;width:100%;height:auto;max-height:240px;aspect-ratio:16/9;background:#080d0b;border:1px solid #4b6152;border-radius:7px;touch-action:none}.lm-path circle[data-point]{cursor:grab}.lm-hint{font-size:11px;color:#a9b8ad;margin:8px 0;line-height:1.45;overflow-wrap:anywhere}.lm-point-list{max-height:280px;overflow:auto;scrollbar-width:thin}.lm-point{border:1px solid #46584c;border-radius:7px;margin:8px 0;padding:8px}.lm-point header{display:flex;justify-content:space-between;align-items:center}.lm-point .lm-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.lm-point label{font-size:10px}.lm-status{font-size:11px;min-height:1.5em;margin:6px 0}.logo-motion-editor details{padding:10px 0;border-top:1px solid #46584c}.logo-motion-editor [hidden]{display:none!important}`;
      style.textContent += `.lm-preview{margin:10px 0;padding:10px;border:1px solid #46584c;border-radius:7px}.lm-preview canvas{display:block;max-width:100%;max-height:360px;width:auto;height:auto;margin:12px auto;background:#000;border-radius:5px}.lm-preview output{display:block;font-size:11px;min-height:2em;overflow-wrap:anywhere}.lm-preview input[type=range]{width:100%}`;
      document.head.append(style);
    }
    const $ = key => root.querySelector(`[data-motion="${key}"]`);
    const reflectionSelect=root.querySelector('[data-reflection="filename"]');
    const reflectionStatus=root.querySelector('[data-reflection-status]');
    root.querySelector('[data-appearance-field]').hidden=!showAppearance;
    root.querySelector('[data-reflection-field]').hidden=!showReflection;
    root.querySelector('[data-orientation-field]').hidden = !showOrientation;
    $('orientation').onchange = () => emit({orientation: $('orientation').value});
    const svg = root.querySelector('svg'), pointList = root.querySelector('.lm-point-list');
    const status = text => { root.querySelector('.lm-status').textContent = text; };
    const percent = new Set(['spanX', 'spanY']);
    const keys = ['enabled', 'path', 'duration', 'spanX', 'spanY', 'zoomMin', 'zoomMax', 'turnX', 'turnY', 'turnZ', 'ease', 'loop', 'keepInside', 'sourceMotion', 'sourceScale', 'sourceTravel'];
    function emit(patch, rebuild = false, restart = false) {
      state = {...state, ...patch};
      state.animation = VfxEngine.normaliseAnimation(state.animation);
      state.snake = VfxEngine.normaliseSnake(state.snake); state.fly = VfxEngine.normaliseFly(state.fly);
      if (patch.fly) patch = {...patch,fly:state.fly};
      state.reflectionSource=sourceSettings(state.reflectionSource);
      sync(rebuild); onChange?.(patch, {restart}); status('Changes are included when you save this effect in a playlist or model.');
    }
    function changeAnimation(key, value) { emit({animation: {...state.animation, [key]: value}}, key === 'path'); }
    $('backdrop').onchange = () => emit({backdrop: $('backdrop').value});
    $('preset').onchange = () => {
      const p = presets[$('preset').value]; if (!p) return;
      emit({backdrop: 'black', skin: 'chrome', motion: 0, x: .5, y: .5, rotX: 0, rotY: -20, rotZ: 0, scale: p.scale,
        animation: VfxEngine.normaliseAnimation(p.animation), snake:VfxEngine.normaliseSnake(p.snake),fly:VfxEngine.normaliseFly(p.fly)}, true, true);
      $('preset').value = '';
    };
    for (const key of keys) $(key).addEventListener('change', () => {
      const input = $(key);
      if (input.type === 'number' && !input.checkValidity()) { input.reportValidity(); return; }
      const value = input.type === 'checkbox' ? input.checked : input.type === 'number' ? Number(input.value) / (percent.has(key) ? 100 : 1) : input.value;
      changeAnimation(key, value);
    });
    for (const input of root.querySelectorAll('[data-dynamics]')) input.onchange = () => {
      if (input.type === 'number' && !input.checkValidity()) { input.reportValidity(); return; }
      const [group, key] = input.dataset.dynamics.split('.');
      emit({[group]: {...state[group], [key]: input.type === 'checkbox' ? input.checked : input.tagName === 'SELECT' ? input.value : Number(input.value)}});
    };
    for(const input of root.querySelectorAll('[data-look]')) input.onchange=()=>{
      if(input.type==='number'&&!input.checkValidity()){input.reportValidity();return;}
      emit({[input.dataset.look]:input.type==='number'?Number(input.value):input.value});
    };
    function refreshReflectionChoices(){
      if(!showReflection)return;
      const videos=getVideos(),filename=state.reflectionSource.filename;
      reflectionSelect.replaceChildren(new Option('Same as playing video',''));
      for(const video of videos)reflectionSelect.add(new Option(video.filename,video.filename));
      const missing=filename&&!videos.some(video=>video.filename===filename);
      if(missing)reflectionSelect.add(new Option(filename+' · missing from library',filename));
      reflectionSelect.value=filename;
      reflectionStatus.textContent=missing?'Saved reflection video is missing. Choose another source, or reload the library after restoring the file.':filename?'This video supplies the reflections independently of the background.':'Reflections follow the background video.';
    }
    reflectionSelect.onchange=()=>emit({reflectionSource:{...state.reflectionSource,filename:reflectionSelect.value}});
    root.querySelector('[data-reflection="speed"]').onchange=event=>{
      const input=event.target;if(!input.checkValidity()){input.reportValidity();return;}
      emit({reflectionSource:{...state.reflectionSource,speed:Number(input.value)}});
    };
    root.querySelector('[data-refresh-reflections]').onclick=async event=>{
      const button=event.target;button.disabled=true;
      try{if(await reloadVideos()===false)throw new Error('Could not reload the library. Try again.');refreshReflectionChoices();}
      catch(error){reflectionStatus.textContent=error.message;}
      finally{button.disabled=false;}
    };
    const preview = showPreview ? mountPreview(root, {getSettings:()=>state,getCue:getPreviewCue,getVideo:getPreviewVideo,getVideos,onClock:clock=>{state.animationClock=clock;drawMarker();}}) : null;
    const libraryChanged = () => { refreshReflectionChoices(); preview?.refreshSources(); };
    window.addEventListener('club-library-changed',libraryChanged);
    for (const button of root.querySelectorAll('[data-transport]')) {
      button.hidden = !onTransport && !preview;
      button.onclick = () => (onTransport || preview?.transport)?.(button.dataset.transport === 'pause' ? 'toggle' : button.dataset.transport);
    }
    function drawPath() {
      const a = state.animation, base = {x: .5, y: .5, scale: .25, depth: .45, rotX: 0, rotY: -20, rotZ: 0, motion: 0, ...state, animation: {...a, enabled: true}};
      const path = Array.from({length: 121}, (_, i) => {
        const sample = VfxEngine.sampleAnimation({...base, animation: {...base.animation, loop: false}}, i / 120 * a.duration).pose;
        return `${i ? 'L' : 'M'}${(sample.x * 320).toFixed(2)},${((1 - sample.y) * 180).toFixed(2)}`;
      }).join(' ');
      svg.innerHTML = `<path d="M160 0V180M0 90H320" stroke="#263c2c" fill="none"/><path d="${path}" stroke="#b8ee70" stroke-width="2" fill="none"/><circle class="lm-playhead" r="4" fill="#fff"/>`;
      if (a.path === 'custom') for (const [i, p] of a.points.entries()) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', p.x * 320); circle.setAttribute('cy', (1 - p.y) * 180); circle.setAttribute('r', 7); circle.setAttribute('fill', '#68b9e8'); circle.dataset.point = i;
        const label = document.createElementNS(circle.namespaceURI, 'text'); label.setAttribute('x', p.x * 320 + 9); label.setAttribute('y', (1 - p.y) * 180 - 8); label.setAttribute('fill', '#fff'); label.setAttribute('font-size', '10'); label.setAttribute('pointer-events', 'none'); label.textContent = i + 1;
        svg.append(circle, label);
      }
      drawMarker();
    }
    function drawMarker() {
      const marker = svg.querySelector('.lm-playhead'); if (!marker) return;
      const base = {x: .5, y: .5, scale: .25, rotX: 0, rotY: -20, rotZ: 0, ...state};
      const sample = VfxEngine.sampleAnimation(base, VfxEngine.animationSeconds(base)).pose;
      marker.setAttribute('cx', sample.x * 320); marker.setAttribute('cy', (1 - sample.y) * 180);
      root.querySelector('[data-transport="pause"]').textContent = state.animationClock?.playing === true ? 'Pause logo motion' : 'Play logo motion';
    }
    function renderPoints() {
      pointList.replaceChildren();
      for (const [i, point] of state.animation.points.entries()) {
        const row = document.createElement('section'); row.className = 'lm-point';
        const head = document.createElement('header'), title = document.createElement('strong'), remove = document.createElement('button');
        title.textContent = `Waypoint ${i + 1}`; remove.type = 'button'; remove.textContent = 'Remove'; remove.disabled = state.animation.points.length <= 2;
        remove.onclick = () => emit({animation: {...state.animation, points: state.animation.points.filter((_, at) => at !== i)}}, true);
        head.append(title, remove); const grid = document.createElement('div'); grid.className = 'lm-grid';
        for (const [key, name, min, max, factor] of [['at', 'Time %', 0, 100, 100], ['x', 'X %', -50, 150, 100], ['y', 'Y %', -50, 150, 100], ['scale', 'Size %', 5, 200, 100], ['rotX', 'Rotate X', -1080, 1080, 1], ['rotY', 'Rotate Y', -1080, 1080, 1], ['rotZ', 'Rotate Z', -1080, 1080, 1]]) {
          const label = document.createElement('label'); label.textContent = name;
          const input = document.createElement('input'); input.type = 'number'; input.min = min; input.max = max; input.step = .1; input.value = (point[key] * factor).toFixed(1); input.dataset.pointField = key;
          input.onchange = () => {
            if (!input.checkValidity()) { input.reportValidity(); return; }
            const points = state.animation.points.map(p => ({...p})); points[i][key] = Number(input.value) / factor;
            if (key === 'at' && points.some((p, at) => at !== i && Math.abs(p.at - points[i].at) < .00001)) { status('Each waypoint needs a different time.'); input.value = point.at * factor; return; }
            emit({animation: {...state.animation, points}}, key === 'at');
          };
          label.append(input); grid.append(label);
        }
        row.append(head, grid); pointList.append(row);
      }
    }
    root.querySelector('[data-add-point]').onclick = () => {
      const points = state.animation.points.map(p => ({...p}));
      if (points.length >= 32) { status('Use up to 32 waypoints per path.'); return; }
      let left = 0; for (let i = 1; i < points.length - 1; i++) if (points[i + 1].at - points[i].at > points[left + 1].at - points[left].at) left = i;
      const p = {}; for (const key of ['at', 'x', 'y', 'scale', 'rotX', 'rotY', 'rotZ']) p[key] = (points[left][key] + points[left + 1][key]) / 2;
      points.splice(left + 1, 0, p); emit({animation: {...state.animation, points}}, true);
    };
    let dragging = null;
    svg.addEventListener('pointerdown', event => {
      const dot = event.target.closest('[data-point]'); if (!dot) return;
      event.preventDefault(); dragging = Number(dot.dataset.point); svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove', event => {
      if (dragging === null) return;
      const bounds = svg.getBoundingClientRect(), points = state.animation.points.map(p => ({...p}));
      points[dragging].x = Math.round(Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)) * 1000) / 1000;
      points[dragging].y = Math.round(Math.max(0, Math.min(1, 1 - (event.clientY - bounds.top) / bounds.height)) * 1000) / 1000;
      emit({animation: {...state.animation, points}});
    });
    const finishDrag = () => { if (dragging !== null) { dragging = null; renderPoints(); } };
    svg.addEventListener('pointerup', finishDrag); svg.addEventListener('pointercancel', finishDrag);
    function sync(rebuild = false) {
      $('orientation').value = VfxEngine.normaliseOrientation(state.orientation);
      $('backdrop').value = state.backdrop === 'black' ? 'black' : 'video';
      const textObject=state.kind==='text'||['text','dj'].includes(state.effect);
      root.querySelector('[data-text-value]').hidden=!textObject||!showText;
      root.querySelector('[data-text-font]').hidden=!textObject;
      for(const [key,,,,,fallback]of lookNumbers){const input=root.querySelector(`[data-look="${key}"]`);if(document.activeElement!==input)input.value=state[key]??fallback;}
      for(const [key,fallback]of [['skin','chrome'],['font','modern'],['axis','y'],['quality','high'],['text','@tonyt.dj']]){
        const input=root.querySelector(`[data-look="${key}"]`);if(document.activeElement!==input)input.value=state[key]??fallback;
      }
      if(document.activeElement!==root.querySelector('[data-reflection="speed"]'))root.querySelector('[data-reflection="speed"]').value=state.reflectionSource.speed;
      refreshReflectionChoices();
      for (const input of root.querySelectorAll('[data-dynamics]')) {
        if (document.activeElement === input) continue;
        const [group, key] = input.dataset.dynamics.split('.');
        if (input.type === 'checkbox') input.checked = state[group][key]; else input.value = state[group][key];
      }
      for (const key of keys) {
        const input = $(key); if (document.activeElement === input) continue;
        if (input.type === 'checkbox') input.checked = state.animation[key];
        else input.value = state.animation[key] * (percent.has(key) ? 100 : 1) || (input.type === 'number' ? 0 : state.animation[key]);
      }
      root.querySelector('.lm-waypoints').hidden = state.animation.path !== 'custom';

      if (rebuild) renderPoints(); drawPath();
    }
    sync(true);
    const timer = setInterval(() => { if (!root.isConnected) {clearInterval(timer);preview?.close();window.removeEventListener('club-library-changed',libraryChanged);} else if (root.getClientRects().length) drawMarker(); }, 100);
    return {root, update(settings) {
      const old = JSON.stringify(state.animation.points); state = {...state, ...settings, animation: VfxEngine.normaliseAnimation(settings.animation ?? state.animation),
        snake: VfxEngine.normaliseSnake(settings.snake ?? state.snake), fly: VfxEngine.normaliseFly(settings.fly ?? state.fly),reflectionSource:sourceSettings(settings.reflectionSource??state.reflectionSource)};
      sync(old !== JSON.stringify(state.animation.points));
    }};
  }
  window.LogoMotionControls = {mount};
})();
