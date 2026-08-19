# amartya-portfolio

Personal site for Amartya Gaur, founder of [hunr.ai](https://hunr.ai) and an AI systems engineer.
Astro, static output, four pages plus a blog, no CMS and no client framework.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
```

## The idea

A résumé is a claim. A proof is a different thing, and proving things is what hunr does, so the
page alternates between the two.

- **Light sections carry the claims.** Who, what, the record. Paper ground, Archivo set extra-wide,
  Newsreader for prose.
- **Black chambers carry the proof.** Three demos you can operate, each one embedded again inside
  the post that argues for it.

The only two accents in the whole system are the two verdicts a test can return: `--pass` and
`--fail`. Nothing else gets a colour.

## What's in it

| Piece | File | What it does |
|---|---|---|
| Hero | `src/components/Hero.astro` | A static SVG of the 739-case regression suite, about 4% of it red. No canvas, no runtime cost. |
| Sticky routing | `src/components/Router.astro` | Two support routers side by side. Type at them; the stateless one loses the thread on an ambiguous fragment and the sticky one does not. |
| The gate | `src/components/Gate.astro` | The hunr mechanic. Runs a reference and a naive solution against a hidden suite and reports whether the challenge may publish. Tick *weaken the suite* to watch it get blocked. |
| Refusal | `src/components/Refuse.astro` | An analytics agent that declines to sum incomparable units, and says why. |
| Ask | `src/components/Ask.astro` | Answers questions about the site from an index built at compile time. See below. |
| Film | `src/components/Film.astro` | A video plate with a poster and a real play control. Native controls appear only after the first click. |
| Blog | `src/content/blog/*.md(x)` | Content collection, RSS at `/rss.xml`, sitemap on build. Posts may embed the demo components directly. |

## Editing

**Posts.** Drop a Markdown or MDX file in `src/content/blog/` with `title`, `description`, `date`
and `tags`. It appears on `/blog`, on the home page (newest three) and in the feed. An `.mdx` file
can `import` any component in `src/components/` and place it mid-argument.

**Projects.** `src/data/projects.js`. One object per row:

```js
{ g: 'agents', s: 'Live', n: 'name', h: 'one line', w: 'where', y: 'when', href: '…', d: 'the detail' }
```

`g` is the filter group (`agents`, `infra`, `merged`). `s` is the status chip, printed verbatim, and
it is the honesty mechanism: `Prototype` and `Unpublished research` are load-bearing.

**Trace spans.** `src/pages/index.astro`. Each span carries its place on the axis:

```html
<li class="span" style="--s:.1786;--e:.947">
```

`--s` and `--e` are fractions of an axis running January 2020 (`0`) to January 2027 (`1`), so one
year is `.1429`. Add `live` for ongoing, `side` for anything part-time (hollow bar).

**Gate tests.** The `TESTS` array at the top of `src/components/Gate.astro`. `ref` and `naive` are
what each solution scores; `weak` marks the cases that survive when the suite is weakened.

**Personal media.** Drop files in `public/media/personal/` and they appear on `/about`. See the
README in that folder. `public/media/` itself is work footage referenced explicitly by a post.

## Deploying

Cloudflare Pages, free plan, with the ask box wired to a Pages Function. Domain
options, environment variables, rate limiting and what a question costs are all in
[DEPLOY.md](DEPLOY.md).

```bash
npm run serve    # build and serve with the function attached, needs .dev.vars
npm run deploy   # build and push to Cloudflare Pages
```

Set `site` in `astro.config.mjs` to the real domain before the first deploy: the
canonical tags, sitemap and RSS links all derive from it.
