# OmniRadio — Your Personal Podcast That Never Stops

A repo-native podcast engine. Tell it what to talk about. Interrupt to redirect. It learns your mind over time.

## The Big Idea

Podcasts are one-directional. OmniRadio is a conversation.

- **For the morning drive**: Describe what you want to hear. Listen 90%, interrupt 10%.
- **For the student**: Feed it a textbook. Banter your way through it. It learns your learning style.
- **For the creator**: Iterate with robotic voices, render with ElevenLabs for production.
- **For the curious**: Endless generation on any topic. Vibe-code new personalities.

## Architecture

### Engine (`src/podcast/engine.ts`)
- **Personality system** — Create hosts, cohosts, guests with distinct voices, traits, catchphrases
- **Topic manager** — Queue, drill down, suggest related topics
- **Growth engine** — Tracks attention span, preferred topics, moods, learning style
- **Session manager** — Create, pause, resume, archive podcast sessions
- **Conversation orchestrator** — Builds context-aware prompts for natural multi-person dialogue

### Worker (`src/worker.ts`)
- SSE streaming from DeepSeek for real-time generation
- Pluggable TTS: browser (free), ElevenLabs (premium)
- Session persistence in KV
- Personality CRUD — vibe-code new hosts/guests
- Topic management with depth control (headline → rabbit hole)
- Listener preference tracking that improves over time

### The Cocapn Difference

This is not a chatbot that plays podcast. The repo IS the podcast studio.

- Every session is saved, searchable, rewritable
- Personalities accumulate character over time
- The system learns what engages YOU, not generic audiences
- A 1-year-old repo produces a personalized experience no competitor can match
- The creator who builds on this for a year has an irreplaceable asset

## Future Vision (Gen 2)

- **MIDI/Endless Music**: Same interrupt model for generative music. Your feedback shapes the sound.
- **Gesture Control**: Camera/mic for real-time cues — like conducting a jam band.
- **Phone Call Mode**: Companion that talks like a real phone conversation, not a podcast.
- **Multi-Listener**: Friends join the same session, each with their own preferences.
- **Local LLM**: Run entirely on-device for privacy. Ollama for free, zero API costs.

## Deploy

1. Fork this repo
2. Set DEEPSEEK_API_KEY as Worker secret
3. Set up KV namespace
4. Deploy to Cloudflare Workers

## Compare to OpenEdu

OpenEdu does educational podcasts. OmniRadio does everything — education, news, philosophy, music, creativity. It's not a podcast app. It's omni-radio: whatever frequency you're on.

Author: Superinstance
