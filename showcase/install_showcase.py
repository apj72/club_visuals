"""Install new showcase content while preserving existing user content."""
import copy
import hashlib
import json
from pathlib import Path
import urllib.request

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = 'http://127.0.0.1:8008'


def api(path, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    request = urllib.request.Request(ORIGIN + path, data=body,
                                     headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=20) as response:
        return json.load(response)


def main():
    manifest = json.loads((ROOT / 'showcase/manifest.json').read_text())
    assert json.loads((ROOT / 'showcase/verification.json').read_text())['blackEnding']
    assert json.loads((ROOT / 'showcase/trailer-verification.json').read_text())['blackEnding']
    old_playlists = {p['slug'] for p in api('/api/playlists')}
    current = api('/api/show-library')
    library = copy.deepcopy(current['library']) if current['library'] else json.loads((ROOT / 'showcase/base-library.json').read_text())
    additions = json.loads((ROOT / 'showcase/show-library-additions.json').read_text())
    for field in ('bricks', 'models', 'profiles'):
        by_id = {item['id']: item for item in library[field]}
        for item in additions[field]:
            if item['id'] in by_id:
                assert item == by_id[item['id']], f'Existing {field} ID differs: {item["id"]}'
            else:
                library[field].append(item)
    staged = {}
    for slug in manifest['playlists']:
        data = json.loads((ROOT / f'showcase/{slug}.json').read_text())
        if slug in old_playlists:
            assert api('/api/playlist/' + slug) == data, 'Preserving existing playlist: ' + slug
        staged[slug] = data
    # All conflict checks happen before mutations. The recipe store uses a revision check.
    if current['library'] != library:
        saved = api('/api/show-library', {'revision': current['revision'], 'library': library})
    else:
        saved = current
    for slug, data in staged.items():
        if slug not in old_playlists:
            api('/api/playlist/' + slug, data)
        assert api('/api/playlist/' + slug) == data
    assert old_playlists.issubset({p['slug'] for p in api('/api/playlists')})
    persisted = api('/api/show-library')
    assert all(any(m['id'] == item['id'] for m in persisted['library'][field])
               for field in ('bricks', 'models', 'profiles') for item in additions[field])
    report = {'playlists': list(staged), 'model': manifest['modelId'],
              'profile': manifest['profileId'], 'libraryRevision': saved['revision'],
              'existingPlaylistsPreserved': len(old_playlists),
              'playlistSha256': {slug: hashlib.sha256((ROOT / f'showcase/{slug}.json').read_bytes()).hexdigest() for slug in staged}}
    (ROOT / 'showcase/installed.json').write_text(json.dumps(report, indent=2))
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    main()
