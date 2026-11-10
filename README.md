# Club Visuals

A browser-based tool for downloading Instagram videos and playing them back as multi-screen DJ visuals with mirror/kaleidoscope effects.

## Features

- **Download** Instagram reels and posts via URL
- **Video library** with thumbnail previews and saved drag-and-drop ordering
- **Multi-screen display** — Single, Dual (2-up), or 8x (4x2 grid) layouts
- **32 mirror presets** — horizontal and vertical flip combinations across all screens, controlled by a slider and quick-access preset buttons
- **Playlist / DJ mode** — build cue lists where each entry specifies a video, view mode, mirror preset, and duration (loop count or seconds). Playlists auto-advance and are saved as JSON for reuse across sessions
- **Per-video layout presets** — save multiple named combinations of layout, playback method, panel orientation, zoom and X/Y position for each video, then use them in playlists
- **Fullscreen playback** — gap-free edge-to-edge video with auto-hiding controls
- **Seamless looping** — near-invisible loop points
- **Efficient rendering** — clones share a single decoded video stream via `captureStream()`
- **Live VFX** — ripple, image smear, video ribbons, kaleidoscope, prism fracture, reflective text, and a rotatable 3D Version1 logo, driven by a venue microphone or USB audio input
- **Auto Perform** — listens to a microphone/USB feed and automatically changes videos, layouts, transitions, and VFX on detected beats and musical sections
- **Instagram background clips** — position a 4:5, 9:16, or square crop box over the player, choose a source timecode and length, and save a silent MP4 for Instagram Video Studio

## Requirements

- Python 3.10+
- [yt-dlp](https://github.com/yt-dlp/yt-dlp) — `brew install yt-dlp`
- [ffmpeg](https://ffmpeg.org/) — `brew install ffmpeg` (for thumbnail generation)
- A Chromium-based browser (Brave, Chrome, Edge) with an active Instagram login — used for cookie-based authentication

## Setup

```bash
git clone https://github.com/apj72/club_visuals.git
cd club_visuals
```

No Python dependencies beyond the standard library.

## Usage

### Start the server

```bash
./start.sh
```

This starts the server at `http://localhost:8008` and opens it in your browser. On first launch it exports Instagram cookies from your browser for authenticated downloads.

### Stop the server

```bash
./stop.sh
```

### iPad preview and Mac playout

Connect the Mac and iPad to the same local network and start the server on the
Mac. **Open Mac playout** and **Mac fullscreen** on the iPad open a dedicated
Brave/Chrome/Edge window on the Mac. Sending a look or playlist also opens it
automatically if no playout engine is connected. Its engine runs playlists and
audio analysis. A normal `http://localhost:8008/output` page still works as an
output; keep only one playout engine open during a performance.

On the iPad, open `http://<Mac-local-IP>:8008` in Safari. The main editor is now
a **private preview**, on both iPad and Mac: choosing videos, auditioning
transitions, changing layouts and adjusting effects does not affect playout.
Use **Send to Mac** to play the current preview from its current position,
including layout, speed, zoom, pan, FX and VFX. Further edits stay private;
send again when ready. **Preview fullscreen** affects the controller only.

An iPad connection automatically takes remote control. The Mac editor is
greyed out and shows **Being remote controlled by iPad**, with **Return control
to Mac** and **Open output screen** buttons. Returning control immediately
unlocks the Mac and blocks further iPad playout commands until you explicitly
tap **Take remote control** on the iPad. Private iPad preview editing remains
available. If the iPad disconnects or stops sending its heartbeat, the Mac
unlocks after eight seconds; existing playout continues. **Open output screen**
opens or brings forward the dedicated output window without changing its
fullscreen state, and remains available on the locked Mac.

iPad/Safari previews use cached H.264/AAC copies, including clips whose MP4
files contain VP9. A progress message appears while the Mac prepares a clip
for the first time. Copies use a maximum 1280-pixel edge and 30 fps; the Mac
output uses the original video. All media routes support Safari's byte-range
requests. Preview starts muted and inline; tap Play if iPadOS blocks autoplay.

**Play this playlist on Mac** sends a copy of the currently edited playlist,
including unsaved entries and its loop setting. Its **Play** button in the
editor remains a private audition. Live playlists keep running when the iPad
locks or disconnects. **Next on Mac** advances the live playlist and **Stop
Mac** stops live playback and Auto Perform. Connection status and command
confirmations appear above the editor. Keep the Mac awake during playout.

**Mac fullscreen** controls the dedicated Mac browser window directly, so
entering and exiting fullscreen needs no Mac-side confirmation. It uses a
separate browser profile in `.runtime/playout-browser` and a loopback-only
DevTools socket; it never attaches to or restarts your personal browser.
The button confirms the window's actual fullscreen state. You can move the
dedicated window to a projector before the performance. The normal browser
page's local Enter fullscreen button is independent of this window control.

For audio, open **Mac audio setup** on the Mac output. Select the microphone or
USB input there and start Auto Perform once locally to grant microphone
permission and activate audio. Stop it if only preparing, then close setup;
the engine keeps running. The iPad's **Sound to Visuals · Mac audio** controls
start/stop Auto Perform, select Mac audio inputs, choose style/change interval,
hold video, lock layout, queue the next beat, tap tempo and resync. Starting
Auto Perform remotely also copies the editor's playlist pool, enabled text
entries and video curation. BPM, section and input status come from the Mac.
The iPad does not need microphone access. Preview FX/VFX audio-connect controls
still belong to the preview device; use Mac Auto Perform for venue audio.

After updating an already running installation, run `./stop.sh` then
`./start.sh` and reload both devices. If the iPad cannot connect, check the
Mac's incoming Python firewall permission and avoid Wi-Fi client isolation.

Run `python3 -m unittest test_remote_control.py test_media_preview.py` for remote
routing, engine ownership, offline handling, reconnect state, Safari ranges,
and a real VP9-to-H.264 conversion check.

### Download a video

Paste an Instagram reel/post URL into the input field and click **Download**. Progress streams in real-time.

### Browse by theme, colour and visual type

The Library includes search, Theme, Colour and Visual type filters. Combine
filters to find a group such as psychedelic portraits in purple, or geometric
3D animations. **Arrange by** groups the list by theme, colour, visual type,
name or download date. **Clear filters** restores **My order**, preserving your
saved drag-and-drop order. Filtered videos can still be dragged to a playlist;
the auto-playlist selector also uses the currently visible results.

The initial 167 clips have draft visual labels from thumbnail review, with
colours measured at 15%, 50% and 85% of each clip. These are suggestions rather
than a frame-by-frame description. Use **Edit tags** on any clip to correct
labels, add your own tags or notes, and mark them Reviewed. Tags are shared
between Mac and iPad and saved separately in `library_catalog.json`. Refresh
the Library on another device to see edits. Source files and saved playlists
keep their existing names and paths. New downloads start as **Untagged**.

### Playback

1. Click any video in the **Library** to load it
2. Use the controls:
   - **Play / Pause** — toggle playback
   - **Loop** — seamless looping
   - **Speed − / +** — 0.25× to 2× playback in 0.25× steps
   - **Mute** — toggle audio
   - **Dual / 8x / Single** — cycle view modes
   - **Slider + preset buttons** — select mirror configuration (different presets shown for Dual vs 8x)
   - **Reset controls** — return to Single layout, preset 1, No Loop, 1× speed, 1× zoom, and centred X/Y pan
   - **Fullscreen** — fills the entire screen, controls auto-hide after 1.5s

### Live VFX

While a video or playlist is playing, click **VFX** in the main player to open its dedicated pop-out controller. Turn VFX on, choose a scene, and adjust Intensity and Feedback. The effect applies to the current layout in the main fullscreen player, clean output window, and recordings. Keys 1–7 switch scenes and Space fires a pulse while the controller has focus. To react to the DJ's music, select a venue microphone or USB audio input and click **Connect**. The input is analysed but not played through the app. The video soundtrack is not used for VFX. The **FX** button opens the separate colour and trails controller.

### Auto Perform: sound to visuals

Choose a microphone or USB audio input in the **Sound to Visuals** bar and press **Auto Perform**. On first use, grant browser microphone permission. The app mutes the video's own soundtrack while it listens to the external audio feed, estimates the beat and energy, and changes videos, layouts, transitions, and VFX automatically. The BPM display includes a confidence score. It takes several regular beats to lock onto a tempo; quiet passages hold the current look. The clean output and recordings receive the same player changes. **Stop Auto** leaves the current video on screen and restores its previous mute setting.

Use **Style** and **Change every** to tune the performance. **Videos** can use the full library or the currently loaded playlist as a pool. **Curate videos** lets you exclude clips and mark them Calm, Medium, or Peak; those preferences are stored in this browser. **Hold video** and **Lock layout** prevent those automatic changes. **Next on beat** queues a video change, **Tap tempo** supplies a tempo estimate, and **Resync** resets the beat count. The **Performance decisions** list shows the latest choices. A USB/virtual line input is preferable to an open microphone in a loud venue. Live analysis reacts to an unexpected drop after it arrives; it cannot predict unheard music. [Implementation and research plan](docs/sound-to-visuals-plan.md).

Open **3D text for Auto Perform** to manage named text lists. The starter **Version1 regulars** list contains `@tonyt.dj`, `@smilejack`, `@moss_b`, and `version1djs.com`. Add event names, Instagram IDs, or short web URLs; edit or remove entries, untick any you want to exclude, and use **Show now** to preview one immediately. **Save as new** copies the current list under a new name, while **Rename** and **Delete list** manage saved lists. Edits save automatically, and the last selected list loads when this browser opens Club Visuals again. An existing custom text pool is kept as **My text** during the upgrade, with missing regular entries added. Auto Perform rotates through enabled entries in the active list when it selects the 3D text scene, avoiding the previous entry when it can. Instagram IDs have a red @ and white handle; event names and URLs render in white. If no entries are enabled, Auto Perform can still show the Version1 logo.

**Mirror sculpture** uses the live video as a reflection inside text or a transparent PNG/WebP silhouette. Enter a title or Instagram handle, click **Use current video's @ID**, select the bundled **Version1 logo**, or upload logo artwork (up to 1 MB). The Position, Size, Reflection depth, Edge glow, 3D angle, Extrusion, and Motion controls shape the object and bend the video around it. Use a high-contrast logo with a transparent background; the image's alpha defines the reflective surface. The 3D controls create a live extruded silhouette rather than importing a 3D mesh.

After loading a video, click **Mirror 3D** in the player controls to switch straight to Mirror sculpture and open its controller. Click the active button again to turn the effect off and close the controller.

Click **3D Logo** for the Version1 object or **3D Text** for editable text or an Instagram ID. Click the active button again to turn it off and close the controller. Text starts as `@tonyt.dj` in Modern sans; choose Bungee for the original block style or Editorial serif for a different look. Adjust position, size, depth and X/Y/Z rotation, or choose an auto rotation axis and its start/end angles. Auto rotate at zero holds the manual angle. The selected logo or text also becomes the shape used by Mirror 3D.

The 3D surface uses a high-resolution signed-distance outline with smoothly rounded bevels. **Surface finish** offers Polished chrome, Liquid mirror, Brushed silver, Gold, Rose gold, Black chrome, Pearl ceramic, Iridescent metal and Original colours. Original colours retains the red @ and white handle. **Bevel** rounds the edges, **Roughness** varies the polish, **Video reflection** controls reflected light, **Video environment wrap** spreads the playing frame around the object, and **Material brightness** adjusts exposure. Chrome and mirror respond to the live video as the object rotates, with softer reflections on rougher surfaces. This is a projected video environment, rather than a reconstructed 3D scene or reflections of objects hidden from the camera.

**High definition** is the default render quality, with two samples per pixel on the object. **Ultra** uses four for smoother edges; **Balanced** reduces GPU work. Rendering follows the preview/output resolution up to the existing display and GPU limits. All finishes appear in the private preview, clean output and recordings, and **Add current view** copies the finish, typeface and material settings into the playlist's effect cue. Scripted 3D cues expose those same settings. Reload both the controller and Mac output after updating the renderer.

Run `node test_vfx_surface.js` for signed-distance geometry, letter counters, rotation and legacy-setting checks.

### Save a video layout

Select a video from the Library, then set its layout, Playback mode, speed (0.25×–2× in 0.25× steps), panel orientation, zoom and X/Y position in the player. The suggested name in **Saved layouts for this video** updates as you change settings; edit it if you like, then click **Save layout**. You can save several layouts for the same video, load any of them to preview it, or delete one. In the Playlist tab, select that video and choose one of its saved layouts from the **Saved layout** dropdown before adding an entry. The entry stores a copy of the values, so later changes to the saved layout do not change existing playlists.

Right-click a saved layout (or click its **⋯** button) and choose **Add to playlist…**. You can also select a video in the Library sidebar and click its **+ Playlist** button, or right-click any Library video. Select an existing playlist or create a new one, set the duration and transition, and click **Add to playlist**. The entry is saved immediately. A Library video uses its current player layout when selected, or a Single layout when it is not selected.

### Playlist / DJ mode

1. Switch to the **Playlist** tab in the right panel
2. Click **New** to create a playlist, give it a name
3. Add entries — each entry specifies:
   - **Video** — select from library (with thumbnail preview)
   - **View mode** — Single, Dual, 3x, 4x, or 8x
   - **Preset** — mirror configuration (P1–P32)
   - **Duration** — number of loops or seconds
   - **Transition in** — choose from 50 GPU effects or eleven classic effects, set a duration from 0.15 to 10 seconds, and choose an Even, Build, Hit, or Ease speed curve
4. Drag the visual transition icons into the slots between video cards. Click a slot to adjust its type, duration, or speed curve. Use **Audition** above the icons to preview the selected effect with library videos, or **▶ Preview** on a slot to audition its two adjacent videos. The audition window lets you choose clips, change the effect, duration, speed curve, and available effect parameters, then replay; **Use in slot** saves those settings to that playlist entry. It does not interrupt the main player or clean output. Click **✦ Script effects** on a video to schedule VFX scenes, mirror, 3D logo, 3D text, and Off cues with effect settings. **✦ Auto-script effects** adds varied cues to videos that have none. Drag video cards to reorder them, or use × to remove one.
5. Click **Save** to persist the playlist (survives page reloads)
6. Click **Play** to start — the indicator bar shows current entry and progress
7. The **Play** button becomes **Stop** while the playlist runs; click it to stop playback and pause the video. Use **Next** on the player to skip ahead.

The same video can appear multiple times with different treatments, e.g.:
- Dual mode, preset 5, for 10 loops
- 8x mode, preset 22, for 30 seconds
- 8x mode, preset 7, for 5 loops

Use **Transition** beside Playback to choose the effect, duration (0.15–10 seconds), and speed curve when selecting a video manually. **Tune** opens the audition window for effect-specific controls and saves them for manual playback. Playlist entries have their own incoming transitions, including when you press **Next**. The 50 catalogue effects use WebGL2; if it is unavailable they play as Cross Dissolve and the audition reports why. Pixel Scatter holds the incoming clip on its first frame until the blocks have cleared. Transitions appear in fullscreen, clean output, and recordings. **Reduce flashes in transitions** is enabled by default in Settings and applies to previews and playback. Strobe Cut becomes a smooth reveal in this mode; White Flash is attenuated. Datamosh, fluid, smoke, particle, and similar effects are visual shader simulations rather than codec edits or physical simulations.

The [transition roadmap](docs/transition-roadmap.md) lists all 50 effects and the separate automation work still planned.

Run `node test_transition_engine.js` to check the catalogue, parameter validation, saved-setting round trips, and the global flash preference. The WebGL2 effects were also visually checked with real clips and swept across all 50 definitions using mixed-size source frames.

The timeline shows a thumbnail, layout, and configured run time beside every video, plus an estimated playlist total. A loop-based run time accounts for source length, loop count, playback speed, and Bounce playback. Seconds-based entries show their specified slot length.

In the Playlist tab, use **+ Add current view** to insert the video currently shown in the player, including its layout, playback settings, and active VFX, at the playhead. Clips are inserted at the nearest clip boundary because playlist entries are whole videos. The new clip opens in the timeline inspector; adjust its duration or incoming transition there, then **Save** the playlist. Use **Preview frame** to choose this screen, 16:9, 16:10 projector, 3:2 laptop, or another frame ratio. The chosen ratio is remembered in this browser. A single video is fitted inside the frame with its original proportions, so any extra space appears as black bars.

### Capture an Instagram background clip

1. Load a video from the Library and set its layout, mirror preset, zoom, and effects.
2. Click **Instagram clip** under the player. Choose **Feed 4:5**, **Story 9:16**, or **Square 1:1**.
3. Drag the green box over the area to keep. Drag its bottom-right handle to resize it while preserving the selected aspect ratio.
4. Enter a start timecode (`mm:ss.sss`) and a length in seconds. **Use current time** copies the current playback position. If the clip runs beyond the source file, select **Playback → Loop** or **Bounce** first.
5. To join the end smoothly to the start, choose a **Loop transition** (Crossfade, Dissolve, Wipe, Slide, Pixelate, or Circle open) and its duration. Half the transition appears at the end of the file and half at the beginning, so it continues across repeat playback. The selected timecode starts the source footage; with a transition, the exported file opens midway through the blend. **None** keeps the original capture behaviour.
6. Click **Capture MP4**. The finished loop keeps the requested length (rounded to the nearest 30 fps frame). A transition records one extra transition length for overlapping footage; allow room for this after the source timecode, or enable Loop/Bounce. Transition lengths are 0.1–10 seconds, rounded to an even number of frames, and cannot exceed half the finished length. The result includes forward and reverse frames in Bounce mode. It is a silent H.264 MP4 in the selected clip folder; use **Download clip** to save a copy elsewhere. Instagram captures are kept out of the Club Visuals Library. Stopping early creates a shorter loop if enough footage exists for the transition; otherwise the capture reports that it was stopped too early.

Set the clip folder in **Settings → Instagram clip folder**. Browse to a folder and click **Use this folder**. Until you set one, clips use the regular download folder. **Use download folder** restores that behaviour.

In Instagram Video Studio, use **Add layers → Video** and choose the MP4. Select that layer, click **Fill canvas** in its Video properties, and place it below text and other foreground layers. Add your audio separately in the studio.

### CLI download

```bash
./ig-save.sh <instagram-url>
```

## Browser authentication

The server reads cookies from Brave browser at startup and caches them for 1 hour. To use a different Chromium browser, edit the `--cookies-from-browser` value in `server.py`.

## File structure

```
club_visuals/
├── server.py       # Python HTTP server (stdlib only)
├── index.html      # Complete frontend (single file)
├── ig-save.sh      # CLI download script
├── start.sh        # Start server + open browser
├── stop.sh         # Stop server
├── downloads/      # Saved videos (gitignored)
├── thumbnails/     # Cached thumbnails (gitignored)
├── playlists/      # Saved playlists as JSON (gitignored)
└── video_presets/  # Saved per-video layouts as JSON (gitignored)
```

## License

MIT

The bundled Version1 logo is a brand asset and is not covered by the MIT code license.
The bundled Bungee font is licensed under the SIL Open Font License 1.1; see [assets/Bungee-OFL.txt](assets/Bungee-OFL.txt).
