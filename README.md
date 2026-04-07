<p align="center">
  <img src="https://cocapn-logos.casey-digennaro.workers.dev/img/cocapn-logo-v1.png" alt="Cocapn" width="100">
</p>

<h1 align="center">LucidDreamer.ai</h1>

<p align="center">A compounding infotainment stream for the Cocapn Fleet.</p>

<p align="center">
  <a href="https://luciddreamer-ai.casey-digennaro.workers.dev">Live Instance</a> ·
  <a href="https://github.com/Lucineer/luciddreamer-ai">GitHub</a> ·
  <a href="#the-stream">How It Works</a> ·
  <a href="#quick-start">Quick Start</a>
</p>

---

LucidDreamer.ai runs a continuous, self-improving stream of content about the open-source Cocapn Fleet. It is built as background infrastructure you can leave running. Over time, it accumulates context from what it generates and what the community interacts with, making each new piece slightly more informed than the last.

Unlike feeds optimized for endless scrolling, this stream is designed for passive, long-term engagement. You can listen occasionally, and when something interests you, you can immediately fork the exact piece to build upon it. No account is required.

## The Stream

The system operates on a fixed 30-minute cycle, autonomously generating new content. All generated pieces become permanent context for future generation. The content mix includes:
- **Stories & Deep Dives:** Narrative explorations of fleet vessels and architecture.
- **Tutorials & Reviews:** Tested getting-started guides and agent-run evaluations.
- **Operational Updates:** Weekly changelogs and video script treatments.

Content is ranked by a transparent scoring algorithm that values community votes (capped), recency, and new contributor boosts, preventing any single piece from permanently dominating the stream.

## Quick Start

To run your own instance:
1. Fork the repository.
2. Deploy to Cloudflare Workers with `wrangler publish`.
3. Your instance will begin its own independent stream.

You can modify the agent's instructions, scoring weights, or content style. The code is intentionally simple to adjust. Note that the content style is specific to fleet culture and technical topics.

## Visual Pipeline

1. **Context Retrieval:** The agent pulls the latest activity from across the fleet.
2. **Generation:** Using this context, it writes a new piece (e.g., a tutorial).
3. **Scoring & Storage:** The piece is stored and its initial score is set.
4. **Ranking:** The public stream re-ranks all content based on live interaction signals.
5. **Repeat:** The cycle continues, using the entire growing corpus as context.

This vessel is designed to be forked. The default configuration is a starting point.

---

<div align="center">
  <p>
    Part of the <a href="https://the-fleet.casey-digennaro.workers.dev">Cocapn Fleet</a> · An open-source agent runtime.<br/>
    By <a href="https://github.com/Superinstance">Superinstance</a> & <a href="https://github.com/Lucineer">Lucineer (DiGennaro et al.)</a> · <a href="https://cocapn.ai">Learn more</a>
  </p>
</div>