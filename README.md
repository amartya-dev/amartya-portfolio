# amartya-portfolio

Personal site for Amartya Gaur — AI systems engineer, founder of hunr.ai.
Static HTML, CSS, and one script. No build step, no dependencies.

## Run it

```bash
python3 -m http.server 4321
```

Then open http://localhost:4321.

## Files

```
index.html         all content, hand-edited
assets/styles.css  design tokens at the top, then sections in source order
assets/main.js     cold-start overlay, orchestrator canvas, scroll reveals, trace rows
```

## The design

The page is built as an orchestration console, because that is the work.

- **Hero** — a canvas rendering of an agent orchestration graph: requests enter, get classified,
  route through a workflow registry or a tool call, hit a verification step with a repair loop, and
  resolve. Pulses travel real routes; nodes light up as they are hit; the cursor warms nearby nodes.
- **Trace** — the career as a span waterfall on a real time axis, so overlapping roles read as
  overlapping spans. Solid bars are full-time, hollow bars ran alongside one.
- **Cold start** — a short boot sequence on first visit each session, skipped on repeat visits and
  whenever the visitor prefers reduced motion.

## Editing content

Everything lives in `index.html`.

**Trace spans** carry their position on the time axis in two custom properties:

```html
<li class="span" style="--s:.1667;--e:.6667">
```

`--s` and `--e` are fractions of the axis, which runs from January 2021 (`0`) to January 2027 (`1`) —
six years, so one year is `.1667`. To change the range, edit the `<span>` labels inside `.axis` and
recompute the fractions. Add `span-live` for something ongoing, `span-side` for anything that ran
alongside a full-time role (renders as a hollow bar).

**Metrics** count up from zero when scrolled into view. The target is an attribute, not the text:

```html
<span class="display fig" data-count="1000" data-format="comma">0</span>
```

**Graph nodes** are the `NODES` array in `assets/main.js`. Each has an `x`/`y` for wide screens and an
`sx`/`sy` for narrow ones. `EDGES` connects them by id, and `ROUTES` lists the paths pulses travel.

## Deploying

Any static host works, since there is nothing to build.

- **GitHub Pages** — push, then Settings → Pages → deploy from `main`, root.
- **Vercel / Netlify / Cloudflare Pages** — import the repo, no build command, output directory `.`.
