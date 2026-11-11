# V2 implementation progress

## Current milestone — private layouts and isolated Mac control

**11 November 2026.** The trial now renders Single, Dual, 3×, 4× and 8×
compositions from one decoded video. It uses the baseline's 32 mirror patterns,
tile position maps and cover/crop maths. Speed, Once/Loop, zoom and pan are
working; Single retains the existing contain behaviour. Preview transport,
seeking, mute and preview fullscreen are separate from Mac controls.

Start with the additional `--enable-playout` flag to enable the trial's native
output, status, ownership, Send, Stop and Mac fullscreen actions. Saved edits,
deletion, downloads, config changes and recording uploads remain blocked.
Without the flag, the previous server-side read-only behaviour still applies.

```sh
python3 scripts/run-ui-preview.py --port 8012 --bind 0.0.0.0 --enable-playout \
  --data-root /private/tmp/club-visuals-v2-data \
  --runtime-root /private/tmp/club-visuals-v2-runtime
```

Refresh `http://localhost:8012/ui-v2/` (or the Mac's LAN address on iPad).
Choose a clip, prepare a composition and use **Take remote control**. Open
the trial output and wait for its engine to connect, then Send. Commands are
reported as sent first and confirmed only after the engine returns their ID.
Connection/ownership failures leave live actions unavailable. No claim occurs
merely from opening V2. Returning control revokes the session until explicitly
claimed again. A Mac V2 editor becomes inert while another controller owns it;
recovery stays available in the header. These actions affect only port 8012.

### Use the existing media library

To demo with the real library, point the trial at the existing downloads folder
and read its tag catalogue/order file in place. Video files are streamed from
their original paths; they are not copied. Keep the trial data/runtime folders
separate so generated thumbnails, preview transcodes and output browser state
remain private to the trial. All saved-data endpoints are still blocked.

```sh
python3 scripts/run-ui-preview.py --port 8012 --bind 0.0.0.0 --enable-playout \
  --data-root /private/tmp/club-visuals-v2-data \
  --runtime-root /private/tmp/club-visuals-v2-runtime \
  --media-root /Users/antonyjoyce/git-repos/club_visuals/downloads \
  --catalog-file /Users/antonyjoyce/git-repos/club_visuals/library_catalog.json \
  --order-file /Users/antonyjoyce/git-repos/club_visuals/library_order.json
```

The trial serves the full current library and its current classifications. The
catalogue/order files are read-only in this mode; thumbnail generation writes
only to the isolated trial data folder. The production app on port 8008 is not
reconfigured.

This milestone sends layout/playback with neutral colour, disabled VFX/trails
and captions off. It does not yet edit creative effects, save layouts, edit
tags/playlists, use Auto Perform or capture recordings. Bounce is deliberately
unavailable until its preview/output behaviour is addressed.

### Mirror patterns and portrait source preview

Pattern cards now use the same per-layout tile position maps as the Mac
renderer. Their asymmetric portrait thumbnail makes horizontal/vertical flips
visible. Equivalent patterns that differ only by flipping the whole canvas are
shown once (for example, Dual's former patterns 1/3 and 2/4). Preview sizing
retains the existing behavior: portrait Single uses a portrait canvas, while
composed/tiled layouts use the established 16:9 canvas. This UI redesign does
not change the Mac output or composition sizing logic.

### Focused prepare/settings screens

Prepare now keeps the selected-video library in a fixed-height internal
scroller with text search, multi-select Theme/Colour/Type facets, tag-review
status filters, sorting by library order/name/theme/colour/type, result counts,
and a one-action clear state. Settings is a
separate page containing the live preview and a
vertically scrollable control panel. Native selects are replaced by compact
menus positioned beside their trigger, avoiding browser-native oversized
popups that can open at the edge of the screen.

Validation: 45 Python tests passed, both existing Node checks passed, and the
new `node test_ui_v2_preview.mjs` checks mirror mapping, crop bounds and Single
contain rendering. Real trial-engine browser checks confirmed a Quad look with
pattern 7 and zoom 1.5, seek transfer, native fullscreen enter/exit and Stop.
Editing the private layout left the output snapshot unchanged; Return control
disabled Send. Landscape 1194px and portrait 834px fit without page overflow,
and the header remained pinned. Physical iPad verification is still pending.

Chromium creates its own Singleton symlinks inside the owned output profile.
The runtime guard therefore validates the proxy cache and profile roots/
DevTools file rather than rejecting browser-owned internal Singleton links.
The copied data tree still rejects all symlinks. Normal production code,
launchers and data remain unchanged.

The earlier milestone record below is retained as history; its statement that
all trial POST requests are blocked applies to the default runner mode only.

**First milestone · 11 November 2026**

The trial now has real library browsing and private media playback in a new
shell. It is deliberately read-only. This is the foundation of the redesign,
not feature parity with the mockups.

## Recovery and isolation

- Baseline commit: `bfe7912`; annotated tag: `ui-v2-baseline-2026-11-11`.
  Both were pushed to GitHub.
- Implementation branch: `feature/ui-v2`.
- Worktree: `/private/tmp/club-visuals-ui-v2` (temporary; source is retained in
  Git, but relocate the checkout if doing longer-term work).
- Verified personal-media/metadata backup:
  `/Users/antonyjoyce/club-visuals-backups/ui-v2-baseline-2026-11-11`.
  Its manifest records hashes for 385 files and the baseline SHA. Browser-local
  preferences still need an export before any real-data adoption.
- Copied trial data: `/private/tmp/club-visuals-v2-data`.
- Independent trial runtime/profile: `/private/tmp/club-visuals-v2-runtime`.
- Production source, normal launchers, current UI and live renderer have no
  implementation edits. No trial code was merged into main.

## Run and review

From the implementation worktree:

```sh
python3 scripts/run-ui-preview.py --port 8012 --bind 127.0.0.1 \
  --data-root /private/tmp/club-visuals-v2-data \
  --runtime-root /private/tmp/club-visuals-v2-runtime
```

Open `http://localhost:8012/ui-v2/`. For iPad testing, use `--bind 0.0.0.0`
and open `http://<Mac-local-IP>:8012/ui-v2/`. The initial trial was started
with that LAN bind. Stop only this terminal's runner with Ctrl+C. Do not use
the legacy worktree's `stop.sh`, which targets production port 8008.

The default sample media folder contains eight copied clips and matching
classification records. Search matches names and saved tags. Selecting a video loads it into
an independent muted player with seeking and native transport. Safari requests
the existing compatible-preview conversion API. Playback on Chromium was
checked with a real copied file; physical Safari verification remains pending.

Back to current UI opens the unchanged legacy page on the **trial port**.
Opening the production root on port 8008 returns to the normal installation.
There are no editable drafts in this milestone, so no dirty-draft prompt is
needed yet.

## Deliberate limitations of this milestone

- Every POST and DELETE is rejected server-side. Saved edits, remote commands,
  ownership claims, cookie refresh, conversion uploads and output launch are
  unavailable. The disabled Send button explains the incomplete integration.
- Folder browsing is disabled. Every GET checks trial roots for symlinks;
  configuration must point only at the trial media/clip directories.
- The old interface is served byte-for-byte for comparison, but its write/live
  actions are also rejected by the trial server. Its attempted writes can show
  HTTP 403 errors; this does not affect the production server.
- Thumbnail generation and Safari proxy creation can write regenerable caches
  inside isolated roots. “Read-only” refers to saved content and live commands.
- Persistent Mac status, actual remote control, layouts/FX/VFX, tag editing,
  playlists, audio and capture are not implemented in V2 yet.

Before enabling any mutations, replace the blanket write rejection with tested
endpoint-specific path restrictions. Before live commands, implement one
controller/heartbeat lifecycle and actual engine confirmations. Do not remove
the isolation guard just to make buttons work.

## Validation

- 44 Python tests passed, including new subprocess integration tests for
  unchanged legacy/host/output responses, isolated video listing, route
  allowlisting, host rejection, blocked mutations, symlink escapes and refusal
  of production port 8008.
- Existing transition and VFX Node checks passed; V2 module syntax passed.
- Browser: eight real clips loaded; selected video reached readyState 4;
  landscape 1194px and portrait 834px had no horizontal overflow; Back returned
  to the legacy trial root. No V2 page-script errors observed.
- Production metadata hashes checked against the verified baseline after trial.

The current default Python is 3.14 without pytest. Tests were run using the
existing `/opt/homebrew/opt/python@3.11/bin/python3.11` environment.

Next: expand the private-preview adapter and layout inspector, then implement
remote status/ownership against the isolated engine. Continue to follow the
phase gates in [the implementation plan](implementation-plan.md).
