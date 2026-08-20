// The spending guards on functions/api/ask.js, exercised against the real
// handler with hostile payloads. Runs in CI. No network: every case here is
// rejected before any model call, which is the whole property under test.
//
// This exists because the guards it covers were absent, and their absence was
// not visible from reading the handler. The daily cap counted requests while the
// browser decided how large each request was, so a payload sitting just under
// the model's context window made one request worth about a dollar and the
// 400-request cap worth about four hundred, against the four dollars the docs
// advertised. Caps that have never been tested are comments.
import { onRequestPost } from '../functions/api/ask.js';

const store = new Map();
const KV = { get: async (k) => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); } };
// Unroutable on purpose: a request that passes every guard then fails its model
// call instantly, and nothing leaves the machine running this.
const ENV = { ANTHROPIC_API_KEY: 'sk-ant-test', ASK_KV: KV, ANTHROPIC_BASE_URL: 'http://127.0.0.1:1' };
const ORIGIN = 'https://amartya-gaur.com';

const req = (body, { origin = ORIGIN, headers = {} } = {}) =>
  new Request(`${ORIGIN}/api/ask`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(origin ? { origin } : {}), ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  });

const ask = () => ({
  turns: [{ role: 'user', content: 'what has he shipped?' }],
  index: [{ id: 'p1', t: 'A project', a: 'x'.repeat(500), u: '/x' }],
  seed: ['p1']
});

let failures = 0;
const check = (ok, name, detail) => {
  if (!ok) failures++;
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${name.padEnd(24)} ${detail}`);
};

const status = async (name, request, want, env = ENV) => {
  const res = await onRequestPost({ request, env });
  check(res.status === want, name, `${res.status} (want ${want})`);
};

// Refused at the door.
await status('cross-origin POST', req(ask(), { origin: 'https://evil.example' }), 403);
await status('no Origin header', req(ask(), { origin: null }), 403);
await status('declared body 9 MB', req(ask(), { headers: { 'content-length': String(9e6) } }), 413);
await status('actual body 200 KB', req({ ...ask(), pad: 'x'.repeat(200_000) }), 413);
await status('malformed JSON', req('{not json'), 400);
await status('no question', req({ turns: [], index: [], seed: [] }), 400);

// A body that fits the byte cap but would still blow up the prompt. This is the
// per-field clamp and the prompt budget, not the body cap.
await status(
  'fat passages under cap',
  req({ ...ask(), index: Array.from({ length: 300 }, (_, i) => ({ id: `p${i}`, t: 'T', a: 'A'.repeat(400), u: '/x' })) }),
  413
);

// Many tiny entries: deliberately sized to slip under the body cap, so that what
// bounds the catalogue here is the index clamp and nothing else. 1,200 in, at
// most MAX_INDEX reach the prompt.
{
  const many = { ...ask(), index: Array.from({ length: 1200 }, (_, i) => ({ id: `p${i}`, t: 'T', a: 'a', u: '/x' })) };
  const res = await onRequestPost({ request: req(many), env: ENV });
  check(res.status === 200, '1,200 tiny entries', `trimmed and accepted (${res.status})`);
}

// Fail closed: no limiter, no answer.
{
  const res = await onRequestPost({ request: req(ask()), env: { ANTHROPIC_API_KEY: 'k' } });
  const closed = (await res.text()).includes('not answering');
  check(closed, 'no KV binding', 'refuses rather than answering unmetered');
}

// The caps stop where they say they stop.
const countAllowed = async (env, blockedPhrase) => {
  store.clear();
  let allowed = 0;
  for (let i = 0; i < 25; i++) {
    const res = await onRequestPost({ request: req(ask()), env });
    if ((await res.text()).includes(blockedPhrase)) break;
    allowed++;
  }
  return allowed;
};

{
  const n = await countAllowed({ ...ENV, ASK_DAILY_PER_IP: '5', ASK_DAILY_TOTAL: '999' }, 'used today');
  check(n === 5, 'per-IP cap of 5', `allowed ${n}, then blocked`);
}
{
  const n = await countAllowed({ ...ENV, ASK_DAILY_PER_IP: '999', ASK_DAILY_TOTAL: '3' }, 'allowance for today');
  check(n === 3, 'global cap of 3', `allowed ${n}, then blocked`);
}

if (failures) {
  console.error(`\n${failures} guard${failures > 1 ? 's' : ''} not holding.`);
  process.exit(1);
}
console.log('\nask guards: all holding');
