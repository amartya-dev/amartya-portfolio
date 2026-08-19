---
title: "739 cases that can fail a build"
description: "An eval suite nobody can block a deploy with is a dashboard. Here's what it took to make ours a gate."
date: 2026-03-02
tags: ["evals", "ci", "agents"]
---

Most agent evaluation I have seen produces a number that goes in a slide. It is measured after the
fact, it moves for reasons nobody can attribute, and when it drops, the response is a conversation
rather than a rollback.

We wanted the opposite: a suite that sits in the deploy pipeline and refuses to let a release through.
That constraint changes almost every design decision you make.

## A gate has to be able to say no

The first thing that dies when you make evals blocking is fuzzy scoring. A number between 0 and 1
that drifts by 0.03 on a rerun cannot stop a deploy, because the first false failure gets it disabled
by whoever is on release duty at 11pm. Any assertion that is not stable across reruns is not an
assertion, it is a vibe.

So the suite is built out of things that are deterministic given a fixed model and seed:

- **Routing** — did this conversation land in the workflow it should have? A label match, not a
  judgment call.
- **Tool-call correctness** — was the tool invoked, with arguments in the right shape, in the right
  order, and not invoked when it should not have been?
- **Handoff quality** — when a workflow gave up, did it hand off with a reason, to a target that
  exists?

Roughly 250 scoring metrics across 739 regression cases and about 2,700 assertions. The ones that
involve model judgment are graded, reported, and explicitly non-blocking. Only the deterministic
ones can fail the build.

## Every case came from something that broke

We did not sit down and write 739 cases. Almost none of them are invented. The suite grew the way a
regression suite is supposed to: something misbehaved in production, we reduced it to the smallest
conversation that reproduced it, and it became a case.

That has a useful side effect. Because each case has an incident behind it, nobody argues about
whether it should be there. The argument you do get — "this case is too specific" — usually means the
fix was too specific, which is worth knowing.

## Wiring it into Jenkins

The gate runs on the deploy job, not on every commit; the full suite is too slow to sit in the inner
loop, and a gate you route around is not a gate. Developers run a subset locally.

The rule is uncomplicated: any deterministic assertion failing means the deploy stops. The report
names the case, the conversation, and the assertion, so the failure is actionable in the first thirty
seconds rather than after someone re-runs it locally to see what happened.

## What actually changed

The measurable thing is regressions caught before release. The less measurable thing matters more:
it changed how the team talks about agent changes. A prompt edit stopped being a low-risk cosmetic
tweak and started being a change that has to pass 739 cases, which is exactly what it always was.

An eval suite you can ignore is a dashboard. The only difference between the two is whether it is
allowed to say no.
