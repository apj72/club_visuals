# V1 design audit and corrections

**Checked against V1 source and local library · 14 November 2026**

This audit records what in the original design pack was inaccurate or risky.
It is the authority for reviewing the refreshed mockups and the reskin-only
implementation plan.

## Confirmed corrections

| Original guidance or mockup | What V1 / the library actually does | Correction for the design |
| --- | --- | --- |
| “16:9 private player” was described as if the video source were landscape. | The library contains 175 MP4s: 159 portrait and 16 square; none are landscape. A source sample is typically 1080×1920 (9:16). | Keep source media portrait. A review player presents the original 9:16 video. The Mac output is a separate 16:9 composition canvas. |
| A single 16:9 preview image implied the source had been stretched or cropped to landscape. | V1 single view fits the full source in the output canvas. Multi-tile layouts fill each fixed tile by cropping the source as needed. | Show the aspect roles explicitly: **source 9:16**, **Mac output 16:9**. Never stretch or rewrite the source. Show letterboxing for single view and tile crops for multi-view. |
| The mockup offered the same 32 pattern options for every layout. | Pattern choices are constrained by fixed tile positions. They change the four-way orientation of each tile, not which tile is next to/above another. | Show each unique orientation once. The requested counts are 8 for 2×, 16 for 4×, 24 for 6×, and 32 for 8×. The proposed 3× count of 12 was unverified; implementation confirms 16 distinct V1 signatures. |
| Pattern icons made distinct choices look identical and did not clearly show each tile's orientation. | Tile 1 and tile 2 keep their relative positions; the same fixed-grid rule applies to 4 and 8 tiles. | Draw fixed cells and orient the actual portrait thumbnail inside each cell. Never rearrange the cells to make another “pattern”. Do not show duplicate orientations. |
| Pattern preferences were attached to Prepare, with no way to curate the default choices by size. | The requested workflow is to curate the pleasing, symmetrical options per layout size, then choose among those in Prepare. | Put the preferred-pattern editor in **Settings**, separately for 2×, 4×, 6× and 8×. Prepare shows those chosen patterns first; **Show all** reveals every unique orientation for the selected size. The design must not invent which patterns are pleasing—the operator selects them by auditioning real footage. |
| Several screens and the right-hand controls extended far below the viewport. The library required page-long scrolling to reach more videos. | The operator needs the preview and controls to stay in view while browsing. | Keep the active workspace within the viewport. Scroll the library inside a bounded, roughly two-to-three-row region; keep the inspector in a fixed-height panel with its own scroll only when needed; keep the playlist timeline in its own bounded strip. Do not make the whole page the only scroll surface. |
| Native dropdowns can open as large system option sheets at the edge of iPad Safari instead of appearing beside their trigger. | This breaks spatial context and can hide most of the working screen. | For frequent layout, pattern and library choices, use an in-page menu/popover anchored to its trigger, with a clear maximum height and internal option scroll. Verify placement on physical iPad Safari. Keep native selects only where their platform presentation remains usable. |
| The mockups used abstract SVG artwork and invented clip names/tags. | The local library has real portrait videos and a saved classification catalogue. | Use extracted still frames from actual library files. Use the matching filenames and catalogue labels. Keep only small still images in the design pack; never copy full source videos into it. |
| The original implementation plan called for a separate V2 app, new routes, new runner and broad UI architecture. | The clarified request is a reskin of V1. The V1 engine and feature set took substantial work and must remain the behaviour source. | That plan is superseded. Use the optional shared-V1 `/redesign` presentation route, preserve control IDs/actions and all current workflow, and keep the original `/` available. See [the corrected implementation plan](implementation-plan.md). |

## V1 capability boundary

V1 supports 1, 2, 3, 4 and 8 tile modes. It does **not** currently have a
six-tile renderer mode. The 6× pattern selector and its 24 choices are a
requested future capability, not a reskin detail. A mockup may show it as
planned, but must label it unavailable until the engine can render a fixed
six-tile grid and map its patterns correctly. Do not change `index.html`
composition drawing, `output.html`, `vfx_engine.js` or output sizing to make
the reskin appear to support 6×.

The current V1 interface uses layout-specific preset-button lists plus a
shared 32-configuration model. The new display should map deduplicated,
layout-specific choices back to existing V1 configuration IDs. That mapping
has to be audited against the renderer before implementation. Pattern names in
the mockup are display labels, not new renderer configuration IDs.

The 16:9 output ratio is the Mac display target, not a promise that every
installed Mac display is physically 16:9. The current playlist preview can
also select other preview-frame ratios. Do not remove that existing choice or
confuse it with source-media ratio.

## Other guidance to treat as concept, not fact

- The static prototype has simulated playback, sending, fullscreen, tag saves,
  and playlist operations. Its success messages are not evidence that V1 or
  remote control has changed.
- The current design prototype does not include the production video engine.
  A static thumbnail is a visual reference, not an effect audition.
- Any rearranged screen must retain V1 playlist creation, save/load, reorder,
  timeline seeking, durations, transitions, timed cues, auto-generation, and
  play-on-Mac transfer. A screen that only shows a playlist preview is
  incomplete.
- Settings content in the mockup must distinguish actual V1 preferences from
  controls that currently live elsewhere. Do not make remote ownership,
  fullscreen, audio, or download actions appear functional in the concept.
- Keep playlist videos available in a compact fixed-height selector, so adding
  an entry does not send the timeline and preview far down the page.
- The labels “High definition”, “Ultra”, or any material/3D option in a mockup
  describe only controls that already exist in V1. Do not turn a visual sample
  into a claim of a new engine feature.

## Library stills used in the refreshed mockups

Each JPEG under `assets/library-stills/` is a single frame extracted from the
matching local source below. The original MP4 remains in `downloads/` and is
not duplicated here.

| Still | Source video | Source dimensions |
| --- | --- | ---: |
| `library-01.jpg` | `Video by glass_void_DcjPtCmNrhd.mp4` | 1080×1920 |
| `library-02.jpg` | `Video by hellothoughtpalace_DbMzTEclnhS.mp4` | 1080×1920 |
| `library-03.jpg` | `Video by riebschlager_Da4LyKzRrEB.mp4` | 1080×1920 |
| `library-04.jpg` | `Video by isosceles.vj_DctbXPKOfPX.mp4` | 1080×1920 |
| `library-05.jpg` | `Video by pigmentsunbound_DdMlp9ITPhu.mp4` | 1080×1920 |
| `library-06.jpg` | `Video by matilda_ai_music_Dbh6Mc6tN7y.mp4` | 1440×2560 |
| `library-07.jpg` | `Video by andythomasartist_Dbrf7hlzaDg.mp4` | 1080×1920 |
| `library-08.jpg` | `Video by fire_inthehead_DbY9e8XuoV0.mp4` | 1080×1920 |

Tags and review states come from the local `library_catalog.json` snapshot at
the time this concept was generated. They are fixture examples and do not
update when the real catalogue changes.

## Implementation findings, 14 November 2026

The live selector derives exact signatures from V1 CONFIGS and its position
maps: dual 8, triple 16, quad 16, octo 32. The proposed triple count of 12 was
an unverified assumption. V1 clears transforms for single preview, so the
reskin does not offer a misleading single-orientation selector. Six tiles
remain unimplemented. Icons use a numbered asymmetric F marker to make all
four flips legible without relying on symmetry within a particular video.

The latest isolation requirement supersedes in-place source editing: the
optional launcher injects presentation files into the V1 document response
only at `/redesign`. Original `/`, host, output and controllers remain V1.
