# Putting this on the internet

Short version: **Cloudflare Pages, on the free plan, with a domain from Cloudflare
Registrar.** Total running cost is the domain, about $10 a year, plus roughly half a
cent per question anyone asks the box. Everything else is free and stays free at the
traffic a personal site gets.

The reason it has to be Cloudflare rather than any of the others is `functions/api/ask.js`.
Everything else here is static and would run anywhere.

## 1. The domain

`astro.config.mjs` is set to `https://amartya-gaur.com`, which is the domain on the
account. Canonical tags, the sitemap, the RSS feed and the absolute OG image URLs all
derive from it, so it has to match the domain the site is actually served on.

| Registrar | .com, first year | .com, renewal | Notes |
|---|---|---|---|
| **Cloudflare Registrar** | $9.77 | $9.77 | At cost, no markup, WHOIS privacy included, no upsells. Requires the domain to use Cloudflare DNS, which it will anyway. |
| Porkbun | ~$9.70 | ~$11 | Good for odd TLDs. |
| Dynadot | $10.88 | $10.88 | Flat, no renewal jump. |
| Spaceship | ~$4.99 | $9.98 | Cheapest first year if the promo is running. |

Avoid anyone whose first year is $1 and whose renewal is $22. The renewal column is
the real price.

Two things worth knowing:

`.ai` runs $70 to $95 a year depending on registrar, with a two-year minimum. hunr.ai already
carries that cost and a second one for a personal site does not earn it back. `.in` is cheap if you
want a second domain pointing at the same site, usually ₹500 to ₹800 a year.

`amartya-gaur.com` is the one in use. `amartya.dev` and `amartyagaur.in` are the
next two that read as a person rather than a startup, if a second is ever wanted.

## 2. Cloudflare Pages

```bash
npm install
npx wrangler login
npm run deploy          # builds, then wrangler pages deploy dist
```

Or connect the GitHub repository in the Cloudflare dashboard, which is better because
it redeploys on push:

- Framework preset: **Astro**
- Build command: `npm run build`
- Output directory: `dist`
- Node version: 20 or newer

The `functions/` directory at the repository root is picked up automatically. Nothing
in it needs configuring.

What the free plan gives you, and none of it is close to being a constraint here:

| | Free plan |
|---|---|
| Static requests and bandwidth | Unlimited |
| Pages Functions requests | 100,000 a day, shared with Workers |
| Builds | 500 a month, 180 build minutes |
| Custom domain and TLS | Included |

## 3. The ask box

Environment variables go under **Settings → Environment variables** on the Pages
project. Set them for Production and Preview both, or the preview builds answer from
retrieval alone.

| Variable | Required | What it is |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | An **encrypted** variable. Without it the endpoint returns 501 and the box falls back to plain retrieval and says so on the page. |
| `ANTHROPIC_BASE_URL` | no | A gateway or proxy in front of the API. Accepted with or without the trailing `/v1`. Anything that is not an absolute http(s) URL is ignored and the real API is used, so a typo here degrades to normal rather than taking the box down. |
| `ASK_MODEL` | no | Defaults to `claude-haiku-4-5-20251001`. |
| `ASK_DAILY_PER_IP` | no | Defaults to 12. |
| `ASK_DAILY_TOTAL` | no | Defaults to 400. |

If the model call fails, the visitor sees one of three sentences depending on the
status — not configured (401/403), too many questions (429), or did not answer — and
the upstream status and body go to the worker log, which is where you look first.

**Bind a KV namespace called `ASK_KV`.** Settings → Functions → KV namespace
bindings. The rate limiter is the only thing standing between a bored visitor and
your card, and it is a no-op without this binding.

Free KV allows 1,000 writes a day. Each question costs two, so the 400-question
default cap runs into its own ceiling before KV's, which is the right way round.

### What it costs to run

Haiku 4.5 is $1 per million input tokens and $5 per million output. A question costs
roughly 7,000 input tokens across its rounds and about 500 output, so:

about one cent per question cold, and roughly half that inside a conversation, because the tools
and system prompt are cached and a follow-up asked within five minutes reads them at a tenth of
the price.

At the 400-a-day cap that is a $4 worst case, and a realistic month on a personal
site is a couple of dollars. If it ever starts mattering, drop `ASK_DAILY_TOTAL`.

### Running it locally

```bash
cp .dev.vars.example .dev.vars     # put a real key in it; .dev.vars is gitignored
npm run serve                      # http://localhost:8788
```

`npm run dev` is the Astro dev server and does **not** run Pages Functions, so the
box answers from the index there and reports that it is doing so. That is the same
path visitors get if the key is ever missing, so it is worth looking at.

## 4. The rest

Cloudflare Web Analytics is free, needs no cookie banner, and there is nothing to consent to. Turn
it on in the dashboard; do not add Google Analytics and then a banner apologising for it.

Point `www` at the apex with a bulk redirect rule. And if you ever want an address on the personal
domain as well as hunr's, Cloudflare Email Routing forwards it to a real inbox for free.

## If you would rather not use Cloudflare

Netlify and Vercel both have workable free tiers, and both would need
`functions/api/ask.js` ported to their handler signature. It is about twenty lines of
difference: a `Request` in, a streamed `Response` out, and the environment read from
`process.env` instead of the `env` argument.

GitHub Pages works too and costs nothing, but it is static only, so the ask box would
permanently be in its retrieval fallback. That is a real option if you decide the
model is not worth the bother, and the page already says the right thing when it
happens.
