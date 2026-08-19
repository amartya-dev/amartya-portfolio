---
title: "A pipeline that cannot invent your UI"
description: "Generated product videos show software that does not exist. Fixing that is not a prompting problem — it means making every frame cite the line of code it came from, and refusing to finish when it cannot."
date: 2026-08-19
tags: ["agents", "pipelines", "provenance"]
---

Ask any capable model for a product demo video and you will get something beautiful and false. The
buttons are in the wrong place. The colours are nearly right. There is a settings panel your product
does not have. It is a video about a plausible product in the same category as yours.

For most generated content that is a quality problem you can prompt your way around. For a product film
it is a correctness problem, and prompting cannot touch it, because the model has no access to the
thing it is describing. It is drawing from a description of your product rather than from your product.

The fix is not a better prompt. It is a shorter distance between the film and the source.

## Grounding is not a promise, it is a chain

"Grounded in your repo" is easy to claim and nearly impossible to verify after the fact. You are handed
a video. Which parts came from the codebase and which parts did the model make up? There is no way to
tell by looking, which means there is no way to tell.

So the design constraint I set was that every claim in the output has to carry a pointer back to what
produced it, all the way down:

- a **design token** cites the file and line it was read from;
- a **screen** in the UI inventory cites the source files it was derived from;
- a **replica asset** carries the source files it was built against;
- the assets stage reviews per-scene stills **against those sources** before it passes.

Not one of those is a model judgement. A scanner reads the repository deterministically — framework
detection, token sources, CSS custom properties with file and line, an index of screens and components
— and everything downstream is required to reference it.

The result is that "is this real?" becomes a query rather than an opinion. You can follow any colour in
the final frame back to the line of CSS it came from, or discover that you cannot, which is the same
information.

## The stage that refuses to close

A chain of citations is only worth as much as its weakest link, and the weakest link in every agent
pipeline is the stage that decides it is finished.

Nine agents run this thing — an executive producer, then directors for repo analysis, proposal,
script, scene, assets, edit, composition and publish. Each writes a checkpoint when it is done. The
important part is what a checkpoint will not accept:

> `write_checkpoint` refuses a `completed` or `awaiting_human` repo-analysis checkpoint that is missing
> either artifact.

Both the design system and the UI inventory are declared as required outputs of that stage. If the
scanner found nothing useful, the stage cannot mark itself done and quietly hand a blank slate to the
next agent, which would then have no choice but to invent one. It stays in progress, and a person finds
out.

This is the whole trick and it is not a clever one. An agent that can declare success on missing work
will eventually declare success on missing work. Put the check in the write path, not in the prompt.

There is a matching guard at the front: if the scan detects an unrecognised framework or no UI code at
all, the pipeline stops and says what it found rather than forcing a backend repository through a
pipeline for web frontends. Refusing the job is a feature.

## Reading a config file is not the same as running one

The best bug in this was mine, and a reviewer found it.

To extract Tailwind's theme, I had been `require()`-ing the analysed repository's `tailwind.config.js`.
It is a config file. Except it is not — it is a JavaScript program, and I was executing it, from a
repository I did not write, inside my own process.

The replacement parses the config statically as an object literal and never executes anything. It picked
up TypeScript config support on the way, because a static parser does not care which language the file
claims to be. Execution still exists as an explicit opt-in, and when it is used it surfaces in the run's
`warnings` rather than happening silently.

Same lesson as everywhere else in this line of work: **the input should be data**. A config file that is
a program is a program, no matter what the extension says, and the moment you execute it you have
adopted whoever wrote it as a collaborator.

## What it refuses to do

It does not template. Composition defaults to a mode where each product's screens are re-authored as
bespoke replicas, because a per-product replica genuinely is bespoke and pretending otherwise is how you
get the video that looks like every other video.

It picks its own runtime at proposal time — one path for React and Next repositories, where a replica is
close to a direct port of the real component, another for Vue and Tailwind-heavy markup where it is not.
Choosing per-repository rather than per-pipeline is the difference between a replica and an impression.

And it runs on a leash: a default budget, a cap on revisions per stage, a cap on how many times a stage
may be sent back, and a wall-clock limit. Nine agents with opinions will happily spend your afternoon
disagreeing with each other about a transition.

## The general shape

I keep arriving at the same design from different directions. A challenge that ships with the wrong
answer so the tests have to prove they can tell. A data layer that refuses to add two numbers that mean
different things. A router that hands over on purpose rather than drifting. And now a film pipeline
where a stage cannot declare itself finished without the evidence it was supposed to produce.

None of these make the model better. They make it possible to find out when it was wrong, which turns
out to be the part that matters.

The pipeline is [open upstream](https://github.com/calesthio/OpenMontage/pull/372), 4,316 lines across
39 files.
