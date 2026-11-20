# Connection to V1

The redesigned interface is a presentation layer applied to the current V1
document at request time. No copy of the editor, renderer or data service is
maintained. `launch.py` imports the original server and subclasses its HTTP
handler for presentation assets and the new `/api/show-library` model store.
`/` and every existing route retain the original handler. `/redesign` reads
the current `index.html` and adds scoped styles, presentation and Show Builder
scripts. The resident `/?host=1` engine and
`/output` always use the original V1 documents.

| New presentation | Existing connection |
| --- | --- |
| Navigation | Calls V1 `switchTab`; retains its library relocation and timeline lifecycle. |
| Private preview and transport | Original `videoWrap`, stage, video/canvases, progress and transport nodes. No media sizing, crop, composition or tile-transform rules are overridden. A uniform presentation transform fits the entire unchanged preview in its panel, with full-size transport; fullscreen removes the fit transform, and capture uses the unscaled view. |
| Layout inspector | Original layout, playback, config, speed, zoom/pan nodes and their listeners. |
| Mirror choices | Exact signatures read from V1 `CONFIGS` using V1 position maps; display IDs call existing `setConfig`. Settings stores only featured UI IDs in a new localStorage key. |
| FX, VFX, text, logo | Original buttons open original controller windows with the original editor as opener. |
| Library and classification | Original library nodes, catalogue filters, review and tag-manager dialogs, listeners and API requests. |
| Playlists | Entire original playlist tab, timeline, entry inspector, cues, transition audition, generator and save/load actions. |
| Show Builder | Pure `show-models.js` compiler resolves reusable bricks, weighted sections, DJ profiles and library selections into ordinary playlist entries. `show-builder.js` provides visual authoring and calls the existing playlist API, editor and timeline for saving and preview. |
| Shared models | `show_store.py` persists `show_models.json` separately from playlists, with atomic writes and revision checks for multiple devices. |
| Reflective object choreography | Shared VFX renderer keeps the live source texture while clearing the visible backdrop. Shared authoring controls save paths/zoom/axes/source travel into effect cues and models. Runtime clocks synchronize timeline poses, remote takes, clean output and recording. |
| Source cue ranges | Shared `source_range.js` time mapping and source-boundary playback; named metadata via `video_cues.py`/`video_cues.js`. Playlist/layout snapshots, remote scenes and clean output carry the same optional In/Out range. |
| Timed layouts | Shared playlist cue timers apply composition changes without loading the source again. Existing layout/config/zoom setters update playback, output broadcasts and recording; timeline scrubbing resolves the layout at the requested time. |
| Transition focus examples | One independent V1 `createTransitionController` instance, driven by two original-library thumbnail frames; no palette selection, playlist or live state writes. |
| Auto Perform | Entire original performance panel, curation and text lists. |
| Capture | Original capture panel, capture overlay, recording button and conversion service. |
| Settings/import | Original folder settings, flash setting, cookie authentication and download controls. |
| iPad connection links | Shared `remote_control.js` dialog and V1 `/api/ipad-links`; current LAN IPs and listener port are refreshed on demand, without changing remote commands. |
| Mac actions/ownership | Entire original remote toolbar and handover dialog; no command implementation is added. |

All document IDs remain unique and all original inputs, dialogs and handlers
are retained. Presentation wrappers use new classes/IDs only. Browser storage
and shared files stay on the same origin when the optional launcher uses the
normal port. Saved edits are real shared V1 data, not an isolated sandbox.

## Shared Facebook capture extension

The later user request explicitly authorises the shared V1 capture addition.
`index.html` adds Facebook feed/landscape/reel/square formats and sends the
selected profile; `server.py` recognises these exports, uses the existing
loop/conversion and clip-folder code, excludes them from source discovery and
resolves their download links. The reskin reads those same controls at request
time. Playout rendering and original Instagram profiles remain intact.

## Dependencies that cannot be completed in presentation

V1 has no six-tile renderer; 6× remains unavailable. V1's triple config model
produces sixteen distinct arrangements rather than the proposed twelve: the full list is
derived from actual signatures rather than inventing entries. New engine
orientations, new render quality, and embedded replacements for the FX/VFX
controllers would require a separately scoped engine/controller change.
Existing controller windows remain accessible in this reskin.

## Isolation and rollback

Run the optional launcher in place of `server.py` on port 8008, and choose
`/redesign` or `/`. Stop it and run the existing `./start.sh` to restore the
original launcher. The original launch script remains unchanged. Never run
two servers against the same writable data concurrently. A different port is
supported for isolated developer fixtures, with browser-local preferences
separate by origin. No migration is involved.
