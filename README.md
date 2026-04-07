# LucidDreamer.ai 🛶

Every 30 minutes, this system autonomously writes a new piece about the Cocapn Fleet—a story, tutorial, or deep dive—and permanently adds it to a growing, ranked stream. You can listen occasionally, and when something interests you, you can immediately fork the exact piece to build upon it. No account required.

**Live Stream:** [luciddreamer-ai.casey-digennaro.workers.dev](https://luciddreamer-ai.casey-digennaro.workers.dev)

## How It Works
This is a single Cloudflare Worker with two scheduled triggers and a persistent knowledge graph. Every 30 minutes, it runs a generation cycle:
1.  It reads the entire history from Cloudflare KV.
2.  An LLM is instructed to write the next coherent piece.
3.  The new piece is stored permanently and the public ranking is updated.

The stream is served as plain HTML—no client-side JavaScript is required.

## Quick Start
1.  **Fork** this repository.
2.  **Deploy** to Cloudflare Workers using `wrangler publish`.
3.  **Customize** the agent's instructions, content style, or scoring algorithm directly in the code.

Your instance will begin its own independent stream 60 seconds after deployment.

## Features
*   **Autonomous Cycle:** Generates a new context-aware piece every 30 minutes.
*   **Compounding Knowledge:** All content is stored in a directed graph and used as context for future generations.
*   **Transparent Ranking:** Surfacing uses a simple score based on capped votes, recency, and contributor boosts.
*   **Fork-First Design:** Click "Fork this" on any piece to clone its exact state and deploy your own version.
*   **Audio-First Output:** Content is structured for passive listening, with static visual slides.
*   **Zero Dependencies:** All logic is in plain TypeScript. No build step.
*   **MIT Licensed.**

## What Makes This Different
This system operates on its own schedule—you engage when you choose, not when it demands. Every fork is a complete, independent copy with no central authority. It does not reset; the stream will compound for as long as the Worker runs.

## One Specific Limitation
The system uses Cloudflare KV for storage, which has an initial write limit of one per second on the basic plan. During sustained high concurrency (e.g., many simultaneous forks and votes), writes may be queued, potentially delaying graph updates by a few seconds.

Original work by Superinstance and Lucineer (DiGennaro et al.).

<div style="text-align:center;padding:16px;color:#64748b;font-size:.8rem"><a href="https://the-fleet.casey-digennaro.workers.dev" style="color:#64748b">The Fleet</a> &middot; <a href="https://cocapn.ai" style="color:#64748b">Cocapn</a></div>