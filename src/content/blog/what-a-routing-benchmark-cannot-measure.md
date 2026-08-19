---
title: "What a routing benchmark cannot measure"
description: "I set out to prove a routing architecture and killed my own hypothesis on day one. What survived is a condition the standard dialogue corpora fail, including one where not a single test dialogue contains the decision being benchmarked."
date: 2026-08-10
tags: ["agents", "routing", "evaluation"]
---

Every multi-agent dialogue system answers the same question on every turn: which agent owns this one?
The standard answer is a global router: one classifier scoring the current turn against the full
catalogue of agents. It is stateless by construction, re-deriving the decision from nothing each time.

I thought I knew what was wrong with that. Anaphoric turns ("yes", "the second one", "what about next
week") carry almost no routing signal on their own. A stateless router sees an ambiguous fragment
against N candidates and its guess wobbles between adjacent turns. So my hypothesis was that a *local*
question, asked of the currently-active agent ("can you still handle this?"), is better posed than an
N-way question about a fragment, and that running both concurrently and arbitrating buys you catalogue
coverage and boundary accuracy at the latency of a single call.

I wrote that down in a design document with a kill criterion attached: **if a fully-informed global
router matches the local gate at conversational boundaries, the architecture argument is dead.**

It matched. On the boundary stratum the fast model scored 0.985 for triage against 0.955 for the gate;
the strong model, 0.985 against 0.975. Nothing significant in either direction, which is exactly what
"matches" means. That was day one.

## Ten registrations, seven negative

I kept going, because a dead hypothesis is not the same as a wasted instrument. Ten pre-registered
experiments, each with its decision rule fixed and tagged in git before the run, roughly 230,000 model
calls across two vendors.

Seven came back negative. The gate never paid for itself: across eight deployments its margin over a
tuned sticky baseline was −0.0009, −0.0015, −0.0008, −0.0015, −0.0037, −0.0031, +0.0019, −0.0060. One
positive out of eight, and that one inside the noise.

A cross-benchmark replication on MultiWOZ disconfirmed all four co-primaries. A threshold-sensitivity
study came back at ρ = 0.325, p = 0.40. A promising in-context-state effect shrank by a factor of three
to six when I held out a second vendor and re-ran it.

The useful property of registering first is that none of those outcomes was negotiable afterwards.

## The result that survived is about the benchmarks

Somewhere in the wreckage a better question appeared. If a stateless router keeps matching a
state-conditioned one, there are two explanations. Either state does not help, or **the benchmark's
state is already in the transcript**, so the stateless router was never stateless. It is reading the
state off the words, like everyone else.

That is testable without a single model call, so I tested it.

> A benchmark can measure state-conditioned routing only to the extent that its state is not
> recoverable from its own transcript.

MultiWOZ: 92% of state values recoverable from the visible window by lexical matching alone. SGD: the
same, 92%. Both are corpora where the customer says the state out loud, so a stateless model is handed
the state for free, and the experiment you think you are running is not the one running.

ABCD is different, and better: its state is *agent actions*, system events rather than things a
participant said. Only 17% of completed actions are identifiable lexically, 43% by a model. That is the
production condition: which procedure has completed is genuinely hidden.

And then ABCD fails for an entirely different reason.

## Zero out of one thousand and four

ABCD has 10 flows and 96 subflows. Of its 1,004 test dialogues, the number containing more than one
subflow is **zero**.

Every dialogue runs one subflow start to finish. There is no "which workflow owns this turn" question,
because the answer never changes. The boundary stratum is empty. Over-stickiness is never punished. A
policy that never switches scores one hundred percent.

That is a hard count, not an estimate, and it is the argument in one line: the corpus with the right
kind of hidden state contains none of the decisions you would want to benchmark against it.

Splicing dialogues to manufacture boundaries does not rescue it. ABCD's scenarios are per-dialogue, so a
splice joins two conversations with different customers and unrelated topics. Those boundaries would be
trivially easy, a stateless router would get all of them, and the headroom problem returns wearing a
different hat.

## The bug in my own estimator

Some weeks in I noticed the ABCD figures had been derived without a committed script. I wrote one, re-ran
everything, and three of four numbers reproduced.

The fourth did not, and the reason was mine. I had matched content words with Python's `in` against raw
text, so `log-out-in` scored **1.000 recoverable**, because the letters `in` occur inside the word
`anything`. Matching at word boundaries dropped identity from 0.213 to 0.171. The published 0.845 figure
for recoverable values could not be reconstructed under any of eleven estimator variants I swept; they
ranged from 0.26 to 0.79.

Two things are worth saying about that. The correction made the conclusion stronger rather than weaker:
I built a model-based estimator to replace the lexical one, and the separation between MultiWOZ and ABCD
*tripled*, from 0.148 to 0.445. And a single defensible change to a nuisance parameter, the minimum
length of a content word, moves the headline from 0.18 to 0.38. Any number here that depends on that
threshold is a bound, not a measurement.

## What I am not claiming

The sticky orchestrator I run in production is not validated by any of this. Five of my own registrations
say the gate does not pay. If you read this as "state-conditioned routing wins", the repository will
contradict you, and I would rather say so here than have you find it there.

The synthetic corpus I built to isolate the mechanism is my own generator, and its gold labels come from
the same module that generated the episodes. It shows that the mechanism responds to a dial I built in
order to move it. As my own pre-registration requires me to write next to every number from it: *the
corpus is designed so that state matters. That is a phantom, not a patient.*

And the validity condition failed its own human-agreement check. I annotated a sample by hand to confirm
the construct and scored κ = −0.016 against the labels, with human accuracy at 0.136 where models scored
0.83 to 0.94 on the same turns. There are two readings. The task is genuinely underdetermined for a
human, or my annotation protocol is bad, and I cannot distinguish them, because n = 1 and that one is
the person who built the corpus.

## Why publish a mostly-negative result

Because the negative results are the load-bearing part. The most useful sentence I produced is that zero
of 1,004 dialogues contain the decision being benchmarked, and I only found it by taking a kill criterion
seriously enough to let it fire.

If you are evaluating a routing design on MultiWOZ, SGD, or ABCD, the honest first step is to check what
fraction of your benchmark's state is sitting in its own transcript. Mine was most of it.
