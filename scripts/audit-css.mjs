import fs from 'node:fs';
const cssFiles = ['app/globals.css','app/sylvia-theme.css','app/sylvia-ui-fix.css','app/sylvia-premium.css','app/sylvia-console.css'];
let css = '';
cssFiles.forEach(f => css += fs.readFileSync(f, 'utf8'));
const defined = new Set();
for (const m of css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)) defined.add(m[1]);
const tsFiles = ['app/page.tsx', ...fs.readdirSync('components').filter(f => f.endsWith('.tsx')).map(f => 'components/' + f)];
const used = new Set();
for (const f of tsFiles) {
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/className=\{?[\"'`]([^\"'`]+)[\"'`]/g)) {
    const val = m[1].replace(/\$\{[^}]*\}/g, ' ');
    val.split(/\s+/).forEach(t => { if (/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(t)) used.add(t); });
  }
}
const missing = [...used].filter(c => !defined.has(c)).sort();
console.log('MISSING CSS:', missing.join(', ') || '(none)');
