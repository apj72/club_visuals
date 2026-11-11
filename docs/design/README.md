# Club Visuals — UI design proposal 01

**10 November 2026 · Design for review, not a replacement application.**

Start with the [visual overview](index.html), then explore the
[interactive prototype](prototype.html). Both work directly from disk in a
browser; there are no dependencies, external fonts, build steps or API calls.
The prototype uses eight invented clips and original SVG illustrations. It
does not load personal media, change tags or send commands to the Mac.

The direction is a quiet charcoal workspace with a large video canvas, a lime
live action, and contextual editing. Four main destinations are **Prepare**,
**Playlists**, **Library** and **Auto Perform**. **Capture** and **Setup** are
secondary destinations. The Mac control bar stays visible across all of them.

For implementation, follow the [reversible implementation plan](implementation-plan.md).
It specifies an isolated test installation, an optional `/ui-v2/` route,
preservation of the current interface and engine, data backups and rollback.
Those implementation safeguards are instructions to build, not features already
provided by this static prototype.

## Open it

Open `docs/design/index.html` in a browser. Alternatively, from the repository:

```sh
python3 -m http.server 8011 --bind 127.0.0.1 --directory docs/design
```

Then visit **http://127.0.0.1:8011/**. This is a separate design-preview server;
the production server on port 8008 does not serve arbitrary documentation.

For physical iPad review, run the same command with `--bind 0.0.0.0`, then open
`http://<Mac-local-IP>:8011/` from Safari on the same local network. The mockup
still has no access to the app's playout APIs. Stop the preview server with
Ctrl+C when finished.

## Suggested review, about ten minutes

1. **Prepare:** choose another clip from the shelf. The Mac status keeps its
   previous clip. Edit the 3D text, then press **Send to Mac**. Only the
   simulated Mac status changes. Open the Layout, Colour and VFX sections.
2. **Playlists:** select an entry, open its incoming transition, search all 61
   effects, then **Use in selected entry**. Notice the unsaved badge; saving
   and sending are different actions.
3. **Library:** search/filter clips, select several, mark reviewed, then undo.
   Open **Review tags**, remove a chip, enter a replacement, and **Save & next**.
   Open **Tags & usage** to inspect a theme and try rename/merge or removal.
4. **Auto Perform:** inspect the Mac audio status and start/stop the simulated
   engine. Open curation and text lists to see their proposed placement.
5. **System states:** use the concept toolbar at the very top to try Mac
   offline, revoked iPad control, Mac handover, preparing a Safari video and
   tag-save conflict. Return control through the handover dialog.
6. **iPad:** narrow the browser or open the prototype on the device. Scroll
   while watching the pinned live controls. In portrait, the inspector moves
   below the preview.
7. **Wireframes:** press **Wireframe** in the top toolbar. Navigation and the
   same interactions remain available with the styling reduced.

## What works in this prototype

- Navigation, responsive layouts and the wireframe toggle.
- A simulated separation between selected preview and playing Mac clip.
- Simulated Send, playlist Send, Next, Stop, output-window mode and ownership.
- Inspector selection, editable text, material selection and control values.
- Library search, theme/review filters, selections and hidden-selection count.
- Per-clip review, one example tag per category, notes and reviewed flag.
- Save & next, bulk mark reviewed, theme rename/removal and one-step undo.
- Searching all 61 actual transition definitions, category filters, parameter
  fields and the selected-transition/unsaved-playlist interaction.
- Offline, revoked-control, handover, proxy-preparation and conflict examples.

State is in memory and resets on reload. In this small demo, each category has
one example tag, and removing a theme through vocabulary management uses an
“Untagged” display value. The real implementation must retain arrays of up to
12 tags/category and represent no assignments as an empty array, not a tag
named “Untagged”. The demo review queue cycles through the eight example clips;
production must use the current filtered queue and end with Save & finish.

Video playback, 3D shading, transition rendering, audio analysis, file saves,
downloads, fullscreen windows and capture are **illustrative or simulated**.
Secondary dialogs show proposed control placement; they are not complete
editors. Sliders demonstrate controls, not a rendering pipeline. The prototype
deliberately does not import production scripts or contact port 8008.

## Deliverables

| Artifact | Use |
| --- | --- |
| [Visual overview](index.html) | Presentation with linked mockups, iPad views and wireframes. |
| [Interactive prototype](prototype.html) | Explore seven screens and system states. |
| [Interactive wireframes](prototype.html?wireframe=1) | The same layout and navigation in low fidelity. |
| [Design specification](design-specification.md) | Information architecture, interaction contracts, tokens, feature mapping and implementation phases. |
| [Reversible implementation plan](implementation-plan.md) | How to build alongside the existing UI, isolate development, preserve data compatibility and back out. |
| [Annotated layout map](wireframes/layout-map.svg) | Numbered Mac/iPad structural diagrams in editable vector form. |
| [Prepare / Mac](mockups/01-prepare-mac.png) | Detailed desktop preparation workspace. |
| [Playlists](mockups/02-playlists.png) | Timeline, preview and selected-entry inspector. |
| [Library](mockups/03-library.png) | Browse, classification and bulk selection. |
| [Tag review](mockups/04-review-tags.png) | Independent review player and editing form. |
| [Transitions](mockups/05-transitions.png) | Searchable catalogue and audition inspector. |
| [Auto Perform](mockups/06-auto-perform.png) | Mac audio status and performance controls. |
| [Capture](mockups/07-capture.png) | Crop and export controls. |
| [Setup](mockups/08-setup.png) | Connections, folders and persistence scope. |
| [iPad landscape](mockups/09-ipad-landscape.png) | 1194px viewport width, full-page capture. |
| [iPad portrait](mockups/10-ipad-portrait.png) | 834px viewport width, full-page capture. |
| [Mac handover](mockups/11-mac-handover.png) | Dimmed editor with reachable recovery actions. |
| [Offline](mockups/12-offline.png) | Uncertain Mac status and disabled live commands. |
| [Conflict](mockups/13-conflict.png) | Preserved tag draft and reload/reconcile guidance. |
| [Prepare wireframe](wireframes/01-prepare.png) | Low-fidelity desktop composition. |
| [Library wireframe](wireframes/02-library.png) | Low-fidelity browse/review structure. |
| [Playlist wireframe](wireframes/03-playlists.png) | Low-fidelity sequence structure. |
| [iPad wireframe](wireframes/04-ipad.png) | Low-fidelity portrait flow. |

PNG exports are screen documents, not device photographs. Most use full-page
captures to show below-the-fold controls; the transition and state examples
use viewport captures. The **1194 × 834** and **834 × 1194** labels identify the
browser viewports used, not necessarily the exported PNG height.

## Source and validation

The design was informed by the [product reference](../product-reference.md),
[UI reference](../ui-redesign-reference.md),
[technical reference](../technical-reference.md) and
[transition catalogue](../transition-catalogue.md). `transitions.js` is a
read-only snapshot of the real registry; the design does not load its renderer.

Browser checks cover navigation, all 61 transition entries, preview/live
separation, tag correction/undo, connection states, responsive overflow and
pinned controls. See the [validation record](validation.md) for measured sizes
and limitations. Physical iPad video, microphone permissions and native Mac
fullscreen need testing when the real UI is implemented.

The production app and its personal data are unchanged by this design pack.
