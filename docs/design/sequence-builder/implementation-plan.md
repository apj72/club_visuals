# Implementation and integration plan

Design only · 15 November 2026. Production files and personal playlists are
unchanged by this study. This plan separates the text-authoring feature from
the new playback capabilities it can eventually request.

## Baseline and connection map

Work on a new feature branch based on the current working application, preserving
the V1 launch route and the optional presentation route. Capture a baseline
commit/tag only after reviewing existing uncommitted work; do not reset it or
create a new application from an old V2 prototype. The source editor is an
optional playlist view, hidden behind a launch/feature flag until validated.

| Existing implementation | Reuse / boundary |
| --- | --- |
| `index.html`: playlist entry construction, normalisation, save/load and `playlistEntrySeconds()` | Generate the same entry contracts. Import/export through the same storage/API path. |
| `index.html`: `normalisePlaylistCue()`, `applyPlaylistCue()`, `schedulePlaylistCues()` | Map compatible single-scene schedules to current cue objects; do not rebuild 3D text/logo rendering. |
| `index.html`: `playEntry()`, `showVideo()`, layout application | Reuse for compatible plans. Do not split one clip to imitate continuous motion. |
| `index.html`: `CONFIGS`, slot maps, crop/zoom functions, `drawTimelineFrame()` and timeline source seeking | Establish one shared source of geometry/crop truth before adding motion; preserve static outputs. Existing code has multiple rendering paths to reconcile. |
| `transition_engine.js` | Query the registry, parameters, easing and flash policy; reuse transition rendering/preview. |
| `vfx_engine.js` | Reuse high-resolution text extrusion, materials, reflections and cue controls. |
| `remote_control.js`, `server.py`, native output paths | Use current ownership, server persistence, Mac host and fullscreen behavior. Extend capability negotiation only where needed. |
| `library_catalog.json`, existing library/preset APIs and featured layout preferences | Read metadata and resolve references; do not fork the catalogue/preset data. |
| `ui-redesign/launch.py`, presentation scripts | Add entry point/view to the existing optional UI; no second engine/server. |

File/function names reflect this checkout, not a proposed public API. The first
engineering task is a small adapter interface around them. Do not copy internal
functions into a new UI merely because the original closures are inconvenient.

### Proposed new modules

- `sequence/parser`: syntax tree retaining comments, ranges and formatting.
- `sequence/compiler`: validation, finite expansion, bindings, timing, capabilities.
- `sequence/v1-adapter`: current playlist JSON import/export and cue translation.
- `sequence/editor`: text/timeline/inspector view; patches text instead of a second
  independent authored model.
- Later: shared `layout-motion` evaluator and versioned event runtime inside the
  common playback architecture, used by all relevant render paths.

Paths are illustrative; keep actual module structure consistent with the repo.
No framework/editor dependency is chosen by this document.

## Gate 0 — verify contracts before implementation

Inventory representative real playlists: seconds and loop-count durations,
all layouts and unique presets, transitions, logo/text/material cues, edge cases
and unknown fields. Copy fixtures into a test workspace without changing personal
data. Record normalized JSON and representative rendered output. Verify both UIs
still use the same playlist store and current Mac/native output behavior.

Resolve known dependencies explicitly:

1. Current script internals need callable adapters; expose/refactor without changing
   existing UI behavior. There is no current `.cvseq` parser or compiler.
2. Existing timeline seeking offers useful reuse, but live cue scheduling uses
   timers. A shared deterministic plan evaluator is additional work, not a free
   property of the current playlist code.
3. Entry colour persistence, continuous properties, six-up, layered VFX and layout
   motion each need capability support. Unknown capability means unsupported.
4. Overlay top-left Y conversion must be verified with calibration frames, not
   guessed from UI labels or WebGL coordinates.

Do not imply these are UI-only changes. Implement engine work on the feature
branch with legacy paths retained and narrowly scoped contracts/tests.

## Gate 1 — useful authoring over existing playlists

Deliver an explicit subset: show/media/look, fixed clip durations, incoming
transitions, existing static entry settings, single-scene logo/text/VFX spans,
finite repeat and sections. Include import and exact-duration reporting.
Unknown/unsupported syntax produces errors, never a partial live playlist.

Add the source view alongside current playlist editing. Build→private audition→
save/new playlist→send uses existing APIs and remote ownership. Implement global
cue splitting and initial/reset states carefully; warn or reject continuous sweep
requirements crossing entry boundaries. Read parameters from current registries.
Keep comments and selection mapping through edits. Use existing private rendering
paths rather than a separate composition implementation.

Acceptance: the first example produces identical normalized entries/cues/timing
to a manually configured V1 playlist. Save/reload from both UI routes. Compare
preview/output/recording. A syntax error, offline Mac or save conflict cannot
alter the running show. New view disabled leaves V1 operational.

## Gate 2 — generation and dependable editing

Add deterministic pools, tag similarity, exclusions, seed locks, exact-duration
fill, shared undo history and source-aware visual edits. Add a library drawer,
actual transition previews, pattern preference resolution and source completion.
These are compiler/editor features; they should not require changes to how an
ordinary playlist plays. Optional AI drafting can come later.

Acceptance: the same source+lock yields the same entries on Mac and iPad. Pool
constraints never silently relax. Show total remains exact through repeats,
cue schedules and transition durations. Reload does not regenerate pool choices.
Touch editing and portrait keyboard use keep transport and compile state visible.

## Gate 3 — shared layout-motion vertical slice

Implement the [motion contract](layout-transitions.md) for 4×↔2× and 8×↔4× only.
Create a pure time-based geometry/crop evaluator and a small runtime event plan.
Anchor it to a Mac-owned show clock; pause/seek/Next/Stop are explicit state
transitions. First release rejects event collisions and incompatible survivor
patterns. Runtime advertises `layout-motion` and its version.

Reuse the existing source decoder for a clip and current renderers for all final
states. Make preview, Mac output and capture call the shared evaluator. Do not
build a CSS-only preview while leaving recording or native output different.
Do not use adjacent playlist entries or per-frame remote messages as a substitute.

Acceptance: all endpoint, source-clock, aspect, cancellation, recording and
legacy regression checks in the motion document pass on actual target devices.
Measure normal output resolution/frame rate and report dropped frames. An older
Mac/runtime refuses the motion plan with a clear capability message.

## Gate 4 — advanced composition, separately scoped

Add continuous property tracks, then independent overlay layers/compositing and
six-up if still wanted. Each needs a named runtime capability, versioned data,
preview/output parity and separate tests. Preserve the existing 3D text/material
renderer while adding composition controls; do not regenerate simpler text.

Add generalized clip-layer X/Y/size only with a real source/layer model. Keep crop
pan distinct. Defer live tempo-following and offline rendering: each is a separate
clock/export project, not syntax-only work.

## Storage, migration and rollback

Proposed new source store: `playlist-sequences/<slug>.cvseq` with a bindings lock
and compiled manifest sidecars. Confirm final location against existing server
conventions before implementation. Bindings include actual media names, seed,
catalogue/preset revision, resolved transitions and compiler/runtime versions.
Manifest includes source hash, source ranges, duration and capability set.

Compatible exports go through the existing `playlists/<slug>.json` writer. Do not
add undocumented required fields to old entries. Keep provenance outside the
legacy payload until its loader's unknown-field behavior is verified. Use atomic
writes and revision checks for concurrent Mac/iPad edits. First import/save uses
a new name; replacing a saved playlist is an explicit action with a visible diff.

Motion plans require a versioned extension/runtime; an older app must not silently
play them as static entries. Store them separately until capability negotiation
and all consumers support them. Do not advertise a new plan in the V1 dropdown
as fully playable by an old runtime.

Rollback before Gate 3: disable the source view; ordinary compiled JSON remains
playable by V1, source/locks stay available for later editing. After Gate 3:
disable new runtime features and select a known compatible playlist. Motion-only
shows remain saved but unavailable until that runtime is restored. Never claim
that disabling an engine extension preserves its newly introduced functionality.

## Verification and review artifacts

- Parser/semantic fixtures: comments, source mapping, units, time precision,
  invalid ranges, finite expansion, ambiguous assets and useful diagnostics.
- Compiler invariants: exact duration, no overlap loss, cue boundary behavior,
  deterministic pool bindings and capability errors instead of dropped features.
- Adapter golden fixtures: normalized output agrees with existing playlist/cue
  contracts; unknown imported data is preserved or blocks round-trip safely.
- Motion evaluation tests: endpoint parity, reverse paths, source aspect, flips,
  gaps/seams, seek/pause/Next/Stop and timing collisions.
- Headless Chrome UI checks plus physical iPad/Mac rehearsal: bounded panes,
  filters, source/timeline links, source patching, private/live separation and
  output/recording parity. Headless still-image mockup QA cannot prove live playback.

For each gate provide supported syntax list, sample scripts, before/after JSON,
test results and a short recorded rehearsal. Release only the supported subset.
No gate requires replacing the existing app with a parallel implementation.
