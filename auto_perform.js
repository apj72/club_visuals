(function (root) {
  'use strict';
  const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
  const median = values => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length ? sorted[Math.floor(sorted.length / 2)] : 0;
  };

  class AutoPerformanceEngine {
    constructor(options = {}) {
      this.changeBars = Math.max(2, Number(options.changeBars) || 8);
      this.reset();
    }
    reset() {
      this.initialized = false;
      this.previous = { bass: 0, mid: 0, high: 0, rms: 0 };
      this.slow = 0;
      this.fast = 0;
      this.onsets = [];
      this.beatCount = 0;
      this.bpm = 0;
      this.confidence = 0;
      this.section = 'listening';
      this.sectionSince = 0;
      this.lastBeat = -Infinity;
      this.lastChange = -Infinity;
      this.lastAccent = -Infinity;
      this.lastSound = -Infinity;
      this.lastQuietExit = -Infinity;
      this.taps = [];
    }
    tap(time) {
      this.taps.push(time);
      this.taps = this.taps.filter(t => time - t < 4).slice(-6);
      if (this.taps.length >= 3) {
        const intervals = this.taps.slice(1).map((t, index) => t - this.taps[index]);
        const period = median(intervals);
        if (period >= .3 && period <= 1.2) {
          this.bpm = Math.round(60 / period);
          this.confidence = Math.max(this.confidence, .75);
          this.lastBeat = time;
          this.beatCount++;
        }
      }
      return this.snapshot();
    }
    resync(time) { this.beatCount = 0; this.lastBeat = time; this.onsets = []; }
    snapshot() {
      return { bpm: this.bpm, confidence: this.confidence, beat: this.beatCount,
        bar: Math.floor(this.beatCount / 4) + 1, section: this.section,
        energy: clamp(this.fast * 2), inputLevel: clamp(this.previous.rms * 2),
        silent: this.section === 'quiet' };
    }
    process(frame) {
      const time = Number(frame.time);
      if (!Number.isFinite(time)) return { ...this.snapshot(), actions: [] };
      const current = {
        bass: clamp(Number(frame.bass) || 0, 0, 1.5),
        mid: clamp(Number(frame.mid) || 0, 0, 1.5),
        high: clamp(Number(frame.high) || 0, 0, 1.5),
        rms: clamp(Number(frame.rms) || 0, 0, 1.5),
      };
      if (!this.initialized) {
        this.initialized = true;
        this.previous = current;
        this.slow = this.fast = current.rms;
        this.sectionSince = time;
        this.lastSound = time;
        return { ...this.snapshot(), actions: [] };
      }
      const rise = Math.max(0, current.bass - this.previous.bass) * .75
        + Math.max(0, current.mid - this.previous.mid) * .15
        + Math.max(0, current.rms - this.previous.rms) * .35;
      this.fast += (current.rms - this.fast) * .13;
      this.slow += (current.rms - this.slow) * .012;
      if (current.rms > .035) this.lastSound = time;
      const actions = [];
      const silent = time - this.lastSound > 2.5;
      const candidate = silent || current.rms < .055 ? 'quiet'
        : this.fast > Math.max(.13, this.slow * 1.45) && current.bass > .2 ? 'peak'
          : this.fast > this.slow * 1.16 ? 'build' : 'steady';
      if (candidate !== this.section && (time - this.sectionSince > .8 || silent)) {
        const wasQuiet = this.section === 'quiet';
        this.section = candidate;
        this.sectionSince = time;
        if (wasQuiet && candidate !== 'quiet') this.lastQuietExit = time;
        if (candidate === 'peak' && time - this.lastQuietExit < 4
            && (this.confidence >= .25 || current.bass > .45)
            && time - this.lastChange > 7) {
          actions.push({ kind: 'change-video', reason: 'drop', energy: clamp(this.fast * 2) });
          this.lastChange = time;
          this.lastQuietExit = -Infinity;
        }
      }
      const onset = !silent && rise > Math.max(.09, this.slow * .22) && time - this.lastBeat > .29;
      if (onset) {
        this.onsets.push(time);
        this.onsets = this.onsets.filter(t => time - t < 9).slice(-24);
        const intervals = this.onsets.slice(1).map((t, index) => t - this.onsets[index])
          .filter(value => value >= .3 && value <= 1.2);
        if (intervals.length >= 3) {
          const period = median(intervals.slice(-8));
          const coherent = intervals.slice(-8).filter(value => Math.abs(value - period) < period * .16).length;
          this.confidence = clamp(coherent / Math.max(4, intervals.slice(-8).length));
          if (this.confidence >= .45) this.bpm = Math.round(60 / period);
        }
        this.lastBeat = time;
        this.beatCount++;
        if (this.confidence >= .4) {
          if (time - this.lastAccent > .38) {
            actions.push({ kind: 'accent', strength: clamp(rise * 2), reason: 'beat' });
            this.lastAccent = time;
          }
          if (this.beatCount % 8 === 0) actions.push({ kind: 'vfx', reason: 'eight-beat', energy: clamp(this.fast * 2) });
          if (this.beatCount % 16 === 0) actions.push({ kind: 'layout', reason: 'four-bar', energy: clamp(this.fast * 2) });
          if (this.beatCount % (this.changeBars * 4) === 0 && time - this.lastChange >= 8) {
            actions.push({ kind: 'change-video', reason: 'phrase', energy: clamp(this.fast * 2) });
            this.lastChange = time;
          }
        }
      } else if (time - this.lastBeat > 4) this.confidence *= .995;
      this.previous = current;
      return { ...this.snapshot(), actions };
    }
  }

  root.createAutoPerformanceEngine = options => new AutoPerformanceEngine(options);
  if (typeof module !== 'undefined') module.exports = { AutoPerformanceEngine };
})(typeof window === 'undefined' ? globalThis : window);
