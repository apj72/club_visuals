# Club Visuals transition implementation plan

Source brief: `/Users/antonyjoyce/Downloads/club_visuals_transitions.md` (16 October 2026).

## Product goal and delivery order

Build the 50-effect catalogue for house, techno, electro, trance, and drum and bass performance. Preserve the existing live player, clean output, and MediaRecorder pipelines. Implement the phases in order and keep each phase usable on its own. The source brief explicitly calls for the core and a small representative slice of Phase 2 first.

| Phase | Scope | Exit criterion |
|---|---|---|
| 1. Core | A metadata registry, validated serialisable parameters, deterministic seeds, two-input progress renderer, easing, GPU capability check, preview and recording parity, safe defaults | Exact A at 0 and B at 1; shared implementation in player, audition, clean output, and recordings; clear fallback on unavailable WebGL2 |
| 2a. Vertical slice | RGB Split, Infinite Zoom, Neon Shockwave | Three distinct GPU effects can be configured, auditioned, saved in playlists, and recorded |
| 2b. Remaining priority effects | Digital Glitch, Spiral Vortex, Liquid Morph, Kaleidoscope Morph, Pixel Explosion, Motion Blur Whip, Hexagonal Mosaic, Plasma Dissolve, Geometric Shatter, Tunnel Warp, Dimensional Portal, Bass Impact Distortion | All first 15 render and export with controls and configurable defaults |
| 3. Remaining catalogue | The other 35 named effects below | All 50 effects are available and verified |
| 4. Automation | Beat/bar/phrase timing, audio modulation, effect chains, weighted collections, repeat avoidance, optional content analysis | Repeatable, configurable automatic transitions with safety filtering |

Current delivery: Phases 1, 2a, 2b, and 3 are implemented as 50 selectable GPU effects alongside eleven classic transitions. Phase 4 automation remains planned. Effects involving codec corruption, fluids, smoke, or particles use deterministic shader simulations; they do not modify compressed video streams or run physical simulations.

## Catalogue and priority

The first 15 are marked **P** in priority order. An existing Club Visuals effect can be used as a starting point, but a catalogue name is complete only when its described visual behaviour is implemented.

| Category | Effects |
|---|---|
| Glitch and digital | Digital Glitch **P2**; RGB Split **P1**; Datamosh; Pixel Explosion **P8**; Scanline Interference; Digital Signal Loss; Pixel Sorting; Block Corruption |
| Psychedelic and kaleidoscopic | Kaleidoscope Morph **P7**; Spiral Vortex **P4**; Liquid Morph **P6**; Fractal Dissolve; Psychedelic Tunnel; Mandala Rotation; Mirror Shatter; Waveform Warp |
| Light, energy, and strobe | White Flash; Neon Shockwave **P5**; Laser Sweep; Electric Arc; Strobe Cut; Energy Burst; Light Leak; Plasma Dissolve **P11** |
| Geometric and motion | Hexagonal Mosaic **P10**; Geometric Shatter **P12**; Infinite Zoom **P3**; 3D Cube Rotation; Radial Slice; Tunnel Warp **P13**; Particle Disintegration; Motion Blur Whip **P9** |
| Organic, fluid, and atmospheric | Smoke Dissolve; Ink in Water; Fluid Ripple; Fire Burn; Ice Crystallisation; Sandstorm; Liquid Chrome; Organic Cell Division |
| Experimental and high impact | Reality Fracture; Time Echo; Chromatic Implosion; Neural Network Morph; Holographic Breakdown; Gravity Well; Quantum Tiles; Spectral Frequency Shift; Dimensional Portal **P14**; Bass Impact Distortion **P15** |

Signature candidates: Infinite Zoom, Neon Shockwave, Liquid Morph, Kaleidoscope Morph, and Bass Impact Distortion. A shader approximation must be labelled honestly where true codec datamoshing, fluid simulation, or particle reassembly would need a separate pipeline.

## Shared model and rendering contract

Each definition declares `id`, `name`, `category`, `description`, `implementationKind`, supported parameters, defaults, and safety tags. A saved transition stores a stable ID, duration, pace, seed, and a validated `params` object. Existing saved playlists without these fields retain their current behaviour.

The renderer receives two frame textures at the same output size, linear progress `0..1`, normalised parameters, and a seed. It outputs source A exactly at 0 and target B exactly at 1. The player supplies its composited layout as the frame source; the audition uses the selected adjacent clips. The recording path draws the same rendered canvas. Colour is 8-bit sRGB and alpha is opaque over black, matching the present player. Inputs use the existing layout compositors, which preserve each tile's cover/contain rule, and are resampled to the output dimensions. Progress uses one monotonic clock during live playback; an explicit progress renderer provides repeatable frame evaluation for export and tests. Varying input frame rates are sampled at the target display or recording tick.

Use WebGL2, already used by `vfx_engine.js`, for two-texture effects. Keep the existing Canvas 2D transitions working. If WebGL2 is unavailable, show a capability message in audition and use Cross Dissolve for a GPU effect; never show an uninitialised frame. Keep GPU shader source native to this repository rather than copying external effects with uncertain licensing.

Parameter vocabulary: `duration`, `intensity`, `direction`, `pace/easing`, `color/palette`, `seed`, `center`, `rotation`, `distortion`, `beatSync`, `audioBand`, `audioAmount`, `motionBlur`, `reverse`, and `impactPosition`. Definitions expose only meaningful controls. Validate ranges before saving and rendering. Use deterministic spatial noise derived from seed rather than `Math.random()` in a render pass.

## Timing, automation, and safety

Time durations remain available. Phase 4 adds quarter, half, 1, 2, 4, and 8 beats, bars, and phrases from BPM (`seconds = beats × 60 / BPM`). An effect's main impact can align to a beat or drop by starting before it. Audio-reactive modulation will use the existing mic input and allow bass, mid, or treble amounts, with deterministic recording policy documented before release. Playlist VFX cue scripting already exists and remains separate from transition timing.

Reduce Flashes is a persistent global setting. It caps effect-added glow, changes Strobe Cut to a smooth reveal, attenuates White Flash, and removes animated static in Digital Signal Loss. It applies in previews, playback, clean output, and recordings. Flash and high-contrast effects are labelled in the playlist palette. Later chains and random collections must apply this setting to every component rather than only to the first effect.

Phase 4 chaining combines effects with adjustable internal time shares and stable endpoints. Weighted random collections are Techno, Psychedelic, High Energy, Atmospheric, and Experimental, with per-effect weights, immediate-repeat avoidance, seeded selection, and safety filtering. Optional later content analysis may use geometry, palette similarity, colour change, motion, darkness, and musical energy as input features. Selection must remain overridable and reproducible.

## Acceptance and verification

1. No accidental black or uninitialised boundary frames. Exact source/target endpoints, including non-square and mixed-resolution clips.
2. A transition never changes the underlying clips outside its allocated interval.
3. Audition, main player, clean output, and recordings use the same effect code; any timing or codec differences are documented.
4. Identical inputs, progress, seed, and parameters produce identical frames.
5. Unsupported GPU features fall back with a visible explanation in audition.
6. Saved parameters validate, round-trip through playlist JSON, and preserve old playlists.
7. Beat timing, impact alignment, safety filtering, and chain endpoints pass dedicated checks before Phase 4 is called complete.
8. Effects are grouped by category, discoverable, previewable with real adjacent videos, and registered with stable IDs. The shader currently uses a shared program with one branch per effect; a future modular shader registry could reduce compile cost as the catalogue grows.

## Reference review

- [GL Transitions specification](https://github.com/gl-transitions/gl-transitions): useful two-texture, progress, endpoints, and metadata model. No shader code is copied.
- [GL Transitions gallery](https://gl-transitions.com/): visual reference only.
- [Resolume Wire](https://resolume.com/software/wire): later node/chaining inspiration, no dependency.
- [FFmpeg GL Effects](https://github.com/xrip/ffmpeg-gl-effects): useful export architecture reference; Club Visuals retains its browser MediaRecorder and server conversion pipeline.
