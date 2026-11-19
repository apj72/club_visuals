# Implementation validation

## Full fly-along endpoints and direction modes · 18 November 2026

`check_fly_path.py` passed using generated media and isolated metadata. At 640×360,
the distant endpoint occupied 11 lit pixels, the close pass filled most of the
frame and departure left zero logo pixels. The once-only mode held that empty
frame. GPU tests verified complete departure at 0°, 45° and 75°, in horizontal and
both vertical orientations, across landscape/portrait/wide frames and both reverse
settings (54 combinations). Repeat passes and mirrored bounce times produced
matching rendered hashes. A vertical departure also translates the camera along
the screen-right basis so the logo clears the left edge.

Both interfaces saved primary and overlaid cues with the new string playback
mode and a compatible derived legacy loop flag. The actual Show Builder form saved
the chosen mode; the live popup updated it, and Pause held the camera pose. A real
MP4 recorded the final part of a once-only flight: decoded early frames contained
the close logo and the final frame had no logo pixels. Final fixture:
`club-fly-path-6ldr7lqx`; tiny and close-up images were visually inspected.

The path now includes a distant approach, the complete letter traversal and a
departure beyond the frame. Departure margins account for view angle, depth and
frame aspect. Playback options are bounce, one-way repeat and one-way once; absent
mode fields map the old loop flag to bounce/once. Existing layered/portrait export,
VFX/fullscreen and saved-effect editing checks passed, as did 40 JavaScript tests
and syntax/diff checks. Frontend files are served dynamically; refresh the editor
and reopen VFX for control/renderer version 16. No server restart or metadata
migration is required.

## Six panels, viewport menus and 45° flight · 18 November 2026

`check_six_fly.py` passed with isolated generated media and metadata. Both original
and redesigned interfaces rendered six panels in a three-column/two-row grid,
offered 32 distinct mirror configurations, and saved/reloaded six-panel presets
and playlist cues. The actual Show Builder Layout menu saved a six-panel step and
displayed six cells in its recipe icon. Numeric mode 5 is appended so existing
mode 4 continues to mean eight panels. Shared render/composite/timeline/output
maps use mirror positions `[0,1,2,4,5,6]`.

Playback and Layout menus stayed inside 1440×1050, 834×1194 and 390×844 viewports
and the original preview fullscreen. Anchored manual popovers avoid clipping by
scrolled parent panels, wrap narrow choices, and reposition on scrolling/resize.
Choice selection and dismissal continued to work. Separate 0° and 45° GPU frames
had visible geometry and distinct pixels; the angle uniform matched π/4. The camera
origin compensates for yaw to keep its central ray aimed at the travelling letter
position, including reverse flight. Edited flight angles survived cue saving.
Real Mac/clean-output playback retained the six-panel grid and mirror mapping.
The final fixture is `club-six-fly-sxvf04qw`; its images were visually inspected.

`check_hints_framing.py` compared preview/composite pixels across all six layouts
in both interfaces and decoded a dust-edged MP4. Existing layered GPU/MP4 export,
VFX controls/fullscreen, and general browser regressions passed. All 61 transition
focus previews and desktop/tablet/phone sizes passed without page errors. The
general check now waits for tag loading before setting Reviewed: an already-checked
but disabled initial checkbox could previously return from Playwright `check()`
before saved tags replaced it. Thirty-eight JavaScript tests and syntax/diff checks
passed. Existing saved fly settings without an angle now use 45°; authors can save
0° for the previous straight-on appearance.
The idle local server was restarted for six-panel preset validation. The live
private editor/renderer reported version 15, created six panels, defaulted flight
to 45°, and kept the Playback menu within the viewport. No console errors occurred.

## Restart video button correction · 18 November 2026

The arrow control called `refreshView()`, which rebuilt the preview while retaining
the current time. Its new hover hint incorrectly described a restart. Replaced
that action with a visibly labelled **Restart video** control and an explicit hint:
jump to the active virtual In point (otherwise zero), preserve paused/playing
state, and keep standalone logo motion independent. Restart cancels a reversing
bounce and stale transition, and sends seek/transport to clean output when invoked
on the Mac engine. An active playlist resets its current clip's loop count, local
timer, initial layout and effect schedule rather than advancing on the old timer.

`check_video_cues.py` passed with generated media and isolated metadata in both
interfaces, covering paused/playing restarts, full-video reset, independent logo
clock retention, zoomed tiled layout retention, bounce restart, playlist timer and
effect reset, and real Mac/clean-output seek while paused. The final fixture is
`club-cues-check-n55vy4zw`. Existing cue marking, range persistence, loop boundaries,
playlist offsets and Show Builder range workflows also passed. Syntax and diff
checks passed. Frontend assets are served dynamically; refresh the editor to load
the corrected button. No server restart or stored-data changes are required.

## Hover help and dust-edge zoom-out · 18 November 2026

`check_hints_framing.py` passed in both interfaces with generated videos and
isolated metadata. Hover and keyboard focus exposed contextual help; Escape
dismissed it and restored accessibility descriptions. Hints appeared above modal
dialogs and described dynamic material choices. Form rebuilds discard detached
option nodes safely. Native options have titles; custom dropdown options copy the
corresponding descriptions. A control inventory audited the shared help coverage.

Zoom-out preserved video proportions and matched composite-frame pixels in all
five layouts. X/Y positioned smaller images within black space. Saved video
presets accepted 0.25× and Show Builder models retained 0.5×. Real host/clean-output
playback retained the smaller framing. A decoded MP4 had black surround and
partially faded dust-edge pixels; desktop frames and exported images were visually
inspected. The final fixture is `club-hints-framing-btbalgxz` in the temporary folder.
Dust masks use stable grain, bounded caches and an edge band that fades in below
1×. Single-view zoom-out uses the same canvas renderer as tiled views and exports.
Colour filters apply to video pixels without tinting the black surround.

Layered effects/MP4 export, VFX controls/fullscreen and Show Builder regressions
passed. General browser checks passed all 61 transition focus previews and layouts
at 1440×1050, 1194×834, 834×1194 and 390×844 with no page errors. Thirty-six JavaScript
tests passed, including zoom-out generation/replacement preservation; 22 Python
tests and seven subtests covered routes and metadata. Syntax and diff checks passed.
This adds `/control_hints.js` and `/video_framing.js` routes and extends saved-layout
zoom validation; existing stored layouts remain compatible.
The idle local server was restarted and the live private editor reported control/
renderer version 14. Both new modules returned HTTP 200; a live 0.5× single-view
preview used the canvas renderer and displayed the zoom help on focus. No console
errors occurred. No user playlist, model or source video was edited by the checks.

## Saved-effect auditions · 18 November 2026

`check_saved_logo_preview.py` passed against isolated stores and generated media
in both interfaces and Show Builder. GPU readback verified independent red logo
reflections, a blue background under a text overlay/tunnel, portrait framing,
scrubbing and changing snake poses. Independent logo Pause held its clock while
preview playback continued. Appearance changes updated the audition renderer
without changing the main player's VFX, selected video or position. DJ windows
used the selected profile's branding text/name. Preview-only actions left saved
models and the unsaved indicator unchanged and sent no `/api/state` writes.

Opening another preview, closing the modal, collapsing its editor and changing
Show Builder tabs released the renderer; WebGL context loss confirmed GPU cleanup.
Chromium can retain layout rectangles for collapsed details, so cleanup explicitly
checks closed details/dialog ancestors. Black-source selection survived closing
and reopening. Desktop and iPad screenshots were inspected without horizontal
overflow. The final fixture is `club-logo-preview-_8gwp7th` in the temporary folder.

Saved-effect editing/persistence, VFX controls/fullscreen and layered GPU/output/
real MP4 export checks passed. Thirty-two JavaScript motion/layer/model tests,
inline/module syntax and `git diff --check` passed. The live editor and renderer
reported version 13 and served the new preview controls. Its only console error
was an unrelated missing `favicon.ico`. Frontend files are served dynamically,
so this batch required no server restart or metadata migration.

## Saved-effect authoring follow-up · 18 November 2026

`check_saved_logo_editing.py` passed in the original and redesigned interfaces
using generated videos and isolated playlist/model stores. It edited primary
logos, text and layered overlays through the real native/custom dropdowns. Position,
depth, X/Y rotation, finish, precise bevel values, text/typeface, reflection source,
reflection speed and snake/fly numeric values survived save/reload and playback.
Default snake speed and fly distance passed browser validity checks. Added text
overlays retained the text kind and content rather than becoming logos.

Missing source selections remained intact. Restoring a file and reloading source
choices cleared its missing label without replacing the brick editor or marking
the model dirty. Editing appearance then updated both unsaved indicators. Saved
models and generated playlists retained the authored overlay and reflection values.
The centered cue dialog kept its heading and Done button available while its list
scrolled; desktop and iPad layouts were visually inspected. No page errors occurred.

The existing VFX controls/fullscreen, layered GPU/MP4 export, Show Builder review
and general browser workflows also passed. All 61 transition focus previews and
desktop/tablet/phone layout checks passed. Thirty-two JavaScript motion/layer/model
tests, syntax checks and `git diff --check` passed. The live editor loaded bundle
version 12, served the shared controls with HTTP 200 and had no console errors.
This batch changed frontend authoring only; no server restart or saved-data migration
was required, and tests did not modify the user's playlists or source videos.

## Layered effects, independent reflections and letter/camera animation · 17 November 2026

The agreed scope is retained in `docs/vfx-layering-deliverables.md` with completed
checks. `check_vfx_layers.py` passed with temporary generated videos and isolated
metadata. GPU readback verified a camera movement mask plus logo, a patterned
kaleidoscope plus logo, independent layer switches (including switching both off
and restoring the selected effect), red reflections over a blue background,
independent reflection Play/Pause and source retention across background changes.
The original SVG produced eight separate letter/chip phase labels. Snake poses
changed rendered pixels, Pause held the wave while video continued, and fly-along
filled/cropped the frame. Saved playlist JSON, repeated cue scrubbing, Mac take,
clean output and replacement Show Builder editions retained the composition.

Real combined and portrait MP4s were decoded: the combined video retained blue
background and red reflective moving letters, while a close-up fly render retained
1080×1920 output. A missing reflection source showed a useful status and blocked
capture until ready. Framebuffer targets now initialize even when a canvas already
has the desired dimensions. Logo capture clocks start with the recorder, after
render preparation. The recorded frames were visually inspected.

The existing VFX controls/fullscreen, chrome reflection/choreography, simulated
camera/recording, upright portrait/landscape/square export, general interface and
Show Builder browser workflows passed. All 61 transition previews and responsive
desktop/tablet/phone checks passed. Forty JavaScript motion/layer/compiler tests,
twenty-one Python remote/route/storage tests, surface checks, syntax checks and
`git diff --check` passed. No page errors occurred. Tests used generated media or
isolated fixture stores; they did not alter the user's playlists or video sources.

The idle live server was updated. A fresh private editor served
`reflection_video.js` with HTTP 200 and loaded editor/controller/renderer version
11; tunnel + logo flags and both new motion controls were confirmed. Its only
console error was the pre-existing missing favicon. Physical-camera combinations,
venue lighting and sustained performance remain device rehearsals.

## Live camera motion extraction · 17 November 2026

`check_camera_motion.py` passed with Chrome's simulated camera and a deterministic
canvas camera, generated source media and isolated metadata. It checked permission
denial, explicit video-only connection, ended tracks after Disconnect, stationary
input suppression, real GPU video-filled masks, glow, and displaced stripe pixels
in distortion mode. Mirroring moved the extracted region to the opposite side;
VFX Off held while the camera stayed connected. Camera controls were visually
inspected and did not overflow their popup.

Private input posted only scoped movement masks. An explicit Mac take bound the
source ID; the Mac engine and clean-output monitor received it without opening
another camera. A different source could not replace the selected input. Reconnect
snapshots excluded camera masks. Saved cues and generated/replacement Show Builder
editions retained effect settings without input bindings. A real captured MP4 was
decoded and contained blue source-video movement over black. Disconnect cleared
the remote silhouette. No page errors occurred. Tests never accessed a real camera.

The existing VFX controls/fullscreen check, chrome GPU/reflection/recording/Mac
workflow and general interface workflow passed. All 61 transition previews and
desktop/tablet/phone layout checks passed. Thirty-six JavaScript tests, twenty-one
Python route/storage/remote tests, surface checks, syntax checks and
`git diff --check` passed. The idle live server was updated; a fresh editor loaded
the camera module with HTTP 200, renderer/controller version 10 and zero console
errors, with its camera disconnected. Physical cameras, venue lighting and sustained
performance still require a device rehearsal.

## Add saved social captures to the library · 17 November 2026

`check_capture_library.py` passed in both interfaces using temporary media and
separate clip/source folders. An earlier Instagram capture was added through the
new Capture controls; it appeared in the shared library and playlist choices,
sorted newest first, without changing the current preview or unsaved playlist.
The original export remained byte-identical. Repeated imports reused the copy.
A real new capture was converted to MP4 and selected automatically, and Refresh
found another saved export while retaining the selection. Unsafe and missing-file
API requests returned 400/404. No page errors occurred; the new panel was visually
inspected. Fifteen capture-import/catalogue tests, Python/inline-JavaScript syntax
checks and `git diff --check` passed.

The user's named `instagram_9x16_20261116_235951_411938000.mp4` was explicitly copied
into the configured library as `capture_instagram_9x16_20261116_235951_411938000.mp4`.
The running idle server was restarted with the new routes.

## Upright letters in vertical logo layouts · 16 November 2026

Vertical logo masks now counter-turn each original letter and the complete chip,
so both reading directions keep their contents upright. Horizontal geometry and
authored rotations remain independent. `check_logo_portrait.py` passed with real
portrait, landscape and square exports; the portrait GPU image was visually
checked for upright V/E/R/S/I/O/N and the chip's 1. Eight motion/orientation tests,
surface checks, engine syntax and `git diff --check` passed.

## VFX controls and private fullscreen fixes · 16 November 2026

The running server was serving updated HTML/JavaScript but returned 404 for
`logo_motion_controls.js` because its loaded request handler predated that route.
The controller stopped initializing and could interrupt scene changes. The idle
server was restarted with the current handler; the live asset now returns 200.
Basic controls also remain usable if the optional choreography widget fails.

`check_vfx_controls.py` passed all effect shortcuts, repeated popup On/Off,
Capture resizing while Off, legacy oscillator and authored path Play/Pause with
video continuing, actual GPU orientation matrices, controller reload/reopen and
independent editor ownership. Native fullscreen and denied-permission fallback
passed across preview layouts, including exact stage/transport restoration and
unchanged video-load tokens. A simulated missing widget retained working controls
without page errors. Tests used generated media and isolated metadata.

`check_chrome_motion.py` and `check_logo_portrait.py` passed again, including
reflection readback, custom paths, saved cues, a paused Mac take/output snapshot,
and real portrait, landscape and square MP4 exports.
The general interface browser workflow also passed all 61 transition previews and
desktop/tablet/phone layout checks with no page errors. Twenty Python route,
storage and remote-control tests, eight motion/orientation tests, surface checks,
JavaScript syntax checks and `git diff --check` passed. The live controller was
confirmed attached to the current editor; Off retained scene 6 and disabled VFX.

## Logo orientation and reusable portrait capture · 16 November 2026

`check_logo_portrait.py` passed using generated temporary media and a separate
social clip directory. It selected top-to-bottom orientation without changing
Rotate Z, opened the portrait render from the VFX controller, checked a complete
vertical GPU image at 1080×1920, and recorded actual portrait, landscape and square
MP4s. FFprobe verified their output dimensions, H.264, 30 fps, single video stream
and expected frame counts. Decoded portrait pixels retained a complete tall logo
and black corners. The recording clock restarted at zero while the live clock
remained at its prior paused time. Files went to the source library, appeared in
the refreshed API/UI and loaded back as ordinary portrait source videos. Scripted
cues retained orientation. Recorded frames and desktop/iPad layouts were inspected.

The existing capture browser rehearsal passed all seven social formats in both
interfaces (14 real MP4 exports). Chrome motion's existing GPU, custom path,
recording, cue, Mac take and output-snapshot tests also passed. No page errors
occurred. Forty Python loop/export tests, eight JavaScript motion/orientation tests,
the signed-distance/material/legacy checks, syntax checks and `git diff --check`
passed. Tests wrote only generated media and temporary metadata; user recordings
and source files were unchanged. Physical Safari/iPad capture remains a device
rehearsal.

## Chrome isolation and object choreography · 16 November 2026

`check_chrome_motion.py --demo` passed with generated temporary video and isolated
playlists/models. Real WebGL readback found 7,783 object pixels changed when the
reflection source changed colour, zero lit pixels outside its projected bounds,
opaque black corners and no GL errors. Switching from a visible-video backdrop
kept black isolation intact. The hidden source sweep changed the reflection while
retaining the object's transform, with matching dark entry/exit frames. Fixed
animation times produced identical GPU frames.

The browser dragged a custom waypoint, exercised preset multi-axis motion and
Pause/Restart, checked unchanged video-load tokens, verified the recording
compositor's black corners and hidden captions, and saved/reloaded choreography in
playlist cues. Repeated seeks inside the same cue updated and held its authored
pose. A real Mac take resumed that phase and carried its settings to clean output;
output snapshot reconnect retained the choreography and black backdrop. Final
browser checks had no page errors. Three rendered MP4 demos and posters were
produced; posters and desktop/controller layouts were visually inspected.

The existing interface workflow passed all 61 transition focus previews and
its desktop/tablet/phone layout checks. Show Builder's existing generation, live
review, editing, storage and responsive browser workflow also passed. Twenty-one
Python route/storage/layout/remote tests plus seven subtests, twenty-six JavaScript
motion/compiler/timeline tests, the existing signed-distance/material/legacy checks,
syntax checks and `git diff --check` passed. Tests did not alter user source media,
playlists or models. Physical Safari/iPad and venue output remain device rehearsals.

## Virtual source cue ranges · 16 November 2026

`check_video_cues.py` passed using a generated 12-second test video and isolated
cue/layout/playlist/model stores. It exercised playhead In/Out marking, multiple
named ranges, updates/deletion, invalid-range rejection, reload persistence,
real loop and once boundaries, restarting from In, and playback after scrubbing
outside the section. Saved layouts, playlist entries and a generated Show Builder
edition retained their range snapshots. Loop counts, speed-adjusted durations and
timeline seeks used the source section; starting from a later loop counted only
remaining repeats. A real remote take carried the range into the Mac engine and
clean-output SSE, including output snapshot restoration after reconnect.

Desktop and iPad portrait cue controls were visually inspected. The existing
`check_browser.py` and `check_show_builder.py` workflows passed, including 61
transition focus previews and the existing desktop/tablet/phone layout checks.
Forty-three Python API/storage/library/remote tests plus seven subtests and twenty
JavaScript source-range/compiler/timeline tests passed. Syntax checks and
`git diff --check` passed. No page errors occurred in the final browser checks.
The tests did not alter user media, cue ranges or saved playlists. Physical iPad
Safari and venue playback remain device rehearsals.

## Video library reload and shared ordering · 16 November 2026

`check_library.py` passed with isolated MP4 copies and temporary metadata. It
verified newest-first ordering by modification time, a manually added edit
appearing after reload, shared video-picker order, browser preference persistence,
retained manual order, unchanged current preview/source and unsaved playlist,
filter preservation, failed-request recovery and an empty folder becoming populated.
Desktop and iPad screenshots were inspected. No page errors occurred.

The existing `check_browser.py` and `check_show_builder.py` workflows passed,
including all 61 transition focus previews, live show review controls and the
existing desktop/tablet/phone overflow checks. Twenty Python library/catalogue,
route and storage tests (plus seven subtests), seventeen compiler/timeline tests,
JavaScript syntax checks and `git diff --check` passed. Test media and metadata
were temporary; the user's source library and saved playlists were unchanged.

## Live review controls · 16 November 2026

The Chrome rehearsal passed with actual pointer dragging of the Y slider. It
verified changing rendered canvas pixels on a paused frame, an unchanged source
load token during slider input, and uninterrupted playback during live changes.
Apply and Reset both passed while playing: playback resumed at the current show
position, Apply committed the new Y framing, and Reset returned to the last
applied framing. Saving with pending preview changes was blocked with Apply/Reset
guidance; saved JSON included the applied values and preserved the source recipe.

Play/Pause passed from a nonzero playhead. Playback crossed into the next clip,
and starting immediately before a timed layout cue applied it at the remaining
offset. Shared cue scheduling and clip timers now account for the playback offset.
The private preview did not publish any Mac output state.

All prior generation, editing, DJ-profile, snapshot, undo, storage and responsive
checks passed, with no page errors. The seventeen compiler/timeline checks, ten
route/storage tests and ten remote-control tests also passed. No user library or
saved playlist was changed by these tests. Physical iPad Safari and hours-long
venue playback remain hardware rehearsals.

[Live controls](screenshots/show-live-controls.png).

## Show review playhead · 15 November 2026

Seventeen compiler/timeline checks, ten route/storage checks and ten existing
remote-control checks passed. JavaScript syntax and `git diff --check` passed.
`check_show_builder.py` exercised the draggable show playhead across three hours,
millisecond time entry, keyboard stepping, and private preview inside Show Builder.

The browser edited a timed layout without altering its initial look, changed the
video and clip length, checked the new section boundary and runtime, scrubbed into
the extended part of the clip, saved and read back a separate reviewed playlist,
and undid the last edit. It also retained the preceding editor playlist when
switching workspaces. Scrubbing left the server's output-state snapshot empty.

The existing generation, DJ/branding, kept-section, playlist-capture and reload
workflows still passed. Review panels were rendered on desktop, iPad landscape,
iPad portrait and phone, with no horizontal document overflow or page errors.
Shared preview readiness now handles decoded media retained across reparenting
without depending on a second `loadeddata` event.

[Desktop playhead](screenshots/show-playhead-desktop.png) ·
[iPad playhead](screenshots/show-playhead-ipad.png) ·
[Phone playhead](screenshots/show-playhead-phone.png).

These remain browser checks with temporary metadata and read-only real media
links; physical touch/Safari hardware and an hours-long rehearsal are separate.

## Show Builder · 15 November 2026

The working visual model builder is available at `/redesign#builder`. See the
[operator guide](show-builder.md). Checked with temporary models, playlists,
catalogue metadata and read-only links to sixteen existing source videos.

- Fifteen compiler checks passed: exact three-hour and 24-hour durations,
  fractional timing and pacing, reproducibility, balanced library use, filtering,
  repeat failures, pinned/shared slots, snapshot isolation, media-only replacement,
  preserved sections, DJ branding, effect collisions and invalid inputs.
- Ten route/persistence checks passed, including all original entry points and
  renderer responses, the new assets, atomic library writes and concurrent/stale
  screen conflicts. Ten existing remote-control checks also passed.
- `check_show_builder.py` passed in Chrome: real drag/drop, brick swapping,
  shared library saving, an exact three-hour/460-clip show, a second DJ profile,
  keeping the opening byte-for-byte, media filtering, branding, distinct version
  files, real timeline preview, timed layout playback, playlist-to-brick capture,
  saved-edition reload and bounded desktop/iPad/phone layouts. No page errors.
- The timed layout rehearsal verified unchanged source time, source URL and load
  token across the composition change, plus the broadcast consumed by output.
- JavaScript syntax, Python compilation and `git diff --check` passed.

[Assembly](screenshots/show-builder-assemble.png) ·
[Generated show](screenshots/show-builder-generated.png) ·
[iPad portrait](screenshots/show-builder-ipad.png).

This verifies compilation and short browser playback, not a continuous three-hour
venue rehearsal or physical Safari/iPad hardware. Layout events currently switch
instantly; the proposed smooth tile-motion engine and `.cvseq` compiler are not
implemented. Generated playlists use shared V1 playback; their layout event
scheduling is the only Show Builder addition to the original editor document.

The local idle server was restarted using the updated redesign launcher after
these checks. No user model library or generated playlist was created by tests.

Checked on 14 November 2026 with installed Google Chrome in headless mode.

## Automated evidence

- Five route-preservation tests passed: original `/`, `/index.html`, remote
  query, resident host, output and controller responses remain byte-identical;
  the new response differs only by its presentation injection; original
  renderer assets are still served by V1.
- Ten existing remote-control tests passed, including ownership/revocation,
  host routing, native-window API calls, output opening and state replay.
- JavaScript syntax, Python compilation and `git diff --check` passed.
- The reskin preserved V1 source. The subsequent, explicitly requested Facebook
  capture extension changes only shared capture format/UI labels and export
  routing in `index.html` and `server.py`; output, controllers, renderer
  scripts, catalogue scripts and original launch scripts remain untouched.

## Chrome workflow checks

The browser used eight existing source MP4s through read-only symlinks, with
a temporary catalogue copy and temporary playlist/preset/config/thumbnail
directories. It did not contact the live server or edit the user's data.

Passing workflows:

- Preview play/pause through original controls.
- Actual V1 pattern selection: dual 8, triple 16, four tiles 16, eight tiles 32.
- Featured preference storage, curated display and Show all.
- Search/clear filters, plus an anchored menu selecting the Reviewed filter.
- Independent tag editor, saving notes and Reviewed to the fixture catalogue.
- Playlist Add current view, save, duration editing and timed cue dialog.
- Saved per-video layout persistence to the fixture preset directory.
- Anchored select menus inside the original review modal; keyboard Escape.
- Original VFX controller window opens with the editor as opener.
- iPad portrait editing panel opens and closes.
- Transition search narrows the existing palette to the requested effect.
- Every one of the 61 transition tiles starts an example on keyboard focus,
  using the existing controller. Focus leaves the playlist, filename, layout,
  armed selection and chosen transition unchanged. Navigation cancels the
  animation. Reduced motion requires Replay, which successfully starts it.
- Original Mac ownership locking makes the editor inert and leaves Return
  control reachable; unlocking restores it.
- No duplicate DOM IDs and no JavaScript page errors.

All six workspaces were captured at 1440×1050, 1194×834, 834×1194 and 390×844.
No horizontal document overflow was found. Desktop page height stays within
the viewport; lists/panels scroll internally. Screenshots under `screenshots/`
are captures of the real editor using temporary metadata, not the design demo.

The repeatable developer check is `python3 ui-redesign/check_browser.py`.
It requires the Python `playwright` package, installed Google Chrome and at
least eight MP4s in the configured library. Test fixture paths are printed;
screenshots are saved there for inspection.

## Hardware and unchanged V1 limitations

Physical iPad Safari decoding, safe areas/keyboard, microphone devices,
native Mac fullscreen and venue output need an on-device rehearsal. The
checks above do not claim a live show or real hardware capture test. Capture
uses the original unscaled view and original capture/convert handlers.

Six tiles require engine work and remain unavailable. Triple has sixteen
actual V1 signatures, rather than the earlier assumed twelve. Single preview
clears flips in V1, so this UI does not imply otherwise. The original FX/VFX
controller windows retain their full controls and original presentation.

The original running server was not replaced during development. Launch the
optional server as documented in the README to use `/redesign` with the live
library and keep `/` as the immediate fallback.

## Shared Facebook capture checks

The Facebook addition passed 38 FFmpeg conversion/library tests and five route
preservation tests. `check_capture.py` created fourteen real short MP4s: all
seven Instagram/Facebook formats from both `/` and `/redesign`. FFprobe
confirmed exact preset dimensions, H.264, 30 fps, eighteen frames for each
0.6-second clip and no audio. The landscape captures included a 0.2-second
loop crossfade. Download requests succeeded and all exported files stayed out
of the eight-video fixture library. The check also exposed and verified the
fix for menus closing on delayed panel-scroll events; anchored menus now
follow their trigger during scroll. No live user data was modified.

## Current-IP connection checks

Six network-link tests and ten existing remote-control checks passed, along
with six optional-launcher route tests. Chrome checks in both UIs covered
generation, multiple adapters, changed addresses, Copy, switching the UI URL,
access from a locked Mac, no-network feedback and desktop/iPad/phone viewport
widths. These used fake LAN addresses and temporary data. The real interface
discovery command also returned this Mac's active en0 address successfully.
A physical iPad connection on the user's Wi-Fi remains a device check.

## Instagram cookie-source correction

Ten tests passed for saved-cookie validity, Chrome/profile selection, atomic
replacement, retaining only Instagram cookies, timeout/failure preservation,
source validation and the Chrome default. Chrome browser checks used mocked
exports in both UIs to verify selector/profile submission and truthful saved-
cookie/error status. No real browser-cookie extraction, Keychain unlock or
live authenticated Instagram download was performed in these checks.
