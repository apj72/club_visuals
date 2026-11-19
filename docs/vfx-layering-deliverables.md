# VFX layering and Version1 logo deliverables

Requested: 17 November 2026. Status: implemented and verified with generated media
and simulated camera input. Physical-camera/venue rehearsal remains.

## Deliverables

- [x] **Combine video effects with an independent 3D logo layer.** Camera motion
  extraction and the Version1 logo can run together. Kaleidoscope tunnel and the
  logo can run together. Each layer has its own on/off control.
- [x] **Independent background and reflection videos.** One video supplies the
  logo's chrome reflections while another plays behind it. Logo-only rendering on
  black remains available. A missing reflection source produces a useful message.
- [x] **Pulsing snake animation.** A travelling wave moves individual letters and
  the chip towards/away from the viewer, along horizontal or vertical logos.
  Wave speed, depth and pulse strength are adjustable.
- [x] **Fly along the logo.** An animated viewpoint travels along the wordmark,
  allowing letters to fill and extend beyond the frame. Travel speed and viewing
  distance are adjustable.
- [x] **Saved playback and recording.** Preview, Mac output and captured videos
  include layers, sources and animation. Playlist cues and Show Builder retain
  authored settings. Independent logo motion Play/Pause remains available.

## Implementation sequence

1. Separate the background effect pass from the logo pass while retaining support
   for existing scene-6 logo cues. Verify camera + logo and tunnel + logo pixels.
2. Add independent reflection-video selection and transport, shared with preview,
   clean output and recording.
3. Extend the logo geometry/shader with a per-letter depth wave and an animated
   camera, driven by the existing independent logo clock.
4. Add authoring controls, cue/model persistence, browser/export regression checks
   and user guidance. Update this checklist with verified results.

## Acceptance checks

- Turning off either layer leaves the other running; global VFX Off still works.
- Both requested combinations render together in private preview and Mac output.
- Changing the background does not replace an independently selected reflection
  video. Black presentation and vertical upright letters remain available.
- Snake motion moves separate letters in depth rather than shifting the wordmark
  as a whole. Pause holds both new animations while video playback continues.
- Fly-along permits deliberate close-up clipping without automatic screen fitting.
- Saved/reloaded cues and recorded MP4s reproduce the authored composition.

## Development log

- Saved the agreed scope and began the renderer/layer-state refactor.
- Added independent layer controls, separate reflection-video playback and the
  per-letter wave/fly-along camera. Existing scene-6 logo cues remain compatible.
- Verified camera + logo and patterned tunnel + logo GPU frames, independent red
  reflections over a blue background, playback controls, pause, full-frame fly
  closeups, saved playlist round trips, timeline scrubbing and Mac/clean output.
- Decoded actual combined and portrait MP4 exports. Existing camera, chrome,
  orientation, capture, fullscreen and Show Builder/browser regressions passed.
- Updated the idle local server and checked the live editor/controller/renderer
  at version 11 with the reflection module served successfully.
- Usage: [Layering and animation guide](vfx-layering.md).

## Second batch · 18 November 2026

Focus: finish the saved-effect editing workflow for the first implementation.
Status: implemented and verified.

- [x] Edit independent reflection-video selection and speed directly in playlist
  cues and reusable Show Builder effects, retaining missing selections safely.
- [x] Edit an overlay's position, size, depth, static rotation and finish without
  rebuilding the look in the live popup.
- [x] Keep Show Builder's unsaved-change indicator accurate for these edits.
- [x] Correct snake-speed/fly-distance numeric step validation, then verify editing,
  saving, reloading, generation and preview with isolated media and metadata.

Also centered the Script effects dialog and kept its heading/Done controls visible
while the cue list scrolls. Reflection rescans retain the open brick form and its
selected source. Text overlays retain the selected text object when added.

Verified by `check_saved_logo_editing.py` in both interfaces, including real menus,
missing-file restoration, accurate unsaved state, saved/reloaded models, generated
cues and playback. Existing layer/export, VFX/fullscreen, Show Builder and general
desktop/tablet/phone browser checks passed. The live editor serves bundle version 12.

## Third batch · 18 November 2026

Focus: audition saved logo looks while editing them.
Status: implemented and verified.

- [x] Add an isolated effect preview to playlist cues and reusable brick effects.
- [x] Provide background selection, landscape/portrait framing, time scrubbing,
  playback and independent logo motion controls, with edits reflected immediately.
- [x] Release preview media and GPU resources on close or navigation, and verify
  previews leave the main player, output and saved metadata untouched.

Verified original/redesigned playlist editors and Show Builder with generated
blue backgrounds and red reflection sources. GPU readback confirmed the rendered
composition, portrait framing, changing/held poses and source selection. Selected
DJ branding also previews correctly. Closing, collapsing, opening another preview
and changing tabs release the previous renderer. Tests observed no playout writes
or preview-only metadata changes. Existing editing/persistence, VFX/fullscreen and
layered output/MP4 export regressions passed. The live app serves version 13.

## Fourth batch · 18 November 2026

Focus: explain the controls and allow video zoom-out with dust-faded edges.
Status: implemented and verified.

- [x] Contextual hover and keyboard-focus hints across both interfaces, FX/VFX
  popups, dropdown choices, playlist/cue editors, tag management and Show Builder.
- [x] Extend video zoom to 0.25×–4× in single view and every tiled layout. Retain
  image proportions and allow X/Y positioning within the exposed black space.
- [x] Fade zoomed-out video edges into black with fine dust-like speckles. Build
  up the dissolve as zoom decreases, using stable grain so export does not flicker.
- [x] Retain zoom-out in named video layouts, playlist editing, timeline previews,
  generated/replacement shows, Mac/clean output and recorded MP4s.

Pixel checks compared preview and composite frames in all five layouts in both
interfaces. Real Mac takes and an actual decoded MP4 retained the framing and
dust dissolve. Existing VFX, fullscreen, layered-export, Show Builder and responsive
browser checks passed, along with 36 JavaScript tests and 22 Python tests (plus
seven subtests). No saved-data migration is required.

## Fifth batch · 18 November 2026

Focus: six-panel layouts, unclipped menus and oblique logo flight.
Status: implemented and verified.

- [x] Add **6×**, with three columns and two rows, 32 mirror configurations,
  favourites, saved layouts, playlist/timeline rendering, Show Builder and Mac output.
- [x] Anchor Playback and Layout menus to their buttons, constrain them to the
  visible viewport and keep them above clipped/scrolled controls and fullscreen.
- [x] Give fly-along a separate **Viewing angle**, defaulting to 45° so letters
  recede into the screen. Keep a 0° straight-on option and save the authored angle.

Both interfaces passed six-grid, preset/playlist persistence and viewport-menu
checks; the actual Show Builder selector and six-cell recipe icon were verified.
GPU frames differed correctly between 0° and 45°, and existing layered/portrait
MP4 exports passed. Mac/clean output retained the six-panel layout. General browser
checks passed all 61 transition previews and desktop/tablet/phone layouts. Thirty-eight
JavaScript tests passed, including six-panel generation/replacement and camera aim.

## Sixth batch · 18 November 2026

Focus: complete fly-along endpoints and explicit direction modes.
Status: implemented and verified.

- [x] Extend the flight to clear the left edge completely, including vertical
  wordmarks, and retreat to a tiny distant point on the return journey.
- [x] Offer **One way · repeat**, **One way · once** and **Back and forth** playback.
- [x] Retain playback modes in live VFX, primary/overlaid cues, Show Builder,
  auditions and recordings, while retaining compatibility with old loop settings.

GPU readback verified tiny/close/off-screen endpoints, repeat and bounce timing,
and complete departure across 54 combinations of angle, orientation, frame shape
and reverse setting. Both interfaces and Show Builder saved the selected mode.
A decoded MP4 contained the close pass followed by an empty final frame that stayed
off-screen. Existing layered/export, VFX/fullscreen and saved-effect checks passed;
40 JavaScript motion/layer/framing/model tests passed.
