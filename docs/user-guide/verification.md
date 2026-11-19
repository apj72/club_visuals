# Handbook verification - 19 November 2026

- 43-page PDF, 12 HTML chapters and a combined HTML edition.
- 21 screenshots captured with the requested local Docshots project.
- All local guide links, anchors and images checked.
- Guide rendered at desktop (1440px) and mobile (390px) widths without page overflow.
- Every PDF page rendered with Poppler and reviewed; representative text/table/image pages inspected at full size.
- 110 Python tests and 17 subtests passed with `python3 -m pytest -q --ignore=test_server.py`.
- 53 JavaScript tests passed with `node --test test_*.cjs test_*.js ui-redesign/show-models.test.cjs`.
- The legacy `test_server.py` is a standalone manual HTTP smoke-test script, rather than part of the pytest fixture suite. Current automated route tests cover both original and redesigned entry points.

Capture uses temporary playlists, models, catalogue, preview cache and thumbnail storage. Live playout and physical camera/audio inputs were not started. Runtime videos, private configuration and user data retain their existing Git exclusions.
