"""Shared model/profile library, independent of generated V1 playlists."""
import json
from pathlib import Path
import threading


class LibraryConflict(ValueError):
    pass


class ShowLibrary:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = threading.Lock()

    def _read(self):
        if not self.path.exists():
            return {'revision': 0, 'library': None}
        return json.loads(self.path.read_text())

    def read(self):
        with self.lock:
            return self._read()

    def save(self, payload):
        library = payload.get('library')
        if not isinstance(library, dict) or library.get('version') != 1:
            raise ValueError('Unsupported show library version')
        for key in ('bricks', 'models', 'profiles'):
            items = library.get(key)
            if not isinstance(items, list) or len(items) > 200:
                raise ValueError(f'Keep up to 200 {key}')
            ids = set()
            for item in items:
                if not isinstance(item, dict):
                    raise ValueError('Invalid component')
                for field in ('id', 'name'):
                    if not isinstance(item.get(field), str) or not 1 <= len(item[field].strip()) <= 120:
                        raise ValueError('Components need IDs and names up to 120 characters')
                if item['id'] in ids:
                    raise ValueError('Duplicate component ID')
                ids.add(item['id'])
        with self.lock:
            saved = self._read()
            revision = payload.get('revision')
            if type(revision) is not int or revision != saved['revision']:
                raise LibraryConflict('Models changed on another screen. Download your draft, then reload the saved library.')
            result = {'revision': revision + 1, 'library': library}
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.path.with_suffix('.json.tmp')
            temporary.write_text(json.dumps(result, indent=2, ensure_ascii=False))
            temporary.replace(self.path)
            return result
