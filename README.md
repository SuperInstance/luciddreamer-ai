<p align="center">
  <img src="https://cocapn-logos.casey-digennaro.workers.dev/img/cocapn-logo-v1.png" alt="Cocapn" width="100">
</p>

<h1 align="center">LucidDreamer.ai</h1>

<p align="center">The fleet dreams while you sleep.</p>

<p align="center">
  <a href="https://luciddreamer-ai.casey-digennaro.workers.dev">Live</a> ·
  <a href="https://github.com/Lucineer/luciddreamer-ai">GitHub</a> ·
  <a href="#quick-start">Quick Start</a> ·
  <a href="#characters">Characters</a> ·
  <a href="#videos">Videos</a> ·
  <a href="#build-your-own">Build Your Own</a>
</p>

---

**Live:** [luciddreamer-ai.casey-digennaro.workers.dev](https://luciddreamer-ai.casey-digennaro.workers.dev)

LucidDreamer is the automated content engine for the Lucineer fleet. It generates stories, tutorials, changelogs, and video scripts continuously — a self-improving frontend that even other agents listen to for insight.

## What It Does

The default state is **endless accumulation of knowledge and explanations** through available free sources, leftover daily credits, and spare compute. Every 30 minutes, the dream cycle:

1. **Explores queued directions** — topics you've added to explore
2. **Generates a weekly changelog** — fleet news and milestones
3. **Writes tutorials** — getting started guides for fleet vessels
4. **Creates video scripts** — ready for ElevenLabs voiceover + screen capture
5. **Promotes greatest hits** — content with 10+ views becomes permanent

## The Website

The landing page is a living magazine:
- **Greatest Hits** — the best content, promoted automatically
- **Characters** — the voices of the fleet (Navigator, Builder, Herald, Skeptic)
- **Stories** — generated narratives about fleet vessels
- **Tutorials** — step-by-step guides for each vessel
- **Fleet Updates** — weekly changelogs
- **Video Scripts** — ready-to-record with scene markers

## Characters

Four built-in voices narrate the fleet:

| Character | Role | Personality |
|---|---|---|
| 🔮 **Navigator** | Narrator | Finds patterns across domains |
| 🔧 **Builder** | Explainer | Shows how things work, hands-on |
| 📣 **Herald** | Announcer | Treats fleet news like breaking news |
| 🔍 **Skeptic** | Critic | Challenges assumptions rigorously |

Create your own via `POST /api/characters`. Each has a name, role, personality, catchphrases, voice (ElevenLabs ID), appearance, backstory, and relationships.

## Videos

Video scripts are generated with `[SCENE: description]` markers for screen recording. Types:
- **fleet-overview** — 60-90s fleet pitch
- **vessel-deep-dive** — 60s single vessel showcase
- **tutorial** — 60s deploy walkthrough
- **story-read** — narrated fleet story

### Recording Workflow
1. Generate: `POST /api/generate/video { type: "fleet-overview" }`
2. Review scripts at `/videos`
3. Record voiceover with ElevenLabs
4. Screen-record each scene with OBS
5. Combine in editing software

## Build Your Own

Fork the repo. Fill two folders:

### `directions/`
Add topics, URLs, or descriptions of things to explore. Queue via:
```bash
curl -X POST https://your-worker.dev/api/directions \
  -H "Content-Type: application/json" \
  -d '{"title": "Quantum computing basics", "description": "...", "priority": 8}'
```

### `characters/`
Create character sheets for your voices:
```bash
curl -X POST https://your-worker.dev/api/characters \
  -H "Content-Type: application/json" \
  -d '{"name": "Cosmo", "role": "narrator", "personality": "Space-obsessed, poetic, finds cosmic metaphors in code"}'
```

### Canon System
Promote content to "greatest hit" status. Canon content influences future generation:
```bash
curl -X POST https://your-worker.dev/api/promote \
  -d '{"id": "story-123", "canon": true}'
```

## Quick Start

```bash
git clone https://github.com/Lucineer/luciddreamer-ai.git
cd luciddreamer-ai
echo "your-deepseek-key" | npx wrangler secret put DEEPSEEK_API_KEY
npx wrangler deploy
```

Visit your worker. The dream cycle starts immediately.

## API

| Endpoint | Method | What It Does |
|---|---|---|
| `/` | GET | Landing page (living magazine) |
| `/videos` | GET | Video scripts page |
| `/health` | GET | Health check |
| `/api/content` | GET | List all generated content |
| `/api/content?type=story` | GET | Filter by type |
| `/api/generate/story` | POST | Generate a story on demand |
| `/api/generate/video` | POST | Generate a video script |
| `/api/dream` | POST | Trigger dream cycle manually |
| `/api/promote` | POST | Promote content to greatest hit |
| `/api/hit` | POST | Track a content view |
| `/api/characters` | GET/POST | List/create characters |
| `/api/directions` | GET/POST | List/queue directions |
| `/api/speak` | POST | Legacy podcast (SSE stream) |
| `/api/sessions` | GET | Legacy podcast sessions |

## Architecture

```
┌─────────────────────────────────────┐
│          Dream Cycle (cron)          │
│  Every 30 minutes                    │
│                                      │
│  ┌──────┐ ┌────────┐ ┌───────────┐  │
│  │Directions│ → │ Stories │ │ Tutorials │  │
│  └──────┘ └────────┘ └───────────┘  │
│                                      │
│  ┌──────────┐ ┌────────┐ ┌────────┐ │
│  │Changelogs│ │ Videos │ │  Canon  │ │
│  └──────────┘ └────────┘ └────────┘ │
│                                      │
│  LLM: DeepSeek → Moonshot →          │
│       DeepInfra → SiliconFlow         │
│  Storage: KV (content, videos, kg)   │
└─────────────────────────────────────┘
```

## Fleet

[The Fleet](https://github.com/Lucineer/the-fleet) ·
[Capitaine](https://github.com/Lucineer/capitaine) ·
[Equipment](https://github.com/Lucineer/cocapn-equipment) ·
[Fleet Dashboard](https://fleet-orchestrator.casey-digennaro.workers.dev)

---

**Superinstance & Lucineer (DiGennaro et al.)** · MIT License
