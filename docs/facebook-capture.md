# Facebook clip capture

Investigated and implemented 14 November 2026.

Facebook supports several video shapes. For a post aimed at the mobile feed,
4:5 is this project's recommended starting point. For a wide club composition,
16:9 preserves a landscape framing; 9:16 is useful for fullscreen reels and
stories. Choose the placement and framing rather than treating one ratio as a
Facebook requirement.

| Capture preset | Output | Use |
| --- | --- | --- |
| Facebook feed | 1080×1350, 4:5 | Portrait feed post; same shape as the existing Instagram feed export. |
| Facebook landscape | 1920×1080, 16:9 | Wide composition; the newly added aspect ratio. |
| Facebook reel / story | 1080×1920, 9:16 | Fullscreen portrait presentation. |
| Facebook square | 1080×1080, 1:1 | Square composition. |

The recommendation above is a practical project choice, not a claim that Meta
requires these exact dimensions for ordinary posts. The existing 1080-pixel
portrait sizes avoid increasing export workload or routinely upscaling source
videos. All presets produce silent H.264 MP4 at 30 fps with fast-start metadata,
matching the existing Instagram capture pipeline. Add audio in a separate
editor/platform if required; this change does not add audio capture.

## How to use it

In V1, select **Social clip** below the player. In the redesigned interface,
open **Capture**. Pick a Facebook preset under Format, position/resize the
crop, choose the start and duration, optionally choose a loop transition, then
press **Capture MP4**. Upload the resulting file to Facebook yourself.

The same crop calculations and conversion endpoint serve both interfaces.
Existing Instagram presets retain their values, dimensions and export names.
Both platforms use the configured **Social clip folder (Instagram / Facebook)**;
its existing `instagram_clip_dir` config key remains compatible. Facebook
files have a `facebook_` prefix and stay outside the source library until explicitly
added. In **Capture → Reuse a saved capture**, select a saved export and click
**Add to library**. A `capture_…` copy is added while the original export is kept;
repeating the action reuses an identical existing copy.
Their download links work with a separate clip folder as well as the default.

Restart the Python server and reload the editor after updating; the optional
redesign launcher imports the same updated V1 server.

## Research and limits

[Meta's video publishing announcement](https://about.fb.com/news/2025/06/making-it-easier-create-videos-facebook/)
describes the unified reel/video publishing flow and explicitly accommodates
horizontal, square and vertical videos. A landscape post is therefore a valid
option; a Facebook post does not have one mandatory aspect ratio.

The [Facebook Feed video ads guide](https://www.facebook.com/business/ads-guide/video/facebook-feed)
and [edited-video help page](https://www.facebook.com/help/1041366099316573)
were also checked, but returned login/temporary-block pages in this research
session. Their precise current dimensions and limits were not independently
verified. Ad placement guidance is not an organic-post requirement. This
implementation deliberately avoids introducing a purported Facebook upload
limit or forcing one format on every post.

## Verification

`test_instagram_loop.py` checks every Instagram/Facebook profile through the
real FFmpeg conversion path, with straight captures, crossfades and invalid
transitions, plus shared-folder resolution and source-library exclusion.
`ui-redesign/check_capture.py` captures and downloads all seven presets from
both real interfaces using temporary metadata and read-only source links,
then checks actual output dimensions, H.264 codec, 30 fps, frame count and the
absence of audio with FFprobe. The landscape case includes a loop crossfade.
