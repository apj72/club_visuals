"""Opt-in reuse of social captures without moving their original exports."""
import filecmp
import os
from pathlib import Path
import shutil
import tempfile


def capture_path(folder, filename):
    if (not isinstance(filename, str) or Path(filename).name != filename
            or not filename.startswith(('instagram_', 'facebook_'))
            or not filename.endswith('.mp4')):
        raise ValueError('Choose a saved Instagram or Facebook MP4 capture')
    folder = Path(folder).resolve()
    path = folder / filename
    if path.is_symlink() or not path.is_file() or path.resolve().parent != folder:
        raise FileNotFoundError('Saved capture not found in the configured clip folder')
    return path


def list_captures(folder):
    folder = Path(folder)
    captures = []
    for path in folder.glob('*.mp4'):
        if not path.name.startswith(('instagram_', 'facebook_')) or path.is_symlink() or not path.is_file():
            continue
        try:
            stat = path.stat()
        except FileNotFoundError:
            continue
        captures.append({'filename': path.name, 'size': stat.st_size, 'modified': stat.st_mtime})
    return sorted(captures, key=lambda capture: capture['modified'], reverse=True)


def import_capture(folder, library, filename):
    source = capture_path(folder, filename)
    library = Path(library).resolve()
    library.mkdir(parents=True, exist_ok=True)
    destination = library / ('capture_' + filename)
    # Existing identical imports are reused; another file is never overwritten.
    if destination.exists() or destination.is_symlink():
        if not destination.is_symlink() and destination.is_file() and filecmp.cmp(source, destination, shallow=False):
            return {'filename': destination.name, 'added': False}
        raise FileExistsError('A different video already uses this library filename')
    with tempfile.NamedTemporaryFile(prefix='.capture-import-', dir=library, delete=False) as temporary:
        temp_path = Path(temporary.name)
        try:
            with source.open('rb') as original:
                shutil.copyfileobj(original, temporary)
            temporary.flush()
            os.fsync(temporary.fileno())
            try:
                os.link(temp_path, destination)
            except FileExistsError:
                if destination.is_symlink() or not destination.is_file() or not filecmp.cmp(source, destination, shallow=False):
                    raise FileExistsError('A different video already uses this library filename')
                return {'filename': destination.name, 'added': False}
        finally:
            temp_path.unlink(missing_ok=True)
    return {'filename': destination.name, 'added': True}
