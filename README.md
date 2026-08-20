# amartya-portfolio

Personal site for Amartya Gaur, founder of [hunr.ai](https://hunr.ai) and an AI systems engineer.
Astro, static output, one Cloudflare Pages Function, no CMS and no client framework.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/, then the HTML gate
npm test         # the spending guards on the ask endpoint
```

Live at [amartya-gaur.com](https://amartya-gaur.com).

## The idea

A résumé is a claim. A proof is a different thing.

The site is set as a monograph: a printed document about a body of work rather than a landing page
for a person. Warm paper ground, a warm near-black ink, and one oxblood accent that is also the
failure colour — on a site arguing *measure it, don't claim it*, the colour that means attention and
the colour that means this-did-not-pass ought to be the same colour.

Three faces, three jobs, no overlap. **Newsreader** says things: every heading, every essay, every
standfirst. **Instrument Sans** labels them: navigation, index rows, metadata. **IBM Plex Mono**
holds data and nothing else — if it is a sentence you read it is one of the first two, if it is a
number you check it is the third.

Structure comes from a margin rail, the way a scholarly book gets it. Every band is a `.spread`: a
narrow left column carrying the section number, its label and any marginal note, and a wide right
column carrying the content. The rail is the constant, so no two content columns have to be the same
shape — which is what stops six sections in a row reading as one section repeated six times.

Dark is not a theme here, it is a voice. Paper is the record *about* the work. Ink-black is the work
speaking for itself: the opening statement, the closing statement, and the chambers where a machine
is actually running. Those are the only three places it appears, and never two in a row.

## What's in it

The home page is a contents page — masthead, the spans, the index, three notes, an address. Each of
the 24 index entries has its own page at `/work/<slug>/`, and the five interactive pieces live on the
page of the thing each is evidence for rather than competing on the front page.

| Piece | File | What it does |
|---|---|---|
| Index | `src/components/Index.astro` | Every entry as a catalogue line: number, name, and the sentence saying what it is, all on one reading line, with provenance underneath. |
| Spans | `src/components/Spans.astro` | Five overlapping roles on one axis, because a list of job titles hides which ran at the same time. |
| Sticky routing | `src/components/Router.astro` | Two support routers side by side. Type at them; the stateless one loses the thread on an ambiguous fragment and the sticky one does not. |
| The gate | `src/components/Gate.astro` | The hunr mechanic. Runs a reference and a naive solution against a hidden suite and reports whether the challenge may publish. Tick *weaken the suite* to watch it get blocked. |
| Refusal | `src/components/Refuse.astro` | An analytics agent that declines to sum incomparable units, and says why. |
| Report | `src/components/Report.astro` | A real finished hunr report with leaders struck to three decisions in it. |
| Ask | `src/components/Ask.astro` | `/ask` — answers questions about the site from an index built at compile time, citing every passage. See below. |
| Blog | `src/content/blog/*.mdx` | Content collection, RSS at `/rss.xml`, sitemap on build. Posts may embed the demo components mid-argument. |

## The ask box

`functions/api/ask.js` is a Pages Function. The model gets a catalogue of everything the site holds,
the passages the browser scored highest, and five tools. Prose it cannot source is rejected and asked
again in front of you; chart numbers come from series the page counts rather than from the model.

It is told to make the case from the record and told exactly how far it may go. It answers
*is he good at X* with what he built, because refusing that is the worst thing it can do — nobody
rephrases for a search box. It may not describe anything as shipped or in production unless that
entry's status says so, may not invent narrative colour, may not editorialise about him, and may not
let *built from zero* attach to a company when the passage gives him a component of it.

Without `ANTHROPIC_API_KEY` it returns 501 and the page falls back to plain retrieval and says so.

## Gates

Two checks run in CI, and both can fail a build. An eval nobody can block a release with is a
dashboard, and it would be a poor advertisement for this site if its own checks were advisory.

**`scripts/check-html.mjs`** runs inside `npm run build`, against the rendered output. It fails on a
word fused to an inline link, an HTML entity printed instead of rendered, an absolute URL naming a
domain the site is not served on, and a page with no title. All four shipped here at least once and
none are visible in a diff.

**`scripts/test-ask-guards.mjs`** (`npm test`) fires hostile payloads at the real handler with no
network. The daily cap counts requests, which is only a spending control if a request has a bounded
size, so every field the client controls is clamped at the boundary and each clamp is asserted here.

## Editing

**Posts.** A Markdown or MDX file in `src/content/blog/` with `title`, `description`, `date` and
`tags`. It appears on `/blog`, on the home page (newest three), in the feed and in `/llms.txt`.

**Projects.** `src/data/projects.js`, one object per row:

```js
{ g: 'agents', s: 'Live', n: 'name', h: 'one line', w: 'where', y: 'when', href: '…', d: 'the detail' }
```

`g` is the group (`agents`, `infra`, `teaching`, `merged`) and must exist in **both** `src/data/work.js`
and `src/data/ask.js`. `s` is the status, printed verbatim on the page and carried into `/llms.txt`
and the ask box's prompt — it is the honesty mechanism, and `Prototype` and `Unpublished` are
load-bearing. Routing (`slug`, `demo`, related `posts`) lives in `src/data/work.js`, keyed by name, so
the prose in `projects.js` never has to be edited to add it.

**Spans.** `src/components/Spans.astro`. `s` and `e` are fractions of an axis running January 2020
(`0`) to January 2027 (`1`), so one year is `.1429`. `k` is `now`, `main` or `side`.

**Gate tests.** The `TESTS` array at the top of `src/components/Gate.astro`.

**Personal media.** Files in `public/media/personal/` appear on `/about`.

**OG cards.** `node scripts/og.mjs` re-renders `public/og/*.png` in a real browser against the real
webfonts. Needs `playwright-core` and a Chromium — see the notes at the top of that file.

## For machines

`/robots.txt` allows everything except `/api/`, names the search and AI agents explicitly, and sets
content signals deliberately: `search=yes, ai-input=yes, ai-train=yes`. `/llms.txt` is generated from
the same data the pages are, so it cannot drift — every entry with its real status, every post, one
fetch. `/plain` is a full text-only version of the site.

## Deploying

Cloudflare Pages, free plan. Project configuration is in `wrangler.jsonc` rather than the dashboard:
name, build output, compatibility date and the `ASK_KV` binding for the rate limiter. Environment
variables, the spending guards, edge protection and what a question costs are all in
[deploying.md](deploying.md).

```bash
npm run serve    # build and serve with the function attached, needs .dev.vars
npm run ci       # guards, then build and gate — what CI runs
npm run deploy   # build, gate and push to Cloudflare Pages
```

`site` in `astro.config.mjs` must match the domain the site is served on: canonicals, the sitemap,
RSS and the absolute OG image URLs all derive from it, and `check-html.mjs` fails the build if they
disagree.
