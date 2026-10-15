/* Shared video transition renderer for the player, recordings, and clean output. */
(() => {
  const TYPES = new Set(['cut', 'fade-in', 'fade-out', 'cross-dissolve', 'wipe', 'zoom-spin', 'whip-pan']);

  window.normaliseTransition = value => {
    const type = TYPES.has(value?.type) ? value.type : 'cut';
    const duration = Math.min(5, Math.max(0.15, Number(value?.duration) || 0.8));
    return { type, duration };
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
    let frame = null, settings = null, startTime = 0, raf = 0, progress = 0;

    function clear() {
      cancelAnimationFrame(raf);
      raf = 0;
      frame = null;
      settings = null;
      overlay.style.display = 'none';
      ctx.clearRect(0, 0, overlay.width, overlay.height);
    }

    function paint(target, width, height, p) {
      if (!settings) return;
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
        }
      }
      target.restore();
    }

    function tick(now) {
      if (!settings || !startTime) return;
      progress = Math.min(1, (now - startTime) / (settings.duration * 1000));
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
