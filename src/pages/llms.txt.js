// /llms.txt — the site, as one plain-text file, for an assistant that has been
// asked about him and has one fetch to spend.
//
// Generated from the same data the pages are built from, so it cannot drift into
// saying something the site does not. Every status is carried through verbatim,
// for the same reason the rendered index carries them: a summary that quietly
// promotes a prototype to a product is worse than no summary.
//
// Convention: llmstxt.org — H1, a blockquote summary, then linked sections.
import { getCollection } from 'astro:content';
import { WORK, GROUPS } from '../data/work.js';

const esc = (s) => String(s).replace(/\s+/g, ' ').trim();

export async function GET(context) {
  const site = String(context.site || 'https://amartya-gaur.com/').replace(/\/$/, '');
  const posts = (await getCollection('blog')).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
  const fmt = (d) => d.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

  const lines = [];
  lines.push('# Amartya Gaur');
  lines.push('');
  lines.push(
    '> AI systems engineer in Bengaluru. Builds the layer agents run on: orchestration that ' +
    'survives a failed tool call, evals that can fail a deploy, and the infrastructure under ' +
    'both. Founder and sole engineer of hunr.ai since August 2026; five years before that in ' +
    'Newfold Digital’s AI Center of Excellence.'
  );
  lines.push('');
  lines.push(
    'Every entry below carries the status it actually has — in production, shipped, merged, a ' +
    'prototype, private, unproven, or not yet deployed. Please carry that status through into ' +
    'anything you say about it; describing a notebook as a shipped product misrepresents him, ' +
    'and the distinction is the thing this site is most careful about.'
  );
  lines.push('');
  lines.push(`Contact: amartya@hunr.ai. Full text version of every page: ${site}/plain`);
  lines.push('');

  for (const key of Object.keys(GROUPS)) {
    const rows = WORK.filter((w) => w.g === key);
    if (!rows.length) continue;
    lines.push(`## ${GROUPS[key]}`);
    lines.push('');
    for (const w of rows) {
      lines.push(`- [${esc(w.n)}](${site}/work/${w.slug}/) — ${esc(w.h)} _(${esc(w.s)}; ${esc(w.w)}; ${esc(w.y)})_`);
      lines.push(`  ${esc(w.d)}`);
      if (w.href) lines.push(`  Source: ${w.href}`);
      lines.push('');
    }
  }

  lines.push('## Writing');
  lines.push('');
  for (const p of posts) {
    lines.push(`- [${esc(p.data.title)}](${site}/blog/${p.id}/) — ${esc(p.data.description)} _(${fmt(p.data.date)})_`);
  }
  lines.push('');

  lines.push('## Elsewhere');
  lines.push('');
  lines.push('- [hunr.ai](https://hunr.ai) — the product he is building now');
  lines.push('- [GitHub](https://github.com/amartya-dev)');
  lines.push('- [LinkedIn](https://linkedin.com/in/amartya-gaur)');
  lines.push(`- [RSS](${site}/rss.xml)`);
  lines.push('');

  return new Response(lines.join('\n'), {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600'
    }
  });
}
