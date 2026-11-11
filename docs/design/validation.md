# Design validation record

Checked locally on **10 November 2026** using a Chromium browser and the
isolated static design server on port 8011. These checks validate the design
prototype, not the production renderer or remote-control integration.

## Layout and artifacts

- All seven screen views checked at widths **390, 768, 834, 1194 and 1440px**.
  A phone-width playlist overflow was found and fixed by constraining grid
  children and wrapping secondary actions. All 35 combinations now fit their
  viewport width; the timeline retains its deliberate internal scroll.
- Pinned Mac control bar checked after scrolling at **1194 × 834** and
  **834 × 1194**. It remains in the viewport.
- The iPad landscape private transport fits in the initial viewport after
  capping the canvas height; its measured bottom was approximately **790px**
  in an **834px**-high viewport.
- Desktop Prepare, iPad views, independent review and the annotated wireframe
  were visually inspected. The presentation gallery loads every referenced
  image. All exported assets are local; no personal video or thumbnail files
  are needed.
- Thirteen detailed PNG mockups, four low-fidelity PNGs and one annotated SVG
  map accompany the responsive HTML prototype.
- JavaScript syntax checks passed. No page-script errors were observed during
  navigation/layout checks. Local file references and Markdown links checked.

## Interaction checks

| Scenario | Result |
| --- | --- |
| Select a different preparation clip | Simulated Mac status remains unchanged. |
| Send the prepared look | Simulated Mac clip updates. |
| Library search for a colour | Only matching sample clips remain. |
| Bulk mark reviewed, then Undo | Only selected clip changes; prior state restores. |
| Remove/add a tag, add notes, Save & next | Demo correction saves and review advances. |
| Search transition catalogue | All 61 entries exist; search narrows correctly. |
| Apply transition to entry | Playlist shows Unsaved changes. |
| Mac offline | Send disabled; Open output remains available. |
| Revoked controller | Send disabled until explicit Take remote control. |
| Mac handover | Editor inert; Return control restores it. |
| Conflict while editing tags | Save retains the unsaved draft; Reload exits the example conflict state. |

## Limits of this review

No real video decoding, shader rendering, network relay, native fullscreen,
microphone input, downloads or capture runs in this prototype. The visual
artwork is static, and demo state resets on reload. Several secondary controls
illustrate placement rather than implementing a complete editor.

Physical iPad Safari, onscreen-keyboard behaviour, venue lighting, screen
reader navigation and actual Mac/projector performance remain implementation
acceptance work. Small metadata type needs physical-device review. Production
application tests were not rerun because its code and runtime were not changed.
