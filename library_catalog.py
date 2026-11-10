"""Shared, editable video tags stored separately from the source media."""
import json
from pathlib import Path
import threading


class LibraryCatalog:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = threading.Lock()

    def _read(self):
        if not self.path.exists():
            return {}
        data = json.loads(self.path.read_text())
        if not isinstance(data, dict) or not isinstance(data.get('videos'), dict):
            raise ValueError('Could not read the library catalogue')
        return data['videos']

    def read(self):
        with self.lock:
            return self._read()

    @staticmethod
    def validate(data):
        result = {}
        for field in ('themes', 'colours', 'types'):
            values = data.get(field, [])
            if not isinstance(values, list) or len(values) > 12:
                raise ValueError(f'{field} must contain up to 12 tags')
            cleaned = []
            for value in values:
                if not isinstance(value, str) or not 1 <= len(value.strip()) <= 40:
                    raise ValueError('Tags must be between 1 and 40 characters')
                value = ' '.join(value.split())
                if value.casefold() not in [tag.casefold() for tag in cleaned]:
                    cleaned.append(value)
            result[field] = cleaned
        notes = data.get('notes', '')
        if not isinstance(notes, str) or len(notes) > 300:
            raise ValueError('Notes must be at most 300 characters')
        reviewed = data.get('reviewed', True)
        if not isinstance(reviewed, bool):
            raise ValueError('Reviewed must be true or false')
        result.update(notes=notes.strip(), reviewed=reviewed, source=data.get('source', 'manual'))
        return result

    def update(self, filename, data):
        entry = self.validate(data)
        with self.lock:
            videos = self._read()
            videos[filename] = entry
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temp = self.path.with_suffix('.json.tmp')
            temp.write_text(json.dumps({'version': 1, 'videos': videos}, indent=2, ensure_ascii=False))
            temp.replace(self.path)
        return entry
