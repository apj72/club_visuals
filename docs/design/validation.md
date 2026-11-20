# Design validation record

Refreshed on **14 November 2026** using installed Google Chrome in headless
mode. These checks validate the static design prototype and its exported
screenshots, not V1 playback or remote-control integration.

## Layout and artifacts

- Rendered the prototype screens in Chrome at **1440 × 1050**, the iPad
  landscape capture at **1194 × 834**, and iPad portrait at **834 × 1194**.
- Regenerated 15 detailed PNGs and four low-fidelity PNGs from the revised
  prototype. Captures are viewport-sized rather than full-page scroll captures.
- The prototype now labels the Mac composition as **16:9** and the reviewed
  source as **9:16**. Layout previews keep portrait stills in a 16:9 canvas.
- The Settings concept groups preferred mirror patterns by 2×, 4×, 6× and 8×.
  The design displays 8, 16, 24 and 32 unique choices respectively. Six-up is
  marked planned because the V1 renderer does not implement it.
- The visual overview, Prepare, library, review, pattern, Settings and iPad
  controls-open captures
  were inspected after regeneration. Real source-video stills are local JPEG
  derivatives; full MP4s are not copied into `docs/design/`.
- Chrome reported no page-script errors across the captured screens.

## Interaction/rendering limits

The prototype shows static video frames and simulated UI actions. It does not
play the source videos, contact V1, send commands, save tags or playlists, or
render the V1 mirror engine. The orientation thumbnails communicate fixed tile
positions and four-way flips; their displayed pattern numbers are mockup labels
and must be mapped to existing V1 configuration IDs before implementation.

Physical iPad Safari menu placement, safe-area/keyboard changes, real video
decoding, V1 composition parity, remote control, native Mac fullscreen,
microphone input and venue display performance remain implementation checks.
No production application code or playback logic was changed in this design
audit.
