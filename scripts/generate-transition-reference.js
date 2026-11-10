/* Regenerate the design/reference inventory from the actual transition registry. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const context = {};
context.window = context;
vm.runInNewContext(fs.readFileSync(path.join(root, 'transition_engine.js'), 'utf8'), context);
const effects = Object.values(context.TRANSITION_CATALOGUE);
const cell = value => String(value).replaceAll('|', '\\|').replaceAll('\n', ' ');
const ruleText = rule => {
  const range = rule.values ? rule.values.join(' / ') : rule.min !== undefined ? `${rule.min}–${rule.max}` : rule.type;
  return `${range}; default ${JSON.stringify(rule.default)}`;
};
const lines = [
  '# Club Visuals: transition catalogue reference', '',
  'Generated from `transition_engine.js` with `node scripts/generate-transition-reference.js`.', '',
  `${effects.length} choices: ${effects.filter(effect => effect.implementationKind === 'shader').length} GPU shader effects and ${effects.filter(effect => effect.implementationKind === 'canvas').length} classic Canvas effects.`, '',
  'Common controls are incoming duration (0.15–10 seconds, except instant Cut), pace (Even / Build / Hit / Ease), and a saved seed. Per-effect controls are listed below. GPU effects fall back to Cross Dissolve if WebGL2 is unavailable. Reduce flashes modifies flash-heavy effects; warning labels are registry metadata, not a guarantee that arbitrary source footage is flash-free.', '',
  'The categories below follow the current registry, including shorter category names used by the early effects. A redesign may consolidate their presentation while preserving saved IDs. Shader simulations are labelled in their descriptions.', '',
  'See the [product reference](product-reference.md) for audition/playlist workflows and the [transition plan](transition-roadmap.md) for future automation.', ''
];
for (const category of [...new Set(effects.map(effect => effect.category))]) {
  lines.push(`## ${category}`, '', '| Effect | Saved ID | Renderer | Behaviour | Effect-specific controls | Labels |', '| --- | --- | --- | --- | --- | --- |');
  for (const effect of effects.filter(effect => effect.category === category)) {
    const controls = Object.entries(effect.parameterDefinitions).map(([key, rule]) => `${key}: ${ruleText(rule)}`).join('; ') || 'None';
    lines.push(`| ${[effect.name, '`'+effect.id+'`', effect.implementationKind, effect.description, controls, effect.safetyTags.join(', ') || '—'].map(cell).join(' | ')} |`);
  }
  lines.push('');
}
fs.writeFileSync(path.join(root, 'docs/transition-catalogue.md'), lines.join('\n'));
console.log(`Documented ${effects.length} transitions.`);
