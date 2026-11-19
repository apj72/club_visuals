/* GPU post-processing for a complete Club Visuals frame. */
(() => {
  // Exact separable squared Euclidean distance transform. Keep the text's
  // high-resolution outline instead of extruding a low-resolution pixel grid.
  function distanceField(width, height, rgba) {
    const size = width * height, infinity = 1e12;
    const transform = inside => {
      const data = new Float32Array(size);
      for (let i = 0; i < size; i++) data[i] = (rgba[i * 4 + 3] >= 128) === inside ? 0 : infinity;
      const length = Math.max(width, height), f = new Float64Array(length), d = new Float64Array(length);
      const v = new Int32Array(length), z = new Float64Array(length + 1);
      const pass = n => {
        let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
        for (let q = 1; q < n; q++) {
          let s = ((f[q] + q*q) - (f[v[k]] + v[k]*v[k])) / (2*q - 2*v[k]);
          while (s <= z[k]) { k--; s = ((f[q] + q*q) - (f[v[k]] + v[k]*v[k])) / (2*q - 2*v[k]); }
          k++; v[k] = q; z[k] = s; z[k+1] = Infinity;
        }
        k = 0;
        for (let q = 0; q < n; q++) { while (z[k+1] < q) k++; d[q] = (q-v[k])**2 + f[v[k]]; }
      };
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) f[y] = data[y*width+x];
        pass(height); for (let y = 0; y < height; y++) data[y*width+x] = d[y];
      }
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) f[x] = data[y*width+x];
        pass(width); for (let x = 0; x < width; x++) data[y*width+x] = d[x];
      }
      return data;
    };
    const toInk = transform(true), toAir = transform(false), result = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      const alpha = rgba[i*4+3]/255;
      const signed = alpha >= .5 ? .5-Math.sqrt(toAir[i]) : Math.sqrt(toInk[i])-.5;
      result[i] = (alpha > 0 && alpha < 1 ? .5-alpha : signed) / height;
    }
    return result;
  }
  const materials = ['chrome', 'mirror', 'brushed', 'gold', 'rose-gold', 'obsidian', 'pearl', 'iridescent', 'original'];
  const normaliseOrientation = value => ['horizontal', 'top-bottom', 'bottom-top'].includes(value) ? value : 'horizontal';
  const logoEnabled = state => state.logoEnabled ?? state.scene === 6;
  const baseEnabled = state => state.baseEnabled ?? state.scene !== 6;
  const logoOnly = state => logoEnabled(state) && !baseEnabled(state);
  function uprightLogoSurface(source, orientation) {
    if (orientation === 'horizontal') return source;
    const ctx = source.getContext('2d'), {width, height} = source;
    const pixels = ctx.getImageData(0, 0, width, height).data;
    // Each separated column span is one original SVG letter, or the complete
    // chip including its 1. Counter-turn each piece before the wordmark turns.
    const pieces = [];
    let piece = null;
    for (let x = 0; x <= width; x++) {
      let top = height, bottom = -1;
      if (x < width) for (let y = 0; y < height; y++) if (pixels[(y * width + x) * 4 + 3] >= 128) {
        top = Math.min(top, y); bottom = y;
      }
      if (bottom >= 0) {
        if (!piece) piece = {x, right: x, top, bottom};
        piece.right = x; piece.top = Math.min(piece.top, top); piece.bottom = Math.max(piece.bottom, bottom);
      } else if (piece) { pieces.push(piece); piece = null; }
    }
    const padding = 24, gap = 32;
    const canvas = document.createElement('canvas');
    canvas.width = padding * 2 + pieces.reduce((sum, p) => sum + p.bottom - p.top + 1, 0) + Math.max(0, pieces.length - 1) * gap;
    canvas.height = padding * 2 + Math.max(1, ...pieces.map(p => p.right - p.x + 1));
    const target = canvas.getContext('2d');
    let offset = padding;
    for (const p of pieces) {
      const w = p.right - p.x + 1, h = p.bottom - p.top + 1;
      target.save();
      target.translate(offset + h / 2, canvas.height / 2);
      target.rotate(orientation === 'top-bottom' ? -Math.PI / 2 : Math.PI / 2);
      target.drawImage(source, p.x, p.top, w, h, -w / 2, -h / 2, w, h);
      target.restore();
      offset += h + gap;
    }
    return canvas;
  }
  function rotationMatrix(logo, elapsed) {
    const sweep = logo.motion > 0 ? (logo.startAngle + (logo.endAngle-logo.startAngle)*(0.5-0.5*Math.cos(elapsed*logo.motion*2))) : 0;
    const [x,y,z] = ['x','y','z'].map(axis => (logo.motion>0 && logo.axis===axis ? sweep : logo['rot'+axis.toUpperCase()])*Math.PI/180);
    const cx=Math.cos(x),sx=Math.sin(x),cy=Math.cos(y),sy=Math.sin(y),cz=Math.cos(z),sz=Math.sin(z);
    const r = [cz*cy,sz*cy,-sy,cz*sy*sx-sz*cx,sz*sy*sx+cz*cx,cy*sx,cz*sy*cx+sz*sx,sz*sy*cx-cz*sx,cy*cx];
    const orientation = normaliseOrientation(logo.orientation);
    if (orientation === 'horizontal') return new Float32Array(r);
    // Apply the wordmark's local orientation before its authored world rotation.
    const angle = orientation === 'top-bottom' ? -Math.PI / 2 : Math.PI / 2;
    const c = Math.cos(angle), s = Math.sin(angle);
    return new Float32Array([r[0]*c+r[3]*s,r[1]*c+r[4]*s,r[2]*c+r[5]*s,
      r[3]*c-r[0]*s,r[4]*c-r[1]*s,r[5]*c-r[2]*s,r[6],r[7],r[8]]);
  }
  const motionPaths = ['still', 'bounce', 'orbit', 'figure8', 'sweep', 'custom'];
  const clampNumber = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  function normaliseSnake(value = {}) {
    const v = value && typeof value === 'object' ? value : {};
    return {enabled: v.enabled === true, speed: clampNumber(v.speed, .25, .02, 3), depth: clampNumber(v.depth, .6, 0, 2),
      pulse: clampNumber(v.pulse, .35, 0, 1), wavelength: clampNumber(v.wavelength, 1.5, .25, 5), reverse: v.reverse === true};
  }
  function normaliseFly(value = {}) {
    const v = value && typeof value === 'object' ? value : {};
    const mode = ['bounce','repeat','once'].includes(v.mode) ? v.mode : v.loop === false ? 'once' : 'bounce';
    return {enabled: v.enabled === true, speed: clampNumber(v.speed, .08, .01, 1), distance: clampNumber(v.distance, 1.2, .28, 5),
      angle: clampNumber(v.angle, 45, 0, 75), reverse: v.reverse === true, mode, loop: mode !== 'once'};
  }
  function sampleLogoDynamics(logo, seconds, objectAspect = 6.22, frameAspect = 16/9) {
    const snake = normaliseSnake(logo.snake), fly = normaliseFly(logo.fly);
    const phase = seconds * snake.speed * Math.PI * 2;
    const amplitude = snake.enabled ? snake.depth * (1 - snake.pulse * .5 + Math.sin(phase * 2) * snake.pulse * .5) : 0;
    const travel = Math.max(0, seconds) * fly.speed;
    const progress = fly.mode === 'bounce' ? 1 - Math.abs((travel % 2) - 1) : fly.mode === 'repeat' ? travel % 1 : Math.min(1, travel);
    const smooth = value => { const t=Math.max(0,Math.min(1,value)); return t*t*(3-2*t); };
    const nearDistance = Math.max(fly.distance, logo.depth * .5 + amplitude + .06);
    // Approach from a distant point, traverse the whole wordmark, then carry
    // past its edge. Reversing the clock retraces exactly the same flight.
    const approach = smooth(progress / .22);
    const farDistance = Math.max(nearDistance*16,Math.max(1,objectAspect)*48*Math.cos(fly.angle*Math.PI/180)/Math.SQRT1_2);
    const cameraDistance = nearDistance * Math.exp(Math.log(farDistance/nearDistance)*(1-approach));
    const cameraAngle = fly.angle * Math.PI / 180 * (fly.reverse ? -1 : 1);
    const ca=Math.cos(cameraAngle), sa=Math.abs(Math.sin(cameraAngle)), halfFrame=Math.max(1,frameAspect)/2;
    const depthBound=logo.depth*.5+amplitude;
    // Project the nearest/farthest bounding-box corners beyond the view cone.
    // This also covers portrait/vertical presentations and a wide output frame.
    const overrun=(halfFrame*nearDistance/ca+Math.abs(1.5*sa-halfFrame*ca)*depthBound)/(1.5*ca+halfFrame*sa)+objectAspect*.05+.1;
    const along=smooth((progress-.22)/.60), departure=smooth((progress-.82)/.18);
    const cameraX = (fly.reverse ? -1 : 1)*((along-.5)*objectAspect+departure*overrun);
    const orientation=normaliseOrientation(logo.orientation);
    // A vertical wordmark's local X axis points up/down on screen. Add a
    // screen-right camera departure so it too clears the left edge completely.
    const verticalExit=.5+frameAspect*(nearDistance/ca+sa*(objectAspect*2+overrun)+ca*depthBound)/3+.25;
    const cameraOriginY=orientation==='horizontal' ? 0 : (orientation==='top-bottom'?1:-1)*departure*verticalExit;
    return {amplitude, phase: snake.reverse ? -phase : phase, wavelength: snake.wavelength,
      flyEnabled: fly.enabled, progress, cameraX, cameraAngle, cameraOriginY,
      cameraOriginX:cameraX-Math.tan(cameraAngle)*cameraDistance, cameraDistance};
  }
  function letterPhases(width, height, rgba) {
    const spans = []; let start = -1;
    for (let x = 0; x <= width; x++) {
      let ink = false;
      if (x < width) for (let y = 0; y < height && !ink; y++) ink = rgba[(y * width + x) * 4 + 3] >= 128;
      if (ink && start < 0) start = x;
      if (!ink && start >= 0) { spans.push([start, x - 1]); start = -1; }
    }
    const phases = new Float32Array(width); let at = 0;
    for (let x = 0; x < width; x++) {
      while (at + 1 < spans.length && x > (spans[at][1] + spans[at + 1][0]) / 2) at++;
      phases[x] = spans.length > 1 ? at / (spans.length - 1) : 0;
    }
    return phases;
  }
  const defaultPoints = () => [
    {at: 0, x: .2, y: .3, scale: .22, rotX: 0, rotY: -25, rotZ: -10},
    {at: .5, x: .8, y: .7, scale: .32, rotX: 30, rotY: 25, rotZ: 10},
    {at: 1, x: .2, y: .3, scale: .22, rotX: 0, rotY: -25, rotZ: -10}];
  function normaliseAnimation(value = {}) {
    const input = value && typeof value === 'object' ? value : {};
    const number = (key, fallback, min, max) => clampNumber(input[key], fallback, min, max);
    let points = Array.isArray(input.points) ? input.points.slice(0, 32).filter(p => p && typeof p === 'object' && Number.isFinite(p.at) && Number.isFinite(p.x) && Number.isFinite(p.y)).map(p => ({
      at: clampNumber(p.at, 0, 0, 1), x: clampNumber(p.x, .5, -.5, 1.5), y: clampNumber(p.y, .5, -.5, 1.5),
      scale: clampNumber(p.scale, .25, .05, 2), rotX: clampNumber(p.rotX, 0, -1080, 1080), rotY: clampNumber(p.rotY, 0, -1080, 1080), rotZ: clampNumber(p.rotZ, 0, -1080, 1080)
    })).sort((a, b) => a.at - b.at).filter((p, i, list) => !i || p.at > list[i - 1].at) : [];
    if (points.length < 2) points = defaultPoints();
    return {enabled: input.enabled === true, duration: number('duration', 12, .5, 600), loop: input.loop !== false,
      path: motionPaths.includes(input.path) ? input.path : 'still', ease: input.ease === 'linear' ? 'linear' : 'smooth',
      spanX: number('spanX', .6, 0, 2), spanY: number('spanY', .5, 0, 2), keepInside: input.keepInside !== false,
      zoomMin: number('zoomMin', 1, .1, 4), zoomMax: number('zoomMax', 1, .1, 4),
      turnX: number('turnX', 0, -1080, 1080), turnY: number('turnY', 0, -1080, 1080), turnZ: number('turnZ', 0, -1080, 1080),
      sourceMotion: ['still', 'left-right', 'right-left', 'back-forth'].includes(input.sourceMotion) ? input.sourceMotion : 'still',
      sourceScale: number('sourceScale', 1, .1, 4), sourceTravel: number('sourceTravel', 1.5, .1, 4), points};
  }
  function animationSeconds(logo, now = Date.now()) {
    const clock = logo.animationClock;
    if (!clock || !Number.isFinite(clock.time) || !Number.isFinite(clock.startedAt)) return 0;
    return Math.max(0, clock.time + (clock.playing ? Math.max(0, now - clock.startedAt) / 1000 : 0));
  }
  function sampleAnimation(logo, seconds) {
    const a = normaliseAnimation(logo.animation), pose = {...logo};
    const phase = a.loop ? ((Math.max(0, seconds) / a.duration) % 1) : Math.min(1, Math.max(0, seconds) / a.duration);
    const angle = phase * Math.PI * 2;
    const triangle = value => 1 - Math.abs((value % 1) * 2 - 1);
    if (a.enabled) {
      if (a.path === 'bounce') { pose.x += a.spanX * (triangle(phase * 2) - .5); pose.y += a.spanY * (triangle(phase * 3 + .25) - .5); }
      if (a.path === 'orbit') { pose.x += a.spanX * .5 * Math.cos(angle); pose.y += a.spanY * .5 * Math.sin(angle); }
      if (a.path === 'figure8') { pose.x += a.spanX * .5 * Math.sin(angle); pose.y += a.spanY * .5 * Math.sin(angle * 2); }
      if (a.path === 'sweep') pose.x += a.spanX * (phase - .5);
      if (a.path === 'custom') {
        const right = a.points.find(p => p.at >= phase) || a.points.at(-1);
        const left = [...a.points].reverse().find(p => p.at <= phase) || a.points[0];
        let mix = right.at > left.at ? Math.max(0, Math.min(1, (phase - left.at) / (right.at - left.at))) : 0;
        if (a.ease === 'smooth') mix = mix * mix * (3 - 2 * mix);
        for (const key of ['x', 'y', 'scale', 'rotX', 'rotY', 'rotZ']) pose[key] = left[key] + (right[key] - left[key]) * mix;
      }
      pose.scale *= a.zoomMin + (a.zoomMax - a.zoomMin) * (.5 - .5 * Math.cos(angle));
      for (const axis of ['X', 'Y', 'Z']) pose['rot' + axis] += a['turn' + axis] * phase;
      pose.scale = Math.max(.02, pose.scale);
      pose.motion = 0; // Authored axes replace the legacy single-axis oscillator.
    }
    const sourcePhase = a.ease === 'smooth' ? phase * phase * (3 - 2 * phase) : phase;
    let sourceX = 0;
    if (a.enabled && a.sourceMotion === 'left-right') sourceX = (sourcePhase * 2 - 1) * a.sourceTravel;
    if (a.enabled && a.sourceMotion === 'right-left') sourceX = (1 - sourcePhase * 2) * a.sourceTravel;
    if (a.enabled && a.sourceMotion === 'back-forth') sourceX = -Math.cos(angle) * a.sourceTravel;
    return {pose, phase, sourceX, sourceScale: a.enabled ? a.sourceScale : 1};
  }
  function projectedBounds(logo, rotation, objectAspect, aspect) {
    const r = rotation, scale = logo.scale * .5;
    const points = [];
    for (const x of [-objectAspect * .5, objectAspect * .5]) for (const y of [-.5, .5]) for (const z of [-logo.depth * .5, logo.depth * .5]) {
      const worldX = (r[0]*x+r[3]*y+r[6]*z)*scale+(logo.x-.5)*aspect;
      const worldY = (r[1]*x+r[4]*y+r[7]*z)*scale+(logo.y-.5);
      const worldZ = (r[2]*x+r[5]*y+r[8]*z)*scale, perspective = 5/(5-worldZ);
      points.push([worldX*perspective/aspect+.5, worldY*perspective+.5]);
    }
    return [Math.min(...points.map(p => p[0])), Math.min(...points.map(p => p[1])), Math.max(...points.map(p => p[0])), Math.max(...points.map(p => p[1]))];
  }
  function fitAnimatedPose(logo, rotation, objectAspect, aspect) {
    const pose = {...logo};
    const reach = Math.abs(rotation[2]) * objectAspect * .5 + Math.abs(rotation[5]) * .5 + Math.abs(rotation[8]) * pose.depth * .5;
    pose.scale = Math.min(pose.scale, 8 / Math.max(.001, reach));
    for (let i = 0; i < 5; i++) {
      const [x0, y0, x1, y1] = projectedBounds(pose, rotation, objectAspect, aspect);
      const factor = Math.min(1, .94 / Math.max(x1-x0, y1-y0));
      if (factor < .999) { pose.scale *= factor * .98; continue; }
      pose.x += Math.max(0, .02-x0) - Math.max(0, x1-.98);
      pose.y += Math.max(0, .02-y0) - Math.max(0, y1-.98);
    }
    return pose;
  }
  function objectScissor(logo, rotation, objectAspect, width, height) {
    const aspect=width/height, scale=logo.scale*.5, r=rotation;
    let minX=width,minY=height,maxX=0,maxY=0;
    for(const x of [-objectAspect*.5,objectAspect*.5]) for(const y of [-.5,.5]) for(const z of [-logo.depth*.5,logo.depth*.5]) {
      const worldX=(r[0]*x+r[3]*y+r[6]*z)*scale+(logo.x-.5)*aspect;
      const worldY=(r[1]*x+r[4]*y+r[7]*z)*scale+(logo.y-.5);
      const worldZ=(r[2]*x+r[5]*y+r[8]*z)*scale;
      const perspective=5/(5-worldZ);
      const px=(worldX*perspective/aspect+.5)*width, py=(worldY*perspective+.5)*height;
      minX=Math.min(minX,px);maxX=Math.max(maxX,px);minY=Math.min(minY,py);maxY=Math.max(maxY,py);
    }
    const left=Math.max(0,Math.floor(minX-2)),bottom=Math.max(0,Math.floor(minY-2));
    return [left,bottom,Math.max(0,Math.min(width,Math.ceil(maxX+2))-left),Math.max(0,Math.min(height,Math.ceil(maxY+2))-bottom)];
  }
  const vertex = `#version 300 es
    void main() {
      vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
    }`;
  const effect = `#version 300 es
    precision highp float;
    uniform sampler2D sourceFrame, previousFrame, shapeMask, motionMask;
    uniform vec2 resolution, point, shapeCenter;
    uniform float elapsed, rippleAge, bass, hit, intensity, feedback, mirrorDepth, mirrorEdge, shapeTilt, shapeThickness, shapeSpin;
    uniform int scene;
    uniform int motionMode;
    uniform float motionStrength;
    out vec4 colour;
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      if (scene == 7) {
        float mask = texture(motionMask, uv).r;
        vec2 px = 1.0 / vec2(textureSize(motionMask, 0));
        vec2 gradient = vec2(texture(motionMask, uv + vec2(px.x, 0)).r - texture(motionMask, uv - vec2(px.x, 0)).r,
          texture(motionMask, uv + vec2(0, px.y)).r - texture(motionMask, uv - vec2(0, px.y)).r);
        float amount = motionStrength * intensity;
        vec3 video = texture(sourceFrame, uv).rgb;
        if (motionMode == 0) video *= clamp(mask * amount, 0.0, 1.0);
        else if (motionMode == 1) video += vec3(0.12, 0.85, 0.68) * (mask * 0.65 + length(gradient)) * amount;
        else {
          vec2 offset = gradient * 0.09 * amount;
          offset += vec2(sin(uv.y * 35.0 + elapsed * 3.0), cos(uv.x * 27.0 - elapsed * 2.0)) * mask * 0.025 * amount;
          video = texture(sourceFrame, clamp(uv + offset, 0.0, 1.0)).rgb;
        }
        colour = vec4(video, 1.0); return;
      }
      vec2 d = (uv - point) * vec2(resolution.x / resolution.y, 1.0);
      float radius = length(d);
      vec2 direction = d / max(radius, 0.001);
      float ripple = sin(radius * 48.0 - rippleAge * 17.0)
        * exp(-radius * 4.0 - rippleAge * 1.6) * intensity;
      vec2 warped = uv;
      if (scene == 0) {
        warped += direction * ripple * (0.025 + bass * 0.055);
        warped.x += sin(uv.y * 30.0 + elapsed * 2.0) * bass * intensity * 0.016;
      } else if (scene == 1) {
        warped.x += sin(uv.y * 24.0 + elapsed) * bass * intensity * 0.14;
        warped.x += ripple * 0.065;
        warped.y += sin(uv.x * 17.0 - elapsed) * bass * intensity * 0.012;
      } else if (scene == 2) {
        warped += direction * ripple * 0.02;
      } else if (scene == 4) {
        vec2 p = (uv - vec2(0.5)) * vec2(resolution.x / resolution.y, 1.0);
        float angle = atan(p.y, p.x) + elapsed * (0.12 + bass * 0.18);
        float sector = 1.04719755;
        angle = abs(mod(angle, sector * 2.0) - sector);
        float r = length(p) * (1.0 + 0.12 * intensity * sin(elapsed + length(p) * 12.0));
        warped = vec2(0.5) + vec2(cos(angle), sin(angle)) * r / vec2(resolution.x / resolution.y, 1.0);
      } else if (scene == 5) {
        float bands = floor(uv.y * (12.0 + bass * 18.0));
        float offset = sin(bands * 37.2 + floor(elapsed * 5.0)) * (0.012 + hit * 0.045) * intensity;
        warped.x += offset;
        warped += direction * ripple * 0.025;
      }
      vec3 image = texture(sourceFrame, clamp(warped, 0.0, 1.0)).rgb;
      if (scene < 0) { colour = vec4(image, 1.0); return; }
      if (scene == 1) {
        vec3 pulled = texture(sourceFrame, clamp(warped - vec2(bass * intensity * 0.16, 0.0), 0.0, 1.0)).rgb;
        image = mix(image, pulled, min(0.7, bass * intensity));
      }
      if (scene == 2) {
        for (int i = 0; i < 6; i++) {
          float n = float(i);
          float y = 0.1 + n * 0.16 + sin(uv.x * (9.0 + n) + elapsed * (0.8 + n * 0.15)) * (0.05 + bass * 0.1);
          float ribbon = exp(-abs(uv.y - y) * (75.0 - bass * 25.0));
          vec3 sampled = texture(sourceFrame, vec2(fract(uv.x + n * 0.13 + elapsed * 0.025), fract(0.15 + n * 0.15))).rgb;
          image += sampled * ribbon * (0.2 + bass * 0.9) * intensity;
        }
      }
      if (scene == 3) {
        vec2 px = 1.0 / resolution;
        float spread = 4.0 + mirrorEdge * 22.0;
        vec2 stepUV = px * spread;
        float angle = shapeTilt * 0.35 + sin(elapsed * 0.65) * shapeSpin * 0.32;
        vec2 local = uv - shapeCenter;
        vec2 shapeUV = shapeCenter + vec2(cos(angle) * local.x + sin(angle) * local.y,
          -sin(angle) * local.x + cos(angle) * local.y);
        shapeUV.x = shapeCenter.x + (shapeUV.x - shapeCenter.x) / max(0.55, 1.0 - abs(shapeTilt + sin(elapsed * 0.65) * shapeSpin) * 0.3);
        float mask = texture(shapeMask, shapeUV).a;
        float left = texture(shapeMask, shapeUV - vec2(stepUV.x, 0.0)).a;
        float right = texture(shapeMask, shapeUV + vec2(stepUV.x, 0.0)).a;
        float down = texture(shapeMask, shapeUV - vec2(0.0, stepUV.y)).a;
        float up = texture(shapeMask, shapeUV + vec2(0.0, stepUV.y)).a;
        vec2 gradient = vec2(right - left, up - down);
        float edge = clamp(length(gradient), 0.0, 1.0);
        vec2 normal = gradient / max(edge, 0.001);
        float bend = mirrorDepth * intensity * (0.012 + bass * 0.025);
        vec2 outsideUV = clamp(uv - normal * edge * bend * (1.0 - mask), 0.0, 1.0);
        vec3 outside = texture(sourceFrame, outsideUV).rgb;
        vec2 reflectedUV = vec2(2.0 * shapeCenter.x - uv.x, uv.y);
        reflectedUV += normal * bend * (0.5 + 0.5 * sin(elapsed * 1.2 + uv.y * 19.0));
        reflectedUV += direction * ripple * 0.035;
        vec3 reflected = texture(sourceFrame, clamp(reflectedUV, 0.0, 1.0)).rgb;
        float bevel = clamp(mask - 0.55 * (left + right + up + down) * 0.25, 0.0, 1.0);
        float glint = pow(max(dot(normal, normalize(vec2(-0.6, 0.8))), 0.0), 3.0) * edge;
        reflected = reflected * (0.7 + 0.55 * glint + 0.2 * bass) + vec3(0.24, 0.45, 0.58) * (glint + bevel) * mirrorEdge;
        float back = texture(shapeMask, shapeUV + vec2(-0.018, 0.023) * shapeThickness).a;
        float side = max(back - mask, 0.0);
        vec3 sideImage = texture(sourceFrame, clamp(reflectedUV + vec2(0.04, -0.02), 0.0, 1.0)).rgb * 0.34 + vec3(0.08, 0.16, 0.2);
        image = mix(outside, sideImage, side);
        image = mix(image, reflected, mask);
        image += vec3(0.10, 0.28, 0.36) * edge * mirrorEdge * (1.0 - mask) * (0.6 + hit);
      }
      if (scene == 5) {
        float shift = (0.003 + hit * 0.018 + bass * 0.009) * intensity;
        image.r = texture(sourceFrame, clamp(warped + vec2(shift, 0.0), 0.0, 1.0)).r;
        image.b = texture(sourceFrame, clamp(warped - vec2(shift, 0.0), 0.0, 1.0)).b;
      }
      vec2 trailUV = uv - direction * ripple * 0.008;
      if (scene == 1) trailUV.x -= (0.003 + bass * 0.012) * intensity;
      vec3 history = texture(previousFrame, clamp(trailUV, 0.0, 1.0)).rgb;
      float blend = feedback * (scene == 1 ? 0.92 : scene == 3 || scene == 6 ? 0.34 : 0.78);
      colour = vec4(mix(image, history * 0.987, blend) + image * hit * 0.08, 1.0);
    }`;
  const present = `#version 300 es
    precision highp float;
    uniform sampler2D frame;
    uniform vec2 resolution;
    out vec4 colour;
    void main() { colour = texture(frame, gl_FragCoord.xy / resolution); }`;
  const logoFragment = `#version 300 es
    precision highp float;
    uniform sampler2D sourceFrame, logoTexture, logoDistance;
    uniform vec2 resolution, logoPosition;
    uniform vec2 reflectionOffset;
    uniform float reflectionScale;
    uniform mat3 logoRotation;
    uniform vec3 logoSnake, logoCamera;
    uniform int logoFly;
    uniform float logoFlyAngle;
    uniform float logoOrientation;
    uniform float logoScale, logoDepth, logoAspect, logoBevel, logoRoughness, logoReflection, logoEnvironment, logoExposure, bass, hit;
    uniform int logoMaterial, logoQuality;
    out vec4 colour;
    const float PI = 3.14159265359;
    float shapeDistance(vec3 p) {
      vec2 uv = vec2(p.x / logoAspect + 0.5, p.y + 0.5);
      vec4 field = textureLod(logoDistance, clamp(uv, 0.0, 1.0), 0.0);
      float planar = field.r;
      float offset = logoSnake.x > 0.0 ? sin(logoSnake.y - field.a * logoSnake.z * PI * 2.0) * logoSnake.x : 0.0;
      float bevel = min(logoBevel, logoDepth * 0.42);
      vec2 q = vec2(planar + bevel, abs(p.z - offset) - logoDepth * 0.5 + bevel);
      return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - bevel;
    }
    vec3 shapeNormal(vec3 p, float epsilon) {
      vec4 field=textureLod(logoDistance,clamp(vec2(p.x/logoAspect+0.5,p.y+0.5),0.0,1.0),0.0);
      float offset=logoSnake.x>0.0 ? sin(logoSnake.y-field.a*logoSnake.z*PI*2.0)*logoSnake.x : 0.0;
      float bevel=min(logoBevel,logoDepth*0.42);
      vec2 q=vec2(field.r+bevel,abs(p.z-offset)-logoDepth*0.5+bevel);
      vec2 weights=max(q,0.0);
      weights=length(weights)>0.000001 ? normalize(weights) : (q.x>q.y ? vec2(1.0,0.0) : vec2(0.0,1.0));
      vec2 planarNormal=field.gb/max(length(field.gb),0.00001);
      return normalize(vec3(planarNormal*weights.x,sign(p.z-offset)*weights.y));
    }
    vec2 wrapVideo(vec2 uv) { return 1.0 - abs(mod(uv, 2.0) - 1.0); }
    vec3 videoLight(vec3 ray, vec2 screenUV, float roughness) {
      // Treat the live frame as a projected, mirrored environment around the
      // object. Curved bevels and rotating sidewalls look in different directions.
      vec2 spherical = vec2(atan(ray.x, ray.z) / (2.0*PI), asin(clamp(ray.y,-1.0,1.0))/PI);
      vec2 mapped = screenUV + spherical * logoEnvironment;
      float footprint=max(length(dFdx(mapped)*resolution),length(dFdy(mapped)*resolution));
      float lod=max(roughness*7.0,log2(max(1.0,footprint)));
      // Move the hidden video through a finite black environment. Apply this
      // after the existing environment wrap so an off-screen source stays dark.
      vec2 sourceUV = (wrapVideo(mapped) - vec2(0.5) - reflectionOffset) / reflectionScale + vec2(0.5);
      vec3 reflected = textureLod(sourceFrame, clamp(sourceUV, 0.0, 1.0), lod).rgb;
      if (any(lessThan(sourceUV, vec2(0.0))) || any(greaterThan(sourceUV, vec2(1.0)))) reflected = vec3(0.0);
      return pow(max(reflected, 0.0), vec3(2.2));
    }
    vec3 studioLight(vec3 r, float roughness) {
      float blur = 0.025 + roughness * 0.25;
      float key = exp(-pow((r.x + 0.42) / (0.1 + blur), 2.0)) * smoothstep(-0.6, 0.6, r.y);
      float rim = exp(-pow((r.x - 0.7) / (0.045 + blur), 2.0)) * (0.4 + 0.6 * r.y*r.y);
      float top = pow(max(0.0,r.y), 10.0 / (0.3+roughness));
      return vec3(1.0,0.96,0.9)*key + vec3(0.65,0.8,1.0)*rim*0.85 + vec3(top)*0.7;
    }
    vec3 fresnel(vec3 f0, float cosine) { return f0 + (1.0 - f0) * pow(1.0-cosine,5.0); }
    vec3 specularLight(vec3 n, vec3 v, vec3 l, vec3 f0, float roughness) {
      vec3 h = normalize(v+l);
      float nv=max(dot(n,v),0.001), nl=max(dot(n,l),0.0), nh=max(dot(n,h),0.0), vh=max(dot(v,h),0.0);
      float a=max(0.035,roughness*roughness), a2=a*a;
      float denominator=nh*nh*(a2-1.0)+1.0;
      float distribution=a2/(PI*denominator*denominator);
      float visibility=0.5/(nl*sqrt(nv*nv*(1.0-a2)+a2)+nv*sqrt(nl*nl*(1.0-a2)+a2)+0.0001);
      return distribution * visibility * fresnel(f0,vh) * nl;
    }
    vec3 finish(vec3 value) {
      value *= logoExposure;
      value = clamp((value*(2.51*value+0.03))/(value*(2.43*value+0.59)+0.14),0.0,1.0);
      return pow(value,vec3(1.0/2.2));
    }
    vec4 renderObject(vec2 pixel) {
      float aspect=resolution.x/resolution.y, scale=max(0.01,logoScale*0.5);
      vec2 screenUV=pixel/resolution;
      vec3 centre=vec3((logoPosition-0.5)*vec2(aspect,1.0),0.0);
      vec3 camera=vec3(0.0,0.0,5.0);
      vec3 worldRay=normalize(vec3((screenUV-0.5)*vec2(aspect,1.0),-5.0));
      mat3 inverseRotation=transpose(logoRotation);
      vec3 ro=inverseRotation*(camera-centre)/scale, rd=inverseRotation*worldRay;
      if (logoFly == 1) {
        ro = logoCamera;
        vec2 screen = (screenUV - 0.5) * vec2(aspect, 1.0);
        float c=cos(logoOrientation), s=sin(logoOrientation);
        vec3 faceRay=vec3(c*screen.x+s*screen.y,-s*screen.x+c*screen.y,-1.5);
        float ca=cos(logoFlyAngle), sa=sin(logoFlyAngle);
        rd = normalize(vec3(ca*faceRay.x-sa*faceRay.z,faceRay.y,sa*faceRay.x+ca*faceRay.z));
        camera=logoRotation*ro*scale+centre;
      }
      vec3 bounds=vec3(logoAspect*0.5,0.5,logoDepth*0.5+logoSnake.x);
      vec3 safeRay=mix(vec3(0.000001),rd,greaterThan(abs(rd),vec3(0.000001)));
      vec3 a=(-bounds-ro)/safeRay, b=(bounds-ro)/safeRay;
      vec3 nearBounds=min(a,b), farBounds=max(a,b);
      float nearT=max(max(nearBounds.x,nearBounds.y),nearBounds.z);
      float farT=min(min(farBounds.x,farBounds.y),farBounds.z);
      if(farT<max(nearT,0.0)) return vec4(0.0);
      float epsilon=max(0.00012,0.3/(resolution.y*scale));
      float t=max(nearT,0.0), distance=1.0;
      int steps=logoQuality==0 ? 64 : logoQuality==1 ? 96 : 128;
      for(int i=0;i<128;i++) {
        if(i>=steps || t>farT) break;
        distance=shapeDistance(ro+rd*t);
        if(distance<epsilon) break;
        t+=max(distance*0.8,epsilon*0.4);
      }
      if(distance>=epsilon || t>farT) return vec4(0.0);
      vec3 local=ro+rd*t;
      vec3 n=normalize(logoRotation*shapeNormal(local,max(0.0007,epsilon*0.5)));
      vec3 world=logoRotation*local*scale+centre;
      vec3 v=normalize(camera-world), r=reflect(-v,n);
      float nv=max(dot(n,v),0.001);
      vec2 surfaceUV=vec2(local.x/logoAspect+0.5,local.y+0.5);
      vec3 pigment=pow(textureLod(logoTexture,clamp(surfaceUV,0.0,1.0),0.0).rgb,vec3(2.2));
      float roughness=clamp(logoRoughness,0.025,0.8), metal=1.0;
      vec3 f0=vec3(0.91,0.93,0.96), albedo=vec3(0.0);
      if(logoMaterial==1) f0=vec3(0.98);
      if(logoMaterial==2) { f0=vec3(0.8,0.83,0.88); roughness=max(roughness,0.26); }
      if(logoMaterial==3) f0=vec3(1.0,0.71,0.27);
      if(logoMaterial==4) f0=vec3(0.98,0.57,0.46);
      if(logoMaterial==5) f0=vec3(0.19,0.22,0.28);
      if(logoMaterial==6) { metal=0.0;f0=vec3(0.055);albedo=vec3(0.82,0.86,0.9); }
      if(logoMaterial==7) f0=0.5+0.45*cos(vec3(0.0,2.1,4.2)+nv*7.0+n.y*2.0);
      if(logoMaterial==8) { metal=0.0;f0=vec3(0.045);albedo=pigment; }
      vec3 reflected=videoLight(r,screenUV,roughness);
      float studioAmount=logoMaterial==1 ? 0.045 : 0.3;
      vec3 environment=(reflected*1.8*logoReflection+studioLight(r,roughness)*studioAmount)*(1.0+min(hit,1.5)*0.15+bass*0.03);
      vec3 result=environment*fresnel(f0,nv)*(1.0-roughness*0.3);
      vec3 key=normalize(vec3(-0.6,0.8,1.3)), fill=normalize(vec3(0.85,-0.15,0.6));
      float diffuse=0.22+max(dot(n,key),0.0)*0.55+max(dot(n,fill),0.0)*0.2;
      result+=albedo*(1.0-metal)*diffuse;
      result+=specularLight(n,v,key,f0,roughness)*vec3(0.8,0.88,1.0)*0.3;
      result+=specularLight(n,v,fill,f0,roughness)*vec3(1.0,0.8,0.65)*0.1;
      if(logoMaterial==6) result+=fresnel(vec3(0.12),nv)*studioLight(r,roughness*0.45)*0.8;
      // Darken concave bevel junctions slightly so depth reads against video.
      float cavity=clamp(1.0-max(0.0,logoBevel+textureLod(logoDistance,surfaceUV,0.0).r)*0.6,0.85,1.0);
      return vec4(finish(result*cavity),1.0);
    }
    void main() {
      vec4 sum=renderObject(gl_FragCoord.xy+(logoQuality>0 ? vec2(-0.25,-0.25) : vec2(0.0)));
      int samples=1;
      if(logoQuality>=1) { sum+=renderObject(gl_FragCoord.xy+vec2(0.25,0.25)); samples=2; }
      if(logoQuality>=2) { sum+=renderObject(gl_FragCoord.xy+vec2(-0.25,0.25));sum+=renderObject(gl_FragCoord.xy+vec2(0.25,-0.25));samples=4; }
      float alpha=sum.a/float(samples);
      if(alpha<=0.0) discard;
      colour=vec4(sum.rgb/max(sum.a,1.0),alpha);
    }`;

  class VfxEngine {
    constructor(canvas) {
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl2', { alpha: false, antialias: true, depth: false, powerPreference: 'high-performance' });
      if (!this.gl) throw new Error('WebGL 2 is unavailable');
      const gl = this.gl;
      this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const compileProgram = (fragment, vertexCode = vertex) => {
        const program = gl.createProgram();
        for (const [type, code] of [[gl.VERTEX_SHADER, vertexCode], [gl.FRAGMENT_SHADER, fragment]]) {
          const shader = gl.createShader(type);
          gl.shaderSource(shader, code);
          gl.compileShader(shader);
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader));
          gl.attachShader(program, shader);
          gl.deleteShader(shader);
        }
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
        return program;
      };
      this.effectProgram = compileProgram(effect);
      this.presentProgram = compileProgram(present);
      this.logoProgram = compileProgram(logoFragment);
      this.uniforms = Object.fromEntries(
        ['sourceFrame', 'previousFrame', 'shapeMask', 'motionMask', 'motionMode', 'motionStrength', 'resolution', 'point', 'shapeCenter', 'elapsed', 'rippleAge', 'bass', 'hit', 'intensity', 'feedback', 'mirrorDepth', 'mirrorEdge', 'shapeTilt', 'shapeThickness', 'shapeSpin', 'scene']
          .map(name => [name, gl.getUniformLocation(this.effectProgram, name)]));
      this.presentUniforms = {
        frame: gl.getUniformLocation(this.presentProgram, 'frame'),
        resolution: gl.getUniformLocation(this.presentProgram, 'resolution')
      };
      this.logoUniforms = Object.fromEntries(
        ['sourceFrame', 'logoTexture', 'logoDistance', 'resolution', 'logoPosition', 'logoScale', 'logoDepth', 'logoAspect', 'logoRotation', 'logoSnake', 'logoCamera', 'logoFly', 'logoFlyAngle', 'logoOrientation', 'logoBevel', 'logoRoughness', 'logoReflection', 'logoEnvironment', 'logoExposure', 'logoMaterial', 'logoQuality', 'reflectionOffset', 'reflectionScale', 'bass', 'hit']
          .map(name => [name, gl.getUniformLocation(this.logoProgram, name)]));
      this.fullscreenVao = gl.createVertexArray();
      gl.bindVertexArray(this.fullscreenVao);
      const makeTexture = () => {
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return texture;
      };
      this.source = makeTexture();
      this.maskTexture = makeTexture();
      this.motionTexture = makeTexture();
      this.reflectionTexture = makeTexture();
      this.motionFrame = null;
      this.setMotionMask({image: null, version: -1});
      this.logoTexture = makeTexture();
      this.logoDistance = makeTexture();
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.logoTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 0]));
      this.logo3d = { kind: 'logo', text: '@tonyt.dj', x: 0.5, y: 0.5, scale: 0.48, depth: 0.45,
        rotX: 0, rotY: -20, rotZ: 0, motion: 0.25, axis: 'y', startAngle: -45, endAngle: 45,
        skin: 'chrome', font: 'modern', bevel: 0.035, roughness: 0.14, reflection: 1, environment: 1, exposure: 1, quality: 'high' };
      this.logo3d.backdrop = 'video';
      this.logo3d.orientation = 'horizontal';
      this.logo3d.animation = normaliseAnimation();
      this.logo3d.snake = normaliseSnake(); this.logo3d.fly = normaliseFly();
      this.logo3d.animationClock = {time: 0, startedAt: Date.now(), playing: false};
      this.logoSurfaceReady = false;
      this.logoAspect = 1;
      const logoImage = new Image();
      logoImage.onload = () => {
        if (this.disposed) return;
        const logoCanvas = document.createElement('canvas');
        logoCanvas.width = 2092;
        logoCanvas.height = 336;
        logoCanvas.getContext('2d').drawImage(logoImage, 0, 20, 523, 84, 0, 0, 2092, 336);
        this.logoSource = logoCanvas;
        this.logoSources = {horizontal: logoCanvas};
        if (this.logo3d.kind === 'logo') this.renderLogoMark();
      };
      logoImage.src = '/assets/version1-hero.svg';
      this.textFontReady = false;
      const font = new FontFace('Version1 Bungee', 'url(/assets/Bungee-Regular.ttf)');
      font.load().then(loaded => {
        if (this.disposed) return;
        document.fonts.add(loaded);
        this.textFontReady = true;
        if (this.logo3d.kind === 'text' && this.logo3d.font === 'bungee') this.renderLogoText();
      }).catch(error => console.error('Version1 font unavailable:', error));
      this.maskCanvas = document.createElement('canvas');
      this.maskContext = this.maskCanvas.getContext('2d');
      this.shape = { kind: 'text', text: 'CLUB', x: 0.5, y: 0.5, scale: 0.7, depth: 1, edge: 0.7, tilt: 0, thickness: 0.8, spin: 0.3 };
      this.shapeImage = null;
      this.maskDirty = true;
      this.targets = [0, 1].map(() => ({ texture: makeTexture(), framebuffer: gl.createFramebuffer() }));
      this.previous = 0;
      this.rippleStart = -100;
      this.point = [0.5, 0.5];
    }

    dispose() {
      this.disposed = true;
      this.gl.getExtension('WEBGL_lose_context')?.loseContext();
    }

    setShape(shape) {
      const previousImage = this.shape.image;
      this.shape = { ...this.shape, ...shape };
      this.maskDirty = true;
      if (this.shape.kind !== 'image') {
        this.shapeImage = null;
        return;
      }
      if (this.shape.kind === 'image' && this.shape.image && (this.shape.image !== previousImage || !this.shapeImage)) {
        this.shapeImage = null;
        const requestedImage = this.shape.image;
        const image = new Image();
        image.onload = () => { if (this.shape.kind === 'image' && this.shape.image === requestedImage) { this.shapeImage = image; this.maskDirty = true; } };
        image.onerror = () => { if (this.shape.kind === 'image' && this.shape.image === requestedImage) { this.shapeImage = null; this.maskDirty = true; } };
        image.src = requestedImage;
      }
    }

    setLogo3d(settings = {}) {
      const previousKind = this.logo3d.kind;
      const previousText = this.logo3d.text;
      const previousFont = this.logo3d.font;
      const previousOrientation = this.logo3d.orientation;
      this.logo3d = { ...this.logo3d, ...settings };
      this.logo3d.backdrop = this.logo3d.backdrop === 'black' ? 'black' : 'video';
      this.logo3d.orientation = normaliseOrientation(this.logo3d.orientation);
      this.logo3d.animation = normaliseAnimation(this.logo3d.animation);
      this.logo3d.snake = normaliseSnake(this.logo3d.snake); this.logo3d.fly = normaliseFly(this.logo3d.fly);
      if (!['logo','text'].includes(this.logo3d.kind)) this.logo3d.kind = 'logo';
      if (!['x','y','z'].includes(this.logo3d.axis)) this.logo3d.axis = 'y';
      if (!materials.includes(this.logo3d.skin)) this.logo3d.skin = 'chrome';
      if (!['modern','bungee','serif'].includes(this.logo3d.font)) this.logo3d.font = 'modern';
      if (!['balanced','high','ultra'].includes(this.logo3d.quality)) this.logo3d.quality = 'high';
      for (const [key,min,max,fallback] of [['x',0,1,.5],['y',0,1,.5],['scale',.05,2,.48],['depth',.02,2,.45],
        ['rotX',-360,360,0],['rotY',-360,360,-20],['rotZ',-360,360,0],['motion',0,2,.25],['startAngle',-360,360,-45],['endAngle',-360,360,45],
        ['bevel',0,.1,.035],['roughness',.025,.8,.14],['reflection',0,2,1],['environment',0,2,1],['exposure',.3,2,1]]) {
        const value=Number(this.logo3d[key]);this.logo3d[key]=Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
      }
      if (this.logo3d.kind === 'text' && (previousKind !== 'text' || previousText !== this.logo3d.text || previousFont !== this.logo3d.font)) {
        if (this.logo3d.font !== 'bungee' || this.textFontReady) this.renderLogoText();
        else this.logoSurfaceReady = false;
      } else if (this.logo3d.kind === 'logo' && (previousKind !== 'logo' || previousOrientation !== this.logo3d.orientation)) {
        if (this.logoSource) this.renderLogoMark();
        else this.logoSurfaceReady = false;
      }
    }

    renderLogoMark() {
      const orientation = this.logo3d.orientation;
      this.logoSources[orientation] ||= uprightLogoSurface(this.logoSource, orientation);
      this.uploadLogoSurface(this.logoSources[orientation]);
    }

    renderLogoText() {
      const value = String(this.logo3d.text || '').slice(0, 80).trim();
      if (!value) { this.logoSurfaceReady = false; return; }
      const hasAt = value.startsWith('@');
      const handle = hasAt ? value.slice(1) : value;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      let fontSize = 560;
      const padding = 64;
      const family = this.logo3d.font === 'bungee' ? '"Version1 Bungee"'
        : this.logo3d.font === 'serif' ? 'Georgia, serif' : '"Avenir Next", Arial, sans-serif';
      const measure = () => {
        ctx.font = `900 ${fontSize}px ${family}`;
        return (hasAt ? ctx.measureText('@').width : 0) + ctx.measureText(handle).width;
      };
      let width = measure();
      const maxWidth = Math.min(this.maxTextureSize,4096) - padding * 2;
      if (width > maxWidth) { fontSize *= maxWidth / width; width = measure(); }
      canvas.width = Math.min(this.maxTextureSize,Math.ceil(width + padding * 2));
      canvas.height = 768;
      ctx.font = `900 ${fontSize}px ${family}`;
      ctx.textBaseline = 'middle';
      const x = padding, y = canvas.height / 2;
      if (hasAt) {
        ctx.fillStyle = '#e20d22';
        ctx.fillText('@', x, y);
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillText(handle, x + (hasAt ? ctx.measureText('@').width : 0), y);
      this.uploadLogoSurface(canvas);
    }

    uploadLogoSurface(canvas) {
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE3);
      gl.bindTexture(gl.TEXTURE_2D, this.logoTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      const width = canvas.width, height = canvas.height;
      const rgba = canvas.getContext("2d").getImageData(0, 0, width, height).data;
      const field = distanceField(width, height, rgba);
      const phases = letterPhases(width, height, rgba);
      // Smooth contour normals independently of the distance field. Subpixel
      // edge detail stays sharp while highlights do not reveal the texel grid.
      const packed = new Float32Array(field.length * 4);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const gx=field[y*width+Math.min(width-1,x+3)]-field[y*width+Math.max(0,x-3)];
        const gy=field[Math.max(0,y-3)*width+x]-field[Math.min(height-1,y+3)*width+x];
        const length=Math.hypot(gx,gy)||1, index=((height-y-1)*width+x)*4;
        packed[index]=field[y*width+x];packed[index+1]=gx/length;packed[index+2]=gy/length;packed[index+3]=phases[x];
      }
      gl.activeTexture(gl.TEXTURE4);
      gl.bindTexture(gl.TEXTURE_2D, this.logoDistance);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, width, height, 0, gl.RGBA, gl.FLOAT, packed);
      this.logoAspect = width / height;
      this.logoSurfaceReady = true;
    }

    updateMask(width, height) {
      const gl = this.gl;
      const canvas = this.maskCanvas;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        this.maskDirty = true;
      }
      if (!this.maskDirty) return;
      const ctx = this.maskContext;
      ctx.clearRect(0, 0, width, height);
      const shape = this.shape;
      const x = Math.max(0, Math.min(1, shape.x)) * width;
      const y = (1 - Math.max(0, Math.min(1, shape.y))) * height;
      if (shape.kind === 'image' && this.shapeImage?.complete && this.shapeImage.naturalWidth) {
        const aspect = this.shapeImage.naturalWidth / this.shapeImage.naturalHeight;
        const w = Math.min(width * shape.scale, height * shape.scale * aspect);
        const h = w / aspect;
        ctx.drawImage(this.shapeImage, x - w / 2, y - h / 2, w, h);
      } else if (shape.kind === 'text' && shape.text) {
        const text = String(shape.text).slice(0, 40);
        let fontSize = Math.max(12, height * shape.scale * 0.48);
        ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
        const measured = ctx.measureText(text).width;
        if (measured > width * 0.9) fontSize *= width * 0.9 / measured;
        ctx.font = `900 ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#fff';
        ctx.fillText(text, x, y);
      }
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      this.maskDirty = false;
    }

    pulse(x = Math.random() * 0.6 + 0.2, y = Math.random() * 0.6 + 0.2) {
      this.point = [x, y];
      this.rippleStart = performance.now() / 1000;
    }

    setReflectionSource(frame, independent = false) { this.reflectionFrame = frame; this.independentReflection = independent; }

    setMotionMask(frame) {
      if (this.motionFrame?.image === frame.image && this.motionFrame?.version === frame.version) return;
      const gl = this.gl;
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, this.motionTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      if (frame.image) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame.image);
      else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      this.motionFrame = {...frame};
    }

    resize(width, height) {
      const gl = this.gl;
      if (this.targetWidth === width && this.targetHeight === height && this.canvas.width === width && this.canvas.height === height) return;
      this.canvas.width = width;
      this.canvas.height = height;
      for (const target of this.targets) {
        gl.bindTexture(gl.TEXTURE_2D, target.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('VFX framebuffer incomplete');
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      this.previous = 0;
      this.targetWidth = width; this.targetHeight = height;
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    render(source, state, size = source) {
      if (!source.width || !source.height) return;
      const width = Math.max(1, Math.min(this.maxTextureSize, Math.round(size.width)));
      const height = Math.max(1, Math.min(this.maxTextureSize, Math.round(size.height)));
      this.resize(width, height);
      this.updateMask(width, height);
      const gl = this.gl;
      const now = Number.isFinite(state.elapsedSeconds) ? state.elapsedSeconds : performance.now() / 1000;
      gl.viewport(0, 0, width, height);
      gl.bindVertexArray(this.fullscreenVao);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.source);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, logoEnabled(state) ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
      if (logoEnabled(state)) gl.generateMipmap(gl.TEXTURE_2D);
      if (logoEnabled(state) && this.independentReflection) {
        gl.activeTexture(gl.TEXTURE6); gl.bindTexture(gl.TEXTURE_2D, this.reflectionTexture);
        if (this.reflectionFrame) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.reflectionFrame);
        else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0,0,0,255]));
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.generateMipmap(gl.TEXTURE_2D);
      }
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      const next = 1 - this.previous;
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.targets[next].framebuffer);
      gl.useProgram(this.effectProgram);
      gl.uniform1i(this.uniforms.sourceFrame, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.targets[this.previous].texture);
      gl.uniform1i(this.uniforms.previousFrame, 1);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.maskTexture);
      gl.uniform1i(this.uniforms.shapeMask, 2);
      gl.activeTexture(gl.TEXTURE5);
      gl.bindTexture(gl.TEXTURE_2D, this.motionTexture);
      gl.uniform1i(this.uniforms.motionMask, 5);
      gl.uniform1i(this.uniforms.motionMode, {video: 0, glow: 1, distort: 2}[state.motion?.mode] ?? 0);
      gl.uniform1f(this.uniforms.motionStrength, state.motion?.strength ?? 1);
      gl.uniform2f(this.uniforms.resolution, width, height);
      gl.uniform2f(this.uniforms.point, this.point[0], this.point[1]);
      gl.uniform2f(this.uniforms.shapeCenter, this.shape.x, this.shape.y);
      gl.uniform1f(this.uniforms.elapsed, now);
      gl.uniform1f(this.uniforms.rippleAge, Math.max(0, now - this.rippleStart));
      gl.uniform1f(this.uniforms.bass, state.bass || 0);
      gl.uniform1f(this.uniforms.hit, state.hit || 0);
      gl.uniform1f(this.uniforms.intensity, state.intensity);
      gl.uniform1f(this.uniforms.feedback, state.feedback);
      gl.uniform1f(this.uniforms.mirrorDepth, this.shape.depth);
      gl.uniform1f(this.uniforms.mirrorEdge, this.shape.edge);
      gl.uniform1f(this.uniforms.shapeTilt, this.shape.tilt);
      gl.uniform1f(this.uniforms.shapeThickness, this.shape.thickness);
      gl.uniform1f(this.uniforms.shapeSpin, this.shape.spin);
      gl.uniform1i(this.uniforms.scene, baseEnabled(state) && state.scene !== 6 ? state.scene : -1);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.useProgram(this.presentProgram);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.targets[next].texture);
      gl.uniform1i(this.presentUniforms.frame, 0);
      gl.uniform2f(this.presentUniforms.resolution, width, height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (logoOnly(state) && this.logo3d.backdrop === 'black') {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
      if (logoEnabled(state) && this.logoSurfaceReady) {
        const u = this.logoUniforms;
        const sample = sampleAnimation(this.logo3d, animationSeconds(this.logo3d));
        const dynamics = sampleLogoDynamics(this.logo3d, animationSeconds(this.logo3d), this.logoAspect, width / height);
        let logo = sample.pose;
        const rotation = rotationMatrix(logo, animationSeconds(this.logo3d));
        if (!dynamics.flyEnabled && (size.fitObject || this.logo3d.animation.enabled || this.logo3d.orientation !== 'horizontal') && this.logo3d.animation.keepInside) {
          const fit = fitAnimatedPose({...logo, depth: logo.depth + dynamics.amplitude * 2}, rotation, this.logoAspect, width / height);
          logo = {...fit, depth: logo.depth};
        }
        this.lastObjectPose = logo;
        this.lastAnimationSample = sample;
        this.lastLogoDynamics = dynamics;
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(this.logoProgram);
        gl.activeTexture(this.independentReflection ? gl.TEXTURE6 : gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.independentReflection ? this.reflectionTexture : this.source);
        gl.uniform1i(u.sourceFrame, this.independentReflection ? 6 : 0);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_2D, this.logoTexture);
        gl.uniform1i(u.logoTexture, 3);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_2D, this.logoDistance);
        gl.uniform1i(u.logoDistance, 4);
        gl.uniform2f(u.resolution, width, height);
        gl.uniform2f(u.logoPosition, logo.x, logo.y);
        gl.uniform1f(u.logoScale, logo.scale);
        gl.uniform2f(u.reflectionOffset, sample.sourceX, 0);
        gl.uniform1f(u.reflectionScale, sample.sourceScale);
        gl.uniform1f(u.logoDepth, logo.depth);
        gl.uniform1f(u.logoAspect, this.logoAspect);
        gl.uniform3f(u.logoSnake, dynamics.amplitude, dynamics.phase, dynamics.wavelength);
        gl.uniform3f(u.logoCamera, dynamics.cameraOriginX, dynamics.cameraOriginY, dynamics.cameraDistance);
        gl.uniform1i(u.logoFly, dynamics.flyEnabled ? 1 : 0);
        gl.uniform1f(u.logoFlyAngle, dynamics.cameraAngle);
        gl.uniform1f(u.logoOrientation, logo.orientation === 'top-bottom' ? -Math.PI/2 : logo.orientation === 'bottom-top' ? Math.PI/2 : 0);
        gl.uniform1f(u.logoBevel, logo.bevel);
        gl.uniform1f(u.logoRoughness, logo.roughness);
        gl.uniform1f(u.logoReflection, logo.reflection);
        gl.uniform1f(u.logoEnvironment, logo.environment);
        gl.uniform1f(u.logoExposure, logo.exposure);
        gl.uniform1f(u.bass, state.bass || 0);
        gl.uniform1f(u.hit, state.hit || 0);
        gl.uniform1i(u.logoMaterial, Math.max(0,materials.indexOf(logo.skin)));
        gl.uniform1i(u.logoQuality, {balanced:0, high:1, ultra:2}[logo.quality] ?? 1);
        gl.uniformMatrix3fv(u.logoRotation,false,rotation);
        const bounds=dynamics.flyEnabled ? [0,0,width,height] : objectScissor({...logo,depth:logo.depth+dynamics.amplitude*2},rotation,this.logoAspect,width,height);
        gl.enable(gl.SCISSOR_TEST);gl.scissor(...bounds);
        gl.bindVertexArray(this.fullscreenVao);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.disable(gl.SCISSOR_TEST);
        gl.disable(gl.BLEND);
        gl.bindVertexArray(this.fullscreenVao);
      }
      this.previous = next;
    }
  }
  VfxEngine.CONTROL_VERSION = 16;
  VfxEngine.distanceField = distanceField;
  VfxEngine.logoEnabled = logoEnabled;
  VfxEngine.baseEnabled = baseEnabled;
  VfxEngine.logoOnly = logoOnly;
  VfxEngine.rotationMatrix = rotationMatrix;
  VfxEngine.materials = Object.freeze(materials);
  VfxEngine.normaliseOrientation = normaliseOrientation;
  VfxEngine.normaliseAnimation = normaliseAnimation;
  VfxEngine.normaliseSnake = normaliseSnake;
  VfxEngine.normaliseFly = normaliseFly;
  VfxEngine.sampleLogoDynamics = sampleLogoDynamics;
  VfxEngine.letterPhases = letterPhases;
  VfxEngine.sampleAnimation = sampleAnimation;
  VfxEngine.animationSeconds = animationSeconds;
  VfxEngine.motionPaths = Object.freeze(motionPaths);
  VfxEngine.projectedBounds = projectedBounds;
  VfxEngine.fitAnimatedPose = fitAnimatedPose;
  window.VfxEngine = VfxEngine;
})();
