"""Shared, editable video tags stored separately from the source media."""
import json
import copy
from pathlib import Path
import threading


class CatalogConflict(ValueError):
    pass


class LibraryCatalog:
    def __init__(self, path):
        self.path = Path(path)
        self.lock = threading.Lock()
        self._undo = None

    def _load(self):
        if not self.path.exists():
            return {'version': 1, 'revision': 0, 'videos': {}}
        data = json.loads(self.path.read_text())
        if not isinstance(data, dict) or not isinstance(data.get('videos'), dict):
            raise ValueError('Could not read the library catalogue')
        data.setdefault('revision', 0)
        return data

    def _read(self):
        return self._load()['videos']

    def read(self):
        with self.lock:
            return self._read()

    def snapshot(self):
        with self.lock:
            data = self._load()
            available = bool(self._undo and self._undo['after'] == data['revision'])
            return {'videos': data['videos'], 'revision': data['revision'],
                    'undoAvailable': available, 'undoLabel': self._undo['label'] if available else ''}

    @staticmethod
    def _check_revision(data, expected):
        if expected is not None and (isinstance(expected, bool) or not isinstance(expected, int) or expected != data['revision']):
            raise CatalogConflict('Tags changed on another screen. Refresh the saved tags before applying this change.')

    def _write(self, videos, revision):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temp = self.path.with_suffix('.json.tmp')
        temp.write_text(json.dumps({'version': 1, 'revision': revision, 'videos': videos}, indent=2, ensure_ascii=False))
        temp.replace(self.path)

    @staticmethod
    def _tag(value):
        if not isinstance(value, str) or not 1 <= len(value.strip()) <= 40:
            raise ValueError('Tags must be between 1 and 40 characters')
        return ' '.join(value.split())

    @staticmethod
    def _unique(values):
        result, seen = [], set()
        for value in values:
            if value.casefold() not in seen:
                result.append(value)
                seen.add(value.casefold())
        return result

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

    def update(self, filename, data, expected_revision=None):
        entry = self.validate(data)
        with self.lock:
            loaded = self._load()
            self._check_revision(loaded, expected_revision)
            videos = loaded['videos']
            before = copy.deepcopy(videos)
            for field in ('themes', 'colours', 'types'):
                known = {tag.casefold(): tag for existing in videos.values() for tag in existing.get(field, [])}
                entry[field] = self._unique([known.get(tag.casefold(), tag) for tag in entry[field]])
            videos[filename] = entry
            revision = loaded['revision'] + 1
            self._write(videos, revision)
            self._undo = {'before': before, 'after': revision, 'label': 'Edit tags for ' + filename}
        return entry

    def manage(self, request, valid_filenames):
        """Apply an all-or-nothing edit; stale clients never overwrite corrections."""
        action = request.get('action')
        if action not in ('rename', 'delete', 'bulk', 'review', 'undo'):
            raise ValueError('Choose a tag action')
        if 'expectedRevision' not in request:
            raise ValueError('A catalogue revision is required')
        with self.lock:
            loaded = self._load()
            self._check_revision(loaded, request['expectedRevision'])
            videos, revision = loaded['videos'], loaded['revision']
            before = copy.deepcopy(videos)
            if action == 'undo':
                if not self._undo or self._undo['after'] != revision:
                    raise CatalogConflict('There is no current tag change to undo.')
                changed = sum(videos.get(name) != self._undo['before'].get(name) for name in set(videos) | set(self._undo['before']))
                self._write(self._undo['before'], revision + 1)
                self._undo = None
                return {'changed': changed, 'revision': revision + 1, 'label': 'Undid the last tag change'}

            field = request.get('field')
            if action != 'review' and field not in ('themes', 'colours', 'types'):
                raise ValueError('Choose Theme, Colour or Visual type')
            targets = set(valid_filenames)
            if action in ('bulk', 'review'):
                names = request.get('filenames')
                if not isinstance(names, list) or not names or len(names) > 5000 or not all(isinstance(name, str) for name in names):
                    raise ValueError('Select one or more library videos')
                if not set(names).issubset(targets):
                    raise ValueError('A selected video is no longer in the library. Refresh the list.')
                targets = set(names)
            if action == 'review':
                if not isinstance(request.get('reviewed'), bool):
                    raise ValueError('Reviewed must be true or false')
                label = 'Mark selected videos ' + ('reviewed' if request['reviewed'] else 'for review')
            else:
                tag = self._tag(request.get('tag'))
                if action == 'rename':
                    replacement = self._tag(request.get('newTag'))
                    if replacement.casefold() != tag.casefold():
                        replacement = next((value for name, existing in videos.items() if name in targets for value in existing.get(field, []) if value.casefold() == replacement.casefold()), replacement)
                    label = f'Rename {tag} to {replacement}'
                elif action == 'bulk':
                    if request.get('mode') not in ('add', 'remove'):
                        raise ValueError('Choose Add tag or Remove tag')
                    tag = next((value for name, existing in videos.items() if name in valid_filenames for value in existing.get(field, []) if value.casefold() == tag.casefold()), tag)
                    label = ('Add ' if request['mode'] == 'add' else 'Remove ') + tag
                else:
                    label = 'Remove ' + tag

            changed = 0
            for filename in targets:
                entry = copy.deepcopy(videos.get(filename, {'themes': [], 'colours': [], 'types': [], 'notes': '', 'reviewed': False}))
                original = copy.deepcopy(entry)
                if action == 'review':
                    entry['reviewed'] = request['reviewed']
                else:
                    values = entry.get(field, [])
                    if action == 'rename':
                        entry[field] = self._unique([replacement if value.casefold() == tag.casefold() else value for value in values])
                    elif action == 'bulk' and request['mode'] == 'add':
                        entry[field] = self._unique([*values, tag])
                    else:
                        entry[field] = [value for value in values if value.casefold() != tag.casefold()]
                    if len(entry[field]) > 12:
                        raise ValueError('This change would give a video more than 12 tags in one category')
                if entry != original:
                    entry['source'] = 'manual'
                    videos[filename] = entry
                    changed += 1
            if changed:
                self._write(videos, revision + 1)
                self._undo = {'before': before, 'after': revision + 1, 'label': label + f' on {changed} video(s)'}
                revision += 1
            return {'changed': changed, 'revision': revision, 'label': label}
