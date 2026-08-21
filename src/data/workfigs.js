// The figure beside each entry on the front page.
//
// First attempt used the same bar figures the blog posts use, which was wrong in
// a way that took a second reading to see: those bars normalise to the largest
// value in the set, so "739 cases" drew as a quarter-full bar next to 2,700, and
// "down 48%" drew as a half-empty one. Next to a list of work, a part-full bar
// does not read as a measurement. It reads as a shortfall. Three of six entries
// were quietly advertising that the work was smaller than it is.
//
// So: a photograph where there is a real thing to photograph, and a schematic of
// the system otherwise. A drawing of a shape has no empty half to misread.
export const WORKFIG = {
  // The product's own output. The three struck decisions on it are his.
  hunr: {
    kind: 'still', label: 'The report it hands back', src: '/media/hunr/report.png'
  },

  'agent-orchestration': {
    kind: 'sketch', d: 'statemachine', label: 'One state holds the thread across turns'
  },

  'eval-gate': {
    kind: 'sketch', d: 'gate', label: 'Cases in front of the build, not after it'
  },

  'website-builder': {
    kind: 'sketch', d: 'builder', label: 'Prompt to generation stack to hosted site'
  },

  // Client work in a regulated sector, so the shape is publishable and nothing
  // else is. The schematic is exactly as specific as the entry is allowed to be.
  'loyalty-engine': {
    kind: 'sketch', d: 'chain', label: 'Rules arbitrated, then written once'
  },

  // This was a frame from the film it cut — the same frame the post about it
  // uses, and the same footage the page opened on. One piece of video, three
  // times, before the reader had got halfway down. The schematic says the thing
  // the frame could not anyway: every token carries a pointer back to the file
  // and line it was lifted from, and nothing reaches the strip without one.
  'product-motion': {
    kind: 'sketch', d: 'film', label: 'Every token cites the line it came from'
  }
};
