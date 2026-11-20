# Show Builder

Open **http://localhost:8008/redesign#builder** with the redesign launcher running.
Show Builder creates ordinary playlists for the existing editor, Mac engine,
clean output and recording system.

## Make a first show

1. In **Assemble**, start with **Three-hour journey** or create a new model.
   Set the total length in minutes (up to 24 hours).
2. Arrange sections and give each a share of the total duration. For example,
   shares 1, 4, 3, 1 divide a three-hour show into 20, 80, 60 and 20 minutes.
3. Drag bricks from the shelf into sections. Use **Swap brick** to replace a
   component, drag placed bricks to reorder or move them, or use the arrows.
   Each chain repeats to fill its section. The last step trims to fit.
4. In **Edit bricks**, define steps with named video slots, lengths, layouts,
   mirror patterns, transitions, playback speed, framing and timed effects.
5. In **DJ profiles**, choose library tags, exclusions, pacing, repeat constraints
   and optional recurring 3D text branding. Empty filters allow all videos.
6. **Save library** stores models, bricks and profiles on this Mac, separately
   from generated playlists. Other devices read the same library. A stale save
   reports a conflict instead of overwriting another edit.
7. Choose a DJ and variation, then **Generate show**. Review its section overview
   and sample videos. **Preview section** moves the show playhead to that section.
8. **Save as new playlist** creates a separate saved edition. From the playlist
   editor, use the usual **Play this playlist on Mac** action to perform it.
   Generating and saving do not send anything to the Mac.

## Reuse and swap components

- A **brick** contains clip steps. It stores choreography, not a particular video
  assignment. Steps with the same slot name share one chosen video within that
  brick occurrence. The next occurrence chooses again. Each step starts its
  clip again; a timed layout cue changes an already running clip instead.
- **Timed layout changes** switch composition at a given second, retaining the
  source clock. These are instant cuts, not smooth tile animations. They run in
  the shared player, Mac engine, output broadcasts and recording canvas, and
  appear when scrubbing.
- **Save chain as brick** groups a section's arranged components into a new
  reusable brick. It copies their definitions and keeps their slots separate.
  Later source-brick changes do not rewrite the grouped copy.
- **Capture playlist clips as brick** imports up to 100 consecutive editor clips,
  replacing media with named slots while keeping layouts, transitions and timed
  effects. Loop-based durations require available source metadata.
- Shared brick edits affect future generations of every model using that brick.
  Generated playlists contain snapshots and retain their original choreography.

## Make another DJ edition

Duplicate or create a DJ profile, choose another variation, then generate.
The same library snapshot, profile, bindings and seed reproduce the same choices,
independently of library display order. The generator balances use of eligible
videos, respects a repeat window for new slot selections, and optionally prefers
similar tags among equally used videos.

- **Generate from this model** uses current bricks and the new DJ's filters,
  pacing and branding.
- **Replace videos · keep choreography** starts from the last generated or
  loaded edition. Clip lengths, transitions, layout events and brick effects
  stay fixed. DJ branding updates; the new profile's pacing is ignored. Select
  the model originally used by the edition.

In **Generated show**, mark sections **Keep this section exactly** to preserve
their original media and cues while regenerating the rest. Their duration and
position must stay the same. Kept sections intentionally retain the old DJ's
content and branding; uncheck them when the whole performance must change.

**Pin video slots** optionally fixes a slot to one eligible video on every
occurrence. This explicitly overrides the repeat window for that slot. Filters
and previous-show exclusions still apply. **Exclude videos used in** removes
every video in a selected saved playlist from new selections.

Save each edition as a new playlist. After reopening the app, use **Generated
show → Resume a saved edition → Load edition**. The shared library must still
contain the model and profile used by that edition.

## Review and recovery

**Generated show → Review the show** has a playhead across the complete show
and a zoomable, horizontally scrollable clip timeline. Drag either playhead to
preview that moment with the existing private video, layout, transition and VFX
renderers. Gold diamonds mark timed layout changes. Preview stays in Show Builder.

**Play from playhead** above the video starts private show playback at the selected
time and continues into the next clips with transitions, timed layouts and effects.
The playhead follows playback. Press **Pause** to hold the current frame; press
Play to resume there. **Clip start** returns to the selected clip's beginning.
Dragging the playhead pauses playback at the new position.

Enter a precise position as seconds, `m:ss.mmm` or `h:mm:ss.mmm`, use Previous/Next
clip or ±1 second, or focus the detailed timeline and use arrow keys (one second),
Page Up/Down (one minute), Home and End. The playhead keeps its time when zooming.

**At the playhead** provides live sliders for vertical position (Y), horizontal
position (X), zoom, mirror pattern, speed, duration and transition length. Moving a
slider updates the private video immediately, including during playback, without
reloading it. Vertical position moves the source crop and the mirror meeting point;
zoom in for additional crop travel. Position controls affect tiled layouts.

Edits are previews until you click **Apply changes**. **Reset changes** abandons
all pending preview changes and restores the last applied show settings. The
buttons stay at the top of the inspector while its controls scroll. Pending edits
are retained if you move to another clip, and Apply/Reset act on all pending clips.
Apply updates this show edition; **Save as new playlist** then saves that version.
Generating, loading or saving another edition requires applying or resetting first.

If a timed layout cue is active, layout edits update that cue rather than the
earlier initial look. Video selection, transitions and timed effects are also
previewed until Apply. Applying or resetting during playback resumes from the
current show position after updating the preview.
**New layout change here** adds a look at the playhead without restarting the
video. **Edit timed effects** opens the existing cue editor. Applied clip-length
changes and removals recalculate section boundaries and the total show time.

These edits affect this edition only. **Edit reusable brick** opens the source
step for changes to future generations. **Undo last edit** restores the edition
before the last review edit. **Save as new playlist** keeps the reviewed version
as a new performance; it does not replace the previously saved edition.

The full playlist editor remains available through **Open in playlist editor**,
which starts its timeline at the show playhead. Switching away from the review
returns its shared private player to its usual workspace. Review does not send
any commands or preview state to the Mac output.

Reviewing a generated show retains one in-memory backup of the previous editor
playlist. **Restore previous editor playlist** returns to it. Save or download
important drafts before reloading the browser.

**Download library** exports the complete recipe library as JSON. **Import
library** loads a complete library as an unsaved draft. **Reload saved** downloads
an unsaved draft before reading the shared version. Import also downloads a
dirty library first. These downloads are backups, not automatic shared saves.

Models live in `show_models.json` at the repository root (ignored by Git).
Generated editions use the existing `playlists` folder and include the model,
profile, brick snapshots, seed, section map and fixed video assignments.

## Current limits

Up to 200 models/bricks/profiles each, 100 sections per model, 100 steps per brick,
10,000 generated clips and 24 hours per show. VFX windows cannot overlap because
the player has one background-effect window. Each window may include an independent
3D logo overlay. Recurring branding yields to brick effects;
skipped appearances and trimmed ending transitions/effects are reported.

Smooth tile animation, arbitrary independent video layers, beat-locked scheduling
and the proposed `.cvseq` language/compiler remain future capabilities. The
sequence-language design prototype is separate from this working visual builder.

## Developer checks

```sh
node --test ui-redesign/show-models.test.cjs
python3 -m unittest discover -s ui-redesign -p 'test_*.py' -q
python3 -m unittest test_remote_control.py -q
python3 ui-redesign/check_show_builder.py
```

The browser rehearsal uses temporary models, playlists and metadata with read-only
links to real media. It does not contact the live app server.

## Reflective object choreography

Logo, text and DJ-branding effect windows include **Backdrop and object
choreography**. Use black to isolate the reflection, then choose a path or custom
waypoints, zoom range and simultaneous X/Y/Z turns. The hidden video can sweep
through the environment independently of the object. These settings belong to the
brick's effect window and are copied into generated playlist cues. Capturing an
editor playlist as a brick retains its choreography; replacing videos keeps the
effect while changing what it reflects. Use Apply changes and save when editing a
generated edition's cue. The existing overlap rule still allows one effect scene
at a time, with an optional independent logo overlay inside that window.

Non-logo effect windows offer **3D logo overlay**. The overlay's motion editor
supports paths, upright vertical orientation, the per-letter pulsing snake and a
fly-along viewpoint. Captured playlists retain their explicit reflection-video
selection when converted into bricks and when background videos are replaced.

Both primary objects and overlays offer **Object appearance** and **Independent
reflection video** in their editing panel. Edit position, depth, X/Y/Z rotation,
finish, reflection source and speed directly in the brick. These controls mark the
library as unsaved; **Save changes** keeps them for future generations. A missing
reflection file remains selected and marked as missing until you replace it or
restore the file and use **Reload reflection choices**.

**Preview this effect** opens a private audition inside the brick editor. Choose a
background and landscape, portrait or square framing; play, pause, restart or scrub
the effect while editing its appearance and reflections. Logo motion can pause
independently. DJ windows preview the selected DJ's branding text/name. Preview
controls do not mark the library unsaved, and close when you collapse the editor
or move away. This single-video preview starts at the background's beginning;
use the generated show's timeline to check complete layouts and cue timing.

Logo/text effect windows also retain their horizontal or vertical **Orientation**.
It is applied before authored rotation, so paths and multi-axis turns remain
independent of the wordmark direction. To bake a look into a reusable source video,
use VFX → Record a 9:16 logo video, then Capture MP4; the export appears in the video
library and can be used as a normal Show Builder source.
