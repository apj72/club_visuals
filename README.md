# Club Visuals

A browser-based tool for downloading Instagram videos and playing them back as multi-screen DJ visuals with mirror/kaleidoscope effects.

## Features

- **Download** Instagram reels and posts via URL
- **Video library** with thumbnail previews
- **Multi-screen display** — Single, Dual (2-up), or 8x (4x2 grid) layouts
- **32 mirror presets** — horizontal and vertical flip combinations across all screens, controlled by a slider and quick-access preset buttons
- **Playlist / DJ mode** — build cue lists where each entry specifies a video, view mode, mirror preset, and duration (loop count or seconds). Playlists auto-advance and are saved as JSON for reuse across sessions
- **Fullscreen playback** — gap-free edge-to-edge video with auto-hiding controls
- **Seamless looping** — near-invisible loop points
- **Efficient rendering** — clones share a single decoded video stream via `captureStream()`

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
   - **Mute** — toggle audio
   - **Dual / 8x / Single** — cycle view modes
   - **Slider + preset buttons** — select mirror configuration (different presets shown for Dual vs 8x)
   - **Fullscreen** — fills the entire screen, controls auto-hide after 1.5s

### Playlist / DJ mode

1. Switch to the **Playlist** tab in the right panel
2. Click **New** to create a playlist, give it a name
3. Add entries — each entry specifies:
   - **Video** — select from library (with thumbnail preview)
   - **View mode** — Single, Dual, or 8x
   - **Preset** — mirror configuration (P1–P32)
   - **Duration** — number of loops or seconds
4. Reorder entries with ↑↓ buttons, remove with ×
5. Click **Save** to persist the playlist (survives page reloads)
6. Click **Play** to start — the indicator bar shows current entry and progress
7. Use **Next** to skip ahead, **Stop** to exit playlist mode

The same video can appear multiple times with different treatments, e.g.:
- Dual mode, preset 5, for 10 loops
- 8x mode, preset 22, for 30 seconds
- 8x mode, preset 7, for 5 loops

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
└── playlists/      # Saved playlists as JSON (gitignored)
```

## License

MIT
