"""Saved source ranges are atomic, revision-checked metadata."""
import json
from pathlib import Path
import threading
import urllib.error
import urllib.request

import pytest
import server
from video_cues import VideoCues, CueConflict, validate_range


def item(identity='intro', start=2, end=8):
    return {'id': identity, 'name': identity.title(), 'sourceRange': {'start': start, 'end': end}}


def test_saved_ranges_survive_restart_and_stale_updates(tmp_path):
    store = VideoCues(tmp_path)
    assert store.read('clip.mp4')['ranges'] == []
    first = store.save('clip.mp4', {'expectedRevision': 0, 'ranges': [item(), item('ending', 15, None)]})
    assert VideoCues(tmp_path).read('clip.mp4') == first
    with pytest.raises(CueConflict):
        store.save('clip.mp4', {'expectedRevision': 0, 'ranges': []})
    assert store.read('clip.mp4') == first
    assert store.read('other.mp4')['ranges'] == []
    assert store.save('clip.mp4', {'expectedRevision': 1, 'ranges': []})['revision'] == 2


@pytest.mark.parametrize('value', [[], 'cue', {'start': -1, 'end': 2}, {'start': True, 'end': 4},
    {'start': 2, 'end': 2}, {'start': 2, 'end': 1}, {'start': 0, 'end': float('inf')},
    {'start': float('nan'), 'end': 4}, {'start': 0, 'end': .05}])
def test_invalid_range_rejected(value):
    with pytest.raises(ValueError):
        validate_range(value)


def test_invalid_update_preserves_file(tmp_path):
    store = VideoCues(tmp_path)
    good = store.save('clip.mp4', {'expectedRevision': 0, 'ranges': [item()]})
    for ranges in [[item(), item()], [dict(item(), name='')], [dict(item(), sourceRange=None)], ['bad']]:
        with pytest.raises(ValueError):
            store.save('clip.mp4', {'expectedRevision': 1, 'ranges': ranges})
        assert store.read('clip.mp4') == good


def test_cue_http_api_and_layout_roundtrip(tmp_path, monkeypatch):
    media = tmp_path / 'media'
    media.mkdir()
    (media / 'clip.mp4').write_bytes(b'fixture')
    monkeypatch.setattr(server, 'get_download_dir', lambda: media)
    monkeypatch.setattr(server, 'VIDEO_CUES', VideoCues(tmp_path / 'cues'))
    monkeypatch.setattr(server, 'VIDEO_PRESET_DIR', tmp_path / 'presets')
    httpd = server.ThreadedHTTPServer(('127.0.0.1', 0), server.Handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    origin = f'http://127.0.0.1:{httpd.server_port}'
    def request(path, body=None):
        req = urllib.request.Request(origin + path, data=None if body is None else json.dumps(body).encode(), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as response:
            return json.load(response)
    try:
        path = '/api/video-cues/clip.mp4'
        assert request(path)['revision'] == 0
        assert request(path, {'expectedRevision': 0, 'ranges': [item()]})['ranges'] == [item()]
        with pytest.raises(urllib.error.HTTPError) as error:
            request(path, {'expectedRevision': 0, 'ranges': []})
        assert error.value.code == 409
        for name in ['missing.mp4', '..%2Fclip.mp4']:
            with pytest.raises(urllib.error.HTTPError) as error:
                request('/api/video-cues/' + name)
            assert error.value.code == 404
        preset = {'id': 'range-layout', 'name': 'Cue loop', 'view': 'single', 'preset': 1,
            'loopMode': 1, 'speed': 1, 'zoom': 1, 'panX': 0, 'panY': 0, 'sourceRange': {'start': 2, 'end': 8}}
        request('/api/video-presets/clip.mp4', {'presets': [preset]})
        assert request('/api/video-presets/clip.mp4')['presets'] == [preset]
        with pytest.raises(urllib.error.HTTPError) as error:
            request('/api/video-presets/clip.mp4', {'presets': [dict(preset, sourceRange={'start': 9, 'end': 8})]})
        assert error.value.code == 400
    finally:
        httpd.shutdown()
        httpd.server_close()
