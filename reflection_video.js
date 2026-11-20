/* A silent, independent video supplying the reflective object's environment. */
(() => {
  function normalise(value = {}) {
    const v = value && typeof value === 'object' ? value : {};
    return {filename: typeof v.filename === 'string' && v.filename.length <= 255 && !/[\\/]/.test(v.filename) && /\.mp4$/i.test(v.filename) ? v.filename : '',
      speed: Number.isFinite(v.speed) ? Math.max(.25, Math.min(4, v.speed)) : 1};
  }
  class ReflectionVideo {
    constructor() {
      this.video = document.createElement('video'); this.video.muted = true; this.video.playsInline = true; this.video.loop = true;
      this.settings = normalise(); this.message = 'Reflections use the playing video.';
      this.video.onloadeddata = () => this.synchronise();
      this.video.onerror = () => { this.message = 'Reflection video unavailable. Choose another library video or reload the library.'; };
      this.onPageHide = () => this.dispose();
      window.addEventListener('pagehide', this.onPageHide);
    }
    dispose() {
      this.video.onloadeddata = this.video.onerror = null;
      this.video.pause(); this.video.removeAttribute('src'); this.video.load();
      window.removeEventListener('pagehide', this.onPageHide);
    }
    configure(value, clock) {
      const settings = normalise(value), changed = settings.filename !== this.settings.filename;
      const key = JSON.stringify(clock);
      const seek = changed || (clock && key !== this.clockKey);
      this.settings = settings;
      if (clock && Number.isFinite(clock.time) && Number.isFinite(clock.startedAt)) {
        this.clock = {...clock, playing: clock.playing !== false}; this.clockKey = key;
      } else if (changed || !this.clock) this.clock = {time: 0, startedAt: Date.now(), playing: true};
      this.video.playbackRate = settings.speed;
      if (changed) {
        if (!settings.filename) {
          this.video.pause(); this.video.removeAttribute('src'); this.video.load(); this.message = 'Reflections use the playing video.';
        } else {
          this.message = 'Loading reflection video…'; this.video.src = '/video/' + encodeURIComponent(settings.filename); this.video.load();
        }
      }
      if (settings.filename && this.video.readyState >= 2 && seek) this.synchronise();
    }
    synchronise() {
      if (!this.settings.filename || !this.video.duration || !this.clock) return;
      const time = this.clock.time + (this.clock.playing ? Math.max(0, Date.now() - this.clock.startedAt) / 1000 * this.settings.speed : 0);
      this.video.currentTime = Math.max(0, time % this.video.duration);
      this.message = 'Reflection: ' + this.settings.filename;
      if (this.clock.playing) this.video.play().catch(() => { this.message = 'Reflection playback could not start. Press Play reflection video.'; });
      else this.video.pause();
    }
    snapshot() {
      const clock = this.clock || {time:0,startedAt:Date.now(),playing:true};
      const time = this.video.readyState >= 2 ? this.video.currentTime : clock.time + (clock.playing ? Math.max(0, Date.now()-clock.startedAt)/1000*this.settings.speed : 0);
      return {time, startedAt: Date.now(), playing: clock.playing};
    }
    frame() { return this.settings.filename && this.video.readyState >= 2 && !this.video.seeking ? this.video : null; }
  }
  ReflectionVideo.normalise = normalise;
  window.ReflectionVideo = ReflectionVideo;
})();
