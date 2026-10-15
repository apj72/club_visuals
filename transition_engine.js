/* Shared video transition renderer for the player, recordings, and clean output. */
(() => {
  const TYPES = new Set(['cut', 'fade-in', 'fade-out', 'cross-dissolve', 'wipe', 'zoom-spin', 'whip-pan',
    'pixel-scatter', 'data-tear', 'iris-burst', 'shutters']);
  const PACES = new Set(['steady', 'accelerate', 'decelerate', 'ease']);
  const clamp = value => Math.max(0, Math.min(1, value));
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
    return { type, duration, pace };
  };

  window.createTransitionController = (stage, capture) => {
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
    let frame = null, settings = null, startTime = 0, raf = 0, progress = 0, tileOrder = [];

    function clear() {
      cancelAnimationFrame(raf);
      raf = 0;
      frame = null;
      settings = null;
      tileOrder = [];
      overlay.style.display = 'none';
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
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      paint(ctx, overlay.width, overlay.height, progress);
      if (progress < 1) raf = requestAnimationFrame(tick);
      else clear();
    }

    return {
      prepare(value) {
        clear();
        settings = window.normaliseTransition(value);
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
        overlay.style.display = 'block';
        paint(ctx, overlay.width, overlay.height, 0);
        return true;
      },
      start() {
        if (!settings) return;
        startTime = performance.now();
        raf = requestAnimationFrame(tick);
      },
      draw(target, width, height) {
        if (settings) paint(target, width, height, progress);
      },
      cancel: clear,
    };
  };
})();
