# Club Visuals Sequence language

Draft language v1 · file extension `.cvseq` · not implemented. Examples describe
the intended interface, including constructs requiring future capabilities.

## First example

```cvseq
show "VERSION1 — one minute" {
  language 1
  duration 60s
  seed 1501
  output 16:9
  tempo 128bpm meter 4/4
}

media liquid = file "Video by pigmentsunbound_DdMlp9ITPhu.mp4"
media neon = file "Video by hellothoughtpalace_DbMzTEclnhS.mp4"

look mirror4 {
  layout 4x pattern 15
  crop pan (50%, 50%) zoom 1
  playback loop speed 1
}

overlay brand = logo version1 {
  material chrome
  position (50%, 50%)
  scale 46%
  quality high
  reflection 1.3
  roughness 0.07
  rotate y -18deg
  sweep y from -25deg to 25deg amount 0.22
}

sequence main {
  clip liquid for 30s use mirror4 {
    enter fade-in over 1.5s ease smooth
  }
  clip neon for 30s use mirror4 {
    enter cross-dissolve over 2s ease smooth
  }
}

schedule {
  every 60s from 6s for 8s show brand
  at 52s for 6s show brand
}
```

This should compile to two ordinary V1 entries and timed logo/off cues. The
incoming transitions are included in each entry's 30 seconds. Total time is
60 seconds, not 63.5 seconds or 56.5 seconds. A non-initial clip's incoming
transition uses the outgoing image according to the existing renderer.

## Lexical rules

- UTF-8; case-sensitive keywords and aliases. Aliases use letters, digits,
  underscores and hyphens, starting with a letter. Human names are quoted.
- One statement per line; braces delimit blocks and may close on the same line.
  Blank lines have no effect. `#` starts a comment outside a string.
- Strings use JSON-style double-quote escaping. A `#` inside quotes is literal.
  No string interpolation, embedded JavaScript or executable expressions.
- Top-level declarations may precede or follow their uses. Exactly one `show`
  and one `sequence main` are required. Unknown keywords are errors.
- Includes/imports are not in language v1. Reusable definitions live in the
  document; future template imports must use managed library IDs and a lockfile,
  not arbitrary filesystem or network locations.

### Time and numbers

| Form | Meaning |
| --- | --- |
| `1200ms`, `1.2s`, `10m`, `1h` | Show-clock duration. Decimal values allowed. |
| `8beats`, `4bars` | Fixed musical time from the declared BPM/meter. |
| `01:02.500` / `01:02:03.500` | Minute/second or hour/minute/second timecode. |
| `50%` | Normalized value, interpreted by its property. |
| `-18deg` | Rotation angle. |
| `1.2` | Dimensionless speed, zoom or shader value. |

BPM counts quarter notes. In meter N/D, a bar is N×4/D quarter-note beats.
At 120 BPM, `4beats` is 2 seconds and `2bars` in 4/4 is 4 seconds.
Retain rational/decimal precision while expanding; round only at the runtime
frame boundary. This is fixed-tempo scheduling, not live beat detection.

Show duration is the sum of clip durations after expansion. A declared duration
is an assertion: mismatch is an error with computed and expected totals.
The show ends at its duration; preview may loop explicitly. Repeating playback
is a transport option, not an unbounded script loop.

## Media and selection

```cvseq
media liquid = file "Video by pigmentsunbound_DdMlp9ITPhu.mp4"
media bikini = file "Video by lyra.elys_DbfkMIpxAVP.mp4"

pool cyan = library {
  themes any ["Abstract", "Organic & fluid"]
  colours any ["Blue", "Cyan"]
  types any ["3D animation", "Generative animation"]
  reviewed only
  exclude media bikini
  exclude videos in playlist "version1-one-hour-journey-60min"
}
```

`file` matches the existing server library's exact filename; aliases are stable
within the script. No raw arbitrary path, external URL or download command.
An optional future asset UUID can strengthen identity, but existing filenames
remain the compatibility binding. Ambiguous/missing assets are errors, with
**Locate replacement** offering an explicit rebind diff.

Within a category `any` means OR; `all` means AND. Different categories combine
with AND. Exclusions always win. `reviewed only` filters catalogue review state,
not an assertion that an automated classifier is correct. Missing tags are shown
as missing metadata, never invented matches. Exclusions may reference multiple
media aliases or saved playlists on separate lines. Playlist references resolve
the actual server store slug and record that playlist revision in the lock.

Pool resolution snapshots canonical media identities. Existing `.fdash` duplicate
names may be treated as one only when source identity is verified, not by fuzzy
filename similarity. The UI shows matched/excluded counts and thumbnails before
generation. A pool with no matches is an error, not an empty successful show.

## Reusable looks and fixed composition

```cvseq
look mirror8 {
  layout 8x pattern 27
  crop pan (50%, 50%) zoom 1.1
  playback loop speed 0.9
  colour hue 0deg saturation 110% contrast 105% brightness 100%
}
```

`look` contains the initial composition for a clip. A clip may override those
values before its timed instructions. Existing supported layouts map to `single`,
`dual`, `triple`, `quad`, `octo` for `1x`, `2x`, `3x`, `4x`, `8x` respectively.
`6x` requires the new six-up capability; never substitute another grid.

`pattern` is the current **one-based saved preset ID**, not an ordinal in a
filtered recommended list. Unique pattern counts differ by layout (2× 8, 4× 16,
8× 32); some of the existing 32 IDs are duplicates for smaller modes. The
compiler canonicalizes aliases using the existing layout map and reports which
ID was retained. It never invents a factorial permutation catalogue.

`pattern preferred 1` means the first featured pattern for that layout **at build
time**, copied into the lock as its concrete ID. Missing preferences are an error
with a picker, not an implicit guess. Editing preferences later does not rewrite
saved sets. **Insert saved layout** resolves an existing preset to explicit look
values and records provenance; it does not build a separate preset store.

`playback loop`, `once`, `bounce` reuse existing playback modes. Fixed-duration
`clip ... for ...` controls show time regardless of source length. Loop repeats
the source as required. `once` holds the final frame if a clip outlasts its media,
subject to verification of existing playback behavior in the adapter. Preserve
legacy loop-count duration entries on import; do not convert them without probing
source duration and accounting for speed and existing entry rules.

Static colour is a capability-gated property: current per-playlist entries do not
persist every global UI colour setting. The first adapter must reject unexpressible
colour values rather than claim that all UI controls are already entry fields.

### Source crop versus output position

`crop pan (X%, Y%)` is normalized **available source-crop travel**, with left/top
at 0% and right/bottom at 100%. It is not the literal source-pixel location of
the crop's center. V1 maps it as `panX = 2*X - 1`, `panY = 1 - 2*Y`, where X/Y
are in [0,1]. For source width W and crop width C, the left crop edge is
`(W-C)*X`; its actual center is `(W-C)*X + C/2`. The same applies vertically.
At zoom 1 some directions have no available crop travel, which the inspector
should show. This is not a floating video's position on the output screen.

Portrait video remains portrait. The **output** is a separate 16:9 canvas.
Single view retains V1 contain behavior; tiled view retains its cover/crop
behavior. Neither is permission to stretch pixels. Future floating video layers
use `video-layer` and require a compositor; they must not be mislabeled crop pan.

## Sequence, sections and reuse

```cvseq
sequence main {
  section "Opening" {
    clip liquid for 20s use mirror4 {
      enter fade-in over 1.5s ease smooth
    }
  }
  repeat 2 {
    clip neon for 20s use mirror8 {
      enter cross-dissolve over 2s ease smooth
    }
  }
}
```

This produces 60 seconds. `section` labels a group; `repeat N` expands a finite
integer number of times. Local clip events repeat with their clip. A global
schedule is evaluated once over the expanded show, not once per repeated section.
Named `look`/overlay/transition definitions provide reuse; no recursive macros
in language v1. The source-range map identifies which expanded occurrence is
selected and warns when a visual edit affects every use of a definition.

### Incoming transitions

```cvseq
transition gentle {
  effect cross-dissolve
  duration 2s
  ease smooth
}

# Either use the preset or write its values directly:
clip neon for 20s use mirror8 {
  enter gentle
}
```

Effect IDs, parameter names, ranges and defaults come from `transition_engine.js`
and the existing [catalogue](../../transition-catalogue.md). An inline transition
may have a nested `params { ... }` block, with one registry parameter/value per
line. Autocomplete uses the actual schema, not hardcoded imaginary parameters.
`ease linear/smooth/in/out` maps to existing pace `steady/ease/accelerate/decelerate`.
Transition duration must fit inside the destination clip. Keep existing flash
reduction settings; a script must not override a user's global reduced-flash policy.

## Timed changes within a clip

```cvseq
clip liquid for 30s use mirror4 {
  enter fade-in over 1.5s ease smooth
  at 8s layout 2x pattern 7 over 1.2s motion zoom-in anchor top-row
  at 18s layout 4x pattern 15 over 1.2s motion zoom-out anchor top-row
  at 23s animate crop pan (60%, 45%) zoom 1.2 over 4s ease smooth
}
```

`at` is relative to this clip's start. `over` is the animation's duration, not a
pause before the next statement. The layout events require `layout-motion`; crop
animation requires `property-tracks`. See [motion design](layout-transitions.md)
for exact supported anchors and endpoint behavior. An omitted `over` is an
instantaneous change, still requiring a runtime event capability if V1 cannot
apply it without starting a new entry. Zero-duration animations are rejected;
write an explicit instantaneous statement instead.

Layout motion includes a uniform, temporary zoom accent (12% by default).
Append `accent 0%` for geometry-only movement or another value up to 40%.
The accent returns to the exact target crop; it does not silently change the
clip's persistent zoom. It is part of the layout-motion capability.

Overlapping writes to the same property are errors. First motion release rejects
layout animation during incoming video transitions. An event extending beyond
its clip is an error rather than being truncated. Initial look values reset at
each clip unless explicitly written otherwise; there is no hidden inheritance
from the preceding clip.

## 3D text, logos and effects

```cvseq
overlay brand = logo version1 {
  material chrome
  position (50%, 50%)
  scale 46%
  depth 0.45
  bevel 0.04
  quality high
  reflection 1.3
  roughness 0.07
  environment 1.1
  exposure 1
  rotate y -18deg
  sweep y from -25deg to 25deg amount 0.22
}
overlay title = text "VERSION1 LIVE" {
  font bungee
  material mirror
  position (50%, 80%)
  scale 32%
  quality high
}
effect ripple = vfx scene-0 {
  intensity 0.7
  feedback 0.72
}
```

`logo version1` means the existing built-in logo path, not a downloaded font or
new logo generator. `text` reuses existing 3D glyph generation. Materials currently
include chrome, mirror, brushed, gold, rose-gold, obsidian, pearl, iridescent and
original; enumerate from the engine. Other logo assets need a supported asset
binding, not a guessed string passed to the existing cue.

`position` is normalized **output** coordinates, top-left origin. `scale 46%`
means existing scale value .46, not a guarantee of 46% visible screen width.
Text dimensions and perspective affect actual bounds; show those bounds in the
preview. Position Y requires a tested adapter between this convention and the
existing WebGL coordinate direction. Do not assume it matches crop Y.

Rotations use degrees. Sweep `amount` maps to existing motion rate, not seconds;
the inspector displays the existing engine's semantics. Animated exact angle
keyframes are separate property tracks. Validate against existing ranges, e.g.
scale .1–2, roughness .025–.8, reflection 0–2. Do not rely on silent normalization
to clamp an invalid authored value.

### Cues and recurring branding

```cvseq
schedule {
  every 60s from 6s for 8s show brand
  at 52s for 6s show title
}
```

Global `at` and `from` are show-relative. `every` expands starts at `from + n*period`
for nonnegative integers n while start < show duration. Each interval must fit
inside the show or require an explicit `trim final` suffix. Default is an error
on overrun. Local `at 6s for 8s show brand` is also valid inside a clip; it must
fit that clip. Schedule statements do not advance the main sequence cursor.

A global interval may cross a clip boundary. The V1 adapter splits its enable
state into entry-local cues and restores it at local time zero, then inserts
`off` at its end. Exact continuous sweep phase across that boundary is not
representable by today's cue restart: emit a capability error if phase continuity
was requested; otherwise warn that motion resets at the boundary. Do not promise
seamless animation from snapshot cues. Short examples avoid crossing boundaries.

The same `show` statement accepts a named `effect`, for example
`at 30s for 10s show ripple`. It occupies the same current VFX scene slot as
logo/text. In the future compositor, explicit named layers can allow several
spans, but their stacking and effect order must be declared and capability checked.

The V1 target has one VFX scene. Overlapping `brand`, `title`, or `ripple` is an
error for that target, because `off` disables the entire scene and logo/text are
alternative content of scene 6. The full future compositor can give named layers
independent spans, ordering and blending. It needs a capability flag, not a fake
V1 export.

### Future property/layer syntax

```cvseq
# Intended syntax; not in the initial V1 export.
at 12s for 6s show title {
  from position (50%, 90%) opacity 0
  to position (50%, 78%) opacity 1 over 0.6s ease out
  exit opacity 0 over 0.6s
  layer 20
}
at 4s video-layer inset {
  source neon
  rectangle (72%, 5%, 23%, 40%)
  fit contain
}
```

Coordinates in `rectangle` are output x/y/width/height. Independent media layers,
opacity animation, simultaneous overlays and ordered effect chains all require
the future compositor. The authoring UI can document them before it supports
them, but must prevent sending an unsupported plan. This distinguishes crop
position from the free positioning requested in the concept.

## Exact-duration generation and similarity

```cvseq
sequence main {
  fill 60m from cyan {
    clip length 20s
    choose similar avoid-repeat 12
    layouts [mirror4, mirror8] change every 60s
    enter choose [cross-dissolve, fluid-ripple] over 2s ease smooth
    remainder error
  }
}
```

At 20 seconds per clip this expands to 180 entries. Every consecutive 60-second
group alternates looks. Transition IDs and pool media are selected using the
show seed and stored in the lock; a refresh is explicit. Exact entry index breaks
ties deterministically. `choose similar` initially uses overlap in existing
theme/type/colour tags; show the scored matches and label that as tag similarity.
Optional future embeddings can improve it, with algorithm/version locked.

`avoid-repeat 12` forbids any source in the preceding 12 entries. It does not mean
“never used in any playlist.” Use playlist exclusions for that. An insufficient
pool is an error with required/available counts and fixes; never quietly relax
the rule. `remainder error` requires exact divisibility. `remainder trim` explicitly
allows a shorter final entry, which must still fit its transition/cues. Expanding
generators before sending makes playback independent of later catalogue changes.

## Evaluation, ordering and diagnostics

All spans are half-open `[start,end)`. At a shared boundary, end old spans first,
initialize the destination clip/look, then apply events starting at that instant.
Compute the resulting state as one batch; do not draw an intermediate blank
frame. Two conflicting starts at the same timestamp/property are an error.

The compiler returns parse diagnostics, expanded entries/events, capability
requirements, resolved bindings, computed duration and source-range mappings.
No silent downgrade. Suggested diagnostic format:

```text
L38:3 E_LAYOUT_CAPABILITY
Animated 4x → 2x requires layout-motion. Connected Mac supports V1 snapshots.
Keep this script as a draft, or explicitly export a copy with hard layout cuts.

L24:3 E_VFX_OVERLAP
"title" overlaps "brand" at 00:12–00:14. V1 can render one VFX scene at a time.

L51:5 E_POOL_TOO_SMALL
7 eligible videos cannot satisfy avoid-repeat 12. Add videos, relax the window,
or remove an exclusion. No playlist has been saved or sent.
```

Other checks: duplicate aliases, unavailable files, unknown transition/material,
invalid pattern for mode, cues out of bounds, invalid units/ranges, unresolved
presets, mismatched total duration, unbounded constructs, conflicting revisions,
ambiguous bindings and unsafe unsupported fields on import.

Proposed limits: 512 KiB source, 10,000 expanded clips, 100,000 events, 24-hour
show and nesting depth 8. Validate expansion cost before allocating/rendering.
No arbitrary code execution, recursion, shell commands or network access in the
language. AI assistance, if added, produces an editable draft that passes the
same compiler; it cannot save or send a show by itself.
