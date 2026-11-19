# Design-study validation

Checked 15 November 2026. These results validate the design artifacts and limited
interactive sketch, not a production sequence compiler or live layout engine.

## Source review

Reviewed the current playlist entry model, duration calculation, cue normalization
and scheduling, playback entry path, timeline drawing/seeking, mirror slot maps,
transition registry and VFX material/rotation code. The proposal distinguishes
representable V1 data from new runtime features instead of assuming every control
can already be scheduled.

Verified that all three named short-example videos exist in `downloads/`.
The mockup references existing portrait JPEG stills under
`docs/design/assets/library-stills/`; no MP4s were copied or transcoded.
The hour example is a query proposal, not a generated playlist. A read-only check
found 20 exact filename matches for its broad theme/exclusion query in this
catalogue snapshot; actual compiler resolution must additionally apply verified
canonical identity and all constraints. Its 180 clips repeat a qualifying pool;
it does not promise 180 distinct unused videos. Add more playlist exclusions to
exclude further sets; insufficient pools must fail explicitly.

Checked 4× P15↔2× P7 and 8× P27↔4× P15 survivor flip compatibility against V1's
one-based IDs and slot maps. The demo follows those maps for its still-image
illustration. This is not frame-level proof for the future engine.

## Browser checks

Used installed **Google Chrome**, headless, through Python Playwright, with an
isolated temporary profile. No Brave profile or normal Chrome profile was used.
Opened only the local design HTML via `file://`; did not send app commands or
connect to the playout server.

Passed:

- JavaScript syntax check with `node --check`.
- Both short examples build: 60 seconds, respectively 3 static clips and 2 clips
  with 4 layout-motion events. Declared duration agrees with explicit clip totals.
- Scrubbing to 8.6 seconds produces the illustrated 4×→2× midpoint; 38.6 seconds
  produces 8×→4×. The source still is drawn using isotropic cover, not stretching.
- Moving a layout event onto its incoming transition gives a diagnostic and keeps
  the last valid preview. Invalid edits do not replace the successful plan.
- Editing branding position to (70%,75%) updates its illustrated position/state.
- Play advances time, Pause stops it, jump buttons seek into movement, and timeline
  clip selection reveals the corresponding source line.
- Selecting a layout-event line in the text seeks to its illustrated midpoint.
  Download script produces the proposed `.cvseq` file without saving to the app.
- Desktop 1600×1060, iPad landscape 1194×834, iPad portrait 834×1194 and narrow
  390×844 widths: no document-level horizontal overflow. Portrait panes switch
  between Preview/Write/Timeline/Details; the document does not scroll vertically.
- No uncaught browser JavaScript errors during those interactions.
- Relative document links, still-image bindings and exact short-example filenames
  were checked on disk.

Screenshots in `mockups/` were inspected after capture. The static screenshots
show different points in the illustration; they are not video output captures.

## Intentionally unverified or unavailable

- No live video, real transition shader or high-definition chrome/3D shading is
  rendered in this sketch. The branding label is a positional illustration.
- No physical iPad Safari run, Mac fullscreen playback, output recording,
  clock synchronization, frame-rate measurement or engine regression test was
  performed for a feature that has not yet been implemented.
- The sketch parser accepts only its documented subset. Seeded pools, arbitrary
  cue/effect layers, musical time, generators and imports need the proposed
  production compiler and tests; the hour example is not executable here.
- The sketch accepts the examples' chrome material metadata but does not render
  it. It is not a validator for the complete language or every V1 parameter range.
- Existing production files and personal playlists were not modified by this study.

The [implementation gates](implementation-plan.md) specify the additional evidence
required before any part of this proposal controls a live show.
