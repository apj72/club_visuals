/* Shared video transition renderer for the player, recordings, and clean output. */
(() => {
  const definitions = [
    ['cut', 'Cut', 'Classic', 'Instant replacement', 'canvas'],
    ['fade-in', 'Fade In', 'Classic', 'Reveal from black', 'canvas'],
    ['fade-out', 'Fade Out/In', 'Classic', 'Pass through black', 'canvas'],
    ['cross-dissolve', 'Cross Dissolve', 'Classic', 'Blend the two clips', 'canvas'],
    ['wipe', 'Wipe', 'Classic', 'Sweep the old clip away', 'canvas'],
    ['zoom-spin', 'Zoom / Spin', 'Motion', 'Zoom and rotate the old frame', 'canvas'],
    ['whip-pan', 'Whip Pan', 'Motion', 'Fast blurred lateral sweep', 'canvas'],
    ['pixel-scatter', 'Pixel Scatter', 'Digital', 'Shuffled blocks clear to the next clip', 'canvas'],
    ['data-tear', 'Data Tear', 'Digital', 'Displaced scan strips and colour edges', 'canvas'],
    ['iris-burst', 'Iris Burst', 'Geometry', 'Circular reveal from the centre', 'canvas'],
    ['shutters', 'Shutters', 'Geometry', 'Horizontal strips collapse', 'canvas'],
    ['rgb-split', 'RGB Split', 'Digital', 'Separate and recombine colour channels', 'shader'],
    ['infinite-zoom', 'Infinite Zoom', 'Motion', 'Rush through the source into the next clip', 'shader'],
    ['neon-shockwave', 'Neon Shockwave', 'Light', 'A luminous expanding ring reveals the target', 'shader'],
    ['digital-glitch', 'Digital Glitch', 'Glitch and Digital', 'Displaced horizontal and vertical fragments reveal the next clip', 'shader'],
    ['datamosh', 'Datamosh', 'Glitch and Digital', 'Codec-style motion blocks smear between clips (shader simulation)', 'shader'],
    ['pixel-explosion', 'Pixel Explosion', 'Glitch and Digital', 'Small blocks burst outward before the target reforms (shader simulation)', 'shader'],
    ['scanline-interference', 'Scanline Interference', 'Glitch and Digital', 'CRT scanlines progressively replace the source', 'shader'],
    ['digital-signal-loss', 'Digital Signal Loss', 'Glitch and Digital', 'Static, sync drift, and colour interference settle on the target', 'shader'],
    ['pixel-sorting', 'Pixel Sorting', 'Glitch and Digital', 'Luminance-directed colour streaks flow into the target (shader simulation)', 'shader'],
    ['block-corruption', 'Block Corruption', 'Glitch and Digital', 'Rectangular blocks flicker and shift to reveal the target', 'shader'],
    ['kaleidoscope-morph', 'Kaleidoscope Morph', 'Psychedelic', 'Mirrored rotating segments resolve into the next clip', 'shader'],
    ['spiral-vortex', 'Spiral Vortex', 'Psychedelic', 'A twisting vortex pulls the old image into the new', 'shader'],
    ['liquid-morph', 'Liquid Morph', 'Psychedelic', 'Flowing distortions melt the two clips together (shader simulation)', 'shader'],
    ['fractal-dissolve', 'Fractal Dissolve', 'Psychedelic', 'Layered fractal noise traces the reveal', 'shader'],
    ['psychedelic-tunnel', 'Psychedelic Tunnel', 'Psychedelic', 'Repeating perspective patterns rush into the next clip', 'shader'],
    ['mandala-rotation', 'Mandala Rotation', 'Psychedelic', 'Symmetric petals rotate and unfold', 'shader'],
    ['mirror-shatter', 'Mirror Shatter', 'Psychedelic', 'Mirrored facets pivot apart and reassemble (shader simulation)', 'shader'],
    ['waveform-warp', 'Waveform Warp', 'Psychedelic', 'Oscillating bands bend the outgoing scene', 'shader'],
    ['white-flash', 'White Flash', 'Light', 'A short white burst reveals the next clip', 'shader'],
    ['laser-sweep', 'Laser Sweep', 'Light', 'Bright sweeping lines expose the incoming image', 'shader'],
    ['electric-arc', 'Electric Arc', 'Light', 'Branching electrical paths tear across the frame', 'shader'],
    ['strobe-cut', 'Strobe Cut', 'Light', 'Alternating cuts settle on the incoming clip', 'shader'],
    ['energy-burst', 'Energy Burst', 'Light', 'A coloured radial blast opens onto the target', 'shader'],
    ['light-leak', 'Light Leak', 'Light', 'Coloured light floods inward from the edges', 'shader'],
    ['plasma-dissolve', 'Plasma Dissolve', 'Light', 'Glowing plasma clouds consume the source', 'shader'],
    ['hexagonal-mosaic', 'Hexagonal Mosaic', 'Geometry and Motion', 'Hexagonal cells turn over to reveal the target', 'shader'],
    ['geometric-shatter', 'Geometric Shatter', 'Geometry and Motion', 'Polygon fragments fly apart (shader simulation)', 'shader'],
    ['cube-rotation', '3D Cube Rotation', 'Geometry and Motion', 'Perspective cube faces turn from source to target', 'shader'],
    ['radial-slice', 'Radial Slice', 'Geometry and Motion', 'Rotating wedges replace the picture', 'shader'],
    ['tunnel-warp', 'Tunnel Warp', 'Geometry and Motion', 'Perspective bending rushes into the next shot', 'shader'],
    ['particle-disintegration', 'Particle Disintegration', 'Geometry and Motion', 'Fine image fragments drift away (shader simulation)', 'shader'],
    ['motion-blur-whip', 'Motion Blur Whip', 'Geometry and Motion', 'A heavy blurred sideways sweep lands on the next shot', 'shader'],
    ['smoke-dissolve', 'Smoke Dissolve', 'Organic and Atmospheric', 'Billowing noise conceals the old image (shader simulation)', 'shader'],
    ['ink-in-water', 'Ink in Water', 'Organic and Atmospheric', 'Dark branching ink tendrils spread through the image (shader simulation)', 'shader'],
    ['fluid-ripple', 'Fluid Ripple', 'Organic and Atmospheric', 'Concentric liquid waves uncover the next clip', 'shader'],
    ['fire-burn', 'Fire Burn', 'Organic and Atmospheric', 'A noisy flame edge burns away the source', 'shader'],
    ['ice-crystallisation', 'Ice Crystallisation', 'Organic and Atmospheric', 'Angular frost patterns grow across the frame (shader simulation)', 'shader'],
    ['sandstorm', 'Sandstorm', 'Organic and Atmospheric', 'Granular wind strips the old image away (shader simulation)', 'shader'],
    ['liquid-chrome', 'Liquid Chrome', 'Organic and Atmospheric', 'Reflective silver ripples flow into the target', 'shader'],
    ['organic-cell-division', 'Organic Cell Division', 'Organic and Atmospheric', 'Soft expanding cells merge into the new image', 'shader'],
    ['reality-fracture', 'Reality Fracture', 'Experimental', 'Offset spatial planes display fragments of both clips', 'shader'],
    ['time-echo', 'Time Echo', 'Experimental', 'Multiple delayed image echoes converge on the target', 'shader'],
    ['chromatic-implosion', 'Chromatic Implosion', 'Experimental', 'Separated colour channels collapse and burst outward', 'shader'],
    ['neural-network-morph', 'Neural Network Morph', 'Experimental', 'A luminous node mesh grows over the transition', 'shader'],
    ['holographic-breakdown', 'Holographic Breakdown', 'Experimental', 'A translucent scan image destabilises and rebuilds', 'shader'],
    ['gravity-well', 'Gravity Well', 'Experimental', 'A dark lens pulls the source inward and releases the target', 'shader'],
    ['quantum-tiles', 'Quantum Tiles', 'Experimental', 'Dense tiles reorder to reconstruct the next scene (shader simulation)', 'shader'],
    ['spectral-frequency-shift', 'Spectral Frequency Shift', 'Experimental', 'Oscillating luminous frequency bands reform as the target', 'shader'],
    ['dimensional-portal', 'Dimensional Portal', 'Experimental', 'An expanding luminous portal opens onto the next clip', 'shader'],
    ['bass-impact-distortion', 'Bass Impact Distortion', 'Experimental', 'A heavy radial shockwave reveals the target on impact', 'shader'],
  ];
  const PARAMETER_RULES = {
    'rgb-split': {
      intensity: { type: 'number', min: 0, max: 1, default: 0.6 },
      direction: { type: 'choice', values: ['horizontal', 'vertical'], default: 'horizontal' },
    },
    'infinite-zoom': {
      intensity: { type: 'number', min: 0, max: 1, default: 0.7 },
      centerX: { type: 'number', min: 0, max: 1, default: 0.5 },
      centerY: { type: 'number', min: 0, max: 1, default: 0.5 },
    },
    'neon-shockwave': {
      intensity: { type: 'number', min: 0, max: 1, default: 0.65 },
      centerX: { type: 'number', min: 0, max: 1, default: 0.5 },
      centerY: { type: 'number', min: 0, max: 1, default: 0.5 },
      color: { type: 'color', default: '#52f5d0' },
    },
  };
  const standardIntensity = { type: 'number', min: 0, max: 1, default: 0.65 };
  const standardCenter = { type: 'number', min: 0, max: 1, default: 0.5 };
  const standardColor = { type: 'color', default: '#52f5d0' };
  const radialEffects = new Set(['spiral-vortex', 'mandala-rotation', 'energy-burst', 'radial-slice',
    'tunnel-warp', 'fluid-ripple', 'gravity-well', 'dimensional-portal', 'bass-impact-distortion',
    'chromatic-implosion', 'psychedelic-tunnel', 'kaleidoscope-morph']);
  const colouredEffects = new Set(['white-flash', 'laser-sweep', 'electric-arc', 'energy-burst', 'light-leak',
    'plasma-dissolve', 'fire-burn', 'ice-crystallisation', 'liquid-chrome', 'neural-network-morph',
    'holographic-breakdown', 'spectral-frequency-shift', 'dimensional-portal', 'bass-impact-distortion']);
  const directionalEffects = new Set(['digital-glitch', 'scanline-interference', 'pixel-sorting',
    'laser-sweep', 'light-leak', 'motion-blur-whip', 'sandstorm', 'waveform-warp']);
  for (const [id, , , , kind] of definitions) {
    if (kind !== 'shader' || PARAMETER_RULES[id]) continue;
    PARAMETER_RULES[id] = { intensity: standardIntensity };
    if (radialEffects.has(id)) Object.assign(PARAMETER_RULES[id], { centerX: standardCenter, centerY: standardCenter });
    if (colouredEffects.has(id)) PARAMETER_RULES[id].color = standardColor;
    if (directionalEffects.has(id)) PARAMETER_RULES[id].direction = { type: 'choice',
      values: ['horizontal', 'vertical'], default: 'horizontal' };
  }
  for (const [id, color] of Object.entries({ 'white-flash': '#ffffff', 'fire-burn': '#ff6b18',
    'ice-crystallisation': '#b8edff', 'liquid-chrome': '#d9e4ef', 'electric-arc': '#8bbaff',
    'plasma-dissolve': '#c445ff', 'light-leak': '#ff6d8a', 'energy-burst': '#ffb13b',
    'dimensional-portal': '#a274ff', 'bass-impact-distortion': '#ff6d3d',
    'neural-network-morph': '#72ffe1' })) {
    PARAMETER_RULES[id].color = { type: 'color', default: color };
  }
  const flashEffects = new Set(['white-flash', 'strobe-cut', 'digital-signal-loss']);
  const contrastEffects = new Set(['neon-shockwave', 'laser-sweep', 'electric-arc', 'energy-burst',
    'plasma-dissolve', 'fire-burn', 'holographic-breakdown', 'bass-impact-distortion']);
  const CATALOGUE = Object.freeze(Object.fromEntries(definitions.map(([id, name, category, description, implementationKind]) =>
    [id, Object.freeze({ id, name, category, description, implementationKind,
      supportedParameters: Object.keys(PARAMETER_RULES[id] || {}),
      parameterDefinitions: PARAMETER_RULES[id] || {},
      defaultParameters: Object.fromEntries(Object.entries(PARAMETER_RULES[id] || {}).map(([key, rule]) => [key, rule.default])),
      safetyTags: flashEffects.has(id) ? ['flash', 'high-contrast'] : contrastEffects.has(id) ? ['high-contrast'] : [] })])));
  window.TRANSITION_CATALOGUE = CATALOGUE;
  const TYPES = new Set(Object.keys(CATALOGUE));
  const GPU_TYPES = new Set(definitions.filter(item => item[4] === 'shader').map(item => item[0]));
  const GPU_EFFECT_IDS = new Map([...GPU_TYPES].map((id, index) => [id, index + 1]));
  const PACES = new Set(['steady', 'accelerate', 'decelerate', 'ease']);
  const clamp = value => Math.max(0, Math.min(1, value));
  const reduceFlashesKey = 'clubVisualsReduceFlashes';
  window.getTransitionReduceFlashes = () => {
    try { return localStorage.getItem(reduceFlashesKey) !== 'false'; }
    catch { return true; }
  };
  window.setTransitionReduceFlashes = enabled => {
    try { localStorage.setItem(reduceFlashesKey, enabled ? 'true' : 'false'); } catch {}
  };
  function normaliseParameters(type, input) {
    const params = {};
    for (const [key, rule] of Object.entries(PARAMETER_RULES[type] || {})) {
      const value = input?.[key];
      if (rule.type === 'number') {
        const number = Number(value);
        params[key] = value === undefined || value === null || value === '' || !Number.isFinite(number)
          ? rule.default : Math.min(rule.max, Math.max(rule.min, number));
      } else if (rule.type === 'choice') params[key] = rule.values.includes(value) ? value : rule.default;
      else params[key] = typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value.toLowerCase() : rule.default;
    }
    return params;
  }
  const randomAt = index => {
    const value = Math.sin((index + 1) * 127.1 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  };
  const shapedProgress = (progress, pace) => {
    if (pace === 'accelerate') return progress * progress;
    if (pace === 'decelerate') return 1 - (1 - progress) * (1 - progress);
    if (pace === 'ease') return progress * progress * (3 - 2 * progress);
    return progress;
  };

  window.normaliseTransition = value => {
    const type = TYPES.has(value?.type) ? value.type : 'cut';
    const duration = Math.min(10, Math.max(0.15, Number(value?.duration) || 0.8));
    const pace = PACES.has(value?.pace) ? value.pace : 'steady';
    const seedValue = value?.seed == null || value.seed === '' ? NaN : Number(value.seed);
    const seed = Number.isInteger(seedValue) && seedValue >= 0 && seedValue <= 4294967295 ? seedValue : 1;
    return { type, duration, pace, seed, params: normaliseParameters(type, value?.params),
      reduceFlashes: window.getTransitionReduceFlashes() };
  };

  const GPU_VERTEX = `#version 300 es
    void main() {
      vec2 position = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
      gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
    }`;
  const GPU_FRAGMENT = `#version 300 es
    precision highp float;
    uniform sampler2D fromTexture, toTexture;
    uniform vec2 resolution, center, direction;
    uniform vec3 accent;
    uniform float progress, intensity, seed, flashLimit;
    uniform int effect;
    out vec4 colour;
    const float PI = 3.14159265359;
    float hash21(vec2 p) { return fract(sin(dot(p + seed * 0.001, vec2(127.1, 311.7))) * 43758.5453); }
    float noise2(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
        mix(hash21(i + vec2(0.0, 1.0)), hash21(i + 1.0), f.x), f.y);
    }
    float fbm(vec2 p) { return noise2(p) * 0.57 + noise2(p * 2.03) * 0.29 + noise2(p * 4.07) * 0.14; }
    vec2 turn(vec2 p, float angle) { float c = cos(angle), s = sin(angle); return mat2(c, -s, s, c) * p; }
    vec4 oldAt(vec2 uv) { return texture(fromTexture, clamp(uv, 0.0, 1.0)); }
    vec4 newAt(vec2 uv) { return texture(toTexture, clamp(uv, 0.0, 1.0)); }
    void main() {
      vec2 uv = gl_FragCoord.xy / resolution;
      if (progress <= 0.0) { colour = texture(fromTexture, uv); return; }
      if (progress >= 1.0) { colour = texture(toTexture, uv); return; }
      if (effect == 1) {
        float amount = sin(PI * progress) * intensity * 0.042;
        vec2 offset = direction * amount;
        vec3 a = vec3(texture(fromTexture, clamp(uv + offset, 0.0, 1.0)).r,
          texture(fromTexture, uv).g, texture(fromTexture, clamp(uv - offset, 0.0, 1.0)).b);
        vec3 b = vec3(texture(toTexture, clamp(uv - offset, 0.0, 1.0)).r,
          texture(toTexture, uv).g, texture(toTexture, clamp(uv + offset, 0.0, 1.0)).b);
        colour = vec4(mix(a, b, smoothstep(0.22, 0.78, progress)), 1.0);
      } else if (effect == 2) {
        float zoomA = exp2(progress * (1.0 + intensity * 4.0));
        float zoomB = exp2((1.0 - progress) * (0.8 + intensity * 3.2));
        vec2 oldUV = clamp(center + (uv - center) / zoomA, 0.0, 1.0);
        vec2 newUV = clamp(center + (uv - center) * zoomB, 0.0, 1.0);
        vec4 oldFrame = texture(fromTexture, oldUV);
        vec4 newFrame = texture(toTexture, newUV);
        colour = mix(oldFrame, newFrame, smoothstep(0.34, 0.68, progress));
      } else if (effect == 3) {
        vec2 aspect = vec2(resolution.x / resolution.y, 1.0);
        vec2 delta = (uv - center) * aspect;
        float distanceFromCenter = length(delta);
        float corner = max(max(length((vec2(0.0, 0.0) - center) * aspect),
          length((vec2(1.0, 0.0) - center) * aspect)),
          max(length((vec2(0.0, 1.0) - center) * aspect), length((vec2(1.0, 1.0) - center) * aspect)));
        float wave = sin(atan(delta.y, delta.x) * 9.0 + seed * 0.17) * 0.015 * intensity;
        float edge = distanceFromCenter - (progress * corner + wave * sin(PI * progress));
        float width = 0.025 + intensity * 0.025;
        float reveal = 1.0 - smoothstep(-width, width, edge);
        float ring = exp(-pow(edge / max(width, 0.001), 2.0));
        vec2 warped = clamp(uv + normalize(delta + vec2(0.0001)) * ring * intensity * 0.018, 0.0, 1.0);
        vec3 mixed = mix(texture(fromTexture, warped).rgb, texture(toTexture, uv).rgb, reveal);
        colour = vec4(min(mixed + accent * ring * intensity * flashLimit, vec3(1.0)), 1.0);
      } else {
        float p = progress, power = intensity;
        vec2 d = uv - center, aspect = vec2(resolution.x / resolution.y, 1.0);
        float radius = length(d * aspect), angle = atan(d.y * aspect.y, d.x * aspect.x);
        vec2 ua = uv, ub = uv;
        float mask = p, glow = 0.0, dark = 0.0, metallic = 0.0;
        if (effect == 4) { // Digital Glitch
          vec2 block = floor(uv * vec2(22.0, 30.0));
          float hit = hash21(vec2(block.y, floor(p * 18.0)));
          ua += direction * (hit - 0.5) * 0.28 * power * sin(PI * p);
          ub -= direction * (hit - 0.5) * 0.15 * power * sin(PI * p);
          mask = smoothstep(-0.08, 0.08, p - hash21(block));
          glow = step(0.91, hit) * 0.2 * sin(PI * p);
        } else if (effect == 5) { // Datamosh-like displaced motion blocks
          vec2 block = floor(uv * vec2(18.0, 12.0));
          vec2 motion = vec2(hash21(block), hash21(block + 19.0)) - 0.5;
          ua += motion * power * p * 0.27;
          ub -= motion * power * (1.0 - p) * 0.18;
          mask = smoothstep(0.0, 0.28, p - hash21(block + 3.0) * 0.52);
        } else if (effect == 6) { // Pixel Explosion
          vec2 grid = vec2(78.0, 46.0), block = floor(uv * grid);
          vec2 drift = (vec2(hash21(block), hash21(block + 27.0)) - 0.5) * 0.52 * power;
          ua -= drift * p * p;
          ub += drift * (1.0 - p) * (1.0 - p);
          mask = smoothstep(-0.08, 0.08, p - hash21(block + 7.0));
        } else if (effect == 7) { // Scanline Interference
          float axis = direction.x > 0.5 ? uv.y : uv.x;
          float pixels = direction.x > 0.5 ? resolution.y : resolution.x;
          float line = sin(axis * pixels * 0.74 + p * 44.0);
          ua += direction * line * 0.009 * power * sin(PI * p);
          mask = smoothstep(-0.05, 0.05, p - axis - line * 0.025 * power);
          dark = (1.0 - step(0.0, line)) * 0.21 * power * sin(PI * p);
        } else if (effect == 8) { // Digital Signal Loss
          float phase = flashLimit < 0.3 ? 0.0 : floor(p * 21.0);
          float staticNoise = hash21(floor(uv * resolution * 0.5) + phase);
          ua.x += (hash21(vec2(floor(uv.y * 52.0), phase)) - 0.5) * 0.17 * power;
          mask = smoothstep(-0.16, 0.16, p - staticNoise);
          dark = (1.0 - staticNoise) * 0.28 * power * sin(PI * p);
          glow = staticNoise * 0.13 * sin(PI * p);
        } else if (effect == 9) { // Pixel Sorting-like streaks
          vec3 src = oldAt(uv).rgb;
          float luminance = dot(src, vec3(0.21, 0.72, 0.07));
          float streak = hash21(floor(uv * vec2(100.0, 12.0)));
          ua += direction * (luminance - 0.5) * 0.32 * power * sin(PI * p);
          ub -= direction * (streak - 0.5) * 0.22 * power * sin(PI * p);
          mask = smoothstep(-0.1, 0.1, p - (streak * 0.6 + luminance * 0.4));
        } else if (effect == 10) { // Block Corruption
          vec2 block = floor(uv * vec2(16.0, 10.0));
          float h = hash21(block + floor(p * 16.0));
          ua += (vec2(h, hash21(block + 9.0)) - 0.5) * 0.19 * power * sin(PI * p);
          mask = smoothstep(-0.04, 0.04, p - hash21(block));
          glow = step(0.9, h) * 0.1 * sin(PI * p);
        } else if (effect == 11) { // Kaleidoscope Morph
          float segments = 8.0;
          float theta = abs(mod(angle + p * power * PI, 2.0 * PI / segments) - PI / segments);
          vec2 folded = vec2(cos(theta), sin(theta)) * radius / aspect;
          ua = center + folded;
          ub = center + turn(folded, (1.0 - p) * 0.4 * power);
          mask = smoothstep(0.21, 0.79, p + sin(angle * segments) * 0.07 * power);
        } else if (effect == 12) { // Spiral Vortex
          float twist = power * sin(PI * p) * 5.0 / (1.0 + radius * 5.0);
          ua = center + turn(d, twist);
          ub = center + turn(d, -twist * 0.8);
          mask = smoothstep(0.12, 0.88, p + (0.33 - radius) * 0.55);
        } else if (effect == 13) { // Liquid Morph
          float n = fbm(uv * 8.0 + vec2(p * 2.0, -p));
          vec2 flow = vec2(fbm(uv * 7.0 + p * 3.0), fbm(uv * 7.0 - p * 3.0 + 12.0)) - 0.5;
          ua += flow * 0.20 * power * sin(PI * p);
          ub -= flow * 0.17 * power * sin(PI * p);
          mask = smoothstep(-0.16, 0.16, p - n);
        } else if (effect == 14) { // Fractal Dissolve
          float fractal = fbm(uv * 13.0) * 0.7 + fbm(uv * 31.0) * 0.3;
          mask = smoothstep(-0.11, 0.11, p - fractal);
          glow = exp(-pow((p - fractal) * 20.0, 2.0)) * 0.18 * power;
        } else if (effect == 15) { // Psychedelic Tunnel
          float tunnel = fract(log(max(radius, 0.006)) * 1.9 - p * (1.5 + power * 3.0));
          ua = center + normalize(d + 0.0001) * tunnel * 0.72;
          ub = center + normalize(d + 0.0001) * fract(tunnel + 0.5) * 0.72;
          mask = smoothstep(0.22, 0.77, p + sin(angle * 10.0) * 0.05);
          glow = (1.0 - smoothstep(0.0, 0.07, tunnel)) * 0.15 * power * sin(PI * p);
        } else if (effect == 16) { // Mandala Rotation
          float petal = abs(mod(angle + p * PI * power, PI / 4.0) - PI / 8.0);
          vec2 folded = vec2(cos(petal), sin(petal)) * radius / aspect;
          ua = center + turn(folded, p * PI * power);
          ub = center + turn(folded, -(1.0 - p) * PI * power);
          mask = smoothstep(0.16, 0.84, p + cos(angle * 16.0) * 0.08);
        } else if (effect == 17) { // Mirror Shatter
          vec2 grid = vec2(10.0, 7.0), tile = floor(uv * grid), local = fract(uv * grid) - 0.5;
          float h = hash21(tile), rotation = (h - 0.5) * PI * power * sin(PI * p);
          ua = (tile + turn(local, rotation) + 0.5) / grid;
          ub = (tile + turn(local, -rotation) + 0.5) / grid;
          mask = smoothstep(-0.1, 0.1, p - h);
          dark = step(0.47, abs(local.x)) * 0.25 * sin(PI * p);
        } else if (effect == 18) { // Waveform Warp
          float wave = sin(uv.y * 31.0 + p * 19.0) * sin(PI * p) * power * 0.065;
          ua += direction * wave;
          ub -= direction * wave * 0.7;
          mask = smoothstep(0.15, 0.85, p + wave * 2.0);
        } else if (effect == 19) { // White Flash
          mask = smoothstep(0.38, 0.62, p);
          glow = exp(-pow((p - 0.5) * 12.0, 2.0)) * (flashLimit < 0.3 ? 0.5 : 1.8) * power;
        } else if (effect == 20) { // Laser Sweep
          float sweep = dot(uv, normalize(direction + vec2(0.18))) / 1.2;
          float edge = p - sweep;
          mask = smoothstep(-0.02, 0.02, edge);
          glow = exp(-pow(edge * 38.0, 2.0)) * 0.75 * power;
        } else if (effect == 21) { // Electric Arc
          float arc = uv.x - (p * 1.3 - 0.15 + (fbm(vec2(uv.y * 25.0, p * 4.0)) - 0.5) * 0.23 * power);
          mask = smoothstep(-0.055, 0.055, -arc);
          glow = exp(-pow(arc * 45.0, 2.0)) * (0.35 + 0.3 * hash21(floor(uv * 35.0))) * power;
        } else if (effect == 22) { // Strobe Cut
          float chops = 5.0 + floor(power * 8.0);
          float chopped = floor(p * chops) / max(1.0, chops - 1.0);
          mask = flashLimit < 0.3 ? smoothstep(0.1 + power * 0.25, 0.9 - power * 0.25, p)
            : mix(step(0.5, fract(chopped * 5.0)), 1.0, smoothstep(0.62, 1.0, p));
          glow = flashLimit < 0.3 ? 0.0 : (1.0 - abs(fract(p * chops) * 2.0 - 1.0)) * 0.12 * power;
        } else if (effect == 23) { // Energy Burst
          float rays = pow(max(0.0, cos(angle * 13.0 + p * 3.0)), 9.0);
          float edge = radius - p * (0.83 + rays * 0.26 * power);
          mask = 1.0 - smoothstep(-0.04, 0.04, edge);
          ua += normalize(d + 0.0001) * sin(PI * p) * 0.055 * power;
          glow = (exp(-pow(edge * 27.0, 2.0)) * 0.8 + rays * sin(PI * p) * 0.55) * power;
        } else if (effect == 24) { // Light Leak
          float leak = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
          leak += dot(uv - 0.5, direction) * 0.12 * power;
          mask = smoothstep(-0.08, 0.08, p - leak * 1.85);
          glow = exp(-pow((p - leak * 1.85) * 12.0, 2.0)) * 0.8 * power;
        } else if (effect == 25) { // Plasma Dissolve
          float plasma = fbm(uv * 8.0 + vec2(p * 3.0, -p * 2.0));
          plasma += 0.14 * sin(uv.x * 25.0 + p * 8.0) * sin(uv.y * 20.0 - p * 7.0);
          mask = smoothstep(-0.1, 0.1, p - plasma);
          glow = exp(-pow((p - plasma) * 18.0, 2.0)) * 0.75 * power;
        } else if (effect == 26) { // Hexagonal Mosaic
          vec2 hex = uv * vec2(10.0 + power * 12.0, 8.0 + power * 10.0);
          hex.x -= floor(hex.y) * 0.5;
          vec2 tile = floor(hex);
          float h = hash21(tile);
          vec2 local = fract(hex) - 0.5;
          float boundary = max(abs(local.x) * 0.87 + abs(local.y) * 0.5, abs(local.y));
          mask = smoothstep(-0.08, 0.08, p - h);
          dark = step(0.47, boundary) * 0.36 * power * sin(PI * p);
        } else if (effect == 27) { // Geometric Shatter
          vec2 tile = floor(uv * vec2(12.0, 8.0));
          vec2 local = fract(uv * vec2(12.0, 8.0));
          float diagonal = step(local.x, local.y);
          float h = hash21(tile + diagonal * vec2(31.0, 17.0));
          vec2 shift = normalize(vec2(h - 0.5, hash21(tile + 7.0) - 0.5) + 0.001);
          ua -= shift * p * p * 0.25 * power;
          ub += shift * (1.0 - p) * (1.0 - p) * 0.18 * power;
          mask = smoothstep(-0.08, 0.08, p - h);
          dark = exp(-abs(local.x - local.y) * 70.0) * 0.27 * sin(PI * p);
        } else if (effect == 28) { // 3D Cube Rotation
          float theta = p * PI * 0.5;
          float seam = 0.5 + 0.5 * (cos(theta) - sin(theta));
          mask = step(seam, uv.x);
          ua.x = uv.x / max(seam, 0.001);
          ub.x = (uv.x - seam) / max(1.0 - seam, 0.001);
          ua.y = 0.5 + (uv.y - 0.5) * (1.0 + sin(theta) * (1.0 - ua.x) * 0.22 * power);
          ub.y = 0.5 + (uv.y - 0.5) * (1.0 + cos(theta) * ub.x * 0.22 * power);
          dark = mix(sin(theta), cos(theta), mask) * 0.26 * power;
          dark += exp(-pow((uv.x - seam) * 45.0, 2.0)) * 0.25 * sin(PI * p);
        } else if (effect == 29) { // Radial Slice
          float wedge = fract((angle + PI) / (2.0 * PI) * 12.0);
          mask = smoothstep(-0.09, 0.09, p - wedge);
          ua = center + turn(d, p * power * 0.5);
          ub = center + turn(d, -(1.0 - p) * power * 0.5);
        } else if (effect == 30) { // Tunnel Warp
          float pull = sin(PI * p) * power;
          ua = center + d / (1.0 + pull * 4.0 / (radius + 0.24));
          ub = center + d * (1.0 + pull * 1.2);
          mask = smoothstep(0.25, 0.75, p + (0.3 - radius) * 0.5);
        } else if (effect == 31) { // Particle Disintegration
          vec2 grid = vec2(105.0, 62.0), tile = floor(uv * grid);
          float h = hash21(tile);
          vec2 drift = vec2(hash21(tile + 14.0) - 0.5, h - 0.5);
          ua -= drift * p * p * 0.35 * power;
          mask = smoothstep(-0.09, 0.09, p - h);
        } else if (effect == 32) { // Motion Blur Whip
          float velocity = sin(PI * p) * (0.25 + power * 0.6);
          ua -= direction * p * p * 1.4;
          ub += direction * (1.0 - p) * (1.0 - p) * 1.4;
          mask = smoothstep(0.35, 0.65, p);
          vec3 blurredA = vec3(0.0), blurredB = vec3(0.0);
          for (int k = -2; k <= 2; k++) {
            blurredA += oldAt(ua + direction * float(k) * velocity * 0.12).rgb * 0.2;
            blurredB += newAt(ub + direction * float(k) * velocity * 0.12).rgb * 0.2;
          }
          colour = vec4(mix(blurredA, blurredB, mask), 1.0);
          return;
        } else if (effect == 33) { // Smoke Dissolve
          float n = fbm(uv * 8.0 + vec2(p * 2.0, -p));
          float smoke = fbm(uv * 5.0 + vec2(p * 1.4, -p * 3.0));
          mask = smoothstep(-0.13, 0.13, p - smoke);
          ua += vec2(smoke - 0.5, n - 0.5) * 0.11 * power * sin(PI * p);
          dark = exp(-pow((p - smoke) * 8.0, 2.0)) * 0.32 * power;
        } else if (effect == 34) { // Ink in Water
          float tendril = radius + sin(angle * 9.0 + p * 5.0) * 0.08 * power
            + (fbm(uv * 11.0 - p * 2.0) - 0.5) * 0.14;
          mask = 1.0 - smoothstep(-0.045, 0.045, tendril - p * 0.95);
          dark = exp(-pow((tendril - p * 0.95) * 15.0, 2.0)) * 0.6 * power;
        } else if (effect == 35) { // Fluid Ripple
          float ring = sin(radius * 55.0 - p * 28.0) * sin(PI * p) * 0.028 * power;
          ua += normalize(d + 0.0001) * ring;
          ub -= normalize(d + 0.0001) * ring * 0.7;
          mask = smoothstep(-0.07, 0.07, p - radius * 1.25);
          glow = abs(ring) * 2.5;
        } else if (effect == 36) { // Fire Burn
          float flame = uv.y + (fbm(uv * vec2(18.0, 8.0) + vec2(0.0, p * 5.0)) - 0.5) * 0.32 * power;
          mask = smoothstep(-0.045, 0.045, p - flame);
          glow = exp(-pow((p - flame) * 19.0, 2.0)) * 0.9 * power;
          dark = exp(-pow((p - flame - 0.055) * 16.0, 2.0)) * 0.33;
        } else if (effect == 37) { // Ice Crystallisation
          vec2 crystal = abs(fract(uv * vec2(20.0, 13.0)) - 0.5);
          float frost = length(uv - vec2(0.0, 1.0)) * 0.55 + max(crystal.x, crystal.y) * 0.2;
          frost += (fbm(uv * 24.0) - 0.5) * 0.17 * power;
          mask = 1.0 - smoothstep(-0.045, 0.045, frost - p);
          glow = exp(-pow((p - frost) * 21.0, 2.0)) * 0.35 * power;
        } else if (effect == 38) { // Sandstorm
          float grain = hash21(floor(uv * resolution * 0.32) + floor(p * 24.0));
          float wind = dot(uv, normalize(direction + vec2(0.08))) * 0.9;
          ua += direction * grain * 0.27 * power * p;
          mask = smoothstep(-0.14, 0.14, p - wind - (grain - 0.5) * 0.26);
          dark = grain * 0.24 * power * sin(PI * p);
        } else if (effect == 39) { // Liquid Chrome
          float n = fbm(uv * 8.0 + vec2(p * 2.0, -p));
          vec2 flow = vec2(sin(uv.y * 29.0 + p * 12.0), cos(uv.x * 26.0 - p * 10.0));
          ua += flow * 0.05 * power * sin(PI * p);
          ub -= flow * 0.05 * power * sin(PI * p);
          mask = smoothstep(-0.16, 0.16, p - n);
          metallic = 0.55 * power * sin(PI * p);
          glow = abs(flow.x * flow.y) * 0.16 * power * sin(PI * p);
        } else if (effect == 40) { // Organic Cell Division
          vec2 grid = uv * vec2(7.0 + power * 7.0, 5.0 + power * 4.0), base = floor(grid);
          float nearest = 2.0;
          for (int x = -1; x <= 1; x++) for (int y = -1; y <= 1; y++) {
            vec2 cellPoint = base + vec2(float(x), float(y));
            vec2 point = cellPoint + vec2(hash21(cellPoint), hash21(cellPoint + 23.0));
            nearest = min(nearest, length(grid - point));
          }
          mask = 1.0 - smoothstep(-0.08, 0.08, nearest - p * 1.5);
          dark = exp(-pow((nearest - p * 1.5) * 9.0, 2.0)) * 0.18;
        } else if (effect == 41) { // Reality Fracture
          vec2 grid = floor(uv * vec2(9.0, 6.0));
          float h = hash21(grid), split = sin(PI * p) * power;
          ua += (vec2(h, hash21(grid + 7.0)) - 0.5) * split * 0.22;
          ub -= (vec2(h, hash21(grid + 13.0)) - 0.5) * split * 0.18;
          mask = smoothstep(-0.12, 0.12, p - h);
          dark = step(0.48, max(fract(uv.x * 9.0), fract(uv.y * 6.0))) * 0.22 * split;
        } else if (effect == 42) { // Time Echo
          float drift = sin(PI * p) * 0.15 * power;
          vec3 echoA = oldAt(uv - direction * drift).rgb * 0.55
            + oldAt(uv - direction * drift * 0.55).rgb * 0.3 + oldAt(uv).rgb * 0.15;
          vec3 echoB = newAt(uv + direction * drift).rgb * 0.55
            + newAt(uv + direction * drift * 0.55).rgb * 0.3 + newAt(uv).rgb * 0.15;
          colour = vec4(mix(echoA, echoB, smoothstep(0.18, 0.82, p)), 1.0);
          return;
        } else if (effect == 43) { // Chromatic Implosion
          float collapse = sin(PI * p) * power;
          ua = center + d * (1.0 - collapse * 0.82);
          ub = center + d * (1.0 + collapse * 1.3);
          vec2 split = normalize(d + 0.0001) * collapse * 0.045;
          vec3 a = vec3(oldAt(ua + split).r, oldAt(ua).g, oldAt(ua - split).b);
          vec3 b = vec3(newAt(ub - split).r, newAt(ub).g, newAt(ub + split).b);
          colour = vec4(mix(a, b, smoothstep(0.38, 0.62, p)), 1.0);
          return;
        } else if (effect == 44) { // Neural Network Morph
          vec2 grid = uv * vec2(20.0, 12.0), local = fract(grid) - 0.5;
          float node = exp(-dot(local, local) * 65.0);
          float link = max(exp(-abs(local.y) * 38.0), exp(-abs(local.x) * 38.0))
            * step(0.24, hash21(floor(grid)));
          mask = smoothstep(-0.14, 0.14, p - hash21(floor(grid)));
          glow = (node * 1.6 + link * 0.75) * power * sin(PI * p);
        } else if (effect == 45) { // Holographic Breakdown
          float scan = sin(uv.y * resolution.y * 0.65 + p * 34.0);
          float jitter = hash21(vec2(floor(uv.y * 38.0), floor(p * 16.0)));
          ua.x += (jitter - 0.5) * 0.1 * power * sin(PI * p);
          mask = smoothstep(0.1, 0.9, p + scan * 0.08 * power);
          dark = (1.0 - step(0.0, scan)) * 0.32 * sin(PI * p);
          glow = step(0.9, jitter) * 0.23 * power * sin(PI * p);
        } else if (effect == 46) { // Gravity Well
          float lens = power * sin(PI * p) * 0.33 / (radius + 0.19);
          ua = center + d / (1.0 + lens);
          ub = center + d * (1.0 + lens * 0.5);
          mask = smoothstep(0.28, 0.72, p + (0.2 - radius) * 0.4);
          dark = exp(-radius * 14.0) * power * sin(PI * p) * 0.8;
        } else if (effect == 47) { // Quantum Tiles
          vec2 grid = vec2(70.0, 42.0), tile = floor(uv * grid), local = fract(uv * grid);
          vec2 swap = vec2(hash21(tile + floor(p * 12.0)), hash21(tile + 19.0 + floor(p * 12.0))) - 0.5;
          ua = (tile + local + swap * sin(PI * p) * 5.0 * power) / grid;
          ub = (tile + local - swap * sin(PI * p) * 5.0 * power) / grid;
          mask = smoothstep(-0.06, 0.06, p - hash21(tile));
        } else if (effect == 48) { // Spectral Frequency Shift
          float band = sin(uv.y * 44.0 + p * 20.0) * sin(PI * p);
          ua.x += band * 0.1 * power;
          ub.x -= band * 0.08 * power;
          mask = smoothstep(0.12, 0.88, p + band * 0.11);
          glow = abs(band) * 0.26 * power;
        } else if (effect == 49) { // Dimensional Portal
          float portal = length(d * aspect * vec2(1.35, 0.84));
          float edge = portal - p * 0.94;
          mask = 1.0 - smoothstep(-0.024, 0.024, edge);
          ub = center + turn(d, (1.0 - p) * 1.4 * power) * (1.0 + sin(PI * p) * 0.4 * power);
          glow = (exp(-pow(edge * 32.0, 2.0)) * 1.1
            + exp(-pow((edge + 0.055) * 34.0, 2.0)) * 0.45) * power;
        } else if (effect == 50) { // Bass Impact Distortion
          float wave = p * 0.95, edge = radius - wave;
          float shock = exp(-pow(edge * 29.0, 2.0)) * power;
          ua += normalize(d + 0.0001) * shock * 0.09;
          ub -= normalize(d + 0.0001) * shock * 0.06;
          mask = 1.0 - smoothstep(-0.05, 0.05, edge);
          glow = shock * 0.75 + exp(-pow((edge + 0.1) * 31.0, 2.0)) * 0.5 * power;
        }
        vec3 mixed = mix(oldAt(ua).rgb, newAt(ub).rgb, clamp(mask, 0.0, 1.0));
        mixed *= 1.0 - clamp(dark, 0.0, 0.9);
        float luminance = dot(mixed, vec3(0.22, 0.71, 0.07));
        mixed = mix(mixed, mix(vec3(luminance), accent, 0.25) * 1.5, metallic);
        colour = vec4(clamp(mixed + accent * glow * flashLimit, 0.0, 1.0), 1.0);
      }
    }`;

  function createGpuRenderer() {
    const canvas = document.createElement('canvas');
    let gl;
    try { gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: true }); }
    catch { gl = null; }
    if (!gl) return { canvas, available: false, reason: 'WebGL2 is unavailable. Using Cross Dissolve.' };
    function compile(kind, source) {
      const shader = gl.createShader(kind);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed');
      return shader;
    }
    let program, fromTexture, toTexture;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl.VERTEX_SHADER, GPU_VERTEX));
      gl.attachShader(program, compile(gl.FRAGMENT_SHADER, GPU_FRAGMENT));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Shader link failed');
      gl.bindVertexArray(gl.createVertexArray());
      fromTexture = gl.createTexture();
      toTexture = gl.createTexture();
      for (const texture of [fromTexture, toTexture]) {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }
    } catch (error) {
      return { canvas, available: false, reason: 'GPU transition could not start: ' + error.message + '. Using Cross Dissolve.' };
    }
    let available = true;
    canvas.addEventListener('webglcontextlost', event => { event.preventDefault(); available = false; });
    const locations = Object.fromEntries(['fromTexture', 'toTexture', 'resolution', 'center', 'direction',
      'accent', 'progress', 'intensity', 'seed', 'flashLimit', 'effect']
      .map(name => [name, gl.getUniformLocation(program, name)]));
    function upload(texture, unit, frame) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, frame);
    }
    return {
      canvas,
      get available() { return available; },
      get reason() { return available ? '' : 'WebGL2 context was lost. Using Cross Dissolve.'; },
      render(fromFrame, toFrame, value, progress, width, height) {
        if (!available || !fromFrame || !toFrame) return false;
        const settings = window.normaliseTransition(value);
        if (!GPU_TYPES.has(settings.type)) return false;
        const targetWidth = Math.max(1, Math.round(width));
        const targetHeight = Math.max(1, Math.round(height));
        if (canvas.width !== targetWidth) canvas.width = targetWidth;
        if (canvas.height !== targetHeight) canvas.height = targetHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.useProgram(program);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        try {
          upload(fromTexture, 0, fromFrame);
          upload(toTexture, 1, toFrame);
        } catch { return false; }
        gl.uniform1i(locations.fromTexture, 0);
        gl.uniform1i(locations.toTexture, 1);
        gl.uniform2f(locations.resolution, canvas.width, canvas.height);
        const params = settings.params;
        gl.uniform2f(locations.center, params.centerX ?? 0.5, 1 - (params.centerY ?? 0.5));
        gl.uniform2f(locations.direction, params.direction === 'vertical' ? 0 : 1, params.direction === 'vertical' ? 1 : 0);
        const color = params.color || '#52f5d0';
        gl.uniform3f(locations.accent, parseInt(color.slice(1, 3), 16) / 255,
          parseInt(color.slice(3, 5), 16) / 255, parseInt(color.slice(5, 7), 16) / 255);
        gl.uniform1f(locations.progress, clamp(progress));
        gl.uniform1f(locations.intensity, params.intensity ?? 0.7);
        gl.uniform1f(locations.seed, settings.seed);
        gl.uniform1f(locations.flashLimit, settings.reduceFlashes ? 0.2 : 0.65);
        gl.uniform1i(locations.effect, GPU_EFFECT_IDS.get(settings.type));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return true;
      },
    };
  }

  window.createTransitionFrameRenderer = () => {
    const gpu = createGpuRenderer();
    const fallback = document.createElement('canvas');
    let renderFailure = '';
    return {
      get gpuAvailable() { return gpu.available; },
      get fallbackReason() { return gpu.reason || renderFailure; },
      render(fromFrame, toFrame, value, progress, width, height) {
        const settings = window.normaliseTransition(value);
        if (GPU_TYPES.has(settings.type) && gpu.available) {
          if (gpu.render(fromFrame, toFrame, settings, progress, width, height)) {
            renderFailure = '';
            return gpu.canvas;
          }
          renderFailure = 'GPU frame could not be rendered. Using Cross Dissolve.';
        }
        fallback.width = Math.max(1, Math.round(width));
        fallback.height = Math.max(1, Math.round(height));
        const context = fallback.getContext('2d');
        context.drawImage(fromFrame, 0, 0, fallback.width, fallback.height);
        context.globalAlpha = clamp(progress);
        context.drawImage(toFrame, 0, 0, fallback.width, fallback.height);
        context.globalAlpha = 1;
        return fallback;
      },
    };
  };

  window.createTransitionController = (stage, capture, captureIncoming = capture) => {
    const overlay = document.createElement('canvas');
    overlay.className = 'transition-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    Object.assign(overlay.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      maxHeight: 'none', zIndex: '9', pointerEvents: 'none',
      objectFit: 'fill', background: 'transparent', display: 'none',
    });
    stage.appendChild(overlay);
    const ctx = overlay.getContext('2d');
    let gpu = null, gpuActive = false, fallbackReason = '';
    let frame = null, settings = null, startTime = 0, raf = 0, progress = 0, tileOrder = [], onComplete = null;

    function ensureGpu() {
      if (!gpu) {
        gpu = createGpuRenderer();
        Object.assign(gpu.canvas.style, {
          position: 'absolute', inset: '0', width: '100%', height: '100%', maxHeight: 'none',
          zIndex: '9', pointerEvents: 'none', display: 'none',
        });
        stage.appendChild(gpu.canvas);
      }
      return gpu.available;
    }

    function renderGpu(value) {
      if (!gpuActive || !gpu?.available) return false;
      const incoming = captureIncoming() || frame;
      return gpu.render(frame, incoming, settings, shapedProgress(value, settings.pace),
        gpu.canvas.width, gpu.canvas.height);
    }

    function clear() {
      cancelAnimationFrame(raf);
      raf = 0;
      frame = null;
      settings = null;
      onComplete = null;
      tileOrder = [];
      gpuActive = false;
      overlay.style.display = 'none';
      if (gpu) gpu.canvas.style.display = 'none';
      ctx.clearRect(0, 0, overlay.width, overlay.height);
    }

    function paint(target, width, height, rawProgress) {
      if (!settings) return;
      const p = shapedProgress(rawProgress, settings.pace);
      const type = settings.type;
      const old = frame;
      target.save();
      if (type === 'fade-in') {
        target.fillStyle = `rgba(0,0,0,${1 - p})`;
        target.fillRect(0, 0, width, height);
      } else if (type === 'fade-out') {
        if (old && p < 0.5) target.drawImage(old, 0, 0, width, height);
        target.fillStyle = `rgba(0,0,0,${p < 0.5 ? p * 2 : (1 - p) * 2})`;
        target.fillRect(0, 0, width, height);
      } else if (old) {
        if (type === 'cross-dissolve') {
          target.globalAlpha = 1 - p;
          target.drawImage(old, 0, 0, width, height);
        } else if (type === 'wipe') {
          target.beginPath();
          target.rect(width * p, 0, width * (1 - p), height);
          target.clip();
          target.drawImage(old, 0, 0, width, height);
        } else if (type === 'zoom-spin') {
          target.globalAlpha = 1 - p;
          target.translate(width / 2, height / 2);
          target.rotate(p * Math.PI);
          const scale = 1 + p * 1.25;
          target.scale(scale, scale);
          target.drawImage(old, -width / 2, -height / 2, width, height);
        } else if (type === 'whip-pan') {
          const travel = p * p * (3 - 2 * p);
          target.filter = `blur(${Math.round(24 * Math.sin(Math.PI * p))}px)`;
          target.drawImage(old, -width * travel, 0, width, height);
        } else if (type === 'pixel-scatter') {
          const columns = 18, rows = 10;
          const cellW = width / columns, cellH = height / rows;
          const sourceW = old.width / columns, sourceH = old.height / rows;
          for (let index = 0; index < columns * rows; index++) {
            const x = index % columns, y = Math.floor(index / columns);
            const start = tileOrder[index] / (columns * rows) * 0.78;
            const local = clamp((p - start) / 0.22);
            if (local >= 1) continue;
            const drift = local * local;
            target.globalAlpha = 1 - local;
            target.drawImage(old, x * sourceW, y * sourceH, sourceW, sourceH,
              x * cellW + (randomAt(index + 400) - 0.5) * cellW * 2.6 * drift,
              y * cellH + (randomAt(index + 800) - 0.5) * cellH * 2.6 * drift,
              cellW, cellH);
          }
        } else if (type === 'data-tear') {
          const strips = 24, stripH = height / strips, sourceH = old.height / strips;
          for (let index = 0; index < strips; index++) {
            const start = randomAt(index + 1000) * 0.68;
            const local = clamp((p - start) / 0.32);
            if (local >= 1) continue;
            const shift = Math.sin(index * 19 + Math.floor(p * 18) * 11) * width * 0.12 * Math.sin(Math.PI * local);
            target.globalAlpha = 1 - local;
            target.drawImage(old, 0, index * sourceH, old.width, sourceH,
              shift, index * stripH, width, stripH);
            if (local > 0 && local < 1) {
              target.globalAlpha = (1 - local) * 0.3;
              target.fillStyle = index % 2 ? '#ff315f' : '#30e9ff';
              target.fillRect(shift < 0 ? width + shift : 0, index * stripH,
                Math.min(Math.abs(shift), width), stripH);
            }
          }
        } else if (type === 'iris-burst') {
          const radius = Math.hypot(width / 2, height / 2) * p;
          target.beginPath();
          target.rect(0, 0, width, height);
          target.moveTo(width / 2 + radius, height / 2);
          target.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
          target.clip('evenodd');
          target.drawImage(old, 0, 0, width, height);
        } else if (type === 'shutters') {
          const strips = 12, stripH = height / strips, sourceH = old.height / strips;
          for (let index = 0; index < strips; index++) {
            const start = (index % 2 ? strips - 1 - index : index) / strips * 0.18;
            const local = clamp((p - start) / 0.82);
            if (local >= 1) continue;
            const remaining = (1 - local) * stripH;
            const sourceRemaining = (1 - local) * sourceH;
            target.drawImage(old, 0, index * sourceH + (sourceH - sourceRemaining) / 2,
              old.width, sourceRemaining, 0, index * stripH + (stripH - remaining) / 2,
              width, remaining);
          }
        }
      }
      target.restore();
    }

    function tick(now) {
      if (!settings || !startTime) return;
      progress = clamp((now - startTime) / (settings.duration * 1000));
      if (gpuActive) {
        if (!renderGpu(progress)) {
          gpuActive = false;
          fallbackReason = gpu?.reason || 'GPU frame could not be rendered. Using Cross Dissolve.';
          settings.type = 'cross-dissolve';
          gpu.canvas.style.display = 'none';
          overlay.style.display = 'block';
        }
      }
      if (!gpuActive) {
        ctx.clearRect(0, 0, overlay.width, overlay.height);
        paint(ctx, overlay.width, overlay.height, progress);
      }
      if (progress < 1) raf = requestAnimationFrame(tick);
      else {
        const complete = onComplete;
        clear();
        if (complete) complete();
      }
    }

    return {
      prepare(value) {
        clear();
        settings = window.normaliseTransition(value);
        fallbackReason = '';
        if (settings.type === 'cut') { settings = null; return false; }
        if (settings.type !== 'fade-in') {
          frame = capture();
          if (!frame && settings.type !== 'fade-out') { settings = null; return false; }
        }
        if (settings.type === 'pixel-scatter') {
          tileOrder = Array.from({ length: 180 }, (_, index) => index);
          for (let index = tileOrder.length - 1; index > 0; index--) {
            const other = Math.floor(randomAt(index + 2000) * (index + 1));
            [tileOrder[index], tileOrder[other]] = [tileOrder[other], tileOrder[index]];
          }
        }
        const rect = stage.getBoundingClientRect();
        const scale = Math.min(devicePixelRatio || 1, 2, 1920 / Math.max(1, rect.width));
        overlay.width = Math.max(1, Math.round(rect.width * scale));
        overlay.height = Math.max(1, Math.round(rect.height * scale));
        if (GPU_TYPES.has(settings.type)) {
          if (ensureGpu()) {
            gpuActive = true;
            gpu.canvas.style.display = 'block';
            if (!gpu.render(frame, frame, settings, 0, overlay.width, overlay.height)) {
              gpuActive = false;
              fallbackReason = 'GPU frame could not be rendered. Using Cross Dissolve.';
            }
          } else fallbackReason = gpu.reason;
          if (!gpuActive) {
            gpu.canvas.style.display = 'none';
            settings.type = 'cross-dissolve';
          }
        }
        if (!gpuActive) {
          overlay.style.display = 'block';
          paint(ctx, overlay.width, overlay.height, 0);
        }
        return true;
      },
      start(complete) {
        if (!settings) return;
        onComplete = typeof complete === 'function' ? complete : null;
        startTime = performance.now();
        raf = requestAnimationFrame(tick);
      },
      draw(target, width, height) {
        if (!settings) return;
        if (gpuActive) target.drawImage(gpu.canvas, 0, 0, width, height);
        else paint(target, width, height, progress);
      },
      getFallbackReason: () => fallbackReason,
      getBackend: () => gpuActive ? 'webgl2' : 'canvas',
      cancel: clear,
    };
  };
})();
