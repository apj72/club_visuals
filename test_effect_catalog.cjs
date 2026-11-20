const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const context = vm.createContext({window:{}});
vm.runInContext(fs.readFileSync('effect_catalog.js','utf8'),context);
const C = context.window.EffectCatalog;

test('new selections omit retired effects while saved cues retain their IDs', () => {
  for (const id of ['scene-1','mirror','scene-5']) {
    assert.ok(C.names[id]);
    assert.equal(C.cueChoices()[id],undefined);
    assert.match(C.cueChoices(id)[id],/existing legacy/);
    assert.equal(C.cueChoices('text')[id],undefined);
  }
  assert.equal(C.cueChoices().text,'3D text');
});
test('retired scenes cannot be selected by Auto Perform or keyboard shortcuts', () => {
  for (const profile of ['ambient','hypnotic','balanced','high-energy']) {
    assert.ok(C.automaticScenes(profile).length > 0);
    assert.ok(C.automaticScenes(profile).every(id => ![1,3,5].includes(id)));
  }
  assert.ok(C.shortcutScenes.every(id => ![1,3,5].includes(id)));
  for (const id of [1,3,5]) {
    assert.equal(C.sceneChoices()[id],undefined);
    assert.match(C.sceneChoices(id)[id],/existing legacy/);
  }
});
