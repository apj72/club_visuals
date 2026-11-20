/* Current effect choices; retain legacy IDs for saved shows and recordings. */
(() => {
  const names = {
    off: 'Off', 'scene-0': 'Liquid ripple', 'scene-2': 'Video ribbons',
    'scene-4': 'Kaleidoscope tunnel', logo: '3D Version1 logo', text: '3D text',
    camera: 'Camera motion extraction', video: 'Plain background video',
    'scene-1': 'Image smear', mirror: 'Mirror sculpture', 'scene-5': 'Prism fracture',
  };
  const legacy = new Set(['scene-1', 'mirror', 'scene-5']);
  function cueChoices(current) {
    const choices = Object.fromEntries(Object.entries(names).filter(([id]) => !legacy.has(id)));
    if (legacy.has(current)) choices[current] = names[current] + ' · existing legacy cue';
    return choices;
  }
  function sceneChoices(current) {
    const choices = {'-1': 'Plain background video', 0: names['scene-0'], 2: names['scene-2'],
      4: names['scene-4'], 6: '3D logo / text only', 7: names.camera};
    const id = ({1: 'scene-1', 3: 'mirror', 5: 'scene-5'})[current];
    if (id) choices[current] = names[id] + ' · existing legacy effect';
    return choices;
  }
  window.EffectCatalog = {names, cueChoices, sceneChoices,
    automaticScenes: profile => profile === 'ambient' ? [0, 6] : [0, 2, 4, 6],
    shortcutScenes: [0, 2, 4, 6, 7]};
})();
