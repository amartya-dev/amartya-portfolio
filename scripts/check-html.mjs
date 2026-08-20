// A gate on the built HTML. Runs after `astro build`, exits non-zero on a real
// defect, and prints the offending file and the surrounding text.
//
// This exists because of three bugs that shipped to a live page and survived
// every kind of review that involves looking at the code:
//
//   1. `What&rsquo;s breaking?` was passed as a prop, so it was escaped and the
//      reader saw the entity spelled out in a heading.
//   2. Four inline links had their preceding space eaten by JSX whitespace
//      collapsing, giving `asticky orchestrator` and `product-motionhappened`.
//   3. astro.config pointed at a domain that was never registered, so every
//      canonical, sitemap entry and OG image URL was wrong.
//
// None of those are visible in a diff. All three are trivial to detect in the
// rendered output, which is the only place they exist. The site's own argument is
// that a check nobody can block a deploy with is a dashboard; this one can.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SITE = 'https://amartya-gaur.com';

const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });

const around = (s, i, pad = 60) =>
  s.slice(Math.max(0, i - pad), i + pad).replace(/\s+/g, ' ').trim();

const problems = [];
const add = (file, rule, detail) =>
  problems.push({ file: file.replace(DIST, ''), rule, detail });

// Only the text a reader sees. Script and style bodies legitimately contain
// things that would look like defects in prose.
const textOf = (html) =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ');

for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
  const html = readFileSync(file, 'utf8');
  const text = textOf(html);

  // 1. A word fused to a link, in either direction.
  for (const m of text.matchAll(/\w<a\s[^>]*href|<\/a>\w/g)) {
    add(file, 'fused-link', around(text, m.index));
  }

  // 2. An HTML entity that was escaped instead of rendered, so the reader sees
  //    the source of the character rather than the character.
  for (const m of text.matchAll(/&amp;(rsquo|lsquo|ldquo|rdquo|mdash|ndash|nbsp|amp|hellip);/g)) {
    add(file, 'escaped-entity', around(text, m.index));
  }

  // 3. An absolute link to a domain we do not serve. Catches a stale `site`
  //    in astro.config, which silently poisons canonicals, RSS and OG cards.
  for (const m of html.matchAll(/https:\/\/amartya[a-z-]*\.com/g)) {
    if (m[0] !== SITE) add(file, 'wrong-domain', `${m[0]} (expected ${SITE})`);
  }

  // 4. An empty or missing title is a page nobody can find.
  const title = html.match(/<title>([\s\S]*?)<\/title>/);
  if (!title || !title[1].trim()) add(file, 'no-title', '<title> is missing or empty');
}

// The canonical of the home page is the one URL everything else is measured
// against, so it is asserted rather than merely scanned for.
const home = readFileSync(join(DIST, 'index.html'), 'utf8');
if (!home.includes(`<link rel="canonical" href="${SITE}/"`)) {
  add(join(DIST, 'index.html'), 'bad-canonical', `home page canonical is not ${SITE}/`);
}

if (problems.length) {
  console.error(`\n${problems.length} problem${problems.length > 1 ? 's' : ''} in the built HTML:\n`);
  for (const p of problems) console.error(`  ${p.rule.padEnd(16)} ${p.file}\n    ${p.detail}\n`);
  process.exit(1);
}

console.log('html check: clean');
