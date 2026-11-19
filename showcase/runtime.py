"""Read real sources through an isolated app server; metadata stays temporary."""
import json
from pathlib import Path
import shutil
import sys
import tempfile
import threading
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'ui-redesign'))
import launch

def fixture():
    v1=launch.v1;work=Path(tempfile.mkdtemp(prefix='club-showcase-qa-'))
    for name in ('thumbs','playlists','presets','previews'):(work/name).mkdir()
    config=work/'config.json';config.write_text(json.dumps({'download_dir':str(ROOT/'downloads')}))
    v1.CONFIG_FILE=config;v1.THUMB_DIR=work/'thumbs';v1.PLAYLIST_DIR=work/'playlists';v1.VIDEO_PRESET_DIR=work/'presets';v1.LIBRARY_ORDER_FILE=work/'order.json'
    v1.LIBRARY_CATALOG=v1.LibraryCatalog(work/'catalog.json');v1.VIDEO_CUES=v1.VideoCues(work/'cues');v1.PREVIEW_CACHE=v1.PreviewCache(work/'previews',v1.find_working_ffmpeg)
    for source in (ROOT/'showcase').glob('version1-showcase-*.json'):shutil.copyfile(source,work/'playlists'/source.name)
    library=json.loads((ROOT/'showcase'/'base-library.json').read_text());add=json.loads((ROOT/'showcase'/'show-library-additions.json').read_text())
    for field in ('models','bricks','profiles'):library[field]+=add[field]
    launch.SHOW_LIBRARY=launch.ShowLibrary(work/'models.json');launch.SHOW_LIBRARY.save({'revision':0,'library':library})
    class Output:
        def status(self):return {'connected':False,'fullscreen':False}
    v1.MAC_OUTPUT=Output();launch.RedesignHandler.log_message=lambda *args:None
    httpd=v1.ThreadedHTTPServer(('127.0.0.1',0),launch.RedesignHandler)
    threading.Thread(target=httpd.serve_forever,daemon=True).start()
    return v1,httpd,f'http://127.0.0.1:{httpd.server_port}',work
