"""Repair legacy showcase studies that baked a three-panel layout into the MP4.

Only the two generated studies are affected. Original renders remain untouched.
Run with --install to update local saved playlists/models after backing them up.
"""
import argparse
from datetime import datetime
import json
from pathlib import Path
import shutil
import sys

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
SOURCES = {m['index']: m['filename'] for m in json.loads((ROOT / 'showcase/source-media.json').read_text())}
RIPPLE = 'version1_showcase_ripple_study.mp4'
COLOUR = 'version1_showcase_colour_and_trails.mp4'
REPLACEMENTS = {RIPPLE: SOURCES[17], COLOUR: SOURCES[7]}
NEUTRAL = dict(hueRotate=0, saturate=100, contrast=100, brightness=100, blur=0, invert=0, sepia=0)
COLOURS = [NEUTRAL, {**NEUTRAL, 'saturate':250,'contrast':130,'brightness':110},
           {**NEUTRAL,'hueRotate':180,'saturate':300,'contrast':150,'brightness':120},
           {**NEUTRAL,'hueRotate':120,'saturate':150,'contrast':140,'brightness':130},
           {**NEUTRAL,'hueRotate':30,'saturate':60,'contrast':110,'brightness':90,'blur':.5,'sepia':60},
           {**NEUTRAL,'invert':100}, {**NEUTRAL,'saturate':80,'contrast':80,'brightness':120,'blur':2,'sepia':20}, NEUTRAL]


def colour_changes():
    return [dict(at=i*4, effects=effect, trailsEnabled=i in (1,2,3,6,7), trailAmount=.06 if i==7 else .13)
            for i,effect in enumerate(COLOURS)]


def repair(value):
    """Return an idempotent copy, preserving timings, layouts and other user edits."""
    if isinstance(value, list):
        return [repair(item) for item in value]
    if not isinstance(value, dict):
        return value
    result = {key: repair(item) for key,item in value.items()}
    slot = value.get('slot', '')
    if slot == '08 · A surface remembers' and not any(e.get('effect') == 'scene-0' for e in result.get('effects', [])):
        effects = result.get('effects', [])
        if all(e.get('at', 0) + e.get('seconds', 0) <= 6 for e in effects):
            result['effects'] = effects + [{'at':6,'seconds':26,'effect':'scene-0','intensity':.95,'feedback':.16}]
    if slot == '10 · Colour acquires a memory' and not result.get('layoutCues'):
        result['layoutCues'] = colour_changes()[1:]
    video = value.get('video')
    if video not in REPLACEMENTS:
        # Recipe/generation bindings also need to use the editable originals.
        for key,item in result.items():
            if isinstance(item,str) and item in REPLACEMENTS:
                result[key] = REPLACEMENTS[item]
        return result
    result['video'] = REPLACEMENTS[video]
    if video == RIPPLE:
        result.setdefault('sourceRange', {'start':0,'end':16})
        # The original title finishes at 6s; expose the ripple as a live purple cue.
        for cue in result.get('cues', []):
            if cue.get('effect') == 'off' and cue.get('at') == 6:
                cue.update(effect='scene-0', intensity=.95, feedback=.16)
    else:
        changes = {c['at']:c for c in colour_changes()[1:]}
        for cue in result.get('layoutCues', []):
            changes[cue['at']] = {**changes.get(cue['at'], {}), **cue}
        result['layoutCues'] = sorted(changes.values(), key=lambda c:c['at'])
    return result


def install():
    backup = ROOT / '.runtime' / ('before-editable-studies-' + datetime.now().strftime('%Y%m%d-%H%M%S'))
    changed=[]
    for path in [*sorted((ROOT/'playlists').glob('*.json')), ROOT/'show_models.json']:
        if not path.exists():continue
        old=json.loads(path.read_text());new=repair(old)
        if new==old:continue
        # Never replace an asset with a source missing from this installation.
        import server
        if any(not (server.get_download_dir()/source).is_file() for source in REPLACEMENTS.values()):
            raise FileNotFoundError('The original study sources must be in the source library.')
        target=backup/path.relative_to(ROOT);target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(path,target)
        if json.loads(path.read_text()) != old:
            raise RuntimeError('Saved content changed during repair; retry after saving: ' + str(path))
        temporary=path.with_suffix('.json.tmp');temporary.write_text(json.dumps(new,indent=2));temporary.replace(path)
        changed.append(str(path.relative_to(ROOT)))
    print(json.dumps({'changed':changed,'backup':str(backup)},indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--install',action='store_true');args=parser.parse_args()
    if args.install:install()
