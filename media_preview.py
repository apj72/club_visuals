"""Build reusable H.264/AAC copies for Safari without changing source media."""
import hashlib
import subprocess
import threading
from pathlib import Path


class PreviewCache:
    def __init__(self, directory, ffmpeg):
        self.directory = Path(directory)
        self.ffmpeg = ffmpeg
        self.lock = threading.Lock()
        self.encoder = threading.Semaphore(1)
        self.jobs = {}

    def request(self, source):
        source = Path(source)
        stat = source.stat()
        key = hashlib.sha256(f'{source.resolve()}:{stat.st_mtime_ns}:{stat.st_size}:h264-v1'.encode()).hexdigest()
        target = self.directory / (key + '.mp4')
        with self.lock:
            if target.is_file():
                return {'ready': True, 'url': '/preview-video/' + target.name, 'path': str(target)}
            if key not in self.jobs:
                self.jobs[key] = {'ready': False}
                threading.Thread(target=self._convert, args=(source, target, key), daemon=True).start()
            return dict(self.jobs[key])

    def _convert(self, source, target, key):
        temp = target.with_suffix('.partial.mp4')
        try:
            with self.encoder:
                executable = self.ffmpeg()
                if not executable:
                    raise RuntimeError('ffmpeg is required for iPad previews. Install ffmpeg on the Mac.')
                self.directory.mkdir(parents=True, exist_ok=True)
                result = subprocess.run([executable, '-nostdin', '-y', '-v', 'error', '-i', str(source),
                    '-map', '0:v:0', '-map', '0:a:0?', '-vf',
                    'scale=1280:1280:force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30',
                    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '22', '-pix_fmt', 'yuv420p',
                    '-profile:v', 'high', '-level:v', '4.1', '-c:a', 'aac', '-b:a', '128k',
                    '-movflags', '+faststart', str(temp)], capture_output=True, timeout=180)
                if result.returncode:
                    raise RuntimeError('Could not prepare iPad preview: ' + result.stderr.decode(errors='replace')[-300:])
                temp.replace(target)
            with self.lock:
                self.jobs[key] = {'ready': True, 'url': '/preview-video/' + target.name, 'path': str(target)}
        except Exception as error:
            temp.unlink(missing_ok=True)
            with self.lock:
                self.jobs[key] = {'ready': False, 'error': str(error)}
