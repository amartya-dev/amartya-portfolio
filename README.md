# amartya-portfolio

Personal site for Amartya Gaur — founder of [hunr.ai](https://hunr.ai), AI systems engineer.
Astro, three static pages plus a blog, two WebGL scenes, no CMS.

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/
```

## The idea

A résumé is a claim. A proof is a different thing, and proving things is what hunr does — so the
page alternates between the two.

- **Light sections carry the claims** — who, what, the record. Paper ground, Archivo set extra-wide,
  Newsreader for prose.
- **Black chambers carry the proof** — the hero eval swarm, the gate you can run yourself, the
  orchestrator in 3D.

The only two accents in the whole system are the two verdicts a test can return: `--pass` and
`--fail`. Nothing else gets a colour.

## What's in it

| Piece | File | What it does |
|---|---|---|
| Eval swarm | `src/scripts/swarm.js` | 739 instanced cubes — the real size of the regression suite. A sweep resolves them; ~4% fail, get repaired, and pass. The readout counts along. |
| The gate | `src/components/Gate.astro` | The hunr mechanic, playable. Runs a reference and a naive solution against a hidden suite and reports whether the challenge publishes. Tick *weaken the suite* to watch it get blocked. |
| Orchestrator | `src/scripts/graph3d.js` | The state machine in space. Drag to look around; the bright travellers are conversations. |
| Blog | `src/content/blog/*.md` | Content collection, RSS at `/rss.xml`, sitemap on build. |

Both WebGL scenes probe their own frame rate for the first 1.4 seconds and drop bloom plus pixel
ratio if they can't hold 26fps. Both stop rendering when off-screen or when the tab is hidden, and
both render a single static frame under `prefers-reduced-motion`.

## Editing

**Posts** — drop a Markdown file in `src/content/blog/` with `title`, `description`, `date`, `tags`.
It appears on `/blog`, on the home page (newest three), and in the feed.

**Trace spans** — `src/pages/index.astro`. Each span carries its place on the axis:

```html
<li class="span" style="--s:.1667;--e:.6667">
```

`--s` and `--e` are fractions of an axis running January 2021 (`0`) to January 2027 (`1`), so one
year is `.1667`. Add `live` for ongoing, `side` for anything part-time (hollow bar).

**Gate tests** — the `TESTS` array at the top of `src/components/Gate.astro`. `ref` and `naive` are
what each solution scores; `weak` marks the cases that survive when the suite is weakened.

**Graph** — `NODES`, `EDGES`, and `ROUTES` at the top of `src/scripts/graph3d.js`.

## Deploying

Static output, so anything works. Set `site` in `astro.config.mjs` to the real domain first — the
canonical tags, sitemap, and RSS links all derive from it.

- **Vercel / Netlify / Cloudflare Pages** — import the repo. Build `npm run build`, output `dist`.
- **GitHub Pages** — build and publish `dist/`.
