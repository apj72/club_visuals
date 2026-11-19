# Current Club Visuals handbook

Edition: **19 November 2026**. Twelve chapters describe the working redesigned
interface. Open `index.html` in a browser, or use `complete.html` for the combined
edition. The printable result is `output/pdf/club-visuals-user-guide.pdf` at the
repository root. Historical screenshots in `docs/screenshots/` are not the
illustrations used by this edition.

## Regenerate screenshots with Docshots

The root `screenshots.py` is a standard Docshots scenario file. The capture runner
uses the actual Docshots implementation at the requested local project path,
starts a temporary instance of the app, copies showcase definitions into
temporary playlist/model stores, and reads local source media. It never contacts
the running playout server or opens a camera/microphone.

```sh
python3 docs/capture_user_guide.py \
  --docshots /Users/antonyjoyce/git-repos/docshots/docshots.py
```

Playwright, its Chromium browser, Pillow, FFmpeg and the local showcase source
media are needed for reproduction. A clean checkout does not include the user's
source library. Pass `-s 05-playlist` to recapture one scenario. Run the complete
set afterwards to refresh the complete capture manifest. Native Docshots can also
run `python3 /path/to/docshots.py --list` against `screenshots.py`.

The scenarios close dialogs and reset inspector scrolling between captures,
including hash-only workspace changes. VFX control screenshots attach to a real
editor running in an offscreen iframe; they do not simulate enabled controls.
Camera/audio remain disconnected, and output indicators honestly show offline.

## Build and verify

```sh
python3 docs/build_user_guide.py
python3 docs/verify_user_guide.py
pdftoppm -scale-to 900 -png output/pdf/club-visuals-user-guide.pdf .runtime/guide-qa/page
```

Edit `content.py`, then rebuild; the individual HTML chapters and combined page
are generated. The verifier checks local links/anchors, image loading and
desktop/mobile overflow, then prints the combined page through Chromium with
page numbers. It requires Playwright, Chrome, Pillow and pypdf. `pdfinfo` and
Poppler's `pdftoppm` support final visual review. Temporary previews stay under
`.runtime/guide-qa/`; final pages, screenshots, manifests and PDF are committed.

Review every Docshots image and the PDF after changes. A capture tool reporting
success does not establish that a modal, crop or workspace is the intended one.
