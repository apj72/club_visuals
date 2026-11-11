# Implementing the redesign with a safe way back

**Implementation instructions · 11 November 2026**

**Build a second interface in isolation, then offer it as an optional route.
Keep the existing interface as the default.**

This is a plan, not a record of implementation. The design prototype exists;
the V2 routes, preview runner, adapters and safeguards below still need to be
built. Writing these instructions does not change the application or its data.

Use the [design specification](design-specification.md) for the intended UI,
the [product reference](../product-reference.md) for behaviour, and the
[technical reference](../technical-reference.md) for current contracts.

## 1. Three separate ways to back out

| Action | Restores | Does not restore |
| --- | --- | --- |
| Switch back to the current UI | The familiar editing interface, without restarting output. | Previously saved tags/playlists, the previous live look, or an unsaved V2 draft. |
| Revert the implementation code | A known-good source revision. | Ignored personal files, browser preferences or a running show's playhead. |
| Restore a data backup | A chosen earlier snapshot of personal files/preferences. | Subsequent edits, unless separately reconciled. |

Normally, disliking the redesign requires **only switching interfaces**. Both
interfaces must support the existing file formats, so saved work remains usable.
Do not restore an old catalogue just because you prefer the old UI.

During development, experiment on copies. This prevents trial saves/deletions
from affecting the real collection at all. A Git branch alone is insufficient:
the source library, catalogue, playlists and preferences are not backed up by Git.

## 2. Boundaries the implementation must preserve

1. `/` and `/index.html` continue serving the existing UI. Do not redirect them,
   change the normal launcher, or set an automatic V2 preference.
2. `/?host=1`, `/output` and `/output?managed=1` keep the current engine/rendering
   path. `output.html` creates a resident `/?host=1` editor: replacing the root
   page could also replace the live engine.
3. Put new HTML, CSS and client logic under `ui/v2/`. Do not inject V2 styles or
   scripts into the legacy page or restyle the old document globally.
4. Preserve existing APIs, filename identities, saved IDs and data formats.
   No compulsory migration, destructive conversion or schema change is needed.
5. Keep the native output controller, shaders and live engine behaviour stable.
   Fixes to existing renderer limitations belong in separate changes.
6. Isolate the development process, port, files, caches and output profile.
   A different URL path on the same server still shares data and live commands.
7. Retain the old UI through development and real-world evaluation. Removing it
   or making V2 the default is a later decision, not an implementation milestone.

## 3. Environments and addresses

| Environment | Code/data | Address | Purpose |
| --- | --- | --- | --- |
| Current app | Existing checkout and real personal data | `http://localhost:8008/` | Continue normal use. |
| Design presentation | `docs/design/`, static demo data, no APIs | `http://localhost:8011/` | Review mockups only. |
| Isolated V2 trial | Separate worktree, copied data and new runtime/profile | `http://localhost:8012/ui-v2/` | Build and test the functional redesign. |
| Legacy UI in the trial | Same trial server and copied data | `http://localhost:8012/` | Compare both interfaces against identical fixtures. |
| Optional real-data trial, later | Reviewed additive release in the normal app | `http://localhost:8008/ui-v2/` | Try the completed UI without changing the default. |

The preview port is proposed, not an option the current server already supports.
On iPad, use the Mac's LAN IP instead of `localhost`, preserving the port.
Never silently fall back from trial port 8012 to production port 8008.

The two servers must not share writable directories or output profiles. Both
can still consume the same Mac's CPU/GPU and displays, so fullscreen/rendering
trials should happen outside a live event.

## 4. Establish the recovery baseline first

### Source checkpoint and worktree

At the time of writing, the design pack and documentation changes were
uncommitted. Worktrees only contain committed files; a new worktree will not
automatically receive the current untracked design pack.

Before implementation:

1. Inspect status/diffs and preserve unrelated work.
2. Commit the reviewed design pack and this plan, staging only intended files.
   Check for unrelated files already in the index before committing.
3. Tag that source checkpoint and record its SHA.
4. Create a separate feature branch/worktree from the checkpoint.

Example commands to run **when implementation starts**; they have not been
executed by this documentation change:

```sh
git status --short
git diff
git add docs/design docs/README.md
git diff --cached --stat
git commit -m "Document reversible UI redesign and implementation plan"
git tag -a ui-v2-baseline-2026-11-11 -m "Current UI before optional redesign"
git worktree add ../club_visuals-ui-v2 -b feature/ui-v2 ui-v2-baseline-2026-11-11
```

Choose fresh names if those tags/branches/directories already exist. Record the
actual baseline in the implementation PR. Back up the reviewed commit/tag to
the repository remote as part of the implementation checkpoint. Do not reset
or force-push main to manage this work.

### Personal-data backup

Make a dated backup outside both worktrees, during a quiet period with metadata
edits, downloads and recordings stopped. Copy rather than move originals.
Include a manifest with original absolute paths and the baseline code SHA.

Back up:

- `config.json`, including the resolved source and Instagram clip paths.
- The actual source MP4s and metadata sidecars, even if outside `downloads/`.
- The actual Instagram clip folder, which may be separate.
- `library_catalog.json` and `library_order.json`.
- `playlists/` and `video_presets/`.
- The application's browser-local preferences on each used device/origin:
  text lists, performance curation, audio/profile and display choices.

Thumbnails and Safari proxies can be regenerated; backing them up is optional.
Authentication cookies are sensitive and are not needed to roll back the UI;
keep them out of Git and ordinary test fixtures. Do not clone a running browser
profile into the trial as a way of backing up preferences.

Browser storage differs between `localhost:8008`, `127.0.0.1:8008` and the LAN
IP, as well as between devices/profiles. Before real-data trials, provide an
export of the app's known preference keys on each relevant origin/device, or
document a manual export. Do not export/restore the whole origin blindly.
Do not restore stale controller IDs or in-memory live command/lease state.

Validate the backup by opening representative JSON files and playing a copied
video. Record missing/empty directories explicitly. A source tag is not a
backup of the personal collection.

## 5. Build a genuinely isolated preview server

### The current launchers cannot be reused for the trial

`server.py` hardcodes port 8008 and constructs `MAC_OUTPUT`, `LIBRARY_CATALOG`
and `PREVIEW_CACHE` at import time. Both `start.sh` and `stop.sh` target port
8008. **Do not run those scripts from the new worktree**: they may detect or
stop the existing app.

First implement a separate `scripts/run-ui-preview.py` with this contract:

- Explicit preview port, default 8012. Refuse port 8008 and fail if occupied;
  do not kill another listener.
- Separate absolute data and runtime roots. Code/assets come from the feature
  worktree; mutable files come from the trial roots.
- Construct/rebind stateful services before accepting requests. Changing only
  `server.PORT` after import will not update the existing `MacOutput.url`.
- Create a new `MacOutput(preview_runtime_root, preview_port)` instance. Its
  `.runtime/playout-browser` profile and managed output URL must be trial-only.
- Default to loopback; allow an explicit LAN bind for physical iPad testing.
- Print port, resolved data paths and **TEST LIBRARY** identity. Expose that
  identity in the trial UI, for example through an additive preview-info route.
- Stop only its own server/resources using Ctrl+C or a separately named,
  verified PID. Never use broad Python/browser process-kill commands.

A thin runner that configures imported services is acceptable initially. If a
runtime factory/refactor is used instead, preserve and test production defaults
separately. Do not combine an extensive server rewrite with the visual redesign.

The runner must account for **every** mutable location:

```text
preview-data/
  config.json              # rewritten to use only the trial folders
  media/                   # copied MP4s and metadata sidecars
  clips/                   # trial exports
  thumbnails/
  playlists/
  video_presets/
  library_catalog.json
  library_order.json
  .cookies.txt             # only if downloads are deliberately configured
preview-runtime/
  .runtime/ipad-previews/
  .runtime/playout-browser/
```

Audit current globals `CONFIG_FILE`, `THUMB_DIR`, `PLAYLIST_DIR`,
`VIDEO_PRESET_DIR`, `LIBRARY_ORDER_FILE`, `COOKIE_JAR`, `LIBRARY_CATALOG`,
`PREVIEW_CACHE` and `MAC_OUTPUT`, plus conversion temporary/output paths and
both configured media folders. Keep code/asset resolution separate: changing
`BASE_DIR` wholesale can break serving while leaving an absolute production
media path active in the copied configuration.

Suggested invocation **after implementing the runner**:

```sh
python3 scripts/run-ui-preview.py --port 8012 --bind 127.0.0.1 \
  --data-root /private/tmp/club-visuals-ui-v2-data \
  --runtime-root /private/tmp/club-visuals-ui-v2-runtime
```

These flags do not exist today. Use a persistent test directory for a longer
trial; temporary directories are not backups.

### Seed copied fixtures and enforce the boundary

Copy representative portrait/landscape, short/long and Safari-incompatible
videos. Preserve filenames and copy matching catalogue, sidecar, layout and
playlist data. Include every media file referenced by test playlists, or mark
deliberately missing-media fixtures clearly.

Do not use hard links or symlinks to production media. Rewrite copied config
paths before startup. Resolve and validate all writable paths against the trial
roots, rejecting symlink/path escapes. Restrict the trial folder browser and
config-update handlers to those roots too; a safe initial configuration is not
enough if Settings can later redirect deletion/export into the real library.

Apply these safeguards server-side, including deletion, catalogue/order writes,
presets/playlists, downloads, cookie refresh, conversions and output profile
launch. New UI-only restrictions do not protect against other API callers.

Prove isolation before UI development: record hashes of relevant production
metadata/media during a quiet test, mutate/delete corresponding copied fixtures,
then verify originals remain unchanged. Inspect trial requests: API, media,
SSE and output calls must remain on the trial origin. In a non-event rehearsal,
verify that sending a trial look changes neither production ownership/status
nor its output window. No production request is needed just to render V2.

## 6. Add the new route without changing the old one

Add narrow, allowlisted routes in the trial server first:

| Route | Contract |
| --- | --- |
| `/`, `/index.html` | Existing HTML and behaviour. No V2 imports. |
| `/?host=1` | Existing resident engine, unchanged. |
| `/output` and existing variants | Existing clean renderer, unchanged. |
| `/ui-v2` | Redirect to `/ui-v2/`, preserving intended editor query flags. |
| `/ui-v2/` | New editing shell. |
| `/ui-v2/<approved asset>` | Only approved new styles/scripts/assets. |
| Existing API/media/renderer routes | Preserve current contracts and saved IDs. |

Parse URL paths before matching, use correct MIME types and test query strings
and traversal attempts. Do not add a generic repository-file server. Use
root-relative API/media URLs on the current origin, not `/ui-v2/api/...` or
hardcoded port 8008.

Reject `host=1` on V2 or redirect it to the existing engine entry point. Never
instantiate a second host or hide an auto-claiming legacy engine iframe behind
the new private canvas. Use `/ui-v2/?remote=1` for explicit controller testing
and retain iPad detection and ownership validation.

## 7. Implement V2 as a separate client

Suggested new structure:

```text
ui/v2/
  index.html
  styles/{tokens,shell,components}.css
  app.js
  state/editor.js
  services/{api,catalogue,playlists,remote}.js
  adapters/{preview,transitions,vfx,capture}.js
  views/{prepare,playlists,library,perform,capture,setup}.js
scripts/run-ui-preview.py
tests/ui_v2/...
```

Native modules are sufficient; a new framework is not required. The prototype
is a design reference, not production code: do not ship its invented media,
fake confirmations, incomplete tag model or simulated capture/playback.

### Avoid a risky refactor of the working editor

Most application logic is inside `index.html`. Legacy remote/catalogue scripts
assume its DOM and globals. In particular, `remote_control.js` moves existing
DOM and binds legacy functions; simply importing it into the new shell will
not create a supported independent client. FX/VFX windows call their opener.

For the reversible first release:

- Reuse unchanged render/transition libraries through their existing interfaces.
- Port needed private-editor logic into V2-specific adapters without editing
  the old page. Record the source baseline of copied logic for maintenance.
- Accept temporary duplication. Extract shared logic later in a separately
  tested refactor; do not rewrite the resident engine alongside the redesign.
- Maintain one private editor state for preview, inspector and complete Send
  payload. Ordinary edits must not publish to `/api/state`; only the existing
  claimed Mac engine publishes live rendering commands.
- Connect inline FX/VFX to this private adapter, not an invisible legacy DOM
  or stale references to pop-out windows.
- Create one controller heartbeat/listener set per page. Dispose view-specific
  players, audio resources and handlers on navigation. Opening tag review must
  not replace the prepared clip or create another live engine.

Review diffs against the baseline at each phase. Early changes should leave
`index.html`, legacy controller scripts, `output.html`, `mac_output.py`, shared
renderers and normal launchers functionally unchanged. Narrow server routing
and additive preview support are expected. Any other shared change needs a
separate justification, regression check and revertable commit.

## 8. Keep saved files and browser settings reversible

- Preserve catalogue arrays, limits, notes, Reviewed, `expectedRevision`, 409
  draft preservation, atomic bulk writes and single-step shared Undo.
- Preserve playlist/cue/material fields and saved-layout schemas. Old → new →
  old fixture round trips must not silently drop fields.
- Do not rewrite saved files merely because a page or playlist was opened.
  Do not migrate automatically on startup.
- Namespace new UI preferences, e.g. `clubVisuals.uiV2.inspectorSection`.
  Never call `localStorage.clear()`.
- Existing text lists, curation and audio/display preferences may seed V2
  copies. During the trial, do not automatically overwrite legacy keys.
  Document that V2-local changes are not continuously shared; use explicit
  import/export if the operator wants to transfer supported preference data.
- The controller session key is a deliberate exception: on the same origin
  and tab, keep `clubRemoteControllerId` so a revoked controller cannot evade
  revocation by switching UIs. Do not create a parallel V2 identity to bypass
  server ownership. Trial and production ports have separate origin/server state.
- Avoid root-scoped service workers. None is needed. Version/cache new assets
  without clearing old UI preferences or taking over its routes.

After adoption on port 8008, both interfaces intentionally save through the
same existing APIs. These are real edits: using the old UI later will show
them. Compatibility makes rollback possible; it does not reverse saved edits.

Compare interfaces sequentially when editing the same saved object. Catalogue
revision protection does not imply that playlists or saved layouts have the
same concurrency guard. Avoid editing one playlist in both UIs at once unless
a separately specified conflict mechanism has been implemented and tested.

## 9. Implementation phases and acceptance gates

Each phase should be a reviewable commit or small PR. Separate route wiring,
preview infrastructure and unrelated fixes so changes can be reverted cleanly.

| Phase | Build | Gate before progressing |
| --- | --- | --- |
| 0. Baseline | Source checkpoint, personal-data backup, worktree | Baseline SHA and backup manifest recorded. |
| 1. Isolation | Preview runner, copied data, separate runtime/profile | Mutating/path/network tests cannot affect production; legacy UI works on the trial. |
| 2. Shell | Opt-in route, navigation, sticky status, Back to current UI | Legacy routes have no V2 imports; browsing does not send commands. |
| 3. Prepare | Real Safari preview, transport/layout, inline FX/VFX/materials | Preview remains private; complete look sends and gets an actual engine confirmation. |
| 4. Library | Filters/order, independent review, all categories, bulk/usage/Undo | Revision/conflict/atomicity checks pass; review leaves preview/playout untouched. |
| 5. Playlists | Timeline, transitions, cues, save/audition/send | Bidirectional file round trips, sent-copy semantics and GPU fallback pass. |
| 6. Auto Perform | Mac audio/settings/holds/tempo, curation/text lists | Correct device scope and one controller; resident engine survives setup closing. |
| 7. Capture/Setup | Real recordings, social crops, conversions, folders/cookies | Actual export files/status and trial path restrictions pass. |
| 8. Rehearsal | iPad/Mac workflow, failures and rollback drills | Existing acceptance checklist and rollback checks below pass. |
| 9. Optional adoption | Additive real-data release at `/ui-v2/` | Fresh personal-data backup; old root remains default; switchback verified. |

Mark incomplete views explicitly and link back to the current interface.
Disable unfinished actions instead of showing simulated success. Do not move
to real-data adoption merely because the screens match the mockups.

Making V2 the default, removing the old UI or modernising the live engine is
outside this rollout. Those need later decisions after actual use.

## 10. Test plan

Run relevant existing checks in the trial worktree, first checking their use
of temporary fixtures/ports. Do not point tests at personal data.

```sh
python3 -m pytest -q test_instagram_loop.py test_library_order.py test_library_catalog.py test_media_preview.py test_remote_control.py
node test_transition_engine.js
node test_vfx_surface.js
```

Use the existing manual layout tests where relevant. `test_server.py` has older
source-string assumptions; string matches alone do not establish UI compatibility.

Add behaviour tests for:

- Route isolation: old root, resident host and output still use the old path;
  new assets never load there; invalid asset paths fail safely.
- Trial data boundaries: mutations, folder/config changes, cookies, exports
  and output launch remain within trial roots, including path/symlink escapes.
- Existing-file compatibility in both directions, including unknown fields
  that the new editor should preserve and no writes on load.
- Private versus live actions, full Send payload and actual result correlation:
  sent, confirmed, failed and unconfirmed must remain different states.
- Ownership loss, explicit reacquisition, revoked IDs, modal handover and
  keyboard locking. Server validation remains authoritative.
- Native fullscreen without a Mac confirmation, Open output preserving state,
  and no access to the production profile.
- Filtered review queue, dirty guard, Save & finish, multi-tag categories,
  rename/merge/remove, hidden selections, conflicts and atomic Undo.
- Playlist saved/unsaved/sent copies, cues/materials, missing media, independent
  transition audition, reduced flashes and unsupported-GPU fallback.
- Recording scope, real conversion/duration and destination paths.
- Physical iPad landscape/portrait, keyboard/dialog recovery, sticky actions,
  touch sizes and Safari preview/proxy playback and seeking.

Use mocks for UI-only checks and the isolated real engine for integration.
Do not start another live host just to compare page styling.

## 11. Rollback runbooks

### A. Switch to the current UI without restarting

Add an always-reachable **Back to current UI** action in the new shell. It
navigates to `/` on the same origin, preserving intended editor flags such as
`remote=1`, never `host=1`. It must not issue Stop, overwrite data, navigate the
output window or close the resident engine.

1. Save or deliberately discard dirty playlist/layout/tag drafts. Intercept
   the switch with Save / Discard / Cancel when necessary; use the normal
   browser navigation warning for reload/close where appropriate. Explain
   that an unsaved prepared look is not automatically a saved layout.
2. Navigate in the same tab. The legacy UI reads existing saved files directly;
   no migration/import or data restore is needed.
3. Verify ownership/engine status. Same-tab controller identity should survive;
   a revoked session still requires explicit Take remote control.
4. Confirm that switching did not stop or resend the live show.

If V2 fails to render, manually navigate to the root URL. The existing Mac
engine can continue during controller navigation/loss; a server/output restart
is a different operation and is not a resumable show checkpoint.

This switches within an environment. To leave the isolated trial, open the
production address on port 8008. Test edits made on 8012 do not transfer there.

### B. Abandon the isolated trial entirely

1. Close its iPad/editor tabs to stop trial heartbeats.
2. Stop only the preview runner through its terminal or verified PID; close
   its dedicated test output window without quitting unrelated browser windows.
3. Return to port 8008. Do not run the worktree's original `stop.sh`.
4. Archive the trial branch/worktree/data if useful. Production requires no
   source or data restore because the trial was never adopted.

Removing the trial is optional. Avoid broad cleanup commands such as
`git clean -fdx`; ignored personal files can exist in a checkout.

### C. Revert an adopted code release

Use this when V2 has been integrated into the normal app and a shared-code
regression makes switching routes insufficient.

1. Work outside a performance. Save edits and stop recordings/downloads.
   Record the deployed SHA and take a fresh personal-data checkpoint.
2. Close controllers and the affected output intentionally. Restarting clears
   in-memory ownership, command snapshots and last-tag Undo; it cannot promise
   frame-accurate show continuation.
3. Revert the identified additive release commit(s), preserving unrelated later
   work. Prefer a single squash commit per milestone so rollback is clear.
   For a non-merge release the command is `git revert <ui-release-commit>`;
   identify the actual SHA first. Merge reverts need deliberate parent selection.
4. Resolve conflicts, run baseline checks, restart the normal app from the
   correct checkout, and reopen/hard-refresh editors and output so older/newer
   scripts are not left running together.
5. Verify the old UI, library, ownership and output. Keep compatible current
   saved data; do not restore an older backup unnecessarily.

Use the baseline tag for comparison or a separate recovery checkout, not
`git reset --hard` on an active tree or a force-push of main. If revert is
complex, prepare a clean baseline checkout, deliberately configure its data
paths and start only one production server. An empty default library in a new
checkout does not mean the original media has been lost.

### D. Restore data only when necessary

1. Stop all writers to the affected files, including download/conversion jobs.
   Reverting Git does not stop existing subprocesses.
2. Preserve a dated copy of the post-trial/damaged state before restoring.
3. Compare the backup manifest and restore the required files and dependent
   media consistently. A full snapshot restore discards newer edits: export
   or reconcile wanted newer work first.
4. Restore intended config paths, never temporary preview paths.
5. Restore only selected app preferences on the correct browser/device/origin;
   leave controller identity and transient live state alone.
6. Restart/reopen clients so stale catalogue revisions/drafts cannot overwrite
   the restored data. Check representative videos, tags, presets and playlists
   through the legacy UI before resuming use.

## 12. Evidence required before real-data adoption

- [ ] Baseline tag/SHA and personal-data backup manifest recorded.
- [ ] Trial process, paths, port and browser profile demonstrably isolated.
- [ ] Current root, resident host and clean output remain unchanged in behaviour.
- [ ] No automatic migration, legacy preference overwrite or root-scoped cache.
- [ ] Files round-trip through both UIs without field loss.
- [ ] Preview/review never changes playout without a deliberate live command.
- [ ] Physical iPad playback, native fullscreen and ownership recovery pass.
- [ ] Back to current UI handles dirty drafts and revoked sessions correctly.
- [ ] Abandoning the trial leaves port 8008 and real files untouched.
- [ ] Code revert and copied-data restoration rehearsed outside an event.
- [ ] Remaining gaps documented; unfinished actions disabled; old UI still default.

## 13. Instruction to hand to the implementing agent

> Implement `docs/design/` as a separate, opt-in interface following
> `docs/design/implementation-plan.md`. Start with a baseline checkpoint and
> an isolated worktree/server using copied media/metadata, its own port and
> its own output profile. Keep the current `/` UI, `/?host=1`, `/output`, native
> controller and normal launchers working as they are. Build V2 at `/ui-v2/`
> with existing API/data formats and no automatic migration. Deliver the phases
> as reviewable commits with legacy compatibility checks. Include a dirty-draft-
> aware Back to current UI action and rehearse rollback. Do not make V2 the
> default or develop mutating features against the real library. Treat the
> prototype as design reference, not a functioning media application.
