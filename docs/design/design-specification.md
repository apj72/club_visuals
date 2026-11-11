# Club Visuals — proposed interface

**Proposal 01 · 10 November 2026**

This document describes a proposed UI, informed by the four current reference
documents. The [prototype](prototype.html) and [mockups](index.html) illustrate
the direction. Existing product behaviour remains the implementation contract;
sample values and simulated interactions are not new capabilities.

## 1. Design direction

Give the video most of the space. Make the destination of every action easy to
read. Keep frequent performance controls available, then reveal creative depth
where the operator is already working.

The visual language is dark graphite, restrained borders and generous spacing.
Video supplies the colour. Lime identifies the deliberate send/start action;
muted aqua identifies private editing and metadata. Warm red identifies Stop
or a destructive metadata operation. Text and icons communicate the meaning
alongside colour.

The main improvement is structural: move away from a long page of equally
prominent panels toward a small set of task-oriented workspaces. Download
authentication and folders should not compete with the performance preview.
Advanced material controls should not occupy space when editing a playlist's
duration. Classification deserves a complete browse/review workflow.

## 2. Information architecture

```text
Persistent shell
├── Mac status + live commands
│   ├── Owner / engine / output / most recent command
│   └── Open output · Mac fullscreen · Next · Stop · Send
├── Prepare
│   ├── Private player + transport
│   ├── Inspector: Layout / Colour / VFX / 3D text
│   └── Library shelf · saved layouts · Add current look
├── Playlists
│   ├── Playlist picker / new / rename / save / delete
│   ├── Private audition + timeline + entry inspector
│   ├── Transition browser + independent A/B audition
│   └── Timed cues · automatic generation · effect scripting
├── Library
│   ├── Search / filters / arrange / grid
│   ├── Selection / bulk edits
│   ├── Independent video review
│   ├── Tags & usage / rename / merge / remove / undo
│   └── Instagram import / source deletion
├── Auto Perform
│   ├── Mac audio / tempo / confidence / musical status
│   ├── Profile / interval / pool / holds
│   └── Curation / text lists / decision log
├── Capture
│   ├── Instagram clip / crop / loop join / conversion
│   └── Full editor recording
└── Setup
    ├── Output / iPad connection / Mac audio permission
    ├── Folders / Instagram cookies
    └── Reduce flashes / diagnostics / storage explanation
```

The prototype has seven screen views: the four primary workspaces, Capture,
Setup, and a contextual Transitions view reached from Playlists. The latter
does not need its own global navigation item.

Use existing concepts consistently: **video**, **look**, **saved layout**,
**playlist**, **entry**, **transition** and **cue**. “Scene” remains a VFX scene;
do not use it as another name for a playlist or saved look.

## 3. Persistent Mac control bar

Place the status/control bar below app navigation. Keep both pinned while the
document scrolls, including iPad safe areas. The thin concept toolbar at the
top of the prototype is review tooling and must not ship in the app.

The bar has three groups:

1. **Destination:** “Playing on Mac”, stopped or unavailable; current clip
   thumbnail/name and whether a playlist is running. This is metadata/status,
   not a monitor video. Never make it look like a live image feed.
2. **Connection:** command owner, engine health and dedicated window mode.
   Compact layouts keep a readable summary beneath the clip name.
3. **Actions:** Open output, Mac fullscreen, Next on Mac, Stop Mac, and Send
   to Mac. On Playlists, the primary label becomes Play playlist on Mac.

The context-dependent primary action must have an explicit label. From Library
or Setup, Send to Mac still sends the prepared look, not the selected review
video. In implementation, expose the prepared filename in the action's
supporting text or accessible description. Disable it until a valid look
exists. Next is enabled only for a running Mac playlist.

Open output may remain available when the engine is offline because it can
start the dedicated window. After opening, show “Starting Mac engine…” and
wait for status. Fullscreen means the **dedicated native Mac window** and must
use the existing output-window API; it must not call requestFullscreen on the
iPad document. Opening/focusing preserves the window's existing mode.

Stop retains its current semantics: stop playlist/Auto Perform activity and
pause playback. The last frame may remain. It is not labelled Blackout.
Do not add remote live Pause, Resume or Record without engine/API work.

### Command feedback

Every live action uses the existing request/result correlation:

| State | Presentation |
| --- | --- |
| Ready | Normal action label; engine and owner shown. |
| Preparing | “Starting Mac engine…”; prevent duplicate conflicting submissions. |
| Sent | “Sent — waiting for Mac”; never imply that sending equals success. |
| Confirmed | “Now playing [filename] on Mac”; update from engine report. |
| Failed | Persistent inline reason and an explicit retry where appropriate. |
| Unconfirmed | “Mac has not confirmed this command”; retain the last confirmed status. |

Success can use a short status message. Failure/uncertainty must stay until
resolved or dismissed; do not rely on a disappearing toast. The prototype's
immediate simulated confirmations are an interaction demonstration only.

## 4. Workspace details

### Prepare

Default to a large 16:9 private player with filename, layout/loop summary,
play/pause, seek, mute and Preview fullscreen. Allow the existing alternative
preview frame ratios. Keep transport outside the video so it is discoverable
on touch. On shorter landscape viewports, fit the canvas and transport into
the available height with letterboxing; do not crop the composition to fit UI.

The inspector has four sections:

- **Layout:** Single/Dual/3x/4x/8x, mirror patterns, playback mode, speed,
  zoom/pan, captions and Reset. Saved layout menu exposes save/load/delete and
  add-to-playlist. Say exactly what a layout stores.
- **Colour:** presets and common colour controls; invert, sepia and trails
  under an expanded detail section.
- **VFX:** scene, enable, intensity, feedback and pulse. Object source leads to
  logo/artwork controls. Mirror sculpture retains its separate settings.
- **3D text:** content, typeface, nine finishes, reflection and render quality.
  Shape, light and motion expand to expose bevel, roughness, depth, position,
  scale, rotation, auto-axis/sweep and environment settings.

The default mockup opens 3D text to illustrate the recent renderer work.
Implementation should remember the last inspector section per browser. The
scene shared by logo/text should have a clear label, such as “3D logo / text”,
while preserving the saved scene ID.

Below the player, a small library shelf makes choosing the next look fast.
Browse all videos opens Library. Selecting a video changes only preparation.
Add current look uses the existing workflow that copies active effects to a
playlist cue. It is not a new general-purpose saved-look format.

### Playlists

Keep preview above the sequence. Select an entry to edit its duration,
incoming transition, copied layout and timed cues in the right inspector.
Show Saved/Unsaved beside the playlist name. Save and Play playlist on Mac
must be separate actions with separate feedback.

Display whole entries with duration and transition boundaries. Provide move
left/right, add and remove alternatives to dragging. Retain time ruler,
scrubbing, ±1 second navigation, timeline zoom and loop. This is not a
frame-accurate cutting editor; do not imply source trimming with edit handles.

Transition boundaries open a contextual browser. Search all 61 entries from
the registry, preserve its categories/IDs, and show warning labels. Independent
A/B audition uses duration, pace, seed and the effect's actual parameters.
Use in selected entry copies the audition settings and marks the playlist
dirty. Cut has no meaningful duration; disable/hide its timing control in the
implementation. Report GPU fallback explicitly and retain Reduce flashes.

Cue editing stays separate: time within entry, effect/Off, text/logo/scene,
material, position and motion. Auto-script affects only entries without cues.
Auto-generate constructs an editable playlist from eligible visible videos;
its wording must not imply that Auto Perform is starting.

### Library and classification

Use a visual grid with filename/display title, duration, category chips and
Reviewed/Needs review. The mockup uses friendly invented names; production
must derive labels from current filenames/metadata and expose full filenames.
No new renaming or automatic title-generation capability is assumed.

Search plus common Theme and Review filters stay prominent. Colour, Visual
type and Arrange by fit a filter drawer on small screens. Show active-filter
count and Clear filters. Manual reordering is available only with unfiltered
My order; alternative sorting must not rewrite that order.

Use explicit selection checkboxes and a bulk toolbar. State the total count,
including selections outside the visible filter. Select shown and Clear
selection remain available. Distinguish selecting from preparing a video.

Review opens an independent player beside three chip/picker groups, notes
and Reviewed. Controls remove individual tags with touch-sized targets. Keep
Previous/Next, Cancel, Save and Save & next. At the end of the filtered queue,
use Save & finish. Unsaved navigation preserves the existing save-or-cancel
guard. Closing the dialog releases its decoding resources.

Tags & usage is a separate view in Library. Category tabs expose Themes,
Colours and Visual types. Show counts and assigned thumbnails before rename,
merge or removal. The concept implements the Theme example; all three
categories must use the same complete workflow in production. Display the
affected count on the final action; no additional blanket approval flow is
needed for routine tag edits.

Keep expectedRevision checks, atomic bulk writes and one-level shared Undo.
On a conflict, retain the user's draft and explain Reload saved tags and
reconciliation. Reload must make clear that it replaces the draft; ideally
offer a copyable draft summary before reload. Never silently save over a newer
revision or offer permanent multi-step history that the server does not have.

Source deletion belongs in a card/detail overflow menu, away from tag removal.
Explain that deleting a video does not repair playlist references. Download
progress lives in the import panel and persists while the operator browses.

### Auto Perform

Lead with Mac input, tempo/confidence, musical section and next-change state.
The simulated meter and sample BPM in the mockup are not performance claims.
Start/Stop Auto Perform explicitly targets the Mac. Hold video, Lock layout,
Next on beat, Tap tempo and Resync belong together as live actions.

Profile, 4/8/16-bar interval and video pool form a compact settings panel.
Label the pool accurately: Entire library ignores browse filters. Curate
videos controls exclusions and Calm/Medium/Peak; those are browser-local
performance preferences, separate from shared classification.

Text lists provide list selection, add/edit/remove/enable, Show now,
copy/rename/delete, and source types. Starting remote Auto Perform copies
enabled entries, pool and curation. Changing browser settings afterwards does
not imply continuous synchronization. Recent decisions are a log, not an
editable replay timeline.

Mac audio setup retains the resident engine on close. First-use microphone
permission may need local Mac interaction. Preview audio belongs to the
preview's device; its controls must not be labelled Mac audio.

### Capture and Setup

Capture has Instagram clip and Full recording modes. Both name the source as
**this editor's preview**. Clip capture shows frame ratio, movable crop, start,
duration, overlap/transition and destination. Provide numeric crop alternatives
to dragging in implementation. Keep all current duration/overlap constraints.

Show capturing, waiting for a loop boundary where applicable, converting,
ready/download and failure separately. Clip output is silent; full recordings
include source audio only when unmuted and supported. Stop other local
capture/playback modes when required by the existing workflow.

Setup contains output/network, Mac input, source/clip folders, cookie status
and refresh, Reduce flashes and concise diagnostics. Folder browsing targets
the Mac server. Group settings by scope: Mac-shared, this browser or session.
Expose troubleshooting in context, without presenting internal API names.

## 5. Responsive behaviour and accessibility

| Width / situation | Behaviour |
| --- | --- |
| Above 1200px | Spacious two-column preparation and playlist editing; 304px inspector; 4-column library. |
| 901–1200px | Two-column canvas/inspector with tighter spacing; compact connection summary; 3-column library. |
| 541–900px | Navigation wraps to a dedicated row; status and live actions use two rows; inspector stacks below preview; 3-column library. |
| 540px and below | Two-column library, stacked dialog content and wrapped live actions. Phone is a fallback, not the primary performance target. |
| Short landscape screen | Canvas height fits the available viewport, with letterboxing. Advanced controls remain in the scrollable document. |

Use the document as the main scroll surface. Avoid several nested vertical
scroll areas on iPad. A timeline can have deliberate horizontal scrolling;
the overall page must not overflow. Dialogs can scroll internally and should
keep their action footer reachable with the onscreen keyboard.

Production requirements:

- At least 44×44 CSS-pixel touch targets for product actions, with visible
  gaps; labels may be visually smaller within a sufficiently large hit area.
- Body/control text ideally 14px; primary descriptions 13–14px. Small 10–11px
  metadata in these mockups needs physical-device legibility review before
  finalizing. Never use small text for the sole error or destination label.
- Keyboard-operable navigation, explicit labels and visible focus rings.
  Scope shortcuts away from text inputs; no accidental sends while typing.
- Native dialog focus containment and restoration to the trigger. Returning
  Mac control must work above any open dialog and restore the user's draft.
- Associate labels/help/errors with controls, announce save/command status,
  and communicate selection/ownership without relying on colour alone.
- Keep reduced motion and Reduce flashes distinct. Do not animate background
  artwork in the shell; video is already the focus.
- Add scroll margins based on actual pinned-shell height so focus/anchors are
  not obscured, including Safari safe-area and keyboard changes.
- Preserve a usable empty-library, missing-media, unavailable-GPU and failed
  preview state. A blank black canvas is not a sufficient loading/error UI.

## 6. State and recovery specification

| State | What the operator sees / can do |
| --- | --- |
| Connected, owns control | Private editing available, applicable live actions enabled. |
| Mac engine offline | Persistent connection banner, last status marked unavailable, live commands disabled, Open output/reconnect available. |
| iPad ownership revoked | Private editing continues; Take remote control is explicit. No automatic reacquisition on heartbeat. |
| Mac controlled by iPad | Dim and inert Mac editor/shortcuts; Return control and Open output remain reachable, even above a dialog. |
| Controller heartbeat lost | Mac unlocks after existing expiry. Do not imply that the running show stops. |
| Safari proxy pending | Visible preparing state and retry/error treatment; other independent work remains possible. |
| No audio permission/input | Clear Mac setup action; no fabricated tempo or “listening” status. |
| Weak tempo confidence | Show uncertainty and hold current look according to existing engine decisions. |
| Tag conflict | Retain draft, explain newer saved version, reload/reconcile; no overwrite. |
| Missing source | Mark affected playlist entry, allow repair/removal; never silently substitute another clip. |
| Output/browser restart | Report reconnecting, then actual recovered state; do not promise a resumable show checkpoint. |

The prototype state selector covers the first five visible examples plus
proxy preparation and tag conflict. It is review tooling, not a proposed
end-user system-state switch.

## 7. Visual system

| Token | Value / intended use |
| --- | --- |
| Background | `#111414` |
| Panel | `#191D1D` |
| Raised control | `#222727` |
| Border | `#343D3C` |
| Primary text | `#F1F3ED` |
| Secondary text | `#A6B1AD` |
| Primary action | `#C1F477` with `#17220C` text |
| Private / informational accent | `#9CDED4` |
| Attention | `#F2C883` |
| Stop / destructive | `#FFAAA5` |
| Focus | 3px aqua outline, 3px offset |
| Type | System sans; monospace for timecodes; no external font dependency |
| Spacing | 4 / 8 / 12 / 16 / 20 / 24 / 32px |
| Radius | 7px controls; 12px panels; 14px dialogs |

Reserve heavy contrast for the video and the next deliberate action. Avoid
glowing borders around every panel. Material spheres are useful previews;
the prototype's CSS swatches are illustrative and must eventually use accurate
material examples. Icons must have labels or accessible names. The abstract
SVG art is original placeholder content, not a new clip library.

## 8. Feature coverage and implementation ownership

This table includes functions whose secondary details are specified but not
fully drawn in the prototype. “Existing” means the current product has the
behaviour; moving it still requires integration and regression checks.

| Existing feature group | Proposed home | Integration source / important contract |
| --- | --- | --- |
| Send look, playlist, Next/Stop, ownership, fullscreen, output | Persistent shell | `remote_control.js`, `mac_output.py`; request IDs, leases, native window state. |
| Mac handover above modals | Shell recovery dialog | Preserve inert controls, keyboard suppression and draft restoration. |
| iPad compatible previews | All preview surfaces | `media_preview.py`; progress, cached proxy and range serving. |
| Instagram import, streaming progress, cookies | Library import + Setup | `index.html`, `server.py`; seven-day cache, manual refresh. |
| Source discovery, metadata, delete, manual ordering | Library | Preserve filenames and destructive operation scope. |
| Search, multi-category/review filters, alternate sorting | Library filter controls | `library_catalog.js`; do not rewrite My order on sorting. |
| Individual review, notes, Reviewed, queue | Library review dialog | Independent player, filtered queue, limits and dirty guard. |
| Bulk tags/review, vocabulary/usage, rename/merge/remove | Library selection + Tags & usage | `tag_manager.js`, `library_catalog.py`; atomic transactions. |
| Catalogue revision/conflict/one-step Undo | Library feedback | Existing API snapshots and expectedRevision. |
| Transport, layouts, 32 patterns, loop/bounce, speed, crop, captions | Prepare / Layout | `index.html`; preserve view IDs and reset semantics; disclose Bounce gap. |
| Save/load/delete/add per-video layouts | Prepare / Layout menu | `video_presets`; narrower than FX/VFX look. |
| Colour FX, presets, trails | Prepare / Colour | `effects.html`; replace opener coupling through a private-editor adapter. |
| Seven VFX scenes, intensity, pulse, feedback, preview audio | Prepare / VFX | `vfx.html`, `vfx_engine.js`; scene IDs and audio device scope. |
| Mirror sculpture, logo, clip ID, transparent artwork | Prepare / VFX details | Separate from extruded 3D logo/text; preserve upload limits. |
| 3D text/logo, fonts, nine materials, quality, motion | Prepare / 3D text + object controls | Preserve shader/material field names and cue round trips. |
| Playlist create/load/save/rename/delete/loop | Playlists header/menu | File persistence versus editable copy versus sent copy. |
| Timeline reorder, seek/scrub, zoom, ±1s, duration/loops | Playlists timeline + entry inspector | Whole-entry editing; accessible alternatives to drag. |
| Quick Add / Add current look | Library or Prepare → playlist picker | Immediate persistence in Quick Add; active FX copied to cue. |
| Automatic playlist generation / effect scripting | Playlists tools | Visible source pool; only empty cue lists auto-scripted. |
| 61 transitions, duration/pace/seed/parameters, audition | Contextual transition browser | `transition_engine.js`; real IDs, warnings and GPU fallback. |
| Timed VFX/text/logo/Off cues | Playlist entry / cues | Preserve cue time, material and transformation serialization. |
| Auto Perform audio/profile/pool/interval/tempo/holds | Auto Perform | `auto_perform.js`; Mac live input versus local preview input. |
| Energy/exclusion curation and text list CRUD/Show now | Auto Perform drawers | Browser-local settings copied at remote start. |
| Recording and loop-boundary stop | Capture / Full recording | Local editor canvas, fixed capture dimensions, conversion states. |
| Social crop/ratio/start/duration/overlap/export | Capture / Instagram clip | Silent MP4, overlap constraints and clip-folder destination. |
| Source/clip folders, Reduce flashes | Setup | Shared config versus browser preference. |
| Clean audience output and resident audio setup | Dedicated Mac output | Keep clean canvas; do not mount the editing shell on `/output`. |

## 9. Boundaries and build sequence

Follow the [reversible implementation plan](implementation-plan.md) for the
concrete delivery process. It adds isolation and rollback requirements to the
feature sequence below: separate worktree/server/data/profile first, optional
`/ui-v2/` route later, and the existing `/` editor and `/?host=1` engine retained.

This proposal rearranges existing capabilities. It does not assume a new live
program stream to the iPad, remote recording/pause, independent projector
routing, a shared cloud settings database, or new automatic classification.
Those can be separate projects. Clean-output Bounce parity is an existing gap
and should remain a visible compatibility issue until repaired and tested.

Suggested implementation sequence:

1. **Shell and scope:** build navigation, pinned controls and explicit state
   selectors in app code; adapt existing remote commands without changing
   rendering ownership. Preserve the old UI while validating this slice.
2. **Preparation:** extract private-editor actions behind an adapter; move
   FX/VFX controls inline; keep existing renderer and serialization. Verify
   that changing anything in the preview leaves playout untouched until Send.
3. **Library:** adopt the grid and review layout using existing catalogue
   transactions. Complete all three categories, queue navigation and conflict
   handling before replacing the manager.
4. **Playlists:** add the timeline/inspector structure and registry-driven
   transition browser. Preserve cue/material round trips and distinguish Save,
   local audition and sending an unsaved copy.
5. **Performance and capture:** move the existing controls into their new
   homes; verify audio ownership and local recording semantics.
6. **Physical validation:** run on the actual iPad, Mac and venue output. Test
   Safari preview loading, control handover above dialogs, disconnects,
   native fullscreen, input permissions and media/GPU failures.

Use the [existing acceptance checklist](../ui-redesign-reference.md#redesign-acceptance-checklist)
as the release gate. Keep the current Python/Node checks, then add behaviour
tests around the extracted UI adapters. Do not use the prototype's synthetic
data or “confirmed” toasts as evidence that the real engine integration works.

## 10. Decisions to review before implementation

- Does the four-workspace navigation match how you move between preparing,
  managing and performing during a show?
- Is the balance between canvas size and inspector depth right on the actual
  iPad, especially portrait with Safari chrome and the keyboard open?
- Are Send and Stop clear enough at a glance? Is the current prepared filename
  sufficiently obvious when sending from another workspace?
- Should the library shelf favour manually ordered videos or the current
  library filter? The prototype uses a fixed illustrative shelf.
- Does a dark graphite/lime palette feel comfortable at venue brightness?
  Validate small metadata labels and inactive controls on the physical screen.

These are design-review prompts, not blockers to producing the concept pack.
