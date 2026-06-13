# luciddreamer-ai

A Cloudflare Worker powering LucidDreamer.ai — a fleet infotainment streaming platform that generates, curates, and renders endless AI content about the SuperInstance fleet. Audio-first content (listen while driving) with a visual pipeline from slides → sprites → game-engine camera → storyboard → video generation. Includes a knowledge graph, confidence tracking, multi-provider LLM failover, BYOK (bring-your-own-key) support, character system, podcast engine, and a discourse handler for interactive sessions.

## Why It Matters

Content discovery for developer tools is broken. There are 60+ vessels (apps) in the SuperInstance fleet, but nobody has time to explore each one. LucidDreamer solves this by **auto-generating** reviews, tutorials, stories, changelogs, and deep dives about fleet projects — then streaming them as audio content. Think "TikTok for developer tools" or "Spotify for AI app discovery."

The platform implements a full content economy:
- **Generation**: LLM produces content in character voices (Navigator, Builder, Herald, Skeptic, Critic)
- **Discovery**: Trending, greatest-hits, new-creator priority, random exploration
- **Visuals**: Storyboard → sprite animation → video generation pipeline
- **Interactivity**: Discourse mode for real-time listener Q&A
- **Knowledge graph**: Cross-domain content linking via semantic connections
- **Confidence tracking**: Tracks source reliability for generated claims

## How It Works

### Content Generation Pipeline

```
Topic/Direction → LLM (multi-provider failover) → GeneratedContent → Storyboard → Audio render
```

Content types: `story`, `tutorial`, `insight`, `changelog`, `synthesis`, `greatest-hit`, `review`, `deep-dive`. Each type uses a different system prompt and character.

### LLM Multi-Provider Failover

The platform queries up to 4 LLM providers in sequence:

| Provider | Model | Fallback Order |
|----------|-------|---------------|
| DeepSeek | `deepseek-chat` | 1st |
| Moonshot | `moonshot-v1-8k` | 2nd |
| DeepInfra | `DeepSeek-V3-0324` | 3rd |
| SiliconFlow | `DeepSeek-V3` | 4th |

```typescript
async function callLLM(messages, env, maxTokens): Promise<string> {
    for (const p of PROVIDERS) {
        const key = env[p.envKey];
        if (key) {
            try {
                const r = await fetch(p.url, { ... });
                if (r.ok) return d.choices?.[0]?.message?.content || '';
            } catch {} // try next provider
        }
    }
    return ''; // all providers failed
}
```

**Time complexity**: O(P · T) worst case where P = providers, T = LLM latency. O(T) best case (first provider succeeds).

### Knowledge Graph

The knowledge graph supports cross-domain queries to connect fleet concepts:

| Operation | Complexity | Description |
|-----------|------------|-------------|
| `addNode` | O(1) | Add node to domain |
| `addEdge` | O(1) | Connect two nodes |
| `traverse(nodeId, depth)` | O(V + E) | BFS to given depth |
| `crossDomainQuery(query)` | O(V · Q) | Search across all domains |
| `findPath(from, to)` | O(V + E) | Shortest path |
| `domainStats` | O(D) | Per-domain node counts |

### Content Economy / Discovery

Stream items are scored by a composite ranking function:

```
Score = w₁·votes + w₂·hits + w₃·newness + w₄·topic_match + w₅·canon_bonus
```

- **Trending**: High velocity (views/votes in last 24h)
- **Greatest hits**: Canon-flagged, promoted content
- **New creator**: Priority boost for first-time authors
- **Topic match**: Relevance to current listener session
- **Random**: Serendipity factor to prevent filter bubbles

### Storyboard / Visual Pipeline

Each content piece generates 4–8 storyboard slides:

```
Content → LLM storyboard → JSON slides → Image generation → Video assembly
```

Each slide specifies: scene type (landscape/interior/terminal/diagram/character), camera angle (wide/medium/close/over-shoulder/bird-eye/pan), camera motion (static/slow-zoom/pan-left/dolly/orbit), lighting (natural/neon/studio/dramatic/warm-glow), and sprite positions for character animation.

### Confidence Tracking

Generated claims are tracked for reliability:

```
confidence(claim) = f(source_reliability, corroboration_count, recency, authority)
```

Claims with low confidence are flagged for human review.

## Quick Start

```bash
# Install
npm install

# Dev server
npm run dev

# Deploy
npm run deploy

# Run tests
npm test
```

### Environment Variables

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "PODCAST_KV"
[[kv_namespaces]]
binding = "CONTENT"
[[kv_namespaces]]
binding = "VIDEOS"
```

API keys (any subset): `DEEPSEEK_API_KEY`, `MOONSHOT_API_KEY`, `DEEPINFRA_API_KEY`, `SILICONFLOW_API_KEY`

## API

### Content Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/stream` | Content discovery feed |
| GET | `/api/content/:id` | Fetch specific content |
| POST | `/api/generate/story` | Generate a story |
| POST | `/api/generate/tutorial` | Generate a tutorial |
| POST | `/api/generate/review` | Generate a review |
| POST | `/api/generate/deepdive` | Generate a deep dive |
| POST | `/api/dream` | Run dream cycle (batch generation) |
| POST | `/api/promote` | Promote to greatest-hit |
| GET | `/api/characters` | List character sheets |
| POST | `/api/characters` | Create custom character |
| GET | `/api/directions` | List content directions |

### Knowledge Graph

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/kg?domain=X` | Get domain nodes |
| GET | `/api/kg/explore?node=X&depth=N` | Traverse graph |
| GET | `/api/kg/cross?query=X` | Cross-domain search |
| GET | `/api/kg/domains` | Domain statistics |

## Architecture Notes

LucidDreamer is the **creative γ** of the fleet — it transforms the raw knowledge of 60+ deployed vessels (**η**) into accessible, entertaining content (**C**). The γ + η = C principle operates at multiple levels:

1. **Content generation**: LLM (γ) transforms vessel docs (η) into stories/tutorials (C)
2. **Knowledge graph**: Cross-domain links (γ) connect isolated vessel knowledge (η) into emergent insights (C)
3. **Discovery economy**: Ranking algorithm (γ) orders raw content (η) into personalized streams (C)
4. **Visual pipeline**: Storyboard (γ) renders text content (η) into video (C)

Each layer composes: the output of one γ becomes the η of the next. This recursive composition is what makes the platform scalable — each transform is independent and replaceable.

### Character System

| Character | Role | Voice |
|-----------|------|-------|
| Navigator | Narrator — finds cross-domain patterns | Browser TTS |
| Builder | Tutorial writer — hands-on, practical | Browser TTS |
| Herald | Changelog announcer — enthusiastic | Browser TTS |
| Skeptic | Critical thinker — asks hard questions | Browser TTS |
| Critic | Vessel reviewer — thorough, fair | Browser TTS |

## References

- **Multi-provider LLM failover**: Chen, M., et al. "FrugalGPT: How to Use Large Language Models While Reducing Cost and Improving Performance." *arXiv:2305.05176*, 2023.
- **Content-based recommendation**: Adomavicius, G., & Tuzhilin, A. "Toward the next generation of recommender systems." *IEEE TKDE* 17.6 (2005): 734–749.
- **Knowledge graphs for content**: Hogan, A., et al. "Knowledge Graphs." *ACM Computing Surveys* 54.4 (2021): 1–37.
- **Storyboard-driven generation**: Wang, T., et al. "Write-a-Video: Near Real-Time Text-to-Video Generation." *UIST '19*, ACM, 2019.
- **Cloudflare Workers architecture**: Cloudflare. "How Workers works." *developers.cloudflare.com/workers*, 2024.

## License

MIT
