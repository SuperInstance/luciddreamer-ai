# DEPENDENCIES — luciddreamer-ai

## Signal Chain Layer

**L4 (Cloud) — Reactive Improv Podcast Engine**

Cloudflare Worker that powers a reactive improv podcast with tensor-based MIDI timing. Applies plato-nervous reactive concepts at the cloud/fleet layer.

## Ecosystem Dependencies

| Repo | Relationship | Description |
|------|-------------|-------------|
| [plato-nervous](https://github.com/SuperInstance/plato-nervous) | **Inspired by** | Reactive signal chain concepts adapted for podcast improv timing |
| [hermit-crab](https://github.com/SuperInstance/hermit-crab) | **Related** | Agent migration concepts applicable to podcast persona transitions |
| [concrete-token-demo](https://github.com/SuperInstance/concrete-token-demo) | **Related** | Demonstrates the underlying distillation pipeline that luciddreamer leverages |

## Data Flow

```
IN:
  - Podcast participant state
  - Audience interaction signals (forks, votes)
  - Tensor-based MIDI timing cues

OUT:
  - Reactive improv podcast audio/script
  - Session state via Cloudflare KV
  - Fork/vote graph for audience-driven narrative
```
