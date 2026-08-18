import fs from 'fs';

const file = process.argv[2];
const t = fs.readFileSync(file, 'utf8');
const re = /"positions"\s*:\s*(\[.*?\])\s*,\s*"isFallback"/s;
const m = t.match(re);
if (m) {
  const pos = JSON.parse(m[1]);
  console.log('COUNT', pos.length);
  for (const p of pos.slice(0, 30)) {
    console.log([p.name, p.location, p.id].join(' | '));
  }
} else {
  const names = [...t.matchAll(/"name":"([^"]{3,160})"/g)].map((x) => x[1]);
  const uniq = [...new Set(names)].filter((n) => /talent|recruit|sourc|human resource/i.test(n));
  console.log('NAME_HITS', uniq.length);
  for (const n of uniq.slice(0, 40)) console.log(n);
  const titles = [...t.matchAll(/>([^<]{3,120}Talent Acquisition[^<]{0,80})</gi)].map((x) => x[1].trim());
  console.log('TITLE_HITS', titles.slice(0, 25));
  const links = [...t.matchAll(/href="([^"]*(?:talent-acquisition|recruiter|sourcer)[^"]*)"/gi)].map((x) => x[1]);
  console.log('LINKS', [...new Set(links)].slice(0, 20));
}
