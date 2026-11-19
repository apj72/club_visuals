# Club Visuals — text sequence builder

Design study · 15 November 2026 · proposed functionality, not an installed feature.

**Working visual builder:** the app now has **Show Builder** at
`/redesign#builder`, with reusable bricks, DJ profiles and multi-hour generation.
See the [working guide](../../../ui-redesign/show-builder.md). The `.cvseq`
language and smooth layout-motion proposal below remain design references.

The operator writes a readable show script and sees a linked timeline and
private composition preview. The script can name videos, reuse looks, schedule
chrome VERSION1 branding, set crop and overlay positions, select transitions,
and describe animated layout changes. It compiles into the existing playlist
format wherever that format can express the requested behaviour.

The interaction inspiration is [SequenceDiagram.org](https://sequencediagram.org/):
text and a visual view of the same document, rapid feedback, and movement
between a source line and its visual counterpart. Its proprietary application
and UML syntax are not dependencies of this proposal.

## Review order

1. [Product and interface design](builder-design.md) — screens, workflows,
   feature scope and compatibility with today's app.
2. [Language reference](language-reference.md) — the proposed `.cvseq` syntax,
   timing, coordinates, queries, reusable looks, validation and examples.
3. [Animated layout transitions](layout-transitions.md) — how 4×↔2× zoom/shrink
   and 8×↔4× work without stretching footage or restarting the video.
4. [Implementation plan](implementation-plan.md) — isolated delivery, existing
   code to reuse, the new engine dependencies and acceptance gates.
5. [Interactive design sketch](prototype.html) — edit a small example, update
   its timeline, scrub and play the layout-motion illustration.

The sketch uses real local-library stills. It illustrates timing, source-line
links, overlay placement and tile motion; it does not run the live video,
transition or high-definition 3D engine. Its parser supports the supplied
examples' explicit clips and layout events, not the whole proposed language.
Open `prototype.html` directly in Chrome; no service or build is required.

The [desktop mockup](mockups/01-sequence-desktop.png),
[iPad landscape mockup](mockups/02-ipad-landscape.png) and
[iPad portrait mockup](mockups/03-ipad-portrait.png) show the tested sketch.
See [validation notes](validation.md) for exactly what was checked.

## Example documents

- [A one-minute script that maps to V1 data](examples/01-existing-playlist.cvseq)
- [A one-minute 4×↔2× and 8×↔4× motion study](examples/02-layout-motion.cvseq)
- [A one-hour set from similar videos, excluding a selected previous set](examples/03-generated-hour.cvseq)

These are language proposals. No production compiler currently consumes them.
Media names in the short examples were checked against this installation's
library. Personal files are referenced; no original videos are copied here.

## Decisions made in this proposal

- Text is the authored source; visual changes patch that text rather than
  maintaining a second, potentially conflicting playlist model.
- Initial compilation reuses ordinary V1 playlists and timed VFX/logo cues.
- Saving, private audition and sending to the Mac are separate actions.
- An animated layout is an event inside a playing clip. It is not simulated
  by appending another clip that starts the video again.
- Mirror patterns retain fixed tile positions. Layout animation does not
  introduce additional mirror-pattern permutations.
- Source media retains its own aspect ratio. The output canvas and the source
  crop are separate spaces, with explicit coordinates.
- Simultaneous independent 3D overlays/effect chains and six-tile layouts
  require additional engine capabilities; the compiler must report those
  dependencies instead of silently approximating them.

The current app, renderer, playlists and personal data are unchanged by this
design study. Implementation starts only as a separately scoped feature.
