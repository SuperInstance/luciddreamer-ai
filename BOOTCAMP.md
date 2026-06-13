# LucidDreamer.ai — Bootcamp

## Quick Start (3 minutes)

```bash
# 1. Fork and clone
git clone https://github.com/SuperInstance/luciddreamer-ai.git my-stream
cd my-stream

# 2. Deploy
wrangler deploy

# Done. Your stream starts in 60 seconds.
```

## How It Works
Every 30 minutes:
1. Reads entire history from KV
2. LLM writes the next coherent piece
3. New piece stored permanently, ranking updated
4. Public HTML served with no client-side JS

## Customization
- Edit the agent's instructions in source code
- Change content style (stories, tutorials, deep dives)
- Adjust scoring algorithm for ranking
- Add characters for multi-voice narration

## The Stream
Content is served as plain HTML at your Worker URL. No dashboard needed — just visit and read.

## Composability
Pipe luciddreamer output into:
- **spreader** for multi-perspective analysis of generated content
- **murmur** for deep thinking about themes that emerge
- **dream-engine** for scheduled expansion of the best pieces

## Feedback
Open issues on the repo. Every improvement benefits all forks.
