# Club Visuals: transition catalogue reference

Generated from `transition_engine.js` with `node scripts/generate-transition-reference.js`.

61 choices: 50 GPU shader effects and 11 classic Canvas effects.

Common controls are incoming duration (0.15–10 seconds, except instant Cut), pace (Even / Build / Hit / Ease), and a saved seed. Per-effect controls are listed below. GPU effects fall back to Cross Dissolve if WebGL2 is unavailable. Reduce flashes modifies flash-heavy effects; warning labels are registry metadata, not a guarantee that arbitrary source footage is flash-free.

The categories below follow the current registry, including shorter category names used by the early effects. A redesign may consolidate their presentation while preserving saved IDs. Shader simulations are labelled in their descriptions.

See the [product reference](product-reference.md) for audition/playlist workflows and the [transition plan](transition-roadmap.md) for future automation.

## Classic

| Effect | Saved ID | Renderer | Behaviour | Effect-specific controls | Labels |
| --- | --- | --- | --- | --- | --- |
| Cut | `cut` | canvas | Instant replacement | None | — |
| Fade In | `fade-in` | canvas | Reveal from black | None | — |
| Fade Out/In | `fade-out` | canvas | Pass through black | None | — |
| Cross Dissolve | `cross-dissolve` | canvas | Blend the two clips | None | — |
| Wipe | `wipe` | canvas | Sweep the old clip away | None | — |

## Motion

| Effect | Saved ID | Renderer | Behaviour | Effect-specific controls | Labels |
| --- | --- | --- | --- | --- | --- |
| Zoom / Spin | `zoom-spin` | canvas | Zoom and rotate the old frame | None | — |
| Whip Pan | `whip-pan` | canvas | Fast blurred lateral sweep | None | — |
| Infinite Zoom | `infinite-zoom` | shader | Rush through the source into the next clip | intensity: 0–1; default 0.7; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5 | — |

## Digital

| Effect | Saved ID | Renderer | Behaviour | Effect-specific controls | Labels |
| --- | --- | --- | --- | --- | --- |
| Pixel Scatter | `pixel-scatter` | canvas | Shuffled blocks clear to the next clip | None | — |
| Data Tear | `data-tear` | canvas | Displaced scan strips and colour edges | None | — |
| RGB Split | `rgb-split` | shader | Separate and recombine colour channels | intensity: 0–1; default 0.6; direction: horizontal / vertical; default "horizontal" | — |

## Geometry

| Effect | Saved ID | Renderer | Behaviour | Effect-specific controls | Labels |
| --- | --- | --- | --- | --- | --- |
| Iris Burst | `iris-burst` | canvas | Circular reveal from the centre | None | — |
| Shutters | `shutters` | canvas | Horizontal strips collapse | None | — |

## Light

| Effect | Saved ID | Renderer | Behaviour | Effect-specific controls | Labels |
| --- | --- | --- | --- | --- | --- |
| Neon Shockwave | `neon-shockwave` | shader | A luminous expanding ring reveals the target | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5; color: color; default "#52f5d0" | high-contrast |
| White Flash | `white-flash` | shader | A short white burst reveals the next clip | intensity: 0–1; default 0.65; color: color; default "#ffffff" | flash, high-contrast |
| Laser Sweep | `laser-sweep` | shader | Bright sweeping lines expose the incoming image | intensity: 0–1; default 0.65; color: color; default "#52f5d0"; direction: horizontal / vertical; default "horizontal" | high-contrast |
| Electric Arc | `electric-arc` | shader | Branching electrical paths tear across the frame | intensity: 0–1; default 0.65; color: color; default "#8bbaff" | high-contrast |
| Strobe Cut | `strobe-cut` | shader | Alternating cuts settle on the incoming clip | intensity: 0–1; default 0.65 | flash, high-contrast |
| Energy Burst | `energy-burst` | shader | A coloured radial blast opens onto the target | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5; color: color; default "#ffb13b" | high-contrast |
| Light Leak | `light-leak` | shader | Coloured light floods inward from the edges | intensity: 0–1; default 0.65; color: color; default "#ff6d8a"; direction: horizontal / vertical; default "horizontal" | — |
| Plasma Dissolve | `plasma-dissolve` | shader | Glowing plasma clouds consume the source | intensity: 0–1; default 0.65; color: color; default "#c445ff" | high-contrast |

## Glitch and Digital

| Effect | Saved ID | Renderer | Behaviour | Effect-specific controls | Labels |
| --- | --- | --- | --- | --- | --- |
| Digital Glitch | `digital-glitch` | shader | Displaced horizontal and vertical fragments reveal the next clip | intensity: 0–1; default 0.65; direction: horizontal / vertical; default "horizontal" | — |
| Datamosh | `datamosh` | shader | Codec-style motion blocks smear between clips (shader simulation) | intensity: 0–1; default 0.65 | — |
| Pixel Explosion | `pixel-explosion` | shader | Small blocks burst outward before the target reforms (shader simulation) | intensity: 0–1; default 0.65 | — |
| Scanline Interference | `scanline-interference` | shader | CRT scanlines progressively replace the source | intensity: 0–1; default 0.65; direction: horizontal / vertical; default "horizontal" | — |
| Digital Signal Loss | `digital-signal-loss` | shader | Static, sync drift, and colour interference settle on the target | intensity: 0–1; default 0.65 | flash, high-contrast |
| Pixel Sorting | `pixel-sorting` | shader | Luminance-directed colour streaks flow into the target (shader simulation) | intensity: 0–1; default 0.65; direction: horizontal / vertical; default "horizontal" | — |
| Block Corruption | `block-corruption` | shader | Rectangular blocks flicker and shift to reveal the target | intensity: 0–1; default 0.65 | — |

## Psychedelic

| Effect | Saved ID | Renderer | Behaviour | Effect-specific controls | Labels |
| --- | --- | --- | --- | --- | --- |
| Kaleidoscope Morph | `kaleidoscope-morph` | shader | Mirrored rotating segments resolve into the next clip | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5 | — |
| Spiral Vortex | `spiral-vortex` | shader | A twisting vortex pulls the old image into the new | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5 | — |
| Liquid Morph | `liquid-morph` | shader | Flowing distortions melt the two clips together (shader simulation) | intensity: 0–1; default 0.65 | — |
| Fractal Dissolve | `fractal-dissolve` | shader | Layered fractal noise traces the reveal | intensity: 0–1; default 0.65 | — |
| Psychedelic Tunnel | `psychedelic-tunnel` | shader | Repeating perspective patterns rush into the next clip | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5 | — |
| Mandala Rotation | `mandala-rotation` | shader | Symmetric petals rotate and unfold | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5 | — |
| Mirror Shatter | `mirror-shatter` | shader | Mirrored facets pivot apart and reassemble (shader simulation) | intensity: 0–1; default 0.65 | — |
| Waveform Warp | `waveform-warp` | shader | Oscillating bands bend the outgoing scene | intensity: 0–1; default 0.65; direction: horizontal / vertical; default "horizontal" | — |

## Geometry and Motion

| Effect | Saved ID | Renderer | Behaviour | Effect-specific controls | Labels |
| --- | --- | --- | --- | --- | --- |
| Hexagonal Mosaic | `hexagonal-mosaic` | shader | Hexagonal cells turn over to reveal the target | intensity: 0–1; default 0.65 | — |
| Geometric Shatter | `geometric-shatter` | shader | Polygon fragments fly apart (shader simulation) | intensity: 0–1; default 0.65 | — |
| 3D Cube Rotation | `cube-rotation` | shader | Perspective cube faces turn from source to target | intensity: 0–1; default 0.65 | — |
| Radial Slice | `radial-slice` | shader | Rotating wedges replace the picture | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5 | — |
| Tunnel Warp | `tunnel-warp` | shader | Perspective bending rushes into the next shot | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5 | — |
| Particle Disintegration | `particle-disintegration` | shader | Fine image fragments drift away (shader simulation) | intensity: 0–1; default 0.65 | — |
| Motion Blur Whip | `motion-blur-whip` | shader | A heavy blurred sideways sweep lands on the next shot | intensity: 0–1; default 0.65; direction: horizontal / vertical; default "horizontal" | — |

## Organic and Atmospheric

| Effect | Saved ID | Renderer | Behaviour | Effect-specific controls | Labels |
| --- | --- | --- | --- | --- | --- |
| Smoke Dissolve | `smoke-dissolve` | shader | Billowing noise conceals the old image (shader simulation) | intensity: 0–1; default 0.65 | — |
| Ink in Water | `ink-in-water` | shader | Dark branching ink tendrils spread through the image (shader simulation) | intensity: 0–1; default 0.65 | — |
| Fluid Ripple | `fluid-ripple` | shader | Concentric liquid waves uncover the next clip | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5 | — |
| Fire Burn | `fire-burn` | shader | A noisy flame edge burns away the source | intensity: 0–1; default 0.65; color: color; default "#ff6b18" | high-contrast |
| Ice Crystallisation | `ice-crystallisation` | shader | Angular frost patterns grow across the frame (shader simulation) | intensity: 0–1; default 0.65; color: color; default "#b8edff" | — |
| Sandstorm | `sandstorm` | shader | Granular wind strips the old image away (shader simulation) | intensity: 0–1; default 0.65; direction: horizontal / vertical; default "horizontal" | — |
| Liquid Chrome | `liquid-chrome` | shader | Reflective silver ripples flow into the target | intensity: 0–1; default 0.65; color: color; default "#d9e4ef" | — |
| Organic Cell Division | `organic-cell-division` | shader | Soft expanding cells merge into the new image | intensity: 0–1; default 0.65 | — |

## Experimental

| Effect | Saved ID | Renderer | Behaviour | Effect-specific controls | Labels |
| --- | --- | --- | --- | --- | --- |
| Reality Fracture | `reality-fracture` | shader | Offset spatial planes display fragments of both clips | intensity: 0–1; default 0.65 | — |
| Time Echo | `time-echo` | shader | Multiple delayed image echoes converge on the target | intensity: 0–1; default 0.65 | — |
| Chromatic Implosion | `chromatic-implosion` | shader | Separated colour channels collapse and burst outward | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5 | — |
| Neural Network Morph | `neural-network-morph` | shader | A luminous node mesh grows over the transition | intensity: 0–1; default 0.65; color: color; default "#72ffe1" | — |
| Holographic Breakdown | `holographic-breakdown` | shader | A translucent scan image destabilises and rebuilds | intensity: 0–1; default 0.65; color: color; default "#52f5d0" | high-contrast |
| Gravity Well | `gravity-well` | shader | A dark lens pulls the source inward and releases the target | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5 | — |
| Quantum Tiles | `quantum-tiles` | shader | Dense tiles reorder to reconstruct the next scene (shader simulation) | intensity: 0–1; default 0.65 | — |
| Spectral Frequency Shift | `spectral-frequency-shift` | shader | Oscillating luminous frequency bands reform as the target | intensity: 0–1; default 0.65; color: color; default "#52f5d0" | — |
| Dimensional Portal | `dimensional-portal` | shader | An expanding luminous portal opens onto the next clip | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5; color: color; default "#a274ff" | — |
| Bass Impact Distortion | `bass-impact-distortion` | shader | A heavy radial shockwave reveals the target on impact | intensity: 0–1; default 0.65; centerX: 0–1; default 0.5; centerY: 0–1; default 0.5; color: color; default "#ff6d3d" | high-contrast |
