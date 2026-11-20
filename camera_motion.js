/* Live frame differencing. Camera pixels stay in the capturing browser; only
   the small movement mask is shared with the selected Mac render. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.CameraMotion = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const number = (v, fallback, min, max) => Number.isFinite(v) ? Math.max(min, Math.min(max, v)) : fallback;
  function settings(value = {}) {
    value = value && typeof value === 'object' ? value : {};
    return {mode: ['video', 'glow', 'distort'].includes(value.mode) ? value.mode : 'video',
      threshold: number(value.threshold, .08, .01, .5), gain: number(value.gain, 4, 1, 12),
      delay: number(value.delay, .2, .05, 2), trails: number(value.trails, .4, 0, 3),
      strength: number(value.strength, 1, 0, 2), mirror: value.mirror !== false,
      compensate: value.compensate !== false};
  }
  class Processor {
    constructor(width = 160, height = 90) {
      this.width = width; this.height = height;
      this.mask = new Uint8ClampedArray(width * height * 4);
      this.trail = new Float32Array(width * height);
      this.histograms = [new Uint32Array(511), new Uint32Array(511), new Uint32Array(511)];
      this.reset();
    }
    reset() {
      this.history = []; this.lastTime = null; this.energy = 0;
      this.trail.fill(0); this.mask.fill(0);
      for (let i = 3; i < this.mask.length; i += 4) this.mask[i] = 255;
    }
    process(rgba, time, options = {}) {
      const config = settings(options), count = this.width * this.height;
      if (rgba.length !== count * 4) throw new Error('Camera frame dimensions changed');
      if (this.lastTime !== null && time <= this.lastTime) return this.mask;
      const dt = this.lastTime === null ? .05 : Math.min(1, (time - this.lastTime) / 1000);
      this.lastTime = time;
      const cutoff = time - config.delay * 1000;
      while (this.history.length > 1 && this.history[1].time <= cutoff) this.history.shift();
      const reference = this.history[0];
      const previous = reference && reference.time <= cutoff ? reference.rgba : null;
      let dr = 0, dg = 0, db = 0;
      if (previous && config.compensate) {
        const [red, green, blue] = this.histograms;
        red.fill(0); green.fill(0); blue.fill(0);
        for (let i = 0; i < rgba.length; i += 4) {
          red[rgba[i]-previous[i]+255]++; green[rgba[i+1]-previous[i+1]+255]++; blue[rgba[i+2]-previous[i+2]+255]++;
        }
        // A median follows lighting shared by most pixels without interpreting
        // a bright moving foreground as a change across the whole background.
        const median = histogram => {
          let total = 0;
          for (let i = 0; i < histogram.length; i++) { total += histogram[i]; if (total >= count / 2) return i - 255; }
          return 0;
        };
        dr = median(red); dg = median(green); db = median(blue);
      }
      const decay = config.trails ? Math.exp(-dt * 4 / config.trails) : 0;
      let total = 0;
      for (let p = 0; p < count; p++) {
        const i = p * 4;
        const difference = previous ? Math.max(Math.abs(rgba[i] - previous[i] - dr),
          Math.abs(rgba[i+1] - previous[i+1] - dg), Math.abs(rgba[i+2] - previous[i+2] - db)) / 255 : 0;
        const value = Math.max(this.trail[p] * decay, Math.min(1, Math.max(0, difference - config.threshold) * config.gain));
        this.trail[p] = value; total += value;
        this.mask[i] = this.mask[i+1] = this.mask[i+2] = Math.round(value * 255);
      }
      this.energy = total / count;
      this.history.push({time, rgba: new Uint8ClampedArray(rgba)});
      // At 20 Hz this retains the full two-second delay with a fixed memory cap.
      if (this.history.length > 48) this.history.shift();
      return this.mask;
    }
  }
  class Input {
    constructor({getSettings, getSourceId, onStatus = () => {}}) {
      this.getSettings = getSettings; this.getSourceId = getSourceId; this.onStatus = onStatus;
      this.id = globalThis.crypto?.randomUUID?.() || `camera-${Date.now()}-${Math.random()}`;
      this.seq = 0; this.generation = 0; this.version = 0; this.stream = null; this.connecting = false;
      this.processor = new Processor();
      this.canvas = document.createElement('canvas'); this.canvas.width = 160; this.canvas.height = 90;
      this.context = this.canvas.getContext('2d');
      this.sample = document.createElement('canvas'); this.sample.width = 160; this.sample.height = 90;
      this.sampleContext = this.sample.getContext('2d', {willReadFrequently: true});
      this.video = document.createElement('video'); this.video.muted = true; this.video.playsInline = true;
      this.message = 'Camera disconnected. Connect a camera on the computer running this editor.';
      this.pagehide = () => this.disconnect();
      window.addEventListener('pagehide', this.pagehide);
    }
    status(message) {
      if (message) this.message = message;
      return {connected: !!this.stream, connecting: this.connecting, message: this.message,
        energy: this.processor.energy, sourceId: this.id};
    }
    async devices() {
      if (!navigator.mediaDevices?.enumerateDevices) return [];
      return (await navigator.mediaDevices.enumerateDevices()).filter(d => d.kind === 'videoinput');
    }
    async connect(deviceId = '') {
      this.disconnect();
      if (!globalThis.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera access needs localhost or HTTPS. Open this editor on the Mac at http://localhost:8008/redesign.');
      }
      const generation = ++this.generation;
      this.connecting = true; this.onStatus(this.status('Waiting for camera permission…'));
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({audio: false, video: {
          ...(deviceId ? {deviceId: {exact: deviceId}} : {facingMode: 'user'}),
          width: {ideal: 640}, height: {ideal: 360}, frameRate: {ideal: 20, max: 30}}});
        if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return false; }
        this.video.srcObject = stream;
        await this.video.play();
        if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return false; }
        this.stream = stream; this.connecting = false; this.processor.reset(); this.lastSample = -Infinity; this.lastPublish = -Infinity;
        const track = stream.getVideoTracks()[0];
        track.addEventListener('ended', () => { if (this.stream === stream) this.disconnect('Camera disconnected or no longer available.'); });
        this.onStatus(this.status('Live: ' + (track.label || 'camera') + '. Keep this editor open while using its movement.'));
        const draw = now => {
          if (this.stream !== stream) return;
          try {
            if (this.video.readyState >= 2 && now - this.lastSample >= 49) {
              this.lastSample = now;
              const config = settings(this.getSettings());
              const ctx = this.sampleContext, w = this.sample.width, h = this.sample.height;
              ctx.save(); ctx.clearRect(0, 0, w, h);
              if (config.mirror) { ctx.translate(w, 0); ctx.scale(-1, 1); }
              // Centre crop to the analysis aspect, without stretching the camera.
              const scale = Math.max(w / this.video.videoWidth, h / this.video.videoHeight);
              const sw = w / scale, sh = h / scale;
              ctx.drawImage(this.video, (this.video.videoWidth-sw)/2, (this.video.videoHeight-sh)/2, sw, sh, 0, 0, w, h); ctx.restore();
              const frame = this.processor.process(ctx.getImageData(0, 0, w, h).data, now, config);
              this.context.putImageData(new ImageData(frame, w, h), 0, 0); this.version++;
              if (now - this.lastPublish >= 100 && !this.publishing) {
                this.lastPublish = now;
                this.publish({image: this.canvas.toDataURL('image/png')});
              }
            }
          } catch { this.disconnect('Could not read camera frames. Reconnect the camera.'); return; }
          this.frameRequest = setTimeout(() => draw(performance.now()), 50);
        };
        this.frameRequest = setTimeout(() => draw(performance.now()), 0);
        return true;
      } catch (error) {
        stream?.getTracks().forEach(track => track.stop());
        if (generation === this.generation) {
          this.connecting = false;
          const message = error.name === 'NotAllowedError' ? 'Camera permission denied. Allow camera access in the browser, then reconnect.'
            : error.name === 'NotFoundError' ? 'No camera found. Connect a camera, refresh the list and try again.'
            : error.name === 'NotReadableError' ? 'Camera is busy or unavailable. Close other camera apps and reconnect.' : error.message;
          this.onStatus(this.status(message)); throw new Error(message);
        }
        return false;
      }
    }
    async publish(payload) {
      const packet = {type: 'cameraMotionFrame', sourceId: this.id, seq: ++this.seq, ...payload};
      this.publishing = true;
      try {
        const response = await fetch('/api/state', {method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(packet), signal: AbortSignal.timeout(1500), keepalive: !payload.image});
        if (!response.ok) throw new Error('Motion link unavailable');
        this.linkError = false;
      } catch { this.linkError = true; }
      finally { this.publishing = false; }
    }
    disconnect(message) {
      this.generation++; clearTimeout(this.frameRequest);
      const active = this.stream || this.connecting;
      this.connecting = false;
      const stream = this.stream; this.stream = null;
      stream?.getTracks().forEach(track => track.stop());
      this.video.pause(); this.video.srcObject = null;
      this.processor.reset(); this.context.clearRect(0, 0, 160, 90); this.version++;
      if (active) this.publish({image: null});
      this.onStatus(this.status(message || 'Camera disconnected.'));
    }
    reset() { this.processor.reset(); this.context.clearRect(0, 0, 160, 90); this.version++; }
    receive(packet) {
      if (packet.type !== 'cameraMotionFrame' || packet.sourceId !== this.getSourceId() || packet.sourceId === this.id) return;
      if (!Number.isFinite(packet.seq) || (this.remote?.id === packet.sourceId && packet.seq <= this.remote.seq)) return;
      const remote = {id: packet.sourceId, seq: packet.seq, at: performance.now(),
        image: packet.image && this.remote?.id === packet.sourceId ? this.remote.image : null};
      this.remote = remote;
      if (!packet.image) return;
      if (typeof packet.image !== 'string' || !packet.image.startsWith('data:image/png;base64,') || packet.image.length > 130000) return;
      const image = new Image();
      image.onload = () => { if (this.remote === remote && image.width === 160 && image.height === 90) remote.image = image; };
      image.src = packet.image;
    }
    frame(sourceId = this.getSourceId()) {
      if (sourceId === this.id && this.stream) return {image: this.canvas, version: this.version};
      if (this.remote && this.remote.id === sourceId && performance.now() - this.remote.at < 1200) return {image: this.remote.image, version: this.remote.seq};
      return {image: null, version: -1};
    }
  }
  return {settings, Processor, Input};
});
