"""Capture the guide with the user's Docshots tool and temporary app data.

No physical inputs, live Mac engine, user metadata, or saved playlists are changed.
"""
import argparse
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys
import time
from PIL import Image

ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'showcase'))
from runtime import fixture

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--docshots',type=Path,default=Path('/Users/antonyjoyce/git-repos/docshots/docshots.py'));parser.add_argument('-s','--scenario');args=parser.parse_args()
    if not args.docshots.is_file():raise SystemExit('Pass --docshots /path/to/docshots.py')
    v1,httpd,origin,work=fixture()
    handle_error=httpd.handle_error
    def quiet_disconnect(request,address):
        if not isinstance(sys.exc_info()[1],(BrokenPipeError,ConnectionResetError)):handle_error(request,address)
    httpd.handle_error=quiet_disconnect
    try:
        v1.LIBRARY_CATALOG.update('blue_laser.mp4',{'themes':['Abstract'],'colours':['Blue'],'types':['Animation'],'reviewed':True})
        env=dict(os.environ,CLUB_DOCSHOTS_URL=origin,PYTHONUNBUFFERED='1')
        command=[sys.executable,str(args.docshots),'-f',str(ROOT/'screenshots.py')]
        if args.scenario:command+=['-s',args.scenario]
        started=time.time();subprocess.run(command,cwd=ROOT,env=env,check=True)
        spec=importlib.util.spec_from_file_location('guide_scenarios',ROOT/'screenshots.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
        records=[]
        for scenario in module.scenarios:
            if args.scenario and scenario['name']!=args.scenario:continue
            path=ROOT/module.config['output_dir']/(scenario['name']+'.png')
            if not path.is_file() or path.stat().st_mtime<started:raise RuntimeError('Docshots did not capture '+scenario['name'])
            with Image.open(path) as im:width,height=im.size
            assert width>200 and height>100
            records.append({'name':scenario['name'],'caption':scenario['caption'],'width':width,'height':height,'bytes':path.stat().st_size})
        target=ROOT/'docs/user-guide/assets/screenshots/capture-manifest.json'
        if not args.scenario:target.write_text(json.dumps({'tool':'docshots','captured':'2026-11-20','isolated':True,'screenshots':records},indent=2))
        print('Verified Docshots captures:',len(records),'Temporary app data:',work,flush=True)
    finally:httpd.shutdown();httpd.server_close()

if __name__=='__main__':main()
