// Open-graph cards. A shared link is often the only thing anybody sees, so each
// one carries the post's own figure and the same drawing language as the site,
// rather than a title on a gradient.
//
// Rendered in a real browser against the real webfonts, then written to
// public/og/. Run: node scripts/og.mjs
//
// Needs playwright-core and a Chromium. It is not a dependency of this project
// because it runs by hand, a few times a year, when the card design changes:
//
//   npm i -D playwright-core && npx playwright install chromium
//
// Override either with an environment variable if you have them somewhere else:
//   PLAYWRIGHT_CORE=/path/to/playwright-core/index.mjs
//   PLAYWRIGHT_CHROMIUM=/path/to/chrome-headless-shell
//
// This used to import both from absolute paths inside one particular laptop,
// which worked on exactly that laptop.
import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const { chromium } = await import(process.env.PLAYWRIGHT_CORE || 'playwright-core').catch(() => {
  console.error(
    'og: playwright-core not found.\n' +
    '    npm i -D playwright-core && npx playwright install chromium\n' +
    '    or set PLAYWRIGHT_CORE to an existing install.'
  );
  process.exit(1);
});

// Undefined lets playwright find its own managed browser, which is the normal case.
const EXE = process.env.PLAYWRIGHT_CHROMIUM || undefined;
const ROOT = new URL('..', import.meta.url).pathname;
const BLOG = join(ROOT, 'src/content/blog');
const OUT = join(ROOT, 'public/og');
mkdirSync(OUT, { recursive: true });

const PREVIEW = (await import(join(ROOT, 'src/data/previews.js'))).PREVIEW;

const fm = (raw) => {
  const m = raw.match(/^---\n([\s\S]*?)\n---/);
  const o = {};
  for (const line of m[1].split('\n')) {
    const k = line.slice(0, line.indexOf(':')).trim();
    let v = line.slice(line.indexOf(':') + 1).trim();
    if (v.startsWith('"')) v = v.slice(1, -1);
    if (v.startsWith('[')) v = JSON.parse(v);
    o[k] = v;
  }
  return o;
};

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');

// The same four figure kinds the site draws, at card scale.
function figure(f) {
  if (!f) return '';
  const max = f.v ? Math.max(...f.v.map(Math.abs)) : 1;
  let body = '';
  if (f.kind === 'bars') {
    body = f.v.map((x, k) => `<div class="r"><i class="${f.bad?.includes(k) ? 'bad' : ''}" style="width:${Math.max((Math.abs(x) / max) * 100, 2)}%"></i></div>`).join('');
  } else if (f.kind === 'signed') {
    body = `<div class="sg">${f.v.map((x) => `<div class="r"><i class="${x < 0 ? 'bad' : ''}" style="left:${x < 0 ? 50 - (Math.abs(x) / max) * 50 : 50}%;width:${Math.max((Math.abs(x) / max) * 50, 1.5)}%"></i></div>`).join('')}</div>`;
  } else if (f.kind === 'pips') {
    const row = (n) => `<div class="pr">${Array.from({ length: f.n }, (_, k) => `<b class="${k < n ? 'on' : 'bad'}"></b>`).join('')}</div>`;
    body = f.single ? row(f.a) : row(f.a) + row(f.b);
  } else if (f.kind === 'still') {
    body = `<img class="still" src="http://localhost:4488${f.src}" />`;
  }
  return `<div class="fig">${body}<div class="cap">${esc(f.label)}</div></div>`;
}

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,300..700&family=Instrument+Sans:wght@400..700&family=IBM+Plex+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: #FBF9F5; color: #16130F;
    font-family: Newsreader, Georgia, serif; overflow: hidden; position: relative; }
  .grat { position: absolute; inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.86' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
    mix-blend-mode: multiply; opacity: .5; }
  .in { position: relative; height: 100%; padding: 54px 64px; display: grid;
        grid-template-rows: auto 1fr auto; }
  .mono { font-family: 'IBM Plex Mono', monospace; font-size: 14px; letter-spacing: .12em;
          text-transform: uppercase; color: #857C6E; }
  .rule { border-top: 1px solid #16130F; margin-top: 14px; }
  .mid { display: grid; grid-template-columns: minmax(0,1fr) 268px; gap: 56px; align-items: center; }
  .mid.solo { grid-template-columns: minmax(0,1fr); }
  h1 { font-family: Newsreader, Georgia, serif; font-weight: 400; font-optical-sizing: auto;
       letter-spacing: -.022em; line-height: 1.02; }
  .sub { margin-top: 22px; color: #4E473E; font-size: 21px; line-height: 1.45; max-width: 44ch;
         font-style: italic; }
  .foot { display: flex; justify-content: space-between; align-items: end; }
  .name { font-family: Newsreader, Georgia, serif; font-weight: 450; font-size: 22px;
          letter-spacing: -.016em; }
  /* figures */
  .fig { display: grid; gap: 9px; }
  .r { height: 15px; background: #F1ECE1; position: relative; }
  .fig > .r + .r, .sg .r + .r { margin-top: 6px; }
  .r i { position: absolute; inset-block: 0; left: 0; background: #3D6B4A; display: block; }
  .r i.bad { background: #8A2B20; }
  .sg .r::after { content:""; position: absolute; left: 50%; inset-block: -1px; width: 1px; background: #E2DBCC; }
  .pr { display: flex; gap: 7px; }
  .pr + .pr { margin-top: 7px; }
  .pr b { width: 21px; height: 21px; border: 1px solid #E2DBCC; background: #F1ECE1; }
  .pr b.on { background: #3D6B4A; border-color: #3D6B4A; }
  .pr b.bad { background: #8A2B20; border-color: #8A2B20; }
  .still { width: 100%; display: block; border: 1px solid #E2DBCC; }
  .cap { font-family: 'Instrument Sans', sans-serif; font-size: 14px; color: #857C6E; line-height: 1.45; }
  /* registration marks, the site's own */
  .c { position: absolute; width: 20px; height: 20px; border: 0 solid #C3BAA6; }
  .c1 { top: 24px; left: 24px; border-width: 1px 0 0 1px; }
  .c2 { top: 24px; right: 24px; border-width: 1px 1px 0 0; }
  .c3 { bottom: 24px; left: 24px; border-width: 0 0 1px 1px; }
  .c4 { bottom: 24px; right: 24px; border-width: 0 1px 1px 0; }
`;

const card = ({ kicker, title, sub, fig, left, right }) => `<!doctype html><meta charset="utf-8">
<style>${CSS}</style>
<div class="grat"></div>
<span class="c c1"></span><span class="c c2"></span><span class="c c3"></span><span class="c c4"></span>
<div class="in">
  <div><div class="mono">${esc(kicker)}</div><div class="rule"></div></div>
  <div class="mid${fig ? '' : ' solo'}">
    <div>
      <h1 style="font-size:${title.length > 46 ? 54 : title.length > 30 ? 64 : 76}px">${esc(title)}</h1>
      ${sub ? `<p class="sub">${esc(sub)}</p>` : ''}
    </div>
    <div>${fig || ''}</div>
  </div>
  <div class="foot"><span class="name">${esc(left)}</span><span class="mono">${esc(right)}</span></div>
</div>`;

// Prefer to end on a full stop; fall back to a whole word and an ellipsis.
const trim = (s, n) => {
  if (s.length <= n) return s;
  const cut = s.slice(0, n);
  const stop = cut.lastIndexOf('. ');
  if (stop > n * 0.5) return cut.slice(0, stop + 1);
  return cut.replace(/\s+\S*$/, '') + '\u2026';
};

const posts = readdirSync(BLOG).filter((f) => f.endsWith('.mdx')).map((f) => {
  const d = fm(readFileSync(join(BLOG, f), 'utf8'));
  return { id: f.replace(/\.mdx$/, ''), ...d };
});

const b = await chromium.launch(EXE ? { executablePath: EXE } : {});
const page = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });

const shoot = async (html, name) => {
  await page.setContent(html, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(220);
  await page.screenshot({ path: join(OUT, name) });
  console.log('  ' + name);
};

for (const p of posts) {
  const d = new Date(p.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  await shoot(card({
    kicker: p.tags.join(' · '),
    title: p.title,
    sub: trim(p.description, 152),
    fig: figure(PREVIEW[p.id]),
    left: 'Amartya Gaur',
    right: d
  }), p.id + '.png');
}

await shoot(card({
  kicker: 'Agent orchestration · Evals · Platform',
  title: 'Amartya Gaur',
  sub: 'I build the layer AI agents run on. Founder of hunr.ai; five years in Newfold Digital’s AI Center of Excellence.',
  fig: figure({ kind: 'pips', single: true, n: 10, a: 3,
    label: 'Ten pre-registered experiments. Seven came back negative.' }),
  left: 'amartyagaur.com',
  right: 'Bengaluru'
}), 'default.png');

await b.close();
writeFileSync(join(OUT, 'README.md'), 'Generated by scripts/og.mjs. Do not edit by hand.\n');
console.log('done');
