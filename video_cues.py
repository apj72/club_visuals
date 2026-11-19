"""Named, non-destructive source ranges, with per-video revision checks."""
import hashlib
import json
import math
from pathlib import Path
import threading


class CueConflict(ValueError):
    pass


def validate_range(value):
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError('Invalid source range')
    start, end = value.get('start'), value.get('end')
    def number(item):
        return not isinstance(item, bool) and isinstance(item, (int, float)) and math.isfinite(item)
    if not number(start) or start < 0 or (end is not None and (not number(end) or end - start < .1 - 1e-9)):
        raise ValueError('Out must be at least 0.1 seconds after In')
    return {'start': start, 'end': end}


class VideoCues:
    def __init__(self, directory):
        self.directory = Path(directory)
        self.lock = threading.Lock()

    def _path(self, filename):
        return self.directory / (hashlib.sha256(filename.encode()).hexdigest() + '.json')

    def _read(self, filename):
        path = self._path(filename)
        return json.loads(path.read_text()) if path.exists() else {'video': filename, 'revision': 0, 'ranges': []}

    def read(self, filename):
        with self.lock:
            return self._read(filename)

    def save(self, filename, data):
        ranges = data.get('ranges')
        if not isinstance(ranges, list) or len(ranges) > 100:
            raise ValueError('Save up to 100 ranges per video')
        cleaned, ids = [], set()
        for item in ranges:
            if not isinstance(item, dict):
                raise ValueError('Invalid cue range')
            identity, name = item.get('id'), item.get('name')
            if (not isinstance(identity, str) or not 1 <= len(identity) <= 80 or identity in ids
                    or not isinstance(name, str) or not 1 <= len(name.strip()) <= 80):
                raise ValueError('Each range needs a unique ID and a name up to 80 characters')
            source = validate_range(item.get('sourceRange'))
            if source is None:
                raise ValueError('A saved range needs In and Out times')
            ids.add(identity)
            cleaned.append({'id': identity, 'name': name.strip(), 'sourceRange': source})
        with self.lock:
            current = self._read(filename)
            revision = data.get('expectedRevision')
            if isinstance(revision, bool) or not isinstance(revision, int) or revision != current['revision']:
                raise CueConflict('Cue ranges changed on another screen. Reload saved ranges, then try again.')
            result = {'video': filename, 'revision': revision + 1, 'ranges': cleaned}
            self.directory.mkdir(parents=True, exist_ok=True)
            path = self._path(filename)
            temp = path.with_suffix('.json.tmp')
            temp.write_text(json.dumps(result, indent=2, ensure_ascii=False))
            temp.replace(path)
            return result
