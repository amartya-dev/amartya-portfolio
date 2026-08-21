// The index behind the ask box. Built at compile time from the same data the rest
// of the page renders, so an answer can never claim something the page does not.
// Every entry carries the URL it came from; nothing is answerable without one.
import { P } from './projects.js';

const GROUP = { agents: 'Agent systems', infra: 'Infrastructure', teaching: 'Open source and writing', merged: 'Merged upstream' };

// Roles, matching the spans on the trace.
export const ROLES = [
  { id: 'role-hunr', t: 'hunr.ai', r: 'Founder and engineer', from: 2026.6, to: 2026.95, now: true, main: true,
    a: 'Founder and engineer at hunr.ai since August 2026. Technical screening that hands a candidate a real repository, lets them use any agent they like, and then checks whether they can defend what came out. He is the sole author of it.',
    k: 'Bengaluru, full time' },
  { id: 'role-newfold', t: 'Newfold Digital', r: 'Senior Software Developer, AI Center of Excellence', from: 2021.25, to: 2026.5, main: true,
    a: 'Five years and five months at Newfold Digital, most of it in the AI Center of Excellence. The agent orchestration framework carrying Network Solutions and BigRock support, the 739-case eval suite that gates their deploys, and the AI-native website builder all came out of that. He resigned in 2026 to build hunr.',
    k: '5y 5mo' },
  { id: 'role-paycrunch', t: 'PayCrunch', r: 'Founding consultant, part-time', from: 2022, to: 2025, side: true,
    a: 'Founding consultant at PayCrunch, a YC-backed fintech, from 2022 to 2025. He built the UPI credit lending backend from zero, integrated the lending and payment rails, wrote the underwriting on top and the Flutter client, and hired and led the first three engineers. Part-time throughout.',
    k: '2022 to 2025' },
  { id: 'role-magicweave', t: 'Magicweave', r: 'Consulting', from: 2026.6, to: 2026.95, side: true,
    a: 'Consulting on Magicweave, a game backend built by his friend Sahil. He advises rather than owns it. The part he points at is the shape: Django used only as an ORM and never to serve a request, with one factory producing two FastAPI apps that have genuinely different trust boundaries.',
    k: '2026' },
  { id: 'role-ohuru', t: 'Ohuru Tech', r: 'Freelance and client work', from: 2020.75, to: 2026.4, side: true,
    a: 'Freelance and client work under Ohuru Tech from 2020 onwards, running alongside everything else. The reusable parts were published rather than copied between projects: three packages on PyPI, plus cookiecutters for Django REST, React and Express that other people starred.',
    k: '2020 to 2026' }
];

// The things that are true about him but live in no repository.
const PERSONAL = [
  { id: 'p-music', t: 'Music', u: '/about', k: 'Off the clock', q: 'guitar sing singing tabla harmonium instrument music band play hobby',
    a: 'He sings and plays harmonium, tabla and guitar. The harmonium and tabla came first and are the ones he would put money on; the guitar is the one he actually picks up. He argues there is a straight line from tabla to the day job: a fixed vocabulary of strokes, composed into cycles, where the interesting part is the return to the first beat rather than anything clever in the middle.' },
  { id: 'p-talks', t: 'Speaking', u: '/about', k: 'Off the clock', q: 'talk talks speaking conference wordcamp wordpress stage audience present presentation',
    a: 'Four WordCamps, in Mumbai, Ahmedabad, Delhi and Kolkata, mostly the same talk about building Gutenberg blocks given three times. He rates WordPress as the least impressive thing in his career and speaking as the fastest way he knows to find out whether he actually understands something.' },
  { id: 'p-jkd', t: 'Jeet Kune Do Federation of India', u: '/about', k: 'Off the clock', q: 'martial arts jeet kune do jkd pro bono free charity volunteer',
    a: 'He built the Jeet Kune Do Federation of India a Next.js and Postgres CMS for nothing, to replace their compromised legacy site. It is written and tested but not yet deployed.' },
  { id: 'p-experience', t: 'How long he has been at this', u: '/work', k: 'Practical', q: 'experience year long career since started began seniority senior total decade age old how long been doing',
    a: 'Six years of professional engineering, from 2020 to now, across five overlapping spans. Five of those years were at Newfold Digital, the last two and a half of them building agent systems in its AI Center of Excellence. The freelance work under Ohuru Tech ran alongside the whole time, and PayCrunch ran alongside from 2022 to 2025.' },
  { id: 'p-where', t: 'Where he is', u: '/#contact', k: 'Practical', q: 'where based located location city country india timezone remote relocate travel',
    a: 'Bengaluru, India, UTC+5:30. Remote work is the default and has been since 2020.' },
  { id: 'p-contact', t: 'How to reach him', u: '/#contact', k: 'Practical', q: 'contact email reach hire hiring available availability work together consult freelance talk message get in touch linkedin github',
    a: 'amartya@hunr.ai is the address he reads. github.com/amartya-dev and linkedin.com/in/amartya-gaur are the other two. He is running hunr full time, so the realistic conversations are about agent systems, evaluation, or the platform underneath them.' },
  { id: 'p-vault', t: 'Arctic Code Vault', u: '/about', k: 'Off the clock', q: 'arctic code vault github award recognition',
    a: 'An Arctic Code Vault contributor, which he says means only that he was committing to the right repositories in 2020.' },
  { id: 'p-edu', t: 'Education and earlier roles', u: '/work', k: 'Earlier', q: 'degree university college education study school btech vit american express bruce clay intern first job',
    a: 'A B.Tech from VIT, then American Express and Bruce Clay before the Newfold years. He does not lead with any of it.' },
  { id: 'p-stack', t: 'What he works in', u: '/work', k: 'Practical', q: 'language languages stack tech technology python typescript javascript go rust framework tools kubernetes postgres aws gcp cloud docker terraform',
    a: 'Python and TypeScript carry most of it, with Django and FastAPI on the server side and Next.js when a front end is needed. Underneath: Postgres and pgvector, Kubernetes and Helm, Cloud Run, Pulumi, apko and OCI images, Jenkins, Cloudflare. LangGraph for the generation harness at Newfold. He tends to write the state machine himself rather than adopt an agent framework.' },
  { id: 'p-how', t: 'How he works', u: '/blog', k: 'Practical', q: 'philosophy approach opinion belief principle how does he work method style think believe',
    a: 'Three positions he keeps returning to. State machines over cleverness, because a router that guesses every turn loses the thread on the first ambiguous fragment. An eval suite that cannot fail a build is a dashboard. And a guarantee belongs in the surface an agent is given, not in the prompt asking it to behave, because a prompt is a request and a type is not.' }
];

const strip = (s) => String(s).replace(/[‘’]/g, "'").replace(/[“”]/g, '"');

export function buildIndex(posts) {
  const out = [];

  for (const p of P) {
    out.push({
      id: 'proj-' + p.n.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
      t: p.n,
      k: GROUP[p.g] + ' · ' + p.s,
      u: p.href || '/#work',
      ext: !!p.href,
      a: strip(p.d),
      q: [p.h, p.w, p.s, p.y].map(strip).join(' '),
      g: p.g,
      s: p.s
    });
  }

  for (const r of ROLES) {
    out.push({ id: r.id, t: r.t, k: 'Role · ' + r.k, u: '/work', a: strip(r.a), q: r.r + ' role job worked employed employer company where did he work career timeline year long experience since' });
  }

  for (const p of posts) {
    out.push({
      id: 'post-' + p.id,
      t: p.data.title,
      k: 'Writing · ' + p.data.tags.join(', '),
      u: '/blog/' + p.id + '/',
      a: strip(p.data.description),
      q: p.data.tags.join(' ') + ' post wrote writing article blog essay note'
    });
  }

  for (const p of PERSONAL) out.push({ id: p.id, t: p.t, k: p.k, u: p.u, a: strip(p.a), q: p.q });

  return out;
}

// What the plot intents draw. Counts, not claims, so they cannot drift from the list.
export function buildPlots(posts) {
  const byGroup = {};
  const byStatus = {};
  for (const p of P) {
    byGroup[GROUP[p.g]] = (byGroup[GROUP[p.g]] || 0) + 1;
    const bucket =
      /Live|In production|Shipped|Published|Merged|Open source/i.test(p.s) ? 'Shipped or merged'
      : /Prototype|New|In progress|Built, not yet/i.test(p.s) ? 'Built, unproven'
      : 'Private or unpublished';
    byStatus[bucket] = (byStatus[bucket] || 0) + 1;
  }
  return {
    group: Object.entries(byGroup).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v),
    status: Object.entries(byStatus).map(([n, v]) => ({ n, v })).sort((a, b) => b.v - a.v),
    roles: ROLES.map((r) => ({ n: r.t, r: r.r, from: r.from, to: r.to, side: !!r.side, now: !!r.now })),
    posts: posts.length,
    projects: P.length
  };
}
