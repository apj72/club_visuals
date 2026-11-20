# From Signal to Spectacle

A directed VERSION1 showcase: **12 minutes · 7 chapters · 29 shots**. The journey starts with a single light, discovers symmetry and substance, brings the logo to life, reveals human movement, reaches a layered peak and returns to black.

[Watch the 84-second preview](../downloads/version1_showcase_signal_to_spectacle_trailer.mp4) · [Open the illustrated running order](index.html) · [Detailed capability map](CAPABILITIES.md)

## Play the show

1. Open the application’s **Playlists** screen and refresh the playlist list if it was already open.
2. Select **VERSION1 · From Signal to Spectacle · 12 min**.
3. Use **16:9**, turn captions **off**, mute source-video audio and turn playlist looping **off**. These are operator settings, not automatic playlist settings.
4. Preview the timeline privately, then use your normal Mac output handover and press the playlist’s Play button when ready.

The show has been saved without starting your live output. Its final source is a black stage: the last logo flies out by 11:56, leaving four seconds of black. Leave looping off to retain this ending.

For editing, click a clip's thumbnail/name to review its own source, layout and effects while paused; click its transition badge to preview the change from the preceding clip. The opening eight seconds deliberately show the complete **SIGNAL** title on black, reflecting the blue-laser video. Scrub beyond **00:08** to see the lasers directly.

Each clip now shows green layout/framing sections and purple effect cues. To replace the opening clip's three-panel change, click its green **0:24** block, choose **Dual** or **4×**, and save. Use **All panels upright** or the numbered orientation patterns for that section. The inspector also exposes zoom, pan, colour and trails; purple cue blocks open the full VFX/logo/text settings. Source video, timing, playback, audio, cue ranges and incoming transitions remain editable for the whole clip. Add, move or remove layout changes using the section controls.

The preview's **Play playlist** button plays the full composition from the current playhead, including timed layouts, effects, reflections and logo motion. **Pause playlist** freezes the composed frame and holds that position. Both playlist Play buttons share this behaviour. **Restart clip** returns to the selected clip's beginning. Replaying after the final frame starts the show from zero.

## The journey

| Time | Chapter | Dramatic purpose and visual language |
| --- | --- | --- |
| 00:00–01:04 | I · A signal in the dark | A small blue light and chrome SIGNAL title establish space. The frame gradually opens into a constellation. |
| 01:04–02:40 | II · One becomes many | Single, dual, triple, quad, six and eight-window compositions build an architectural world. Prisms and kaleidoscopic depth begin to transform it. |
| 02:40–04:16 | III · Light becomes matter | Ripple impulses, a sculpture bouncing inside a virtual cue range, 3D mirror text, colour treatments and trails give light texture and memory. |
| 04:16–06:24 | IV · The identity awakens | Chrome becomes brushed metal, gold and original finish. The mark follows paths, reflects an independent film, breathes with a travelling letter wave, then becomes a 45° flight into the screen. |
| 06:24–08:00 | V · The human signal | Mirror imagery introduces identity; recorded human movement becomes a mask, a glow and a distortion field. Your own captured portrait logo reappears inside the composition. |
| 08:00–10:24 | VI · The singularity | Nine shorter shots combine six/eight layouts, kaleidoscopic tunnels, prism effects, text, snake waves, independent reflections and one-way/repeating logo flights. Hidden footage travels through the final logo’s reflections. |
| 10:24–12:00 | VII · Return to the source | The frame simplifies. An upright logo, your own flyby film and a HOME title restore familiarity. The final mark recedes and exits, leaving silence and black. |

### Sound direction

The preview film is **silent**. No music has been selected or bundled. The main edit uses 16- and 32-second phrases; **120 BPM in 4/4** gives convenient eight- and sixteen-bar phrases. Choose music that grows from sparse atmosphere to a driving peak at 08:00, releases at 10:24 and resolves by 11:56. The playlist is time-directed, so it also works without audio. Live audio reactivity belongs to the encore.

## Companion shows

- **VERSION1 · Transition Atlas · all 61 effects** — 4:16. An eight-second title, every native transition across alternating footage, then a black ending. A technical appendix rather than an interruption to the story. The reduced-flash preference is set on each transition.
- **VERSION1 · Live Input Encore · connect camera first** — 1:36. Three 32-second camera-motion looks: movement mask with chrome/snake logo; glow with 3D text; distortion with a moving gold logo. Connect a camera explicitly in Camera Motion before playing. Without camera input this does not demonstrate live extraction.
- **VERSION1 · Signal to Spectacle · 84-second trailer** — a short native playlist and an MP4 render for quick review and sharing.

### Live encore handover

After the main show reaches black, introduce “now you are the signal.” Connect the intended camera, check movement in its preview, then run the 96-second Live Input Encore. Invite a broad arm sweep for the first look, smaller gestures for the glow and a final sweeping gesture for distortion. Stop the encore after its third shot.

For an optional **64-second audio finale**, connect the intended music input, check its meter, then enable Auto Perform and its audio-reactive VFX. Use a rhythmic section, demonstrate a pulse/scene change, and finish with a deliberate fade or blackout. This is an operator-led demonstration: the saved encore does not connect hardware or switch Auto Perform on automatically.

### Demonstrate the production workflow

After the performance, use a short screen walkthrough to cover capabilities that an output film cannot communicate:

1. **Library:** reload, sort newest first, search/filter, inspect tags and review status. Show the new showcase sources beside your captured logo films.
2. **Cue points:** open the “Time folds back” shot at 03:12. Its 0.8–2.8-second virtual source range and bounce playback explain how a short source becomes a 32-second moment. Restart returns to that range’s In point.
3. **Logo controls:** pause video and use the separate logo animation transport; inspect paths, axis rotations, zoom and reflection source. Show horizontal and both vertical orientations; hover controls for hints.
4. **Show Builder:** resume the directed edition from Generated shows. Inspect its seven chapters and pinned sources, then save a separate variation if desired. Keep this directed edition intact.
5. **Capture:** record a short section in 9:16 or another supported output format, save it, add the capture to the library, reload and reuse it as a source. The show already includes your imported portrait capture as an example of this feedback loop.
6. **Output/control:** demonstrate clean fullscreen output and the iPad/controller handover using your normal connected setup.

## What was created

Four playlists, a reusable Show Builder model/profile with seven chapter bricks, the preview MP4 and five additional source assets: colour/trails, ripple impulses, recorded movement extraction, an optimised bounce source and a black ending plate. The three effect studies were rendered with the application’s own processing. The movement study uses existing recorded footage through `CameraMotion.Processor`; it is not a physical-camera recording.

Existing playlists, media and models are preserved. Staged playlist JSON, the recipe additions, manifest, rendering scripts and verification reports are kept in this directory. The directed edition contains the exact pinned edit; generating a fresh recipe variation can change source choices and does not inherit the edition’s manually pinned source-range trims.

## Editable source correction

The original ripple and colour/trails study MP4s contain a rendered three-panel
layout. They remain useful as finished renders, but selecting Single displays
that entire baked image. The directed playlist and recipe now use the original
footage, with ripple VFX and timed colour/trails applied live. Layout controls
therefore determine the actual panel count, and individual effects stay editable.

`python3 showcase/editable_studies.py --install` repairs references in saved
playlists, preserving their duration/layout choices and backing up changed JSON
under `.runtime/before-editable-studies-*`. Original MP4s are not modified.
Save any open editor draft before repair; reopen the playlist afterwards.
