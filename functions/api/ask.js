// Cloudflare Pages Function. The model behind the ask box on the home page.
//
// The shape is the argument: the model is given retrieved passages and a typed
// tool surface, and nothing else. It chooses what to say and what to draw. It
// cannot choose the numbers, because chart_preset series are computed on the page
// from the same data the page renders, and every point of a composed chart has to
// name the passage it came from or the server drops it. A prompt asking a model to
// be truthful is a request. A tool that will not carry an uncited number is not.
//
// Environment (Pages project settings):
//   ANTHROPIC_API_KEY   required for the model path. Without it this returns 501
//                       and the page falls back to plain retrieval.
//   ASK_MODEL           optional, defaults to claude-haiku-4-5-20251001
//   ASK_KV              optional KV namespace. Bind it and you get rate limiting.
//   ASK_DAILY_PER_IP    optional, defaults to 40
//   ASK_DAILY_TOTAL     optional, defaults to 1500

const MAX_Q = 300;
const MAX_PASSAGES = 6;
const MAX_ROUNDS = 3;

const TOOLS = [
  {
    name: 'answer',
    description:
      'Give the visitor the answer in prose. Every sentence must be supported by the passages you were ' +
      'given. Cite the passage ids you used.',
    input_schema: {
      type: 'object',
      properties: {
        text: {
          type: 'string',
          description:
            'Two to four sentences, plain and specific, written about Amartya in the third person. ' +
            'No preamble, no "based on the passages", no offer to help further.'
        },
        sources: {
          type: 'array',
          items: { type: 'string' },
          description: 'Passage ids that support the text. At least one.'
        }
      },
      required: ['text', 'sources']
    }
  },
  {
    name: 'chart_preset',
    description:
      'Draw one of the exact series held by the site. Use this whenever the question is about the shape ' +
      'of his career or the makeup of his work, because these numbers are computed rather than recalled.',
    input_schema: {
      type: 'object',
      properties: {
        series: {
          type: 'string',
          enum: ['roles_timeline', 'projects_by_area', 'projects_by_status'],
          description:
            'roles_timeline: the five spans on a 2020 to 2027 axis, showing the overlap. ' +
            'projects_by_area: how the projects split across agent systems, infrastructure and upstream work. ' +
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
      'Compose a chart the presets do not cover, for example comparing the size of specific pieces of work. ' +
      'Every point must name the passage its number came from. Points citing a passage you were not given ' +
      'are dropped before the chart is drawn, so do not invent one.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'One short line above the chart. Sentence case, no full stop.' },
        unit: { type: 'string', description: 'What the values count, e.g. "lines of code", "cases", "accounts".' },
        points: {
          type: 'array',
          maxItems: 8,
          items: {
            type: 'object',
            properties: {
              label: { type: 'string' },
              value: { type: 'number' },
              source: { type: 'string', description: 'The id of the passage this number appears in.' }
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
      'Use this when the passages do not answer the question, or when the question is about something ' +
      'this site does not hold, such as pay, personal contact details beyond the public address, or ' +
      'opinions he has not published. Declining is the correct answer, not a failure.',
    input_schema: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'One or two sentences saying plainly what is missing. Do not apologise and do not speculate ' +
            'about what the answer might be.'
        }
      },
      required: ['reason']
    }
  }
];

const SYSTEM = `You are the ask box on Amartya Gaur's personal site. A visitor types a question about him and you answer it.

The three chart_preset series are always available to you, whatever was retrieved, because the page computes them itself. Everything else you know is in the PASSAGES block of the user message. Each passage has an id, a title and a body, and was retrieved from an index built out of the page itself. If something is not in a passage, you do not know it, no matter how reasonable a guess would be. You have no memory of other conversations.

Work by calling tools. Nothing you write outside a tool call is shown.

- Reach for chart_preset whenever the question is about his career shape or the makeup of his work. A picture of the overlap answers "how long has he been doing this" better than a sentence does.
- Reach for chart when a comparison in the passages has numbers in it and the presets do not cover it.
- Follow any chart with answer, so the visitor gets the chart and the sentence.
- Call decline on its own when the passages do not carry the answer.

Voice: third person, present tense, plain. Specific over impressive. He is an engineer who dislikes overstatement, and half the point of this box is that it will not overstate on his behalf. If a passage says something is unpublished, a prototype or private, say so rather than rounding it up. Never invent a number, a date, a client name or an employer. Two to four sentences is the right length.`;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });

async function limited(env, ip) {
  if (!env.ASK_KV) return null;
  const day = new Date().toISOString().slice(0, 10);
  const perIp = Number(env.ASK_DAILY_PER_IP || 40);
  const total = Number(env.ASK_DAILY_TOTAL || 1500);
  const kIp = `ip:${day}:${ip}`;
  const kAll = `all:${day}`;
  const [a, b] = await Promise.all([env.ASK_KV.get(kIp), env.ASK_KV.get(kAll)]);
  const nIp = Number(a || 0), nAll = Number(b || 0);
  if (nIp >= perIp) return 'You have used today’s questions on this box. It resets at midnight UTC.';
  if (nAll >= total) return 'The box has hit its allowance for today. It resets at midnight UTC.';
  const ttl = 86400 * 2;
  await Promise.all([
    env.ASK_KV.put(kIp, String(nIp + 1), { expirationTtl: ttl }),
    env.ASK_KV.put(kAll, String(nAll + 1), { expirationTtl: ttl })
  ]);
  return null;
}

export async function onRequestPost({ request, env }) {
  if (!env.ANTHROPIC_API_KEY) return json({ error: 'no model configured' }, 501);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'bad request' }, 400);
  }

  const q = String(body.q || '').trim().slice(0, MAX_Q);
  const passages = Array.isArray(body.passages) ? body.passages.slice(0, MAX_PASSAGES) : [];
  const plots = body.plots && typeof body.plots === 'object' ? body.plots : {};
  if (!q) return json({ error: 'no question' }, 400);

  const ip = request.headers.get('cf-connecting-ip') || '0.0.0.0';
  const stop = await limited(env, ip);
  if (stop) return json({ blocks: [{ type: 'decline', reason: stop }] });

  const known = new Set(passages.map((p) => String(p.id)));
  const passageText = passages
    .map((p) => `<passage id="${p.id}" title="${String(p.t).replace(/"/g, "'")}" source="${p.u}">\n${p.a}\n</passage>`)
    .join('\n');

  const messages = [
    {
      role: 'user',
      content:
        `PASSAGES\n${passageText || '(nothing was retrieved for this question)'}\n\n` +
        `QUESTION\n${q}`
    }
  ];

  const blocks = [];
  const model = env.ASK_MODEL || 'claude-haiku-4-5-20251001';

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({ model, max_tokens: 900, system: SYSTEM, tools: TOOLS, messages })
    });

    if (!res.ok) return json({ error: 'model unavailable' }, 502);
    const out = await res.json();
    const calls = (out.content || []).filter((c) => c.type === 'tool_use');
    if (!calls.length) break;

    messages.push({ role: 'assistant', content: out.content });
    const results = [];

    for (const call of calls) {
      const i = call.input || {};
      let note = 'rendered';

      if (call.name === 'answer') {
        const cited = (i.sources || []).map(String).filter((s) => known.has(s));
        if (!cited.length) {
          note = 'refused: none of those source ids were in the passages you were given. Cite one that was, or call decline.';
        } else {
          blocks.push({ type: 'text', text: String(i.text || ''), sources: cited });
        }
      } else if (call.name === 'chart_preset') {
        const key = { roles_timeline: 'roles', projects_by_area: 'group', projects_by_status: 'status' }[i.series];
        const data = key && plots[key];
        if (!data) note = 'refused: that series is not held by the page.';
        else blocks.push({ type: 'chart', kind: i.series, title: String(i.title || ''), data });
      } else if (call.name === 'chart') {
        const pts = (i.points || []).filter(
          (p) => known.has(String(p.source)) && Number.isFinite(Number(p.value))
        );
        if (pts.length < 2) {
          note = 'refused: fewer than two points survived source checking. Every point needs a source id from the passages above.';
        } else {
          blocks.push({
            type: 'chart',
            kind: 'composed',
            title: String(i.title || ''),
            unit: String(i.unit || ''),
            data: pts.map((p) => ({ n: String(p.label), v: Number(p.value), src: String(p.source) })),
            dropped: (i.points || []).length - pts.length
          });
        }
      } else if (call.name === 'decline') {
        blocks.push({ type: 'decline', reason: String(i.reason || '') });
      }

      results.push({ type: 'tool_result', tool_use_id: call.id, content: note });
    }

    // A tool that returned cleanly ends the turn. Only a rejection earns another round.
    if (!results.some((r) => String(r.content).startsWith('refused'))) break;
    messages.push({ role: 'user', content: results });
  }

  if (!blocks.length) blocks.push({ type: 'decline', reason: 'That one did not resolve into an answer I can stand behind.' });
  return json({ blocks });
}

export function onRequestGet() {
  return json({ error: 'post a question' }, 405);
}
