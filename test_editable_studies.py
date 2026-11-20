"""Legacy generated examples must retain authored timing and editable layouts."""
import copy
import importlib.util
from pathlib import Path

spec = importlib.util.spec_from_file_location('editable_studies', Path(__file__).parent / 'showcase/editable_studies.py')
studies = importlib.util.module_from_spec(spec)
spec.loader.exec_module(studies)


def test_repair_preserves_user_settings_and_is_idempotent():
    for video in (studies.RIPPLE, studies.COLOUR):
        old = {'video':video,'view':'quad','preset':19,'zoom':1.2,
               'duration':{'type':'seconds','value':32},
               'cues':[{'at':0,'effect':'text','text':'MATTER'},{'at':6,'effect':'off'}],
               'layoutCues':[{'at':8,'view':'dual','preset':1}]}
        snapshot = copy.deepcopy(old)
        fixed = studies.repair(old)
        assert old == snapshot
        assert fixed['video'] == studies.REPLACEMENTS[video]
        assert fixed['view'] == 'quad' and fixed['preset'] == 19 and fixed['zoom'] == 1.2
        assert fixed['duration'] == old['duration'] and fixed['cues'][0] == old['cues'][0]
        assert next(c for c in fixed['layoutCues'] if c['at'] == 8)['view'] == 'dual'
        assert studies.repair(fixed) == fixed


def test_source_ranges_and_unrelated_cues_survive():
    value = {'video':studies.RIPPLE,'sourceRange':{'start':2,'end':4},
             'cues':[{'at':6,'effect':'logo','skin':'gold'}]}
    result = studies.repair(value)
    assert result['sourceRange'] == value['sourceRange']
    assert result['cues'] == value['cues']
    assert studies.repair({'video':'ordinary.mp4','view':'single'}) == {'video':'ordinary.mp4','view':'single'}


def test_recipe_bindings_and_colour_only_changes_are_repaired():
    recipe = {'bindings':{'slot':studies.RIPPLE},'steps':[
        {'slot':'08 · A surface remembers','effects':[{'at':0,'seconds':6,'effect':'text'}]},
        {'slot':'10 · Colour acquires a memory','layoutCues':[]}]}
    result = studies.repair(recipe)
    assert result['bindings']['slot'] == studies.REPLACEMENTS[studies.RIPPLE]
    assert result['steps'][0]['effects'][-1]['effect'] == 'scene-0'
    assert len(result['steps'][1]['layoutCues']) == 7
    assert all('view' not in c for c in result['steps'][1]['layoutCues'])
    assert studies.repair(result) == result
