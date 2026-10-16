# Sound to Visuals: autonomous performance mode

Research and implementation plan, 16 October 2026.

## Product outcome

Press **Auto Perform** and choose an audio input on first use. Club Visuals listens to the DJ feed, keeps a musical clock, selects videos from an eligible library pool, chooses layouts and transitions, and performs VFX changes. The operator can take over any decision, lock a video or layout, and stop automation immediately. The clean output and recordings show the same decisions as the editor.

The first release should work with a microphone or USB/virtual audio input, which the app already supports for VFX. Capturing audio from another browser tab or the operating system is a later input option: browser screen capture may return no audio track even when requested, and it requires a fresh user gesture and permission each time [1].

## What exists today

- `index.html` already obtains a microphone/USB stream using `getUserMedia`, disables echo cancellation/noise suppression/automatic gain control when possible, creates an `AudioContext` and `AnalyserNode`, and derives bass level and isolated pulses. This analysis runs inside `renderVfxFrame`, so it is tied to the VFX render loop and cannot currently drive a reliable autonomous show.
- The playlist model already contains video, duration, layout/preset, speed, zoom/pan, transition, and timed VFX cues. The transition catalogue has 61 choices. `showVideo`, `applyLayoutConfiguration`, `applyPlaylistCue`, and `broadcastState` are usable action endpoints.
- The player has one main video element and a clean output window. Automation needs a prepared next clip and one authoritative action stream; separate independent decision engines in the two windows would drift.
- Library ordering exists, but there are no explicit performance tags such as energy, motion, colour, exclusion, or logo-friendly content.

## Research conclusions

1. Build one shared audio input service rather than opening a second microphone stream for Auto Perform. The browser requires user permission and a secure context for `getUserMedia`; localhost qualifies [2].
2. Use an `AudioWorklet` for continuous feature frames and timestamps, with the current `AnalyserNode` retained for simple meters and as a fallback. Worklets process audio on a separate thread with low latency [3]. Compute RMS, low/mid/high energy, positive spectral flux, and short-term loudness change; send compact feature summaries to the controller at roughly 20–50 Hz.
3. Derive onset candidates from spectral flux, then estimate tempo **and beat phase** from a rolling window. A bass pulse is not a beat grid. Published online beat tracking uses spectral flux plus tempo/phase hypotheses and an initial induction window [4]. Expect several seconds of warm-up and common half/double-tempo ambiguity; expose confidence and allow tap tempo.
4. Treat a build, breakdown, and drop as *probabilistic section states*, using rolling loudness, bass return, high-frequency density, onset rate, and change from the preceding 8–32 bars. Research on EDM drops describes their varied structure and the difficulty of reliable automatic detection [5]. Live audio cannot reveal an unplayed future drop. Align planned changes to predicted beats, and use an immediate accent when a surprise drop is detected. Optional offline track analysis can add genuine look-ahead later.
5. A browser-only first implementation can own its small feature set. If broader spectral features are useful, evaluate Meyda, which offers real-time extraction under MIT [6]. Essentia.js offers more sophisticated analysis but its repository is AGPL-3.0 and notes API instability; licensing and integration should be reviewed before adopting it [7].

## Experience

The main player gets **Auto Perform** / **Stop Auto**. First press asks for a microphone/USB input and uses the browser permission prompt. Later presses reuse the chosen input where permission persists. A compact performance panel shows input level, BPM, confidence, current section (quiet/build/steady/peak), current and prepared next video, and the next scheduled action. A visible **Tap tempo** and **Resync beat** give the operator a quick recovery path.

Controls remain available during automation. A manual video/layout/effect choice takes precedence until the next musical boundary or until unlocked; **Lock video**, **Lock layout**, and **Hold look** keep specific choices in place. **Next on beat** requests a clip change at the next valid boundary. **Stop Auto** cancels pending actions, releases input only if Auto Perform owns it, and leaves the current image on screen. The app must show when input is silent, lost, or too uncertain for beat-synced decisions.

Settings: input, style profile (Balanced, Hypnotic, High Energy, Ambient), change frequency, transition intensity, VFX intensity, library pool/tags, minimum clip duration, no-repeat window, flash reduction, and audio-to-video timing offset. Defaults should be conservative and usable with one press; settings refine the show, rather than being required to start it.

## Controller design

```text
Mic / USB / later tab audio
        ↓
Shared audio input → feature worklet → beat/section estimator
                                  ↓
                        decision engine + rules
                                  ↓
                  scheduled action queue / action log
                                  ↓
                current player → clean output / recorder
```

The audio layer emits timestamped features. The estimator emits `beat`, `bar`, `phrase`, `onset`, `energy`, `section`, and confidence values. The decision engine emits explicit actions, such as `{at, kind:'change-video', video, layout, transition, reason, seed}`. It does not call DOM controls directly. An executor validates the action, preloads the next video, and calls existing playback/layout/VFX functions. The clean output receives the committed action and parameters through the existing broadcast channel. The action log records decisions and seeds for debugging and possible replay/export.

**Decision hierarchy**

| Musical event | Visual response | Guardrail |
|---|---|---|
| Continuous low/mid/high energy | Modulate VFX intensity, mirror depth, or zoom in bounded ranges | Smooth values; no full layout rebuild every frame |
| Confident beat/onset | Small pulse, ripple, or brief accent | Refractory period; never flash every kick by default |
| 4/8-beat boundary | Consider orientation, zoom direction, or VFX scene | Minimum hold time; preserve locked controls |
| 8/16/32-bar phrase or strong section change | Consider next video and transition | Preload before boundary; avoid recent clips |
| Build → peak/drop | Stronger transition or new clip, 3D logo/text accent | Confidence threshold, cooldown, Reduce Flashes filter |
| Silence/input loss/low confidence | Hold current video; calm, slow movement | No random rapid cuts; show status |

Selection is **weighted and reproducible**, not unconstrained random. Score eligible videos using user tags (energy, motion, colour family, preferred layout, logo-safe area), recent usage, current section, source duration, and a seeded tie-breaker. Choose a layout that suits the clip's aspect ratio and avoids repeating the last orientation. Choose transitions from a profile-specific allowlist and the existing catalogue safety tags. Respect the global Reduce Flashes setting. Preload the next clip while the current one plays; if preparation misses its boundary, defer to the next beat/bar rather than cutting to black.

For example, a quiet passage could hold a single mirrored clip with slow rotation; a sustained build could add panels and restrained zoom; a detected peak could reveal a fresh high-motion clip with Pixel Scatter or Bass Impact Distortion, then place the Version1 logo or an Instagram ID in the centre for one or two bars. A cooldown prevents another big transition or brand moment immediately afterward. These are editable rules, not a fixed sequence.

The planner should choose the *next* scheduled action using the current best beat grid and update it as confidence changes. A small calibrated offset compensates for audio input, browser processing, and display latency; measure this on the target venue setup. Browser audio output latency properties describe output timing, not the full microphone-to-screen path [8].

## Delivery phases and acceptance

| Phase | Scope | Acceptance |
|---|---|---|
| 0. Baseline | Capture sample DJ sets and annotate beats, section changes, and desired visual changes; profile current player/output timing. | Repeatable fixture set and measurable latency/false-trigger baseline. |
| 1. Shared input and clock | Extract audio service from VFX renderer; add worklet, feature stream, beat grid, confidence, Tap/Resync, input-loss handling. | VFX and automation use one stream; no doubled permission prompts; beat markers remain stable on fixture tracks. |
| 2. Live performance MVP | Auto Perform button, status panel, seeded rules, library pool, conservative clip/layout/VFX/transition choices, preloading, Stop/Hold/Next. | A 30-minute unattended run has no black frames, runaway cuts, or lost output sync; manual override works. |
| 3. Musical structure | Build/break/drop estimator, phrase-aware decisions, user profiles, video tags, precomputed library features. | Annotated test sets show useful changes at musical boundaries; false drops do not cause repeated strong effects. |
| 4. Authoring and replay | Display decisions and confidence on timeline, edit rules/weights, save a performance log or convert it to a playlist, optional offline audio analysis. | A saved run can be inspected and replayed with the same decisions and transition seeds. |

Set numeric pass thresholds after Phase 0 calibration on the target Mac, browser, input interface, and output display. Test half/double-time music, tempo changes, quiet breakdowns, vocals without a kick, rapid DJ mixes, silence, revoked permissions, missing files, WebGL fallback, fullscreen, clean output, and recording. Track decision latency, beat timing error, transitions missed because preload was late, repeated-video rate, CPU/GPU load, and operator override frequency. Test continuous performance with flash reduction enabled by default.

## Implementation order in this repository

1. Add `audio_performance.js` and an AudioWorklet module, served by `server.py`; refactor `connectVfxAudio`/`disconnectVfxAudio` so VFX and automation share the same stream and lifecycle.
2. Add pure beat/section estimator and decision-engine modules with fixture-driven tests. Keep musical inference separate from browser APIs.
3. Add a two-deck or preloaded-hidden-video path to `showVideo` and verify transition/clean-output parity at a scheduled boundary.
4. Add Auto Perform UI, override/lock controls, library tags, and profile persistence. Keep existing manual playlist playback as an independent mode.
5. Add action logging and timeline visibility before expanding model complexity. Tune rules from real set recordings and operator feedback.

## Sources

[1] [MDN: `getDisplayMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getDisplayMedia)

[2] [MDN: `getUserMedia`](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)

[3] [MDN: AudioWorklet](https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet)

[4] [ISMIR 2010: online beat tracking](https://archives.ismir.net/ismir2010/paper/000050.pdf)

[5] [ISMIR 2014: detecting drops in electronic dance music](https://archives.ismir.net/ismir2014/paper/000297.pdf)

[6] [Meyda project and license](https://github.com/meyda/meyda)

[7] [Essentia.js project and license](https://github.com/MTG/essentia.js)

[8] [MDN: AudioContext base latency](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/baseLatency)
