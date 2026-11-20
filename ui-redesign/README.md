# Current default interface

The interface in this directory is now the normal application at
**http://localhost:8008/**. Start it with `./start.sh` or `python3 server.py`.
`ui-redesign/launch.py` remains a compatibility launcher for the same server.

- Current editor: `/` (Playlists: `/#playlist`, Show Builder: `/#builder`).
- Classic editor: `/classic`, sharing the same media, playlists and metadata.
- Existing `/redesign` URLs redirect to `/`, keeping parameters and workspace fragments.
- `/redesign/*.js` and CSS remain supported asset URLs.
- `/?host=1` remains the unskinned resident Mac playback/audio engine.
- `main` contains the current development; the older V2 Studio trial is superseded.

See the [current handbook](../docs/user-guide/index.html) and
[release/rollback instructions](../docs/releases/2.0.0.md).

The implementation journal below records earlier development stages. Its old
launch commands, homepage locations and limitations describe those stages and
are superseded by the current handbook and the routes above.

---

# Redesigned UI over V1

Branch: `ui/redesign-v1-skin`.
V1 baseline: `bfe79123ccc6887882154f83f123447ebde233a2`.

This is the real V1 editor with an additional presentation layer. Its original
controls, event listeners, renderers, playlists, APIs and shared data are used
directly. Show Builder adds visual recipe authoring and a shared model/profile
library, compiling into ordinary playlists. Timed layout events run in the
shared player without restarting the source video. The
subsequently requested Facebook capture addition updates the shared capture
format table and export routing in V1 for both interfaces. The later requested
Connect iPad feature adds a shared current-IP dialog and read-only endpoint.
Neither changes playout composition. The
[connection map](connection-map.md) explains each connection and dependency.

## Launch

From `/Users/antonyjoyce/git-repos/club_visuals`:

```sh
./stop.sh
python3 ui-redesign/launch.py
```

Leave that terminal running. Open these URLs in Chrome:

- Redesigned editor: **http://localhost:8008/redesign**
- Original V1 fallback: **http://localhost:8008/**
- Existing clean output: **http://localhost:8008/output**
- Reusable Show Builder: **http://localhost:8008/redesign#builder**

See the [Show Builder guide](show-builder.md) for reusable bricks, exact-duration
multi-hour shows, DJ profiles, kept sections and replacement-video editions.
This working visual builder does not require the separate proposed `.cvseq`
language, which remains a design reference.

The [current illustrated handbook](../docs/user-guide/index.html) and
[printable PDF](../output/pdf/club-visuals-user-guide.pdf) cover the complete
workflow. In Playlists, preview Play/Pause now operates the whole composition
from the playhead. Green timeline blocks edit timed layout/framing/colour/trail
sections; purple blocks edit effect cues. Logo motion follows the playlist
transport there; its independent transport remains available in Prepare and
private cue auditions.

On the Mac, click **Connect iPad** in the top control bar to generate a link
using its current network IP. Use **Copy link**, then open it in Safari on the
iPad. **Generate current link** refreshes it after changing Wi-Fi. Multiple
interfaces are listed when available. See [connection guidance](../docs/ipad-connection.md).

On the iPad, use `http://<Mac-local-IP>:8008/redesign?remote=1` on the same network.
The normal V1 remote ownership, preview preparation and Mac fullscreen actions
apply. Use the original **Open output screen** action to start the Mac engine.

The launcher does not automatically close an existing server. If port 8008 is
occupied, it exits with an explanation. Stop the old server before launching
this one. Do not run separate servers against the same writable data.

## Video library

**Reload library** above every workspace rescans the configured source-video
folder, including MP4s you have edited and copied in yourself. It updates the
library and video pickers while retaining the current preview and playlist.

**Library order** defaults to **Newest first**, using each file's modification
date. The choice is remembered in this browser and applies to Prepare, Playlists,
classification review, Auto Perform curation, transition audition and Show Builder
video choices. **My order** keeps the saved drag order available; **Clear filters**
does not reset the chosen order. Generated playlist playback order is unchanged.

## Reflective objects on black

For combined camera/tunnel + logo looks, separate reflection videos, the pulsing
letter snake and fly-along closeups, see the
[layering and animation guide](../docs/vfx-layering.md). The saved
[deliverables](../docs/vfx-layering-deliverables.md) track the requested scope.

**Camera motion…** in **Prepare → Colour, VFX & 3D text** adds a live camera input.
Connect explicitly on the Mac's localhost editor, then choose video-filled
movement, glow or distortion. Movement is carried to Mac output on a take and
included in captures. See the [camera motion guide](../docs/camera-motion.md).

Open **Prepare → Colour, VFX & 3D text → Chrome on black**. The video remains the
logo's live reflection source while the rest of the frame is black. The VFX
controller offers bounce/orbit/figure-eight paths, custom draggable waypoints,
zoom pulses and simultaneous X/Y/Z turns. **Hidden video sweep** keeps the logo
stationary while the reflection source moves through it. The **Backdrop** choice
also works for text. Black mode hides captions in preview, output and recording.

Choose a **Quick look**, enable automation and tune its cycle. Custom waypoints
include time, position, size and all rotation axes; Keep inside fits the object to
the screen. Save with **Playlists → Add current view**, or use the same controls
inside a scripted logo/text cue or a Show Builder effect window. Models and playlist
JSON keep the authored settings; paused timeline previews, playback and Mac output
share the animation timing. **Play logo motion / Pause logo motion** in the player
and VFX controller controls both paths and Auto rotate, independently of video
playback. Motion starts paused; a Mac take preserves whether it is running or
paused. **Restart cycle** starts it from the beginning. **Turn VFX off** disables
the current effect without changing scenes or being reversed by Capture resizing.

Each editor owns its VFX controller. After an update, refresh the editor and reopen
the controller. **Preview fullscreen** restores the preview and transport to their
original places on exit. Browsers that deny native fullscreen use a window-filling
preview instead; press Escape to leave.

[Reflections only](screenshots/chrome-reflections-only.mp4) ·
[Moving logo](screenshots/chrome-logo-choreography.mp4) ·
[Hidden video sweep](screenshots/chrome-hidden-video-sweep.mp4).

## Portrait logo recordings

In VFX, choose **Orientation → Vertical · top → bottom** (or bottom → top), then
**Record a 9:16 logo video…**. This opens Capture with a complete 1080×1920 portrait
render on black. Set the length and choose **Capture MP4**. Keep **Start logo motion
from the beginning** checked to record a fresh automation cycle. The orientation
is independent of X/Y/Z rotation, paths and zoom, and is retained in saved cues.
Vertical logo layouts keep the individual letters and numbered chip upright.

The MP4 is saved directly to the source library and appears there automatically
for reuse in playlists. Landscape and square logo-render presets are also offered.
These full-frame renders use the live video as their reflection source and fit the
whole object when Keep inside is enabled. The existing social presets keep their
crop box and social clip destination.

To reuse a social export, open **Capture → Reuse a saved capture**, choose its
filename and press **Add to library**. Saved Instagram/Facebook captures are listed
on page load; use **Refresh saved captures** for files saved since then. A newly
finished capture is selected automatically. The original export stays in the clip
folder and a `capture_…` copy is added to the source library. Repeating the action
reuses an identical existing copy. The current preview and playlist are retained.

[Portrait MP4 example](screenshots/logo-portrait-render.mp4) ·
[Capture controls](screenshots/logo-portrait-capture.png).

## Cue ranges

In **Prepare → Edit this look → Cue ranges**, scrub the source and mark In/Out at
the playhead, or type the times in seconds. **Use range** starts at In, and
**Preview loop** repeats the section. Leave Out blank for the source's natural end.
Save several named ranges per video and choose them again from **Saved range**.
**Full video** restores ordinary playback without deleting your saved ranges.

**Add range to playlist…** and saved layouts copy those times into the playlist.
The Playlists inspector offers saved ranges and editable In/Out times; Show Builder's
review inspector offers **Source cue range**. Apply and save a generated edition to
keep its changes. Playlist snapshots are independent of later saved-range edits.
Loop-count durations and timeline seeks use the selected source section, while
seconds-based clip lengths stay fixed. Mac transfer and clean output retain In/Out.
Source video replacement clears its old range; kept sections retain their snapshots.

On iPad portrait, open **Edit controls** to reach Cue ranges. Restart the server and
refresh editor/output windows once after installing this update.

## Workspaces

- **Show Builder:** reusable bricks and weighted sections, clip choreography,
  timed layouts and effects, saved models and DJ profiles, exact multi-hour
  generation, video replacement, kept sections, past-set exclusions and separate
  saved performance editions. Generated shows have a draggable full-show playhead,
  a zoomable clip timeline, precise time entry and an in-place private preview.
  Play/Pause starts at the current playhead and continues through clips. Live
  sliders adjust framing, mirror pattern, speed and timings while viewing the
  result. Apply commits preview changes to the show; Reset restores its last
  applied settings. Durations update section timings, and Undo restores the last
  applied edit.
- **Prepare:** private preview, original transport, compact filtered library,
  collapsible layout/playback/zoom/effect/saved-layout controls. On iPad portrait,
  **Edit controls** opens a bounded panel above the bottom button.
- **Playlists:** original library drag-and-drop, preview, timeline, load/save,
  duration/layout/transition inspector, transition audition, timed cues,
  generation, scripting, loop, local recording and Mac transfer. Hover, keyboard
  focus or tap any transition to see a looping example between real library
  stills, rendered by the existing V1 transition controller. Replay is explicit
  when reduced motion is enabled. The timeline,
  video list and inspector each have bounded scrolling.
- **Library:** original search, combined category/review filters and sorting,
  ordering, tags, deletion and add-to-playlist actions. Classification manager
  retains bulk editing, tag usage and undo. Tag review has its independent video.
- **Auto Perform:** existing audio device, profile/pool, holds, beat actions,
  curation, named text lists and decision log.
- **Capture:** shared Instagram/Facebook crop/loop/transition/export controls, with
  the unchanged capture overlay and a local editor recording action.
- **Settings:** featured mirror patterns, original source/clip folders,
  Reduce flashes, cookie connection and Instagram import.

The Mac toolbar and ownership feedback stay visible across workspaces. Frequent
selects open anchored in-page menus, including in existing modal dialogs.
All saved changes are real shared data, visible from V1 as well.

## Mirror choices and source aspect

Choices are read directly from V1's `CONFIGS` and fixed tile-position maps,
deduplicated and sent back through V1 `setConfig`. Icons show each cell's
actual horizontal/vertical flip with an asymmetric F and tile number. Counts
are dual 8, triple 16, four tiles 16, six tiles 32 and eight tiles 32. Settings lets you mark
featured choices separately for dual/four/six/eight; **Show all** reveals the rest.
An empty featured list shows all choices until you curate it.

Single view has no mirror-pattern selector. **6×** uses a three-column, two-row
grid and supports the same zoom, position, effects, recording and output paths
as the other layouts. Its patterns and favourites are available in Prepare and
Settings; saved layouts, playlists and Show Builder retain the six-tile choice. The whole preview is fitted
uniformly into its presentation panel; the source is not stretched. Capture
uses the unscaled original view so crop interaction retains V1 coordinates.

Effect, VFX and 3D controls open the existing controller windows. Their
complete original controls and renderer remain available. Physical Safari,
audio hardware and native fullscreen still need a device rehearsal.

## Rollback

During review, follow **Original V1** in the header to use `/` immediately.
To return to the original launcher, stop the optional launcher with Ctrl+C and
run `./start.sh`. No source restoration or data migration is needed. The V1
baseline is retained on `main`. Model authoring lives here; timed layout event
playback is shared by the original and redesigned editors.

## Checks

```sh
python3 -m unittest discover -s ui-redesign -p 'test_*.py' -q
python3 -m unittest test_remote_control.py -q
node --check ui-redesign/presentation.js
python3 ui-redesign/check_library.py
python3 ui-redesign/check_video_cues.py
python3 ui-redesign/check_chrome_motion.py
python3 ui-redesign/check_logo_portrait.py
python3 ui-redesign/check_vfx_controls.py
python3 ui-redesign/check_capture_library.py
node --test test_camera_motion.cjs
python3 ui-redesign/check_camera_motion.py
node --test test_vfx_layers.cjs
python3 ui-redesign/check_vfx_layers.py
python3 ui-redesign/check_saved_logo_editing.py
```

Route tests prove original editor/engine/output/controller responses are
byte-identical and the redesigned response contains only presentation
injection. See [validation](validation.md) for browser workflow evidence and
remaining hardware checks.

## Screenshots of the working editor

[Prepare](screenshots/prepare.png) · [Playlists](screenshots/playlist.png) ·
[Transitions](screenshots/transitions.png) · [Library](screenshots/library.png) · [Auto Perform](screenshots/auto.png) ·
[Capture](screenshots/capture.png) · [Settings](screenshots/settings.png) ·
[iPad preview](screenshots/ipad-prepare.png) · [iPad controls](screenshots/ipad-controls.png).

These use real media with temporary test metadata. To repeat the full browser
workflow checks: `python3 ui-redesign/check_browser.py` (developer-only
Playwright and Chrome required).

Instagram imports in Settings use the shared browser/profile selector: Chrome
by default, with Brave available explicitly. Log into Instagram on the Mac in
that browser/profile, then refresh its cookies. The saved-cookie status does
not establish that Instagram accepts the session.
