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

Project configuration lives in `wrangler.jsonc`, not in the dashboard: the project
name, the build output directory, the compatibility date and the `ASK_KV` binding
are all declared there, so `wrangler pages dev` and `wrangler pages deploy` run the
same configuration and a missing binding shows up in a diff.

```bash
npm install
npx wrangler login
npm run deploy          # build, gate, then wrangler pages deploy
```

The `functions/` directory at the repository root is picked up automatically.

### CI/CD

`.github/workflows/deploy.yml` builds, runs the HTML gate, and deploys. A push to
`main` goes to production; a pull request gets its own preview deployment on a
branch alias. Two repository secrets are required:

| Secret | Where it comes from |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare dashboard → My Profile → API Tokens → Create Token. Permissions: **Account · Cloudflare Pages · Edit**. Nothing else. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → the account ID in the right-hand sidebar. |

Without them the workflow still builds and gates, and says so, so a fork's pull
request is checked rather than failed.

The alternative is the dashboard's Git integration, which redeploys on push with no
token in GitHub at all. It is fine, and the reason this repository does not use it is
that the build then happens somewhere the gate's exit code is harder to see.

### The gate

`npm run build` is `astro build` followed by `scripts/check-html.mjs`, which fails on
defects that exist only in the rendered output: a word fused to an inline link, an
HTML entity printed rather than rendered, an absolute URL pointing at a domain this
site is not served on, a page with no title. Every one of those has shipped here at
least once, and none of them are visible in a diff.

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
| `ANTHROPIC_API_KEY` | yes | An **encrypted** variable. Without it the endpoint returns 501 and the box falls back to plain retrieval and says so on the page. Never put this in `wrangler.jsonc` — that file is committed. |
| `ANTHROPIC_BASE_URL` | no | A gateway or proxy in front of the API. Accepted with or without the trailing `/v1`. Anything that is not an absolute http(s) URL is ignored and the real API is used, so a typo here degrades to normal rather than taking the box down. |
| `ASK_MODEL` | no | Defaults to `claude-haiku-4-5-20251001`. |
| `ASK_DAILY_PER_IP` | no | Defaults to 12. |
| `ASK_DAILY_TOTAL` | no | Defaults to 250. |

If the model call fails, the visitor sees one of three sentences depending on the
status — not configured (401/403), too many questions (429), or did not answer — and
the upstream status and body go to the worker log, which is where you look first.

**The `ASK_KV` binding is already declared** in `wrangler.jsonc`, pointing at the
namespace `amartya-portfolio-ask-kv` (`2a64302963724a8c96222c80c2e5841b`). Nothing to
click. The rate limiter is the only thing standing between a bored visitor and your
card, and it is a no-op without that binding, which is why it lives in the repository
where its absence would be visible.

Free KV allows 1,000 writes a day. Each question costs two, so the 400-question
default cap runs into its own ceiling before KV's, which is the right way round.

### The spending guards

The daily cap counts requests. That is only a spending control if a request has a
bounded size, and for a while it did not: the browser sends the index and the
passages it scored highest, and both went into the prompt uncapped. A payload sitting
just under the model's context window made one request worth about a dollar, which
made the 400-request cap worth about four hundred rather than the four this file used
to claim.

Everything the client controls is now clamped at the boundary of `onRequestPost`, and
`scripts/test-ask-guards.mjs` exercises each clamp against a hostile payload in CI:

| Guard | Limit | Real page sends |
|---|---|---|
| Request body | 96 KB | 17 KB |
| Index entries | 200 | 43 |
| Passage text | 2,500 chars | 627 longest |
| Title / id | 160 / 80 chars | 56 / 49 |
| Assembled prompt | 48 KB | 13.8 KB |

Three more things it does, none of which are visible from reading the happy path:

- **The limiter fails closed.** It used to return "allowed" when the `ASK_KV` binding
  was missing, so the single configuration mistake that removes the spending cap also
  removed every sign that a cap had ever existed. Now the box declines to answer.
- **Same-origin only.** A browser always sends `Origin` on a POST, and on Pages the
  function shares a host with the page, so same-host covers production, every preview
  alias and localhost without naming any of them. Forgeable by hand, and still enough
  to remove every drive-by script that sets no headers.
- **Body size is checked twice**, once against `Content-Length` and once against what
  actually arrived, because the header is a claim rather than a fact.

### What it costs to run

Haiku 4.5 is $1 per million input tokens and $5 per million output. A real question is
roughly 7,000 input tokens across its rounds and about 500 output — about a cent, and
half that on a follow-up, because the tools and system prompt are cached and a second
question within five minutes reads them at a tenth of the price.

With the prompt bounded at 48 KB, the most expensive question anyone can construct is
about eight times a normal one. So the 250-a-day cap is worth roughly **$16 on the
worst imaginable day and about $2 on a real one**. If that ever stops feeling
comfortable, `ASK_DAILY_TOTAL` is the dial.

### Stopping it at the edge

The guards above bound the bill. They do not stop a bot from spending the day's
allowance in ninety seconds and leaving nothing for anyone reading the page, because
every blocked request has still travelled through KV to be refused. Two free things
fix that, and both are dashboard-only — there is no API for either in Wrangler or the
Cloudflare MCP connector:

1. **A rate limiting rule** (Security → WAF → Rate limiting rules; the free plan
   allows one). Match `http.request.uri.path eq "/api/ask"`, characteristic **IP**,
   **10 requests per 1 minute**, action **Block**, duration 1 minute. This refuses the
   flood at the edge before it reaches the Function, so the daily allowance stays for
   people. Ten a minute is far above anything a reader does and far below anything a
   script does.
2. **Bot Fight Mode** (Security → Bots). One toggle, free, challenges the obvious
   automated traffic across the whole zone.

If it is ever actually attacked rather than theoretically attackable, the next step is
[Turnstile](https://developers.cloudflare.com/turnstile/) on the ask form — a token
minted in the browser and verified in the Function before the model is called. It is
free and invisible in managed mode, and it is deliberately not here yet, because it is
a real change to a working form and the caps already bound the money.

### Running it locally

```bash
cp .dev.vars.example .dev.vars     # put a real key in it; .dev.vars is gitignored
npm run serve                      # http://localhost:8788
```

`npm run serve` needs wrangler 4.124 or newer — the compatibility date in
`wrangler.jsonc` is ahead of what older workerd binaries will start on, and the error
when it is not is about the runtime rather than about the date.

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
