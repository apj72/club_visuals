# V2 implementation progress

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

The media folder contains eight copied clips and matching classification
records. Search matches names and saved tags. Selecting a video loads it into
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
