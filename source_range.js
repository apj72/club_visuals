/* Source times are seconds in the original video; show times stay independent. */
(function (root) {
  'use strict';
  function validate(value) {
    if (value == null) return null;
    const {start, end = null} = value;
    if (typeof start !== 'number' || !Number.isFinite(start) || start < 0
      || (end !== null && (typeof end !== 'number' || !Number.isFinite(end) || end - start < .1 - 1e-9))) {
      throw new Error('Set an In time of zero or more and an Out time at least 0.1 seconds later. Leave Out blank for the video end.');
    }
    return {start, end};
  }
  function bounds(value, duration) {
    const full = {start: 0, end: Number.isFinite(duration) && duration > 0 ? duration : null};
    if (!value) return full;
    let range;
    try { range = validate(value); } catch { return full; }
    if (full.end === null) return range;
    const end = Math.min(range.end ?? full.end, full.end);
    return end - range.start >= .1 - 1e-9 ? {start: range.start, end} : full;
  }
  function sourceTime(entry, local, duration) {
    const range = bounds(entry.sourceRange, duration);
    const elapsed = Math.max(0, local * Math.max(.25, Number(entry.speed) || 1));
    const length = range.end === null ? null : range.end - range.start;
    if (!length) return range.start + elapsed;
    if (Number(entry.loopMode) === 2) {
      const turn = elapsed % (length * 2);
      return range.start + Math.min(length - .001, turn > length ? length * 2 - turn : turn);
    }
    return range.start + (Number(entry.loopMode) === 1 ? elapsed % length : Math.min(elapsed, Math.max(0, length - .001)));
  }
  // Frame checks keep short cue loops responsive; media events cover hidden tabs.
  function watch(video, check) {
    let frame = 0;
    function tick() {
      frame = 0; check();
      if (!video.paused && !video.ended) frame = requestAnimationFrame(tick);
    }
    function start() { if (!frame) frame = requestAnimationFrame(tick); }
    function stop() { cancelAnimationFrame(frame); frame = 0; }
    video.addEventListener('play', start);
    video.addEventListener('pause', stop);
    video.addEventListener('timeupdate', check);
    video.addEventListener('ended', check);
  }
  const api = {validate, bounds, sourceTime, watch};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SourceRange = api;
})(globalThis);
