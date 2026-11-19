# Layered video effects and animated Version1 logos

## Combine camera motion or kaleidoscope with the logo

Open **Prepare → Colour, VFX & 3D text → 3D Logo**. In VFX, choose
**Video effect → Kaleidoscope tunnel**, or connect a camera under
**Camera motion extraction**. The video effect now runs behind the 3D logo.
You can start with the video effect and add the logo afterwards, too.

The two buttons at the top of VFX independently turn the **video effect** and
**3D logo** layers on/off. Turning off one leaves the other running.
**Turn VFX off** disables the entire composition. **Plain background video**
shows the source video behind the logo without a background effect.

The Version1 logo and 3D text share the object layer; choosing one replaces the
other. Existing saved logo-only cues continue to play as logo-only compositions.
Camera input still requires an explicit connection; see the
[camera motion guide](camera-motion.md).

## Use different background and reflection videos

Load the background video in the main player. In VFX's logo controls, open
**Independent reflection video** and choose a **Reflection source** from the
library. That video supplies the logo's chrome reflections while the main player
continues supplying the background and its video effect.

**Same as playing video** restores the original reflection source. Independent
reflection playback is silent and looping; its **speed** and **Play/Pause** controls
operate separately from background playback and logo motion. **Refresh videos**
updates the source choices after reloading or adding videos to the library.
Unavailable sources show a status message, and capture waits for a selected
reflection video to be ready.

**Backdrop → Black · reflections only** still makes a logo-only black render when
the video effect layer is off. When the video effect layer is on, its image is
visible behind the reflective logo. Choose **Plain background video** for an
ordinary second video behind the chrome object.

## Pulsing snake motion

Open **Pulsing snake · individual letters**, enable **letter depth wave**, and
press **Play logo motion**. The individual Version1 letters and the numbered chip
move forward/back in a travelling wave. It follows the wordmark in horizontal,
top-to-bottom and bottom-to-top presentations.

Tune **Wave speed**, **Depth**, **Pulse strength** and **Waves along logo**. Reverse
the direction if desired. **Quick look → Pulsing letter snake** supplies a starting
look. The wave uses the same independent clock as paths and rotation: **Pause logo
motion** holds its pose while the source videos keep playing.

## Fly along the wordmark

Open **Fly along the logo**, enable the viewpoint and press **Play logo motion**.
Or choose **Quick look → Fly along Version1**. Adjust **Travel speed** and
**Viewing distance**; a smaller distance lets individual letters fill the screen.
**Viewing angle** defaults to **45°**, looking along letters that recede into the
screen. Set **0°** for the straight-on view, or adjust up to 75° for a steeper view.
The camera remains aimed at the travelling point on the logo as the angle changes.
The viewpoint bypasses **Keep inside** to allow deliberate close-up clipping.

The complete flight begins with a tiny distant logo, approaches for a close-up
pass along all the letters, then carries completely off-screen to the left.
Vertical logos also depart beyond the left edge. **Start from the chip end**
reverses the letter traversal; a reversed horizontal flight exits on the right.

Choose **Flight playback**:

- **Back and forth** retraces the complete path, shrinking the logo back to the
  tiny distant point before the next outward pass.
- **One way · repeat** makes forward passes, beginning again at the distant point
  after each off-screen departure.
- **One way · once** plays a single pass and holds off-screen. Use **Restart cycle**
  to replay it.

**Travel speed** sets complete passes per second: 0.08 gives a 12.5-second pass,
or 25 seconds for a full outward/return journey. **Viewing distance** sets the
closest part of the pass. Play/Pause freezes or continues the current position.
Snake motion and fly-along can run together; the closest camera position keeps a
small clearance ahead of the deepest moving letter. Saved cues, Show Builder,
private auditions, Mac output and recordings retain the playback mode. Older
back-and-forth/once settings remain compatible.

## Save and record

Use **Playlists → Add current view**, then save the playlist. A combined cue keeps
the video effect plus a separate logo overlay, including orientation, reflection
video selection/speed, snake settings and fly settings. Timeline scrubbing holds
the corresponding pose. Send the look or playlist to Mac for the same composition.

Show Builder effect windows offer **3D logo overlay** and its motion editor.
Capturing a playlist as a reusable brick retains its layers; replacing background
videos leaves an explicitly selected reflection video unchanged.

In a playlist's **Script effects** dialog, open **Object appearance, reflections
and motion**, or **Logo overlay appearance, reflections and motion** for a combined
cue. The same controls are available when editing a Show Builder brick. **Object
appearance** edits position, size, depth, static X/Y/Z rotation, finish and lighting;
text cues also expose their text and typeface. **Independent reflection video**
edits the saved source and playback speed directly. You can adjust the snake and
fly settings there too, without recreating the look in the live VFX popup.

**Reload reflection choices** rescans the library and keeps the selected source.
Missing saved sources remain selected and are marked as missing, so opening or
saving an older cue does not silently replace its video. Restoring the file and
reloading clears the warning. Save the playlist or the Show Builder library to
keep authoring changes; Show Builder marks these edits as **Unsaved changes**.
The Script effects dialog scrolls its cue list while keeping its heading and
**Done** button available.

Choose **Preview this effect** inside either saved-effect editor to audition the
look as you edit. Select a library background or black, and switch between 16:9,
9:16 and square framing. **Play preview**, **Restart preview** and the time slider
control the audition; **Play/Pause logo motion** holds or moves the logo separately.
Reflection source/speed, appearance and animation edits update the preview directly.
DJ branding previews use the selected profile's branding text or DJ name.

This is a single-video effect preview starting at the background's beginning.
Use the playlist timeline to review actual cue timing, source ranges and tiled
layouts. Camera masks are not connected in this small preview. Only one effect
preview runs at a time; closing it, collapsing its editor or leaving the page
releases its media and graphics resources. Preview controls are temporary and
leave the main player, Mac output and saved settings unchanged.

Use a social Capture format or playlist recording for the complete layered
composition. **Record a 9:16 logo video…** exports the logo layer on black at full
portrait size, including the selected reflection source and new animation.
**Start logo motion from the beginning** starts a fresh cycle; uncheck it to
continue from the current pose. Exported logo renders go into the source library.
