// The index needs a destination for every row, and projects.js is prose — the
// descriptions in it are long enough that editing them to bolt on routing data
// would be a good way to introduce a typo into the only copy of them. So the
// routing lives here and is merged in by name.
//
// `demo` names the interactive piece that belongs to a project. Those used to
// live on the home page, four of them stacked in identical frames, where they
// competed with each other and with the index. Each one now sits on the page of
// the thing it is evidence for, which is where a piece of evidence goes.
import { P } from './projects.js';

const META = {
  'hunr.ai': {
    slug: 'hunr', demo: 'report', film: true,
    posts: ['proving-a-challenge-discriminates', 'a-container-per-job-without-a-daemon', 'no-network-inside-a-cloud-run-job']
  },
  'When a routing benchmark can measure nothing': {
    slug: 'routing-benchmark', posts: ['what-a-routing-benchmark-cannot-measure']
  },
  'Repo-to-docs retrieval': { slug: 'repo-to-docs' },
  'A data layer that refuses': { slug: 'data-layer-that-refuses', demo: 'refuse' },
  'ax, an agent asset registry': { slug: 'ax-asset-registry' },
  'Agent orchestration framework': {
    slug: 'agent-orchestration', demo: 'router', posts: ['a-sticky-orchestrator']
  },
  'Evals with a deploy gate': { slug: 'eval-gate', demo: 'gate', posts: ['739-cases'] },
  'AI-native website builder': { slug: 'website-builder' },
  'Public MCP server for deploys': { slug: 'mcp-deploys' },
  'Typesense, all four layers': { slug: 'typesense' },
  'Microsoft 365 to NCE': { slug: 'm365-to-nce' },
  'Loyalty and rewards engine': { slug: 'loyalty-engine' },
  'Ohuru Tech packages': { slug: 'ohuru-packages' },
  'Magicweave': { slug: 'magicweave' },
  'UPI credit lending backend': { slug: 'upi-lending' },
  'Jeet Kune Do Federation of India': { slug: 'jkd-federation' },
  'Textualize/rich': { slug: 'rich-binary-units', demo: 'units' },
  'product-motion': { slug: 'product-motion', posts: ['a-pipeline-that-cannot-invent-your-ui'] },
  'Azure Speech for OpenMontage': { slug: 'openmontage-speech' },
  'neta-resume': { slug: 'neta-resume' },
  'Creative Commons cccatalog': { slug: 'cccatalog' }
};

export const GROUPS = {
  agents: 'Agent systems',
  infra: 'Infrastructure',
  merged: 'Merged into other repositories'
};

export const WORK = P.map((p) => ({ ...p, posts: [], ...(META[p.n] || {}) }));

export const bySlug = (slug) => WORK.find((w) => w.slug === slug);
