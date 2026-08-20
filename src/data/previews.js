// The small figure that stands for each post, on the writing index and on the
// home page. Every one is the post's own numbers, not a thumbnail standing in for
// it. Posts that have no figure get none, which is what stops this being a grid
// of identical tiles.
export const PREVIEW = {
  'a-pipeline-that-cannot-invent-your-ui': {
    kind: 'still', label: 'A frame from the film it cut', src: '/media/hunr-a-thousand-resumes.jpg'
  },
  'what-a-routing-benchmark-cannot-measure': {
    kind: 'signed', label: 'Eight deployments, one positive',
    v: [-0.0009, -0.0015, -0.0008, -0.0015, -0.0037, -0.0031, 0.0019, -0.006]
  },
  '739-cases': { kind: 'bars', label: 'Assertions, cases, metrics', v: [2700, 739, 250] },
  'a-container-per-job-without-a-daemon': {
    kind: 'bars', label: '14s to build, 0.227s to rebase', v: [14, 0.227], bad: [0]
  },
  'proving-a-challenge-discriminates': {
    kind: 'pips', label: 'Reference passes 8, naive passes 5', a: 8, b: 5, n: 8
  },
  'a-sticky-orchestrator': { kind: 'pips', label: 'Three hand-offs against one', a: 4, b: 1, n: 4 },
  'no-network-inside-a-cloud-run-job': {
    // The post's own diagram would be the truest preview, but at this size its
    // labels are unreadable, and an unreadable label is worse than no figure.
    kind: 'bars', label: 'Loopback reachable. Nothing else is.', v: [1, 0], bad: [1]
  }
};
