# Club Visuals: product reference

**Source review: 10 November 2026.** This describes the current repository,
including the classification manager delivered with this documentation.
For screen design, also read the [UI redesign reference](ui-redesign-reference.md).
For code and data contracts, read the [technical reference](technical-reference.md).

## 1. Purpose and operating model

Club Visuals prepares and performs DJ/event visuals from a local video library.
It downloads Instagram reels/posts, combines videos with tiled layouts,
transitions and effects, builds playlists, and renders clean output on a Mac.
An iPad can prepare a separate preview and control what the Mac plays.

It is a local Python server with browser interfaces. The default address on the
Mac is `http://localhost:8008`; the iPad connects to that Mac's LAN IP address.
Internet access is needed for downloads, but the downloaded media and normal
playout are local.

The important objects are:

| Object | Meaning |
| --- | --- |
| Library video | A source MP4 in the configured download folder. |
| Classification | Shared theme, colour and visual-type tags, notes and review status for a video. |
| Look | A video plus layout, mirror preset, playback settings, zoom/pan, FX and VFX. |
| Saved layout | A named per-video combination of layout and playback settings. It is narrower than a complete look. |
| Playlist entry | A video, copied layout settings, duration, incoming transition and optional timed effects. |
| Preview | The composition being prepared in the current editor. |
| Mac engine | A resident browser editor that executes live playlists and audio analysis. |
| Output | The clean image displayed on the Mac/projector. |

“Multi-screen” currently means multiple tiles inside one composition: Single,
Dual, 3x, 4x or 8x. It does not mean eight independently routed projector feeds.

## 2. Devices, windows and private versus live actions

The main editor on either device is a **private preview**. Picking another
video, changing its layout or auditioning effects does not send those edits to
the Mac automatically.

The sticky remote toolbar provides the deliberate live actions:

| Control | Behaviour |
| --- | --- |
| Send to Mac | Transfers the current look and starts it on the Mac. Uses the preview position, or the beginning if the preview has ended. |
| Play this playlist on Mac | Sends a copy of the current playlist, including unsaved entries and its loop setting, for execution on the Mac. |
| Stop Mac | Stops live playlist/Auto Perform activity and pauses live playback. |
| Next on Mac | Advances the running Mac playlist. |
| Open output screen | Opens or brings forward the dedicated Mac output without changing its fullscreen state. |
| Mac fullscreen / Exit Mac fullscreen | Controls that dedicated Mac browser window directly. It requires no confirmation click on the Mac. |
| Preview fullscreen | Fullscreens only the current editor's player. |

Opening the output, sending a look or starting a remote playlist can start the
dedicated output when needed. Keep the Mac awake and its output/engine alive.
A live playlist continues when the iPad sleeps or disconnects because its
timers run on the Mac. Further edits in the iPad's playlist do not change the
already sent copy; send it again to replace it.

### iPad setup and control ownership

1. Start the server on the Mac with `./start.sh`.
2. Connect both devices to the same network; guest/client-isolated Wi-Fi can
   prevent the iPad reaching the Mac.
3. Open `http://<Mac-local-IP>:8008` in iPad Safari.
4. Use **Open output screen**, prepare a look, then **Send to Mac**.
5. Move the dedicated output to the intended display when setting up the venue;
   the iPad can then enter and leave fullscreen remotely.

An iPad session automatically claims control if no other controller owns it.
While it is connected, Mac editor controls are greyed out and show **Being
remote controlled by iPad**. **Return control to Mac** unlocks the Mac and
revokes that controller session. The iPad must explicitly press **Take remote
control** before it can send more playout commands. It can still prepare a
private preview while the Mac has control.

The Mac unlocks after approximately eight seconds without a controller
heartbeat. This releases ownership; it does not stop the show. Ownership and
the controller connection are separate from the Mac engine connection.
If an editor dialog was open when the iPad connected, a handover dialog keeps
Return control and Open output reachable while preserving the underlying editor.

The normal `/output` browser page remains available. Its browser Fullscreen
API button can require a local user gesture. The dedicated output window's
remote fullscreen control avoids that restriction using native browser-window
control and a separate browser profile.

### iPad video compatibility

Some source files contain VP9 even though their extension is `.mp4`. Safari
previews use cached H.264/AAC copies, with a maximum 1280-pixel edge at 30 fps.
Preparing the first preview can take time; progress and playback failures must
remain visible. Originals remain the sources for Mac playout. Media endpoints
support byte ranges for Safari loading and seeking. Preview starts muted and
inline; iPadOS can still require pressing Play.

## 3. Ingest, connection and the source library

### Downloads and authentication

Paste an Instagram reel/post URL and press **Download**. The server runs
`yt-dlp`, streams progress and authentication messages, and adds completed
videos to the library. Thumbnails are created with FFmpeg. Cookie status and
refresh actions live in the connection panel. The current cookie-export
implementation uses Brave; its cookie cache has a seven-day age limit.
The optional password field unlocks the Mac login keychain for a refresh.

`./ig-save.sh <instagram-url>` is an alternative command-line downloader. The
script writes to the repository's `downloads` directory; it does not use the
browser Settings folder selection.

The library discovers MP4 files in the configured source folder, so existing
MP4s can also be placed there. There is no general-purpose media-upload dialog.
Instagram metadata, when available, supplies uploader, caption and duration
information. Missing Instagram metadata does not prevent a file being listed.

### Browsing and ordering

The Library provides thumbnails, filenames, current-selection highlighting,
deletion, quick add-to-playlist actions and a persistent manual order. Drag a
video or use the drag handle's arrow keys to change that order.

Search matches filenames, uploader names, classification tags and notes.
Theme, Colour and Visual type filters combine. Arrange by supports My order,
theme, colour, visual type, name and newest first. Review filters distinguish
initial labels, reviewed clips and untagged clips.

Filtering and sorting are browsing operations. They do not rename files or
rewrite the saved manual order. Manual reordering is disabled while a filter
or alternate sort is active; **Clear filters** restores My order. Filtered
clips can still be copied into a playlist. Auto-playlist generation uses the
currently visible results or visible checked clips.

Deleting a source video also removes its associated metadata, thumbnail,
per-video layout file and library-order entry. Existing playlist entries can
still refer to the deleted filename; deleting media is not a playlist repair
operation.

## 4. Classification and correcting wrong tags

Classifications are shared server data, separate from filenames, playlists
and the Auto Perform energy/exclusion preferences. Each video may have several
themes, colours and visual types, plus a note and a Reviewed flag.

The initial 167-video library in this installation received draft labels from
thumbnail review, with colours measured at 15%, 50% and 85% of each clip.
These are suggestions, not reliable descriptions of every frame. A clean
checkout does not include the personal catalogue, and new downloads are
untagged; there is no background AI classifier automatically labelling them.

### Per-video review

Use **Edit tags** on a library card or **Review / edit** in **Manage
classification tags**. The editor contains an independent video player with
play/pause, seeking and looping, alongside the saved classifications.

- Remove an incorrect tag with its × chip.
- Add a known tag from a category's existing-tag picker.
- Enter custom tags using comma-separated fields.
- Edit the note or mark the clip reviewed.
- Save, or use **Save & next video** to work through the current review queue.
- Previous/Next changes the review clip; unsaved changes must be saved or
  cancelled before navigation. Cancel leaves the saved labels unchanged.

This player is for review only. It does not replace the main editor preview
or interrupt Mac playout. Per-video edits load the latest saved tags first;
if another screen changes the catalogue before saving, use **Reload saved
tags** and reconcile the edit rather than overwriting newer data.

### Classification manager

The wide manager has two views:

| View | Available work |
| --- | --- |
| Videos & review | Search, filter by category/review status, inspect thumbnails and assigned labels, open a clip for review, select shown clips, clear selection. |
| All tags & usage | Browse/search the vocabulary by category, see assignment counts, inspect matching clips, rename/merge a tag, or remove it from all matching library videos. |

Selected clips support adding/removing one tag, marking reviewed and marking
for review. Selection survives filtering inside the manager; its count shows
when selected clips are outside the current filters. Opening the manager
afresh clears the previous selection.

Tag-wide changes show how many videos they affect. Renaming to an existing
label merges assignments without duplicates. Changes are scoped to the chosen
category: removing a Colour does not remove a similarly named Theme. Other
labels, notes, media files and playlists are preserved.

**Undo last tag change** restores the last successful catalogue edit in the
current server session. The label describes that change. Each new edit replaces
the undo entry; a server restart clears it. Revision checks reject stale edits,
and a bulk operation either saves completely or changes nothing.

## 5. Player, layouts and saved layouts

The preview player supports Play/Pause, seeking, mute, one-shot playback,
forward Loop and Bounce. Bounce plays forwards and then backwards. Speed is
0.25×–2× in quarter-speed steps. Single, Dual, 3x, 4x and 8x layouts use one
decoded source with Canvas tile rendering; mirror configurations select
horizontal/vertical flips across tiles. There are 32 stored preset patterns,
with mode-specific quick choices.

Zoom is 1×–4×. Horizontal/vertical pan moves the crop through the source.
Captions can show uploader attribution and then hide automatically. Reset
controls restores Single, preset 1, No Loop, 1× speed, 1× zoom, centred pan and
the default manual transition. The fullscreen preview hides controls after
inactivity and reveals them on interaction.

Save several named layouts per video. A saved layout contains view/preset,
playback mode, speed, zoom and X/Y pan; it is not a full FX/material preset.
Names are suggested from the current settings and can be edited. Layouts can
be loaded, deleted or added to playlists from their menu. Playlist entries
store copies, so changing a saved layout does not rewrite old entries.

## 6. Playlists and the timeline

Playlists can be created, named, saved, loaded, deleted, reordered and looped.
The same source video may appear several times with different looks. Add an
entry using a library video or saved layout; configure its playback settings,
duration and incoming transition. Duration is measured in seconds or complete
loops. Estimated run times account for source duration, speed and Bounce.

The Playlist workspace brings the library into a side column and adds a
timeline, transition palette and selected-clip inspector. It supports dragging
clips into the timeline, reordering, moving/scrubbing the playhead, ±1 second
navigation, zooming the timeline and inspecting each entry's duration and
transition. Preview frame choices include this screen, 16:9, 16:10, 3:2, 4:3,
square and portrait.

**+ Add current view** inserts the currently prepared look at the nearest clip
boundary and copies its active effects into a cue. Entries are whole videos;
this is not a frame-accurate cutting or trimming editor. Quick Add to playlist
dialogs save their additions immediately; ordinary timeline/editor changes
need **Save**. The local playlist **Play** button becomes **Stop**, which also
pauses its video. This remains a preview audition. Use the distinct **Play
this playlist on Mac** action for live playout.

**Auto** creates a playlist for a requested duration using eligible visible
library videos. This generator differs from live audio-driven Auto Perform.
**Auto-script effects** adds timed cues only to entries without existing cues.

## 7. Transitions and timed effects

There are 61 transition choices: eleven classic choices and 50 GPU catalogue
effects. The GPU groups include glitch/digital, psychedelic/kaleidoscopic,
light/energy, geometric/motion, organic/atmospheric and experimental effects.
The exact names, IDs, parameter ranges/defaults and warning labels are in the
[generated transition catalogue](transition-catalogue.md).

Manual video selection and playlist entries have separate incoming-transition
settings. Duration is 0.15–10 seconds. Pace choices are Even, Build, Hit and
Ease. Available effect-specific parameters and seeds can be tuned in an
audition dialog. Drag a palette icon to a transition slot or select a slot and
change its settings. Adjacent-video audition and manual Tune do not interrupt
the main preview or live output. **Use in slot** copies the audition settings.

GPU effects require WebGL2 and fall back to Cross Dissolve when unavailable.
The audition reports fallback reasons. Pixel Scatter holds the incoming first
frame until its blocks clear. **Reduce flashes in transitions**, enabled by
default, modifies flash-heavy effects and applies to preview/render paths.
Named datamosh, fluid and particle transitions are shader simulations rather
than codec corruption or physical simulations.

Each playlist entry can schedule timed VFX/3D/Off cues, including text,
position, rotation, material and render quality. This timed-cue system is
separate from transition timing. Beat/bar transition durations, effect chains
and weighted random transition collections remain roadmap items.

## 8. Colour FX, live VFX and 3D objects

**FX** opens a colour/trails controller with hue, saturation, contrast,
brightness, blur, invert and sepia. Presets include Neon, Vintage, Acid, Night
Vision, Inverted and Dreamy. Trails can be enabled and their accumulation
adjusted. The controller also has transport shortcuts. Its changes belong to
the editor that opened it.

**VFX** opens the scene controller. Scenes are Liquid ripple, Image smear,
Video ribbons, Mirror sculpture, Kaleidoscope tunnel, Prism fracture and the
3D logo/text scene. Controls include enable/disable, intensity, feedback,
manual pulse, audio input and sensitivity. Keys 1–7 change scenes and Space
fires a pulse while this controller has focus, excluding text-entry controls.

Mirror sculpture reflects the video inside a text or alpha-image silhouette.
It accepts text, the current clip's Instagram ID, the bundled Version1 logo,
or transparent PNG/WebP artwork up to 1 MB. Position, size, reflection depth,
edge glow, angle, extrusion and motion shape the effect. It is separate from
the more detailed 3D logo/text renderer.

**3D Logo** and **3D Text** open their controls directly. Text accepts up to
80 characters. Typefaces are Modern sans, Bungee and Editorial serif.
High-resolution signed-distance outlines provide rounded bevels and extruded
surfaces, with X/Y/Z rotation or a chosen auto-rotation axis and sweep.

Finishes: Polished chrome, Liquid mirror, Brushed silver, Gold, Rose gold,
Black chrome, Pearl ceramic, Iridescent metal and Original colours. Adjust
bevel, roughness, video reflection, environment wrap and material brightness.
Original colours retains the red @ and white handle. Chrome/mirror use the
live video as a projected reflection environment, not inferred 3D scene depth.

Balanced, High definition and Ultra use progressively more edge samples and
GPU work. Output resolution depends on the display, device-pixel ratio and
GPU limits; recordings have their own fixed capture dimensions. Materials and
typefaces are copied by Add current view and can be edited in scripted cues.

## 9. Auto Perform and text lists

Auto Perform analyses a microphone, USB interface or suitable virtual audio
input. It does not use the video's soundtrack or play the analysed venue feed
back through the speakers. The Mac engine owns live audio processing; the iPad
controls it and displays its status.

On first use, configure/authorise input in **Mac audio setup**. Browser/OS
microphone permission and audio-context activation can need a local setup
gesture. Once set up, remote start/stop and performance controls are available.
Closing audio setup leaves the engine running.

Profiles are Balanced, Hypnotic, High Energy and Ambient. Change intervals are
4, 8 or 16 bars. Video pools are the whole library or current playlist.
**Curate videos** excludes clips and sets Calm/Medium/Peak energy preferences.
Those preferences are browser-local and separate from shared classifications.
Ordinary Library filters do not constrain Entire library Auto Perform.

Hold video, Lock layout, Next on beat, Tap tempo and Resync let the operator
guide the performance. Status shows BPM/confidence, beat/bar, musical section,
input level and the prepared next change. The decision log records recent
actions. Tempo needs several regular beats to settle; quiet passages hold the
current look. Drop detection reacts to heard audio and does not predict it.

Named text lists contain event names, Instagram IDs and web URLs. Add, edit,
delete, enable/disable and Show now; save a new list, rename or delete a list.
The selected list is remembered in that browser. Starter regulars are
`@tonyt.dj`, `@smilejack`, `@moss_b` and `version1djs.com`. Enabled entries rotate
through the 3D text scene; if none are enabled the logo remains available.
The selected material determines their appearance.

Remote Auto Perform start copies the editor's playlist pool, enabled text
entries and curation preferences to the engine. These browser-local settings
are not a continuously synchronised shared settings database.

## 10. Recording and Instagram clip capture

**Record** records the composition in the editor where it is pressed, including
its effects, transitions and captions. Standard capture is 1920×1080 at 30 fps,
with browser WebM capture followed by server-side H.264 MP4 conversion. Source
audio is included only when unmuted and capture support permits it. Stopping
during a loop can wait for a boundary. Conversion status and the resulting
library entry are shown.

There is currently no remote Record Mac action. Recording an iPad private
preview is not a recording of the independently running Mac show.

**Instagram clip** captures a movable, resizable crop from the prepared view:

| Format | Output |
| --- | --- |
| Feed 4:5 | 1080×1350 |
| Story 9:16 | 1080×1920 |
| Square 1:1 | 1080×1080 |

Choose source timecode and 0.1–600 seconds duration. Use current time copies
the playhead. Loop/Bounce can provide footage past a source boundary.
Capturing is separate from playlist playback and full recording; stop those
in this editor first.

Optional loop transitions are Crossfade, Dissolve, directional Wipe/Slide,
Pixelate and Circle open. Their duration is 0.1–10 seconds and cannot exceed
half the finished clip. Half the transition is placed at each end to join
across repeat playback; capture needs the extra overlap. Output is a silent
H.264 MP4 with finished duration rounded to 30 fps. A shortened/stopped capture
needs enough footage for its overlap or reports an error.

Clips use the configured Instagram clip folder, falling back to the download
folder. `instagram_` outputs are kept out of the source library. The app offers
a download link; Instagram Video Studio import/layering happens outside this
repository and is not an embedded editor feature.

## 11. Settings, persistence and current limits

Settings expose the source folder, Instagram clip folder and Reduce flashes.
Folder browsing operates on the Mac server's filesystem, even from an iPad.
Source order, classifications, layout presets and playlists are shared disk
data. Audio preferences, text lists and some display preferences are stored
in the current browser. See the [persistence table](technical-reference.md#persistence-and-backup).

Important limits for a redesign:

- Keep one authoritative Mac engine. Multiple output pages can compete for its
  lease; one active engine is allowed at a time.
- Server/browser restart is not a resumable show checkpoint. Output reconnect
  replays latest commands, not a frame-accurate playlist/performance history.
- Bounce is implemented in the main editor, but the current clean-output
  `setPlaybackMode` handler maps both Loop and Bounce to forward looping.
  Do not claim output parity for Bounce until that path is corrected.
- Local preview Play/Pause, recording and review are distinct from the limited
  explicit live commands. There are no dedicated remote live Pause/Resume or
  Record controls yet.
- FX/VFX pop-outs call their opening editor. They are not independent network
  clients; audio Connect in an iPad preview pop-out belongs to that device.
- Safari's proxy preview can differ in resolution/frame rate from the original.
  First-time preparation, media permission and GPU failures need clear states.
- This is a trusted-LAN app, without accounts, application authentication or
  internet hosting configuration.
- Offline audio look-ahead, editable performance replay, true 3D scene recovery,
  arbitrary 3D mesh import and independent multi-projector routing are not
  implemented features.
