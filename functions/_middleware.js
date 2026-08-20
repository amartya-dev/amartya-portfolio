// One canonical host, enforced at the edge.
//
// Rate limiting rules are scoped to a zone. amartya-gaur.com is in the account's
// zone and amartya-portfolio.pages.dev is not, so the rule protecting /api/ask
// simply does not exist on the pages.dev hostname: three POSTs there and a fourth
// went straight through, where on the custom domain the fourth was a 429.
// Anyone who finds the pages.dev alias skips the edge protection entirely.
//
// The in-code caps still apply there — the limiter fails closed, the daily budget
// is shared, the prompt is bounded — so the bill was never at risk. What was at
// risk is the burst protection, which is the part that keeps the day's allowance
// available to people rather than letting a script drain it in a minute.
//
// So the production alias redirects to the canonical host and the problem stops
// existing. 308 rather than 301 because it preserves the method and body: a POST
// re-POSTs to the canonical host, where the rule applies, instead of silently
// becoming a GET.
//
// Preview deployments keep working. Those are <hash>.amartya-portfolio.pages.dev
// and <branch>.amartya-portfolio.pages.dev, and redirecting them would defeat the
// point of having them. Only the bare production alias is matched, so localhost
// under `wrangler pages dev` is untouched too.
const CANONICAL = 'amartya-gaur.com';
const PRODUCTION_ALIAS = 'amartya-portfolio.pages.dev';

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (url.hostname === PRODUCTION_ALIAS) {
    url.hostname = CANONICAL;
    url.protocol = 'https:';
    url.port = '';
    return new Response(null, {
      status: 308,
      headers: {
        location: url.toString(),
        'cache-control': 'public, max-age=3600'
      }
    });
  }

  return context.next();
}
