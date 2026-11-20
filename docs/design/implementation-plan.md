# Implementing the redesign as a V1 reskin

**Current scope · 14 November 2026**

The latest instruction is to keep V1 files untouched and expose the reskin
as a separate, reversible interface. The implementation uses an optional
launcher and `/redesign` route over the current V1 document, with `/` retained
as original V1. See [launch instructions](../../ui-redesign/README.md) and the
[connection map](../../ui-redesign/connection-map.md). The goal is
to reskin the existing V1 application. Keep its rendering engine, remote
control, server APIs, playlist model and complete playlist workflow. Do not
rebuild them or introduce another editor.

## Non-negotiable boundary

Treat the current V1 application as the source of truth for behaviour. The
redesign may change visual styling, spacing, responsive presentation, labels,
and where existing controls appear. Preserve the existing control actions and
data flow. Avoid moving a control if that requires replacing its handler or
changing the preview/playout relationship.

Keep these files and behaviours intact unless a separate engine task is
explicitly approved:

- `output.html`, `vfx_engine.js`, the canvas composition and video aspect/crop
  calculations.
- `server.py`, remote-control endpoints, command ownership and native Mac
  fullscreen behaviour.
- Playlist creation, load/save, ordering, timeline seek, per-entry duration,
  transitions, timed cues, auto-generation, and play-on-Mac transfer.
- Existing library filtering, classification, tag editing, saved layouts,
  effects, capture and Auto Perform actions.

The reskin must keep V1 working at its existing route. Rollback is a code
revert; it must not depend on restoring media, playlists or metadata.

## Work sequence

1. **Record the baseline.** Start on a feature branch and note the clean V1
   commit. Keep user media and all shared JSON data out of the change. Confirm
   the existing app route and Mac output still work before styling.
2. **Map the current UI.** Record each visible control's existing DOM ID,
   handler, action scope (preview, Mac output, or saved data), and playlist
   workflow. Compare against [the V1 design audit](audit.md). Mark gaps as
   future work rather than silently inventing behaviour.
3. **Apply presentation at request time.** Read the current V1 document and
   inject the separate stylesheet and presentation script at `/redesign`.
   Keep the original file untouched. Prefer scoped CSS, existing controls, and small
   presentational wrappers. Preserve IDs, event handlers, routes, API payloads,
   and storage keys. If markup must move, verify every existing selector and
   event path still resolves. Do not replace V1 screens with the static design
   prototype; it has demo-only behaviour.
4. **Implement the pattern preference UI as presentation over V1 configs.**
   In Settings, let the operator choose which pleasing/symmetrical patterns
   appear first for each 2×, 4×, 6× and 8× size. Prepare shows that curated set
   first and offers **Show all** for the other unique orientations. Keep tile
   positions fixed. A pattern changes each tile's orientation only.
5. **Keep six-up separate.** V1 currently implements 1, 2, 3, 4 and 8 views;
   it has no six-tile renderer mode. Design the six-up preference and mockup,
   but do not make it appear functional in the V1 reskin. Six-up needs a
   separately scoped renderer/composition change.
6. **Review before merging.** Compare the reskinned V1 against the baseline
   with the existing real library, playlists and remote controls. Verify all
   original actions remain present and the 9:16 source / 16:9 Mac output roles
   are clear. Review the diff to confirm engine and server code are untouched.

## Orientation rules for the UI

The tile arrangement is stable: tile 1 stays left of tile 2; in a four-tile
layout, 1 and 2 stay on the top row and 3 and 4 stay below them. The eight-tile
layout also keeps its grid positions fixed. Choices change the four-way
orientation of each tile without reordering tiles.

Present each unique arrangement once. The requested complete counts are:

| Tiles | Unique orientation patterns |
| ---: | ---: |
| 1 | V1 clears transforms in single preview; no working selector is offered |
| 2 | 8 |
| 3 | Requested count was 12; actual V1 configuration signatures produce 16 |
| 4 | 16 |
| 6 | 24 |
| 8 | 32 |

The available orientation patterns are not the same as the featured set.
Settings controls the featured set independently for each supported tile
count. **Show all** exposes every unique pattern for the selected count.
Never repeat rotationally/reflection-equivalent entries in that full list.
Before wiring the new selectors, map the display entries to existing V1
configuration IDs and check that the V1 renderer produces the intended
orientation. Do not change how the renderer interprets those IDs as part of a
reskin.

Six-up's 24-pattern selector can be shown as a design concept, labelled as
planned; it remains unavailable until the renderer supports a fixed six-tile
grid and matching configuration mapping.

## Rollback

Keep the reskin in its own feature branch until accepted. To back it out,
revert the reskin commit or switch back to the recorded V1 baseline. Since the
reskin does not migrate data or change engine/API behaviour, rollback must not
require deleting or restoring library files, playlists, presets or tags.

Before merging, inspect the final diff for changes to `output.html`,
`vfx_engine.js`, `server.py`, playlist serialization, `remote_control.js`,
or saved-data formats. Any such change is outside this plan and should be
removed from the reskin or proposed as a separate task.

## Implemented isolation

The optional launcher subclasses the V1 HTTP handler for the new presentation
routes only. It does not replace any server method, renderer or editor action.
The original editor, host, output and effect-controller documents are checked
byte-for-byte by the route tests. No V1 source file is edited.
