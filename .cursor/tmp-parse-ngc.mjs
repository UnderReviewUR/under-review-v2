import fs from 'fs';

const file = process.argv[2];
let t = fs.readFileSync(file, 'utf8');
t = t.replace(/&#34;/g, '"').replace(/&amp;/g, '&');

const idx = t.indexOf('"positions"');
if (idx === -1) {
  console.log('no positions key');
  process.exit(0);
}
const start = t.indexOf('[', idx);
let depth = 0;
let end = -1;
for (let i = start; i < t.length; i++) {
  const ch = t[i];
  if (ch === '[') depth++;
  else if (ch === ']') {
    depth--;
    if (depth === 0) {
      end = i + 1;
      break;
    }
  }
}
if (end === -1) {
  console.log('could not bracket match');
  process.exit(0);
}
const pos = JSON.parse(t.slice(start, end));
const hits = pos.filter((p) => /talent|recruit|sourc|human resource/i.test(`${p.name} ${p.department || ''}`));
console.log('TOTAL', pos.length, 'HITS', hits.length);
for (const p of hits.slice(0, 30)) {
  console.log([p.name, p.location, p.id, p.canonicalPositionUrl || ''].join(' | '));
}
