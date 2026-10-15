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

### Download a video

Paste an Instagram reel/post URL into the input field and click **Download**. Progress streams in real-time.

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

**Mirror sculpture** uses the live video as a reflection inside text or a transparent PNG/WebP silhouette. Enter a title or Instagram handle, click **Use current video's @ID**, select the bundled **Version1 logo**, or upload logo artwork (up to 1 MB). The Position, Size, Reflection depth, Edge glow, 3D angle, Extrusion, and Motion controls shape the object and bend the video around it. Use a high-contrast logo with a transparent background; the image's alpha defines the reflective surface. The 3D controls create a live extruded silhouette rather than importing a 3D mesh.

After loading a video, click **Mirror 3D** in the player controls to switch straight to Mirror sculpture and open its controller. Click the active button again to turn the effect off and close the controller.

Click **3D Logo** for a solid object built from the Version1 SVG, or **3D Text** for an editable Instagram ID. Click the active button again to turn it off and close the controller. The text starts as `@tonyt.dj` in the bundled Bungee font, with a red @ and white handle. In the controller, switch between the two objects, type another ID, move and resize it, adjust depth and X/Y/Z rotation, and choose an auto rotation axis with start and end angles. The selected logo or text also becomes the shape used when you switch to Mirror 3D. Auto rotate at zero holds the chosen manual angle. The surface reflects the live video. The object appears in the main player, clean output, and recordings.

### Save a video layout

Select a video from the Library, then set its layout, Playback mode, speed (0.25×–2× in 0.25× steps), panel orientation, zoom and X/Y position in the player. The suggested name in **Saved layouts for this video** updates as you change settings; edit it if you like, then click **Save layout**. You can save several layouts for the same video, load any of them to preview it, or delete one. In the Playlist tab, select that video and choose one of its saved layouts from the **Saved layout** dropdown before adding an entry. The entry stores a copy of the values, so later changes to the saved layout do not change existing playlists.

Right-click a saved layout (or click its **⋯** button) and choose **Add to playlist…**. You can also click **+ Playlist** on any video in the Library sidebar, or right-click that video. Select an existing playlist or create a new one, set the duration and transition, and click **Add to playlist**. The entry is saved immediately. A Library video uses its current player layout when selected, or a Single layout when it is not selected.

### Playlist / DJ mode

1. Switch to the **Playlist** tab in the right panel
2. Click **New** to create a playlist, give it a name
3. Add entries — each entry specifies:
   - **Video** — select from library (with thumbnail preview)
   - **View mode** — Single, Dual, or 8x
   - **Preset** — mirror configuration (P1–P32)
   - **Duration** — number of loops or seconds
   - **Transition in** — Cut, Fade In, Fade Out/In, Cross Dissolve, Wipe, Zoom / Spin, or Whip Pan, with a duration from 0.15 to 5 seconds
4. Drag the visual transition icons into the slots between video cards. Click a slot to adjust its type or duration. Drag video cards to reorder them, or use × to remove one.
5. Click **Save** to persist the playlist (survives page reloads)
6. Click **Play** to start — the indicator bar shows current entry and progress
7. Use **Next** to skip ahead, **Stop** to exit playlist mode

The same video can appear multiple times with different treatments, e.g.:
- Dual mode, preset 5, for 10 loops
- 8x mode, preset 22, for 30 seconds
- 8x mode, preset 7, for 5 loops

Use **Transition** beside Playback to choose the effect and duration when selecting a video manually. Playlist entries have their own incoming transitions, including when you press **Next**. Transitions appear in fullscreen, clean output, and recordings.

The timeline shows a thumbnail, layout, and configured run time beside every video, plus an estimated playlist total. A loop-based run time accounts for source length, loop count, playback speed, and Bounce playback. Seconds-based entries show their specified slot length.

### Capture an Instagram background clip

1. Load a video from the Library and set its layout, mirror preset, zoom, and effects.
2. Click **Instagram clip** under the player. Choose **Feed 4:5**, **Story 9:16**, or **Square 1:1**.
3. Drag the green box over the area to keep. Drag its bottom-right handle to resize it while preserving the selected aspect ratio.
4. Enter a start timecode (`mm:ss.sss`) and a length in seconds. **Use current time** copies the current playback position. If the clip runs beyond the source file, select **Playback → Loop** or **Bounce** first.
5. Click **Capture MP4**. The player seeks to the start and records the selected area for the requested time, including forward and reverse frames in Bounce mode. The result is a silent H.264 MP4 in the selected clip folder; use **Download clip** to save a copy elsewhere. Instagram captures are kept out of the Club Visuals Library.

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
