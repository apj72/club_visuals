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
  const CATALOGUE = Object.freeze(Object.fromEntries(definitions.map(([id, name, category, description, implementationKind]) =>
    [id, Object.freeze({ id, name, category, description, implementationKind,
      supportedParameters: Object.keys(PARAMETER_RULES[id] || {}),
      parameterDefinitions: PARAMETER_RULES[id] || {},
      defaultParameters: Object.fromEntries(Object.entries(PARAMETER_RULES[id] || {}).map(([key, rule]) => [key, rule.default])),
      safetyTags: id === 'neon-shockwave' ? ['high-contrast'] : [] })])));
  window.TRANSITION_CATALOGUE = CATALOGUE;
  const TYPES = new Set(Object.keys(CATALOGUE));
  const GPU_TYPES = new Set(definitions.filter(item => item[4] === 'shader').map(item => item[0]));
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
      } else {
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
        gl.uniform1i(locations.effect, settings.type === 'rgb-split' ? 1 : settings.type === 'infinite-zoom' ? 2 : 3);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        return true;
      },
    };
  }

  window.createTransitionFrameRenderer = () => {
    const gpu = createGpuRenderer();
    const fallback = document.createElement('canvas');
    return {
      get gpuAvailable() { return gpu.available; },
      get fallbackReason() { return gpu.reason; },
      render(fromFrame, toFrame, value, progress, width, height) {
        const settings = window.normaliseTransition(value);
        if (GPU_TYPES.has(settings.type) && gpu.available
          && gpu.render(fromFrame, toFrame, settings, progress, width, height)) return gpu.canvas;
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
          if (!gpuActive) settings.type = 'cross-dissolve';
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
