// Cloudflare Pages Function. The agent behind the ask box on the home page.
//
// The shape is the argument. The model is given a catalogue of everything the site
// holds, the handful of passages the browser scored highest for the question, and
// five tools. It can pull more passages when it decides it needs them, and it can
// draw. What it cannot do is reach the visitor any other way: prose arrives through
// a tool that demands the ids it used, and an answer citing something it was never
// given is rejected and asked again, live, in front of you. Chart numbers come from
// series this page computes, or from points that each name their passage.
//
// A prompt asking a model to be truthful is a request. A tool that will not carry an
// uncited number is not.
//
// Environment (Pages project settings, or .dev.vars locally):
//   ANTHROPIC_API_KEY   required. Without it this returns 501 and the page falls
//                       back to plain retrieval and says so.
//   ANTHROPIC_BASE_URL  optional. Points the call at a gateway or proxy instead of
//                       api.anthropic.com. With or without a trailing /v1.
//   ASK_MODEL           optional, defaults to claude-haiku-4-5-20251001
//   ASK_KV              a KV namespace. Bind it. Without it there is no rate limit
//                       and a bored visitor can spend real money on your behalf.
//   ASK_DAILY_PER_IP    optional, defaults to 12
//   ASK_DAILY_TOTAL     optional, defaults to 400

const MAX_Q = 400;
const MAX_TURNS = 12;
const MAX_ROUNDS = 5;
const SEED_PASSAGES = 6;

const TOOLS = [
  {
    name: 'answer',
    description:
      'Say something to the visitor. This is the only way words reach them. Every claim must be ' +
      'supported by a passage you have actually been given, and you must list the ids you used.',
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description:
            'Two to five sentences about Amartya, third person, plain and specific. No preamble, no ' +
            '"based on the passages", no offer to help further. Write it as a person would say it.'
        },
        sources: {
          type: 'array',
          items: { type: 'string' },
          description: 'Ids of the passages this rests on. At least one, and only ids you were given.'
        },
        follow_up: {
          type: 'array',
          maxItems: 3,
          items: { type: 'string' },
          description:
            'Up to three short questions a curious visitor would ask next, that this index can actually ' +
            'answer. Phrase them as the visitor would type them. Omit if nothing obvious follows.'
        }
      },
      required: ['text', 'sources']
    }
  },
  {
    name: 'fetch_passages',
    description:
      'Pull the full text of passages from the catalogue. The browser only sent you what it scored ' +
      'highest, which is often not what the question actually needs. Use this whenever a catalogue ' +
      'title looks more relevant than what you were handed, or when a comparison needs a second entry.',
    input_schema: {
      type: 'object',
      properties: {
        ids: { type: 'array', maxItems: 6, items: { type: 'string' }, description: 'Catalogue ids to open.' },
        why: { type: 'string', description: 'Five words on what you are looking for. Shown to the visitor.' }
      },
      required: ['ids']
    }
  },
  {
    name: 'chart_preset',
    description:
      'Draw one of the three series the page computes for itself. These are always available and are ' +
      'counted rather than recalled, so prefer them over describing the same thing in prose.',
    input_schema: {
      type: 'object',
      properties: {
        series: {
          type: 'string',
          enum: ['roles_timeline', 'projects_by_area', 'projects_by_status'],
          description:
            'roles_timeline: five spans on a 2020 to 2027 axis, showing which overlapped. ' +
            'projects_by_area: the split across agent systems, infrastructure and upstream work. ' +
            'projects_by_status: how many are shipped or merged, built but unproven, or private.'
        },
        title: { type: 'string', description: 'One short line above the chart. Sentence case, no full stop.' }
      },
      required: ['series', 'title']
    }
  },
  {
    name: 'chart',
    description:
      'Compose a chart the presets do not cover, when the passages carry comparable numbers. Every point ' +
      'names the passage its number appears in. Points naming a passage you have not opened are dropped ' +
      'before the chart is drawn, so open it first rather than guessing.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'One short line above the chart. Sentence case, no full stop.' },
        unit: { type: 'string', description: 'What the values count: "lines", "cases", "accounts", "stars".' },
        points: {
          type: 'array',
          maxItems: 8,
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'number' },
              source: { type: 'string', description: 'Id of the passage this number appears in.' }
            },
            required: ['label', 'value', 'source']
          }
        }
      },
      required: ['title', 'unit', 'points']
    }
  },
  {
    name: 'decline',
    description:
      'Say plainly that the site does not hold this. Correct for pay expectations, private contact ' +
      'details, opinions he has not published, anything about his personal life, and anything else ' +
      'the passages do not carry. Declining is the right answer, not a failure.',
    input_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'One or two sentences on what is missing. Do not apologise, do not speculate about what ' +
            'the answer might be, and do not pad it with what you could answer instead.'
        },
        follow_up: {
          type: 'array',
          maxItems: 3,
          items: { type: 'string' },
          description: 'Up to three questions the index can answer, offered instead.'
        }
      },
      required: ['reason']
    }
  }
];

const SYSTEM = (catalogue) => `You are the ask box on Amartya Gaur's personal site. A visitor types questions about him and you answer them.

What you know is the index below and nothing else. There is no general knowledge available to you here: if a fact is not in a passage you have opened, you do not have it, however reasonable a guess would be. The three chart_preset series are the exception, because the page counts them itself and they are always available.

CATALOGUE
Every entry in the index, as id and title. The browser has already opened the ones it scored highest for the question and put them in the user message. Anything else here you can open with fetch_passages.
${catalogue}

Work only through tools. Anything you write outside a tool call is discarded unread.

How to work:
- Read what you were handed. If a catalogue title looks like a better fit than what arrived, open it before answering. Two or three opens is normal for a good answer; one is normal for an easy one.
- Reach for chart_preset when the question is about the shape of his career or the makeup of his work. A picture of the overlap answers "how long has he been doing this" better than a sentence.
- Reach for chart when the passages you have opened carry numbers worth putting side by side.
- Always finish with answer or decline. A chart on its own is not a reply.
- On a follow-up question, use what is already in this conversation rather than re-opening the same passages.

Voice: third person, present tense, plain, specific over impressive. He is an engineer who dislikes overstatement and half the point of this box is that it will not overstate on his behalf. Where a passage says something is unpublished, a prototype, private or not yet deployed, say that rather than rounding it up. Never invent a number, a date, a client name or an employer. Two to five sentences is right; nobody wants a briefing.`;

const enc = new TextEncoder();
const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

// Pull the growing value of "text" out of a half-arrived JSON object, so the
// answer types itself rather than appearing all at once.
function partialText(buf) {
  const m = buf.match(/"text"\s*:\s*"/);
  if (!m) return '';
  let out = '';
  for (let i = m.index + m[0].length; i < buf.length; i++) {
    const c = buf[i];
    if (c === '"') break;
    if (c !== '\\') { out += c; continue; }
    const n = buf[i + 1];
    if (n === undefined) break;
    if (n === 'u') {
      const hex = buf.slice(i + 2, i + 6);
      if (hex.length < 4) break;
      out += String.fromCharCode(parseInt(hex, 16));
      i += 5;
    } else {
      out += { n: '\n', t: '\t', r: '\r', b: '', f: '' }[n] ?? n;
      i += 1;
    }
  }
  return out;
}

async function limited(env, ip) {
  if (!env.ASK_KV) return null;
  const day = new Date().toISOString().slice(0, 10);
  const perIp = Number(env.ASK_DAILY_PER_IP || 12);
  const total = Number(env.ASK_DAILY_TOTAL || 400);
  const kIp = `ip:${day}:${ip}`;
  const kAll = `all:${day}`;
  const [a, b] = await Promise.all([env.ASK_KV.get(kIp), env.ASK_KV.get(kAll)]);
  const nIp = Number(a || 0);
  const nAll = Number(b || 0);
  if (nIp >= perIp) return 'You have used today’s questions on this box. It resets at midnight UTC.';
  if (nAll >= total) return 'The box has hit its allowance for today. It resets at midnight UTC.';
  const expirationTtl = 86400 * 2;
  await Promise.all([
    env.ASK_KV.put(kIp, String(nIp + 1), { expirationTtl }),
    env.ASK_KV.put(kAll, String(nAll + 1), { expirationTtl })
  ]);
  return null;
}

// api.anthropic.com, or whatever gateway is configured, resolved to the exact
// messages endpoint. Anything that is not a usable absolute URL falls back to the
// real API rather than failing the request on a config typo.
function messagesURL(base) {
  const DEFAULT = 'https://api.anthropic.com/v1/messages';
  if (!base || typeof base !== 'string') return DEFAULT;
  let root = base.trim().replace(/\/+$/, '');
  if (!root) return DEFAULT;
  if (!/^https?:\/\//i.test(root)) return DEFAULT;
  if (/\/v1$/i.test(root)) root = root.slice(0, -3).replace(/\/+$/, '');
  const url = `${root}/v1/messages`;
  try { new URL(url); } catch { return DEFAULT; }
  return url;
}

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'no model configured' }, 501);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const turns = Array.isArray(body.turns) ? body.turns.slice(-MAX_TURNS) : [];
  const index = Array.isArray(body.index) ? body.index : [];
  const seed = Array.isArray(body.seed) ? body.seed.slice(0, SEED_PASSAGES).map(String) : [];
  const plots = body.plots && typeof body.plots === 'object' ? body.plots : {};
  if (!turns.length || turns[turns.length - 1].role !== 'user') return json({ error: 'no question' }, 400);

  const stop = await limited(env, request.headers.get('cf-connecting-ip') || '0.0.0.0');
  if (stop) {
    return new Response(JSON.stringify({ e: 'block', block: { type: 'decline', reason: stop } }) + '\n{"e":"done"}\n', {
      headers: { 'content-type': 'application/x-ndjson', 'cache-control': 'no-store' }
    });
  }

  const byId = new Map(index.map((d) => [String(d.id), d]));
  const catalogue = index.map((d) => `  ${d.id}  ${d.t}`).join('\n');
  const opened = new Set();
  const passageBlock = (ids) =>
    ids
      .map((id) => {
        const d = byId.get(id);
        if (!d) return null;
        opened.add(id);
        return `<passage id="${id}" title="${String(d.t).replace(/"/g, "'")}" link="${d.u}">\n${d.a}\n</passage>`;
      })
      .filter(Boolean)
      .join('\n');

  const messages = turns.slice(0, -1).map((t) => ({ role: t.role, content: String(t.content).slice(0, 4000) }));
  const q = String(turns[turns.length - 1].content).slice(0, MAX_Q);
  const openedNow = passageBlock(seed);
  messages.push({
    role: 'user',
    content:
      (openedNow ? `OPENED FOR THIS QUESTION\n${openedNow}\n\n` : 'NOTHING SCORED ABOVE THE FLOOR FOR THIS QUESTION.\n\n') +
      `QUESTION\n${q}`
  });

  const model = env.ASK_MODEL || 'claude-haiku-4-5-20251001';
  // A gateway in front of the API is set by base URL, so honour one if it is
  // configured. Accepts it with or without the /v1, and with or without a
  // trailing slash, because every place that asks for this spells it differently.
  const endpoint = messagesURL(env.ANTHROPIC_BASE_URL);
  // Tools and system are identical for every question and are most of the input,
  // so one cache breakpoint on the system block covers both. A follow-up asked
  // within five minutes reads them at a tenth of the price.
  const system = [{ type: 'text', text: SYSTEM(catalogue), cache_control: { type: 'ephemeral' } }];

  const stream = new ReadableStream({
    async start(ctrl) {
      const send = (o) => ctrl.enqueue(enc.encode(JSON.stringify(o) + '\n'));
      const cited = [];

      try {
        for (let round = 0; round < MAX_ROUNDS; round++) {
          send({ e: 'status', t: round === 0 ? 'thinking' : 'thinking again' });

          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'x-api-key': env.ANTHROPIC_API_KEY,
              'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({ model, max_tokens: 1100, system, tools: TOOLS, messages, stream: true })
          });

          if (!res.ok) {
            // "The model did not answer" is true of a bad key, a spent balance and a
            // 500 alike, which makes it useless to whoever has to fix it. The status
            // goes to the worker log with the upstream body; the visitor gets the one
            // sentence that is actually true for their case.
            const detail = await res.text().catch(() => '');
            console.error(`ask: anthropic ${res.status} ${res.statusText} ${detail.slice(0, 400)}`);
            const t = res.status === 401 || res.status === 403
              ? 'The model is not configured on this deployment.'
              : res.status === 429
                ? 'Too many questions at once. Try again in a moment.'
                : 'The model did not answer. Try again in a moment.';
            send({ e: 'error', t });
            break;
          }

          // Reassemble the streamed content blocks, forwarding what is legible as it arrives.
          const blocks = [];
          let cur = null;
          let buf = '';
          let sent = 0;
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let tail = '';

          for (;;) {
            const { value, done } = await reader.read();
            if (done) break;
            tail += dec.decode(value, { stream: true });
            const lines = tail.split('\n');
            tail = lines.pop();

            for (const line of lines) {
              if (!line.startsWith('data:')) continue;
              let ev;
              try { ev = JSON.parse(line.slice(5).trim()); } catch { continue; }

              if (ev.type === 'content_block_start') {
                cur = ev.content_block;
                buf = '';
                sent = 0;
                if (cur.type === 'tool_use') send({ e: 'tool', name: cur.name });
              } else if (ev.type === 'content_block_delta') {
                if (ev.delta.type === 'input_json_delta') {
                  buf += ev.delta.partial_json;
                  if (cur && cur.name === 'answer') {
                    const so = partialText(buf);
                    if (so.length > sent) { send({ e: 'delta', t: so.slice(sent) }); sent = so.length; }
                  }
                }
              } else if (ev.type === 'content_block_stop') {
                if (cur && cur.type === 'tool_use') {
                  let input = {};
                  try { input = buf ? JSON.parse(buf) : {}; } catch { input = {}; }
                  blocks.push({ ...cur, input });
                }
                cur = null;
              }
            }
          }

          if (!blocks.length) break;
          messages.push({ role: 'assistant', content: blocks.map((b) => ({ type: 'tool_use', id: b.id, name: b.name, input: b.input })) });

          const results = [];
          let more = false;
          let finished = false;

          for (const call of blocks) {
            const i = call.input || {};
            let note = 'shown to the visitor';

            if (call.name === 'answer') {
              const ok = (i.sources || []).map(String).filter((s) => opened.has(s));
              if (!ok.length) {
                note =
                  'rejected: none of those ids name a passage you have opened. Open one with ' +
                  'fetch_passages and answer from it, or call decline.';
                send({ e: 'reject', name: 'answer', why: 'cited a passage it had not opened' });
              } else {
                cited.push(...ok);
                send({
                  e: 'block',
                  block: {
                    type: 'text',
                    text: String(i.text || ''),
                    sources: ok.map((id) => ({ id, t: byId.get(id).t, u: byId.get(id).u, k: byId.get(id).k })),
                    follow_up: (i.follow_up || []).slice(0, 3).map(String)
                  }
                });
                finished = true;
              }
            } else if (call.name === 'fetch_passages') {
              const ids = (i.ids || []).map(String).filter((id) => byId.has(id));
              if (!ids.length) {
                note = 'rejected: none of those ids are in the catalogue.';
                send({ e: 'reject', name: 'fetch_passages', why: 'asked for ids not in the catalogue' });
              } else {
                send({ e: 'opened', ids: ids.map((id) => ({ id, t: byId.get(id).t })), why: String(i.why || '') });
                note = passageBlock(ids);
                more = true;
              }
            } else if (call.name === 'chart_preset') {
              const key = { roles_timeline: 'roles', projects_by_area: 'group', projects_by_status: 'status' }[i.series];
              const data = key && plots[key];
              if (!data) note = 'rejected: that series is not one the page holds.';
              else send({ e: 'block', block: { type: 'chart', kind: i.series, title: String(i.title || ''), data } });
            } else if (call.name === 'chart') {
              const pts = (i.points || []).filter((p) => opened.has(String(p.source)) && Number.isFinite(Number(p.value)));
              if (pts.length < 2) {
                note =
                  'rejected: fewer than two points survived the source check. Every point needs the id ' +
                  'of a passage you have opened.';
                send({ e: 'reject', name: 'chart', why: 'points named passages it had not opened' });
              } else {
                send({
                  e: 'block',
                  block: {
                    type: 'chart',
                    kind: 'composed',
                    title: String(i.title || ''),
                    unit: String(i.unit || ''),
                    data: pts.map((p) => ({ n: String(p.label), v: Number(p.value), src: String(p.source) })),
                    dropped: (i.points || []).length - pts.length
                  }
                });
              }
            } else if (call.name === 'decline') {
              send({
                e: 'block',
                block: {
                  type: 'decline',
                  reason: String(i.reason || ''),
                  follow_up: (i.follow_up || []).slice(0, 3).map(String)
                }
              });
              finished = true;
            }

            results.push({ type: 'tool_result', tool_use_id: call.id, content: note });
          }

          if (finished && !results.some((r) => String(r.content).startsWith('rejected'))) break;
          if (!more && !results.some((r) => String(r.content).startsWith('rejected'))) {
            // A chart with no words after it. Ask for the sentence.
            results.push({ type: 'text', text: 'The chart is on screen. Finish with answer or decline.' });
          }
          messages.push({ role: 'user', content: results });
        }
      } catch {
        send({ e: 'error', t: 'That request came apart on the way. Try it again.' });
      }

      send({ e: 'done', opened: [...opened] });
      ctrl.close();
    }
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      'x-accel-buffering': 'no'
    }
  });
}

export function onRequestGet() {
  return json({ error: 'post a question' }, 405);
}
