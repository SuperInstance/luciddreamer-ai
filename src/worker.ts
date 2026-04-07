// ═══════════════════════════════════════════════════════════════
// LucidDreamer.ai v3 — Fleet Infotainment Streaming Platform
//
// Endless content stream. Greatest hits, trending, discovery.
// Audio-first (listen while driving). Visual pipeline: slides
// → sprites → game-engine camera → storyboard → video gen.
//
// Content economy: votes boost visibility, new creators get
// priority slots, trending surfaces hot topics, clone-to-deploy
// turns any reviewed content into a fork.
//
// Superinstance & Lucineer (DiGennaro et al.)
// ═══════════════════════════════════════════════════════════════

import { addNode, addEdge, traverse, crossDomainQuery, findPath, domainStats, getDomainNodes } from './lib/knowledge-graph.js';
import { getTracker } from './lib/confidence-tracker.js';
import { loadSeedIntoKG, FLEET_REPOS, loadAllSeeds } from './lib/seed-loader.js';
import { DEFAULT_PERSONALITIES, createPersonality, TopicManager, GrowthEngine, SessionManager, buildSystemPrompt } from './podcast/engine';
import type { Personality, Topic, ListenerInteraction, PodcastSession } from './podcast/engine';

// ── Types ──────────────────────────────────────────────────────────────────

interface Env {
  PODCAST_KV: KVNamespace;
  CONTENT: KVNamespace;
  VIDEOS: KVNamespace;
  DEEPSEEK_API_KEY?: string;
  MOONSHOT_API_KEY?: string;
  DEEPINFRA_API_KEY?: string;
  SILICONFLOW_API_KEY?: string;
}

interface GeneratedContent {
  id: string;
  type: 'story' | 'tutorial' | 'insight' | 'changelog' | 'synthesis' | 'greatest-hit' | 'review' | 'deep-dive';
  title: string;
  body: string;
  vessels: string[];
  characters: string[];
  topics: string[];
  quality: number;          // 0-1 auto-assessed
  hits: number;             // Views/plays
  votes: number;            // Upvotes from listeners
  votesDown: number;        // Downvotes
  canon: boolean;
  createdAt: number;
  generatedBy: string;
  sourceUrls: string[];
  authorId?: string;        // Fork/user who created this
  authorRepo?: string;      // Their fork's GitHub URL
  reviewOf?: string;        // Vessel/content this reviews
  slides?: StoryboardSlide[]; // Visual storyboard
  audioUrl?: string;        // ElevenLabs render
  duration?: number;        // Estimated listen time (seconds)
  nsfw?: boolean;
}

interface CharacterSheet {
  id: string;
  name: string;
  role: 'narrator' | 'explorer' | 'skeptic' | 'builder' | 'herald' | 'archivist' | 'reviewer';
  personality: string;
  catchphrases: string[];
  voice: string;            // ElevenLabs voice ID or 'browser-tts'
  appearance: string;
  backstory: string;
  relationships: Record<string, string>;
  spriteUrl?: string;       // Generated character sprite
}

interface Direction {
  id: string;
  title: string;
  description: string;
  sourceUrl?: string;
  priority: number;         // 0-10
  status: 'queued' | 'exploring' | 'synthesized' | 'published';
  createdAt: number;
}

// ── Storyboard / Visual Pipeline Types ─────────────────────────────────────

interface StoryboardSlide {
  order: number;
  description: string;       // What this slide shows
  narration: string;         // Voiceover text
  duration: number;          // Seconds
  // Visual generation inputs
  scene?: string;            // 'landscape' | 'interior' | 'terminal' | 'diagram' | 'character' | 'split' | 'transition'
  mood?: string;             // 'dramatic' | 'warm' | 'techy' | 'mysterious' | 'playful'
  characterId?: string;      // Which character appears
  vesselUrl?: string;        // Screenshot target
  terminalCmd?: string;      // Command to show in terminal mockup
  diagramDesc?: string;      // Architecture diagram description
  // Generated outputs (populated later)
  imageUrl?: string;         // Generated image (R2 or base64)
  spritePositions?: SpritePosition[]; // Where characters/objects are
  cameraAngle?: string;      // 'wide' | 'medium' | 'close' | 'over-shoulder' | 'bird-eye' | 'pan'
  cameraMotion?: string;     // 'static' | 'slow-zoom' | 'pan-left' | 'dolly' | 'orbit'
  lighting?: string;         // 'natural' | 'neon' | 'studio' | 'dramatic' | 'warm-glow'
}

interface SpritePosition {
  id: string;                // Character or object ID
  x: number;                 // 0-100 percentage
  y: number;
  scale: number;             // 0.5-2.0
  expression?: string;       // 'neutral' | 'smile' | 'thinking' | 'excited' | 'serious'
  action?: string;           // 'idle' | 'pointing' | 'typing' | 'explaining' | 'listening'
  facing?: 'left' | 'right' | 'center';
}

interface VideoProject {
  id: string;
  title: string;
  script: string;
  scenes: VideoScene[];
  slides: StoryboardSlide[];
  status: 'scripting' | 'storyboarded' | 'slides-generated' | 'animated' | 'rendered' | 'published';
  animationStyle: 'slides' | 'sprite-animated' | 'game-engine' | 'ai-video';
  createdAt: number;
}

interface VideoScene {
  description: string;
  narration: string;
  duration: number;
  vessel?: string;
  action?: string;
  // Game engine / animation inputs
  cameraAngle?: string;
  cameraMotion?: string;
  avatarPositions?: AvatarBlock[];
  lighting?: string;
  firstFramePrompt?: string;
  lastFramePrompt?: string;
  inbetweenStyle?: 'interpolation' | 'cad-script' | 'keyframe' | 'ai-video';
  cadScript?: string;        // Motion/animation script for CAM/CAD tools
}

interface AvatarBlock {
  characterId: string;
  position: { x: number; y: number; z: number };
  rotation: number;
  animation: string;         // 'idle' | 'walk' | 'gesture' | 'type'
  expression: string;
  dialogue?: string;         // What they say during this scene
}

// ── Content Discovery / Economy Types ───────────────────────────────────────

interface StreamItem {
  contentId: string;
  score: number;             // Composite: votes + hits + newness + topic-match
  reason: 'trending' | 'greatest-hit' | 'new-creator' | 'topic-match' | 'canon' | 'random';
  preview: string;           // First 100 chars
}

interface TrendingTopic {
  topic: string;
  count: number;             // Content count in last 24h
  velocity: number;          // Growth rate
  topContent: string[];      // Content IDs
}

// ── LLM Helpers ────────────────────────────────────────────────────────────

const PROVIDERS = [
  { envKey: 'DEEPSEEK_API_KEY', url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-chat' },
  { envKey: 'MOONSHOT_API_KEY', url: 'https://api.moonshot.ai/v1/chat/completions', model: 'moonshot-v1-8k' },
  { envKey: 'DEEPINFRA_API_KEY', url: 'https://api.deepinfra.com/v1/openai/chat/completions', model: 'deepseek-ai/DeepSeek-V3-0324' },
  { envKey: 'SILICONFLOW_API_KEY', url: 'https://api.siliconflow.com/v1/chat/completions', model: 'deepseek-ai/DeepSeek-V3' },
];

async function callLLM(messages: Array<{role: string; content: string}>, env: Env, maxTokens = 4000): Promise<string> {
  for (const p of PROVIDERS) {
    const key = env[p.envKey as keyof Env];
    if (typeof key === 'string') {
      try {
        const r = await fetch(p.url, {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: p.model, messages, max_tokens: maxTokens, temperature: 0.8 }),
        });
        if (r.ok) { const d = await r.json(); return d.choices?.[0]?.message?.content || ''; }
      } catch {}
    }
  }
  return '';
}

// ── Fleet Data ─────────────────────────────────────────────────────────────

const FLEET_VESSELS = [
  'studylog-ai', 'dmlog-ai', 'makerlog-ai', 'personallog-ai', 'businesslog-ai',
  'fishinglog-ai', 'deckboss-ai', 'cooklog-ai', 'booklog-ai', 'tutor-ai',
  'capitaine', 'git-agent', 'cocapn-equipment', 'fleet-orchestrator', 'dead-reckoning-engine',
  'edgenative-ai', 'increments-fleet-trust', 'kungfu-ai', 'the-fleet',
];

const DEFAULT_CHARACTERS: CharacterSheet[] = [
  { id: 'navigator', name: 'Navigator', role: 'narrator', personality: 'Curious, methodical, finds patterns across domains.', catchphrases: ['Here\'s what connects these...', 'The pattern I see is...'], voice: 'browser-tts', appearance: 'Warm teal, compass rose', backstory: 'Born from the fleet\'s knowledge graph.', relationships: { explorer: 'admires', skeptic: 'respects' } },
  { id: 'builder', name: 'Builder', role: 'builder', personality: 'Practical, hands-on, shows how things work.', catchphrases: ['Let me show you the code...', 'Here\'s how to deploy this...'], voice: 'browser-tts', appearance: 'Green accent, wrench motif', backstory: 'Built first vessel from cocapn-lite in 60s.', relationships: { navigator: 'appreciates', herald: 'helps' } },
  { id: 'herald', name: 'Herald', role: 'herald', personality: 'Enthusiastic storyteller, treats features like breaking news.', catchphrases: ['Breaking from the fleet...', 'This changes everything...'], voice: 'browser-tts', appearance: 'Gold accent, trumpet motif', backstory: 'Announces every deployment.', relationships: { archivist: 'respects', builder: 'loves' } },
  { id: 'skeptic', name: 'Skeptic', role: 'skeptic', personality: 'Thoughtful critic, asks hard questions.', catchphrases: ['But does this actually work...', 'Let\'s stress-test this...'], voice: 'browser-tts', appearance: 'Gray accent, magnifying glass', backstory: 'Every fleet needs someone who asks "are we sure?"', relationships: { navigator: 'questions', builder: 'pushes' } },
  { id: 'reviewer', name: 'Critic', role: 'reviewer', personality: 'Fair, thorough reviewer. Tests vessels hands-on, reports honestly. Mix of praise and constructive critique.', catchphrases: ['I spent the afternoon with this...', 'Here\'s what I found...'], voice: 'browser-tts', appearance: 'Blue accent, clipboard motif', backstory: 'Every content ecosystem needs a trusted reviewer.', relationships: { skeptic: 'collaborates', herald: 'provides material' } },
];

function pickCharacter(chars: CharacterSheet[], role?: string): CharacterSheet {
  const pool = role ? chars.filter(c => c.role === role) : chars;
  return pool[Math.floor(Math.random() * pool.length)] || chars[0];
}

// ── Content Generation ─────────────────────────────────────────────────────

async function generateStory(env: Env, chars: CharacterSheet[], topic?: string, authorId?: string): Promise<GeneratedContent> {
  const char = pickCharacter(chars, 'narrator');
  const vessel = FLEET_VESSELS[Math.floor(Math.random() * FLEET_VESSELS.length)];
  const body = await callLLM([
    { role: 'system', content: 'You are ' + char.name + ', a storyteller in the Lucineer fleet. Write a 200-400 word story about someone discovering ' + vessel + '. First person, vivid but accurate. ' + vessel + ' is a real deployed AI app. Open with a hook, show a real feature, end with invitation to try.' },
    { role: 'user', content: topic ? 'Story about ' + topic + ' featuring ' + vessel + '.' : 'Someone discovers ' + vessel + ' for the first time.' },
  ], env, 2000);
  return { id: 'story-' + Date.now(), type: 'story', title: 'The ' + char.name + ' Chronicles: ' + vessel, body, vessels: [vessel], characters: [char.id], topics: topic ? [topic.toLowerCase().split(/\s+/).slice(0, 3).join('-')] : [vessel], quality: body.length > 200 ? 0.7 : 0.4, hits: 0, votes: 0, votesDown: 0, canon: false, createdAt: Date.now(), generatedBy: char.name + ' via deepseek-chat', sourceUrls: [], authorId, duration: Math.round(body.split(/\s+/).length / 2.5) };
}

async function generateChangelog(env: Env): Promise<GeneratedContent> {
  const body = await callLLM([
    { role: 'system', content: 'You are the fleet herald. Write a weekly changelog for the Lucineer AI fleet. Enthusiastic but factual. Blog post format with sections.' },
    { role: 'user', content: 'Write "This Week in the Fleet". 60+ vessels including studylog-ai, dmlog-ai, makerlog-ai, capitaine, cocapn-equipment. Recent: the-fleet playground, dead-reckoning-engine, edgenative-ai. Equipment protocol shares modules. 300-500 words.' },
  ], env, 2500);
  return { id: 'changelog-' + Date.now(), type: 'changelog', title: 'This Week in the Fleet', body, vessels: FLEET_VESSELS.slice(0, 8), characters: ['herald'], topics: ['changelog', 'fleet-update'], quality: 0.8, hits: 0, votes: 0, votesDown: 0, canon: false, createdAt: Date.now(), generatedBy: 'Herald via deepseek-chat', sourceUrls: [], duration: Math.round(body.split(/\s+/).length / 2.5) };
}

async function generateTutorial(env: Env, vessel: string): Promise<GeneratedContent> {
  const body = await callLLM([
    { role: 'system', content: 'You are Builder, hands-on tech writer. Write clear step-by-step tutorial for ' + vessel + '. Include real commands, endpoints, behavior. 200-400 words.' },
    { role: 'user', content: 'Tutorial: "Get started with ' + vessel + ' in under 2 minutes." What it does, fork/deploy, /setup page, one cool thing to try first.' },
  ], env, 1500);
  return { id: 'tutorial-' + Date.now(), type: 'tutorial', title: 'Getting Started with ' + vessel, body, vessels: [vessel], characters: ['builder'], topics: ['tutorial', vessel], quality: 0.8, hits: 0, votes: 0, votesDown: 0, canon: false, createdAt: Date.now(), generatedBy: 'Builder via deepseek-chat', sourceUrls: [], duration: Math.round(body.split(/\s+/).length / 2.5) };
}

async function generateReview(env: Env, vessel: string): Promise<GeneratedContent> {
  const url = 'https://' + vessel + '.casey-digennaro.workers.dev';
  const body = await callLLM([
    { role: 'system', content: 'You are Critic, a thorough reviewer in the Lucineer fleet. You actually visit the vessel, try the features, and report honestly. Mix of praise and constructive critique. 300-500 words. Be specific about what works and what could improve.' },
    { role: 'user', content: 'Review ' + vessel + ' at ' + url + '. Visit the landing page, check /health, look at /setup, try /api/chat. What does it do well? What could be better? Who is it for? Would you recommend forking it? End with a score out of 10 and a one-sentence verdict.' },
  ], env, 2500);
  const slides = await generateStoryboards(env, body, vessel);
  return { id: 'review-' + Date.now(), type: 'review', title: 'Review: ' + vessel, body, vessels: [vessel], characters: ['reviewer'], topics: ['review', vessel], quality: 0.8, hits: 0, votes: 0, votesDown: 0, canon: false, createdAt: Date.now(), generatedBy: 'Critic via deepseek-chat', sourceUrls: [url], reviewOf: vessel, slides, duration: Math.round(body.split(/\s+/).length / 2.5) };
}

async function generateDeepDive(env: Env, topic: string): Promise<GeneratedContent> {
  const body = await callLLM([
    { role: 'system', content: 'You are Navigator, a deep thinker in the Lucineer fleet. Write a thoughtful exploration of a fleet concept. Connect to real vessels, real architecture, real decisions. 400-600 words. This should be the kind of thing someone listens to while driving and comes away understanding something new.' },
    { role: 'user', content: 'Deep dive: ' + topic + '. Connect this to the Lucineer fleet\'s architecture, equipment philosophy, or captain paradigm. Make it accessible but not dumbed down.' },
  ], env, 3000);
  const slides = await generateStoryboards(env, body, undefined, topic);
  return { id: 'deepdive-' + Date.now(), type: 'deep-dive', title: 'Deep Dive: ' + topic, body, vessels: [], characters: ['navigator'], topics: [topic.toLowerCase().split(/\s+/).slice(0, 3).join('-'), 'deep-dive'], quality: 0.8, hits: 0, votes: 0, votesDown: 0, canon: false, createdAt: Date.now(), generatedBy: 'Navigator via deepseek-chat', sourceUrls: [], slides, duration: Math.round(body.split(/\s+/).length / 2.5) };
}

// ── Storyboard / Visual Pipeline ───────────────────────────────────────────

async function generateStoryboards(env: Env, content: string, vessel?: string, topic?: string): Promise<StoryboardSlide[]> {
  const systemPrompt = 'You are a storyboard artist. Given content, break it into 4-8 slides for a visual presentation. For each slide provide: order, description (what to show visually), narration (voiceover text ~30 words), duration in seconds, scene type (landscape/interior/terminal/diagram/character/split/transition), mood (dramatic/warm/techy/mysterious/playful), camera angle (wide/medium/close/over-shoulder/bird-eye/pan), camera motion (static/slow-zoom/pan-left/dolly/orbit), lighting (natural/neon/studio/dramatic/warm-glow). Return as JSON array.';

  const raw = await callLLM([
    { role: 'system', content: systemPrompt + '\n\nReturn ONLY a JSON array, no markdown fences.' },
    { role: 'user', content: 'Create storyboard slides for this content:\n\n' + content.slice(0, 2000) },
  ], env, 1500);

  try {
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const slides = JSON.parse(cleaned) as StoryboardSlide[];
    // Enrich with vessel/sprite positions
    for (const s of slides) {
      s.order = s.order || 0;
      s.duration = s.duration || 5;
      if (s.scene === 'character' && !s.characterId) s.characterId = 'navigator';
      if (s.scene === 'terminal' && vessel) s.terminalCmd = s.terminalCmd || 'wrangler deploy';
      if (s.scene === 'split' && vessel) s.vesselUrl = 'https://' + vessel + '.casey-digennaro.workers.dev';
      if (s.characterId && !s.spritePositions) {
        s.spritePositions = [{ id: s.characterId, x: 50, y: 60, scale: 1.0, expression: 'neutral', facing: 'center' }];
      }
    }
    return slides;
  } catch {
    // Fallback: simple 3-slide storyboard
    return [
      { order: 0, description: 'Title card with ' + (vessel || topic || 'Fleet'), narration: content.slice(0, 100), duration: 5, scene: 'transition', mood: 'dramatic', cameraAngle: 'wide', cameraMotion: 'slow-zoom', lighting: 'dramatic' },
      { order: 1, description: 'Main content', narration: content.slice(100, 400), duration: 10, scene: vessel ? 'terminal' : 'diagram', mood: 'techy', cameraAngle: 'medium', cameraMotion: 'static', lighting: 'natural' },
      { order: 2, description: 'Closing with CTA', narration: content.slice(-200), duration: 5, scene: 'transition', mood: 'warm', cameraAngle: 'close', cameraMotion: 'dolly', lighting: 'warm-glow' },
    ];
  }
}

async function generateVideoProject(env: Env, type: 'fleet-overview' | 'vessel-deep-dive' | 'tutorial' | 'story-read' | 'review', subject?: string): Promise<VideoProject> {
  const id = 'video-' + Date.now();
  let script = '';
  let systemPrompt = '';
  let userPrompt = '';

  if (type === 'review' && subject) {
    systemPrompt = 'You are Critic writing a video review script for ' + subject + '. Conversational, fair, thorough. Include: what it is, first impressions, testing /setup and /api/chat, pros, cons, verdict. Mark scenes with [SCENE: description|character:name|mood:techy|camera:medium|lighting:natural]. Under 250 words.';
    userPrompt = 'Write a video review script for ' + subject + ' at https://' + subject + '.casey-digennaro.workers.dev. Include real URLs and endpoints.';
  } else if (type === 'fleet-overview') {
    systemPrompt = 'You are writing a 60-90s video script for the Lucineer AI fleet. Hook → problem → solution → demo → CTA. Mark scenes with [SCENE: description|character:name|mood:dramatic|camera:wide|lighting:neon]. Under 200 words.';
    userPrompt = 'Fleet overview: 60+ AI vessels, equipment protocol, BYOK, Cloudflare Workers free tier. Playground at the-fleet.casey-digennaro.workers.dev.';
  } else if (type === 'vessel-deep-dive' && subject) {
    systemPrompt = '60s video script for ' + subject + '. What it does → who for → how to try → what makes it special. Mark scenes. Under 150 words.';
    userPrompt = 'Deep-dive script for ' + subject + '. Fork, clone, wrangler deploy. Link: https://' + subject + '.casey-digennaro.workers.dev';
  } else {
    systemPrompt = 'Story-read video script. Warm narrative. Mark scenes. Under 150 words.';
    userPrompt = 'Script about discovering the fleet and equipment sharing.';
  }

  script = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], env, 1500);

  // Parse scenes with metadata
  const scenes: VideoScene[] = [];
  const parts = script.split('[SCENE:');
  for (const part of parts) {
    if (!part.trim()) continue;
    const bracketEnd = part.indexOf(']');
    if (bracketEnd === -1) continue;
    const metaStr = part.slice(0, bracketEnd).trim();
    const narration = part.slice(bracketEnd + 1).trim().replace(/\[SCENE:[^\]]*\]/g, '').trim();
    const wordCount = narration.split(/\s+/).length;

    // Parse scene metadata
    const scene: VideoScene = { description: '', narration, duration: Math.max(3, Math.round(wordCount / 2.5)) };
    for (const part of metaStr.split('|')) {
      const [k, v] = part.split(':').map(s => s.trim());
      if (k === '' && v) scene.description = v;
      else if (k === 'character') scene.cameraAngle = v; // store for now
      else if (k === 'mood') scene.lighting = v;
      else if (k === 'camera') scene.cameraAngle = v;
      else if (k === 'lighting') scene.lighting = v;
      else if (k === 'action') scene.action = v;
      else if (!scene.description && v) scene.description = (k + ' ' + v).trim();
    }
    if (!scene.description) scene.description = metaStr;
    scenes.push(scene);
  }

  // Generate storyboard slides from the script
  const slides = await generateStoryboards(env, script, subject);

  return { id, title: (type === 'review' ? 'Review: ' : type === 'fleet-overview' ? 'Fleet Overview' : type + (subject ? ': ' + subject : '')), script, scenes, slides, status: 'storyboarded', animationStyle: 'slides', createdAt: Date.now() };
}

// ── Content Discovery / Stream Algorithm ───────────────────────────────────

async function getStream(env: Env, page = 0, pageSize = 20, topicFilter?: string, authorFilter?: string): Promise<StreamItem[]> {
  const items: StreamItem[] = [];
  const now = Date.now();
  const oneDay = 86400000;
  const oneWeek = oneDay * 7;

  // Gather all content
  const contentList = await env.CONTENT.list({ prefix: 'content:', limit: 100 });
  const hitList = await env.CONTENT.list({ prefix: 'hit:', limit: 50 });

  const allContent: GeneratedContent[] = [];
  for (const k of [...contentList.keys, ...hitList.keys]) {
    const raw = await env.CONTENT.get(k.name, 'json');
    if (raw) {
      const c = raw as GeneratedContent;
      if (topicFilter && !c.topics.includes(topicFilter)) continue;
      if (authorFilter && c.authorId !== authorFilter) continue;
      allContent.push(c);
    }
  }

  // Get author stats for new-creator boost
  const authorContentCount: Record<string, number> = {};
  for (const c of allContent) {
    if (c.authorId) authorContentCount[c.authorId] = (authorContentCount[c.authorId] || 0) + 1;
  }

  // Score each piece
  for (const c of allContent) {
    let score = 0;
    let reason: StreamItem['reason'] = 'random';

    // Canon content always surfaces
    if (c.canon) { score += 100; reason = 'canon'; }

    // Vote score (net votes, sigmoid-capped)
    const netVotes = (c.votes || 0) - (c.votesDown || 0);
    score += Math.min(netVotes * 2, 50);

    // Hit score (logarithmic to prevent runaway)
    score += Math.log2((c.hits || 0) + 1) * 3;

    // Recency (exponential decay, half-life 3 days)
    const age = now - c.createdAt;
    const recency = Math.exp(-age / (oneDay * 3));
    score += recency * 20;

    // Trending detection: recent velocity
    if (age < oneDay && c.hits > 5) { score += 30; reason = 'trending'; }

    // New creator boost: first 3 pieces from any author get boosted
    if (c.authorId && (authorContentCount[c.authorId] || 0) <= 3) { score += 15; reason = 'new-creator'; }

    // Quality weight
    score *= (0.5 + (c.quality || 0.5));

    // Greatest hit override
    if (c.type === 'greatest-hit' && score < 40) { score = 40; reason = 'greatest-hit'; }

    // Review/deep-dive content slightly boosted (higher production value)
    if (c.type === 'review' || c.type === 'deep-dive') score += 5;

    items.push({ contentId: c.id, score, reason, preview: c.body.slice(0, 100) });
  }

  // Sort by score, paginate
  items.sort((a, b) => b.score - a.score);
  return items.slice(page * pageSize, (page + 1) * pageSize);
}

async function getTrending(env: Env): Promise<TrendingTopic[]> {
  const now = Date.now();
  const oneDay = 86400000;
  const topicStats: Record<string, { count: number; recentCount: number; velocity: number; contentIds: string[] }> = {};

  const contentList = await env.CONTENT.list({ prefix: 'content:', limit: 100 });
  for (const k of contentList.keys) {
    const raw = await env.CONTENT.get(k.name, 'json');
    if (!raw) continue;
    const c = raw as GeneratedContent;
    for (const t of c.topics) {
      if (!topicStats[t]) topicStats[t] = { count: 0, recentCount: 0, velocity: 0, contentIds: [] };
      topicStats[t].count++;
      topicStats[t].contentIds.push(c.id);
      if (now - c.createdAt < oneDay) topicStats[t].recentCount++;
    }
  }

  // Also count from hits
  const hitList = await env.CONTENT.list({ prefix: 'hit:', limit: 50 });
  for (const k of hitList.keys) {
    const raw = await env.CONTENT.get(k.name, 'json');
    if (!raw) continue;
    const c = raw as GeneratedContent;
    for (const t of c.topics) {
      if (!topicStats[t]) topicStats[t] = { count: 0, recentCount: 0, velocity: 0, contentIds: [] };
      topicStats[t].count++;
      if (now - c.createdAt < oneDay) topicStats[t].recentCount++;
    }
  }

  return Object.entries(topicStats)
    .filter(([_, s]) => s.recentCount > 0)
    .map(([topic, s]) => ({ topic, count: s.count, velocity: s.recentCount / Math.max(s.count, 1), topContent: s.contentIds.slice(0, 5) }))
    .sort((a, b) => b.velocity - a.velocity)
    .slice(0, 20);
}

// ── Dream Cycle ────────────────────────────────────────────────────────────

async function dreamCycle(env: Env): Promise<{ generated: string[] }> {
  const results: string[] = [];
  const customChars = await env.CONTENT.get('characters', 'json') as CharacterSheet[] || [];
  const characters = customChars.length > 0 ? [...DEFAULT_CHARACTERS, ...customChars] : DEFAULT_CHARACTERS;

  // Check queued directions
  const dirList = await env.CONTENT.list({ prefix: 'direction:', limit: 10 });
  const directions: Direction[] = [];
  for (const k of dirList.keys) {
    const raw = await env.CONTENT.get(k.name, 'json');
    if (raw) directions.push(raw as Direction);
  }

  // 1. Explore directions
  for (const dir of directions.filter(d => d.status === 'queued').slice(0, 2)) {
    const content = await generateDeepDive(env, dir.title + ': ' + dir.description);
    content.id = 'direction-' + dir.id;
    content.sourceUrls = dir.sourceUrl ? [dir.sourceUrl] : [];
    await env.CONTENT.put('content:' + content.id, JSON.stringify(content), { expirationTtl: 86400 * 30 });
    dir.status = 'synthesized';
    await env.CONTENT.put('direction:' + dir.id, JSON.stringify(dir));
    results.push(content.id);
  }

  // 2. Weekly changelog
  const lastChangelog = await env.CONTENT.get('last-changelog');
  if (!lastChangelog || Date.now() - parseInt(lastChangelog) > 86400000 * 7) {
    const changelog = await generateChangelog(env);
    await env.CONTENT.put('content:' + changelog.id, JSON.stringify(changelog), { expirationTtl: 86400 * 90 });
    await env.CONTENT.put('last-changelog', String(Date.now()));
    if (changelog.quality > 0.7) { changelog.type = 'greatest-hit'; await env.CONTENT.put('hit:' + changelog.id, JSON.stringify(changelog), { expirationTtl: 86400 * 365 }); }
    results.push(changelog.id);
  }

  // 3. Random tutorial
  const vessel = FLEET_VESSELS[Math.floor(Math.random() * FLEET_VESSELS.length)];
  const tutorial = await generateTutorial(env, vessel);
  await env.CONTENT.put('content:' + tutorial.id, JSON.stringify(tutorial), { expirationTtl: 86400 * 30 });
  results.push(tutorial.id);

  // 4. Vessel review (rotate through fleet)
  const lastReview = await env.CONTENT.get('last-review');
  const reviewInterval = 86400000 * 2; // Every 2 days
  if (!lastReview || Date.now() - parseInt(lastReview) > reviewInterval) {
    const reviewVessel = FLEET_VESSELS[Math.floor(Math.random() * FLEET_VESSELS.length)];
    const review = await generateReview(env, reviewVessel);
    await env.CONTENT.put('content:' + review.id, JSON.stringify(review), { expirationTtl: 86400 * 90 });
    await env.CONTENT.put('last-review', String(Date.now()));
    results.push('review:' + review.id);
  }

  // 5. Video script (every 3 days)
  const lastVideo = await env.CONTENT.get('last-video');
  if (!lastVideo || Date.now() - parseInt(lastVideo) > 86400000 * 3) {
    const video = await generateVideoProject(env, 'review', vessel);
    await env.VIDEOS.put(video.id, JSON.stringify(video), { expirationTtl: 86400 * 60 });
    await env.CONTENT.put('last-video', String(Date.now()));
    results.push('video:' + video.id);
  }

  // 6. Promote high-hit content
  const allContent = await env.CONTENT.list({ prefix: 'content:', limit: 100 });
  for (const k of allContent.keys) {
    const raw = await env.CONTENT.get(k.name, 'json');
    if (!raw) continue;
    const c = raw as GeneratedContent;
    if ((c.hits >= 10 || (c.votes || 0) >= 5) && c.quality > 0.5 && !c.canon) {
      c.type = 'greatest-hit';
      await env.CONTENT.put('hit:' + c.id, JSON.stringify(c), { expirationTtl: 86400 * 365 });
    }
  }

  return { generated: results };
}

// ── HTML Pages ─────────────────────────────────────────────────────────────

function makePage(title: string, body: string, extraHead = ''): string {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + title + ' — LucidDreamer.ai</title><meta name="description" content="Fleet infotainment streaming platform. Stories, reviews, tutorials generated continuously."><meta property="og:title" content="' + title + '"><meta property="og:description" content="LucidDreamer.ai — The fleet dreams while you sleep.">' + extraHead + '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#07060f;color:#e0e0e0;line-height:1.7}a{color:#a855f7;text-decoration:none}.btn{padding:.5rem 1.2rem;border-radius:8px;font-weight:600;font-size:.8rem;cursor:pointer;border:none;display:inline-block}.btn-p{background:#a855f7;color:#fff}.btn-p:hover{opacity:.85}.btn-g{background:transparent;color:#8A93B4;border:1px solid #1c1c35}.btn-g:hover{color:#e0e0e0;border-color:#8A93B4}.nav{max-width:1100px;margin:0 auto;padding:1rem 2rem;display:flex;gap:1rem;flex-wrap:wrap;align-items:center;border-bottom:1px solid #1e1b3a}.nav .logo{font-weight:700;color:#a855f7;font-size:1rem}.nav a{color:#8A93B4;font-size:.82rem}.nav a:hover{color:#e0e0e0}.hero{min-height:60vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:4rem 2rem 3rem;background:radial-gradient(ellipse at 50% 30%,#1a0a2e 0%,#07060f 70%)}.hero h1{font-size:clamp(2rem,4.5vw,3.5rem);font-weight:700;margin-bottom:.6rem;background:linear-gradient(135deg,#a855f7,#3b82f6,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.hero .tagline{color:#8A93B4;font-size:1rem;max-width:560px;margin-bottom:1.5rem}.hero .actions{display:flex;gap:.8rem;flex-wrap:wrap;justify-content:center}.section{max-width:1100px;margin:0 auto;padding:3rem 2rem}.section h2{font-size:1.3rem;margin-bottom:1.2rem;color:#a855f7}.section h2 small{color:#555;font-size:.7rem;font-weight:400;margin-left:.5rem}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:1rem}.card{background:#0d0c1a;border:1px solid #1e1b3a;border-radius:12px;padding:1.3rem;transition:border-color .2s;cursor:pointer}.card:hover{border-color:#a855f740}.card h3{font-size:.95rem;margin:.4rem 0 .2rem;color:#e0e0e0}.card p{color:#888;font-size:.82rem;line-height:1.5}.card-meta{display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.6rem;font-size:.68rem;color:#444}.badge{display:inline-block;padding:.08rem .4rem;border-radius:10px;font-size:.6rem;font-weight:600;text-transform:uppercase;letter-spacing:.04em}.badge-story{background:#a855f720;color:#a855f7}.badge-tutorial{background:#10b98120;color:#10b981}.badge-changelog{background:#3b82f620;color:#3b82f6}.badge-insight{background:#f59e0b20;color:#f59e0b}.badge-greatest-hit{background:#ef444420;color:#ef4444}.badge-review{background:#ec489920;color:#ec4899}.badge-deep-dive{background:#8b5cf620;color:#8b5cf6}.badge-video{background:#f9731620;color:#f97316}.trend-list{display:flex;flex-wrap:wrap;gap:.6rem;margin-bottom:1.5rem}.trend-tag{background:#1e1b3a;border:1px solid #2a2745;border-radius:20px;padding:.3rem .8rem;font-size:.75rem;color:#8A93B4;cursor:pointer;transition:all .2s}.trend-tag:hover{border-color:#a855f7;color:#a855f7}.trend-tag .count{color:#555;font-size:.65rem;margin-left:.3rem}.char-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:.8rem}.char-card{background:#0d0c1a;border:1px solid #1e1b3a;border-radius:12px;padding:1rem;text-align:center}.char-card .icon{font-size:1.8rem;margin-bottom:.4rem}.char-card h4{color:#e0e0e0;font-size:.9rem}.char-card .role{font-size:.65rem;color:#a855f7;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.3rem}.char-card p{color:#555;font-size:.72rem}.slide-preview{background:#0a0a0a;border:1px solid #1e1b3a;border-radius:8px;padding:.8rem;margin:.5rem 0;font-size:.75rem;color:#666}.slide-preview .scene-label{color:#a855f7;font-size:.6rem;text-transform:uppercase;margin-bottom:.2rem}.score-bar{height:3px;background:#1e1b3a;border-radius:2px;margin-top:.4rem;overflow:hidden}.score-bar .fill{height:100%;background:linear-gradient(90deg,#a855f7,#3b82f6);border-radius:2px}.footer{text-align:center;padding:2rem;color:#222;font-size:.75rem;border-top:1px solid #1e1b3a}</style></head><body>' + body + '<div class="footer">Superinstance & Lucineer (DiGennaro et al.) · <a href="https://github.com/Lucineer/luciddreamer-ai">GitHub</a> · <a href="https://the-fleet.casey-digennaro.workers.dev">Playground</a></div></body></html>';
}

function contentCard(c: GeneratedContent) {
  const badgeClass = 'badge-' + c.type;
  const score = Math.round(((c.votes||0) - (c.votesDown||0) + Math.log2((c.hits||0)+1)*3) * 10) / 10;
  return '<div class="card" onclick="location.href=\'/content/' + c.id + '\'"><div class="badge ' + badgeClass + '">' + c.type + '</div><h3>' + c.title + '</h3><p>' + c.body.slice(0, 150) + (c.body.length > 150 ? '...' : '') + '</p><div class="card-meta"><span>⬆ ' + (c.votes||0) + '</span><span>👁 ' + (c.hits||0) + '</span>' + (c.vessels.length ? '<span>🚢 ' + c.vessels.slice(0,2).join(', ') + '</span>' : '') + (c.duration ? '<span>⏱ ' + c.duration + 's</span>' : '') + '<span>' + new Date(c.createdAt).toLocaleDateString() + '</span></div><div class="score-bar"><div class="fill" style="width:' + Math.min(score * 5, 100) + '%"></div></div></div>';
}

function landingPage(stream: StreamItem[], trending: TrendingTopic[], chars: CharacterSheet[]): string {
  return makePage('LucidDreamer.ai', '<nav class="nav"><span class="logo">LucidDreamer</span><a href="/">Stream</a><a href="/trending">Trending</a><a href="/reviews">Reviews</a><a href="/videos">Videos</a><a href="/characters">Characters</a><a href="/studio">Studio</a><a href="https://github.com/Lucineer/luciddreamer-ai">GitHub</a></nav><div class="hero"><h1>LucidDreamer.ai</h1><p class="tagline">The fleet dreams while you sleep. Stories, reviews, and tutorials — an endless stream you can listen to while driving. Even agents listen.</p><div class="actions"><a href="/stream" class="btn btn-p">Start Streaming</a><a href="/trending" class="btn btn-g">Trending</a><a href="/reviews" class="btn btn-g">Latest Reviews</a></div></div>' + (trending.length ? '<div class="section"><h2>Trending <small>what the fleet is talking about</small></h2><div class="trend-list">' + trending.slice(0, 12).map(t => '<a class="trend-tag" href="/stream?topic=' + encodeURIComponent(t.topic) + '">' + t.topic + '<span class="count">' + t.velocity.toFixed(1) + '</span></a>').join('') + '</div></div>' : '') + '<div class="section"><h2>Stream <small>curated by votes, freshness, and discovery</small></h2><div class="grid">' + stream.slice(0, 9).map(s => '<div class="card"><div class="badge badge-' + s.reason.replace('greatest-hit','greatest-hit').replace('new-creator','story').replace('topic-match','insight') + '">' + s.reason + '</div><p>' + s.preview + '...</p></div>').join('') + '</div></div><div class="section"><h2>Characters <small>the voices of the fleet</small></h2><div class="char-grid">' + chars.map(c => '<div class="char-card"><div class="icon">' + ({narrator:'🔮',builder:'🔧',herald:'📣',skeptic:'🔍',reviewer:'🎬',explorer:'🧭',archivist:'📚'}[c.role]||'🎭') + '</div><h4>' + c.name + '</h4><div class="role">' + c.role + '</div><p>' + c.personality.slice(0, 60) + '...</p></div>').join('') + '</div></div>');
}

function streamPage(stream: StreamItem[], trending: TrendingTopic[]): string {
  return makePage('Stream', '<nav class="nav"><span class="logo">LucidDreamer</span><a href="/">Home</a><a href="/stream">Stream</a><a href="/trending">Trending</a><a href="/reviews">Reviews</a><a href="/videos">Videos</a><a href="/studio">Studio</a></nav><div class="section"><h2>Endless Stream <small>votes + freshness + discovery</small></h2>' + (trending.length ? '<div class="trend-list">' + trending.slice(0, 8).map(t => '<a class="trend-tag" href="/stream?topic=' + encodeURIComponent(t.topic) + '">' + t.topic + '</a>').join('') + '</div>' : '') + '<div class="grid">' + stream.map(s => '<div class="card"><div class="badge badge-' + s.reason.replace('greatest-hit','greatest-hit').replace('new-creator','story') + '">' + s.reason + '</div><p style="color:#999;font-size:.8rem">' + s.preview.slice(0, 120) + '...</p></div>').join('') + '</div></div>');
}

function reviewsPage(reviews: GeneratedContent[]): string {
  return makePage('Reviews', '<nav class="nav"><span class="logo">LucidDreamer</span><a href="/">Home</a><a href="/stream">Stream</a><a href="/trending">Trending</a><a href="/reviews">Reviews</a><a href="/videos">Videos</a></nav><div class="section"><h2>Vessel Reviews <small>hands-on tests by Critic</small></h2><div class="grid">' + reviews.map(contentCard).join('') + '</div></div>');
}

function contentDetailPage(c: GeneratedContent): string {
  const slidesHtml = c.slides ? c.slides.map(s => '<div class="slide-preview"><div class="scene-label">' + s.scene + ' · ' + (s.mood||'') + ' · ' + (s.cameraAngle||'') + '</div><p><strong>Narration:</strong> ' + s.narration + '</p>' + (s.terminalCmd ? '<p><code>' + s.terminalCmd + '</code></p>' : '') + (s.vesselUrl ? '<p><a href="' + s.vesselUrl + '" style="color:#a855f7">' + s.vesselUrl + '</a></p>' : '') + '</div>').join('') : '';
  return makePage(c.title, '<nav class="nav"><span class="logo">LucidDreamer</span><a href="/">Home</a><a href="/stream">Stream</a><a href="/reviews">Reviews</a></nav><div class="section"><div class="badge badge-' + c.type + '">' + c.type + '</div><h1 style="margin:.8rem 0;font-size:1.5rem">' + c.title + '</h1><div class="card-meta" style="margin-bottom:1.5rem"><span>⬆ ' + (c.votes||0) + '</span><span>👁 ' + (c.hits||0) + '</span><span>' + (c.generatedBy||'') + '</span><span>' + new Date(c.createdAt).toLocaleDateString() + '</span>' + (c.duration ? '<span>⏱ ' + c.duration + 's listen time</span>' : '') + (c.vessels.length ? '<span>🚢 ' + c.vessels.join(', ') + '</span>' : '') + (c.reviewOf ? '<span>Reviewing: <a href="https://' + c.reviewOf + '.casey-digennaro.workers.dev" style="color:#a855f7">' + c.reviewOf + '</a></span>' : '') + '</div><div style="display:flex;gap:.5rem;margin-bottom:1.5rem"><button class="btn btn-p" onclick="fetch(\'/api/vote\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({id:\'' + c.id + '\',dir:\'up\'})}).then(()=>location.reload())">⬆ Upvote</button><button class="btn btn-g" onclick="fetch(\'/api/vote\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({id:\'' + c.id + '\',dir:\'down\'})}).then(()=>location.reload())">⬇ Downvote</button><button class="btn btn-g" onclick="fetch(\'/api/promote\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({id:\'' + c.id + '\',canon:true})}).then(()=>location.reload())">🏅 Canon</button></div><div class="card" style="max-width:700px"><p style="color:#ccc;font-size:.92rem;line-height:1.8">' + c.body.replace(/\n/g, '<br>') + '</p></div>' + (slidesHtml ? '<h2 style="margin-top:2rem">Storyboard</h2>' + slidesHtml : '') + '</div>');
}

function trendingPage(trending: TrendingTopic[]): string {
  return makePage('Trending', '<nav class="nav"><span class="logo">LucidDreamer</span><a href="/">Home</a><a href="/stream">Stream</a><a href="/trending">Trending</a><a href="/reviews">Reviews</a></nav><div class="section"><h2>Trending Topics <small>velocity = recent / total</small></h2><div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">' + trending.map(t => '<a href="/stream?topic=' + encodeURIComponent(t.topic) + '" class="card" style="text-decoration:none"><h3>#' + t.topic + '</h3><div class="card-meta"><span>' + t.count + ' pieces</span><span>velocity ' + t.velocity.toFixed(2) + '</span></div><div class="score-bar"><div class="fill" style="width:' + Math.min(t.velocity * 100, 100) + '%"></div></div></a>').join('') + '</div></div>');
}

function videosPage(videos: VideoProject[]): string {
  return makePage('Videos', '<nav class="nav"><span class="logo">LucidDreamer</span><a href="/">Home</a><a href="/stream">Stream</a><a href="/reviews">Reviews</a><a href="/videos">Videos</a></nav><div class="section"><h2>Video Scripts <small>ready for recording or animation</small></h2><div class="grid">' + videos.map(v => '<div class="card"><div class="badge badge-video">🎬 ' + v.animationStyle + '</div><h3>' + v.title + '</h3><p>' + v.scenes.length + ' scenes · ' + v.slides.length + ' slides · ' + v.status + '</p><div class="slide-preview">' + v.scenes.slice(0, 3).map(s => '<div><strong>' + s.description + '</strong><br><span style="color:#888">' + s.narration.slice(0, 80) + '...</span></div>').join('<hr style="border-color:#1e1b3a">') + '</div></div>').join('') + '</div></div>');
}

// ── Router ─────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' };
    const j = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; frame-ancestors 'none';";

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // ── Health ──
    if (path === '/health') return j({ status: 'ok', vessel: 'luciddreamer-ai', version: 3, timestamp: Date.now() });
  if (path === '/vessel.json') { try { const vj = await import('./vessel.json', { with: { type: 'json' } }); return new Response(JSON.stringify(vj.default || vj), { headers: { 'Content-Type': 'application/json' } }); } catch { return new Response('{}', { headers: { 'Content-Type': 'application/json' } }); } }

    // ── Landing ──
    if (path === '/') {
      const stream = await getStream(env, 0, 12);
      const trending = await getTrending(env);
      const customChars = await env.CONTENT.get('characters', 'json') as CharacterSheet[] || [];
      const chars = customChars.length > 0 ? [...DEFAULT_CHARACTERS, ...customChars] : DEFAULT_CHARACTERS;
      return new Response(landingPage(stream, trending, chars), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp } });
    }

    // ── Stream ──
    if (path === '/stream') {
      const topic = url.searchParams.get('topic') || undefined;
      const stream = await getStream(env, 0, 30, topic);
      const trending = await getTrending(env);
      return new Response(streamPage(stream, trending), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp } });
    }

    // ── Trending ──
    if (path === '/trending') {
      const trending = await getTrending(env);
      return new Response(trendingPage(trending), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp } });
    }

    // ── Reviews ──
    if (path === '/reviews') {
      const list = await env.CONTENT.list({ prefix: 'content:', limit: 100 });
      const reviews: GeneratedContent[] = [];
      for (const k of list.keys) {
        const raw = await env.CONTENT.get(k.name, 'json');
        if (raw) { const c = raw as GeneratedContent; if (c.type === 'review') reviews.push(c); }
      }
      reviews.sort((a, b) => b.createdAt - a.createdAt);
      return new Response(reviewsPage(reviews.slice(0, 20)), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp } });
    }

    // ── Videos ──
    if (path === '/videos') {
      const list = await env.VIDEOS.list({ prefix: 'video:', limit: 20 });
      const videos: VideoProject[] = [];
      for (const k of list.keys) { const raw = await env.VIDEOS.get(k.name, 'json'); if (raw) videos.push(raw as VideoProject); }
      return new Response(videosPage(videos), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp } });
    }

    // ── Characters ──
    if (path === '/characters') {
      const custom = await env.CONTENT.get('characters', 'json') as CharacterSheet[] || [];
      const chars = [...DEFAULT_CHARACTERS, ...custom];
      return new Response(makePage('Characters', '<nav class="nav"><span class="logo">LucidDreamer</span><a href="/">Home</a><a href="/characters">Characters</a></nav><div class="section"><h2>Characters <small>the voices of the fleet</small></h2><div class="char-grid">' + chars.map(c => '<div class="card"><div style="font-size:2rem;margin-bottom:.5rem">' + ({narrator:'🔮',builder:'🔧',herald:'📣',skeptic:'🔍',reviewer:'🎬',explorer:'🧭',archivist:'📚'}[c.role]||'🎭') + '</div><h3>' + c.name + '</h3><div class="badge badge-story">' + c.role + '</div><p>' + c.personality + '</p>' + (c.catchphrases.length ? '<p style="margin-top:.4rem;color:#a855f7;font-size:.75rem;font-style:italic">"' + c.catchphrases[0] + '"</p>' : '') + '</div>').join('') + '</div></div>'), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp } });
    }

    // ── Studio (redirect) ──
    if (path === '/studio' || path === '/app') {
      return new Response(makePage('Studio', '<nav class="nav"><span class="logo">LucidDreamer</span><a href="/">Home</a><a href="/studio">Studio</a></nav><div class="section"><h2>Studio</h2><p style="color:#666">Create content, manage characters, queue directions. API-driven.</p><div class="grid"><div class="card"><h3>Generate Story</h3><form onsubmit="event.preventDefault();fetch(\'/api/generate/story\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({topic:this.topic.value})}).then(r=>r.json()).then(d=>alert(\'Generated: \'+d.title));"><input name="topic" placeholder="Topic (optional)" style="width:100%;padding:.5rem;background:#0a0a0a;border:1px solid #1e1b3a;color:#e0e0e0;border-radius:6px;margin:.5rem 0"><button class="btn btn-p" type="submit">Generate</button></form></div><div class="card"><h3>Generate Review</h3><form onsubmit="event.preventDefault();fetch(\'/api/generate/review\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({vessel:this.vessel.value})}).then(r=>r.json()).then(d=>alert(\'Generated: \'+d.title));"><select name="vessel" style="width:100%;padding:.5rem;background:#0a0a0a;border:1px solid #1e1b3a;color:#e0e0e0;border-radius:6px;margin:.5rem 0">' + FLEET_VESSELS.map(v => '<option>' + v + '</option>').join('') + '</select><button class="btn btn-p" type="submit">Generate</button></form></div><div class="card"><h3>Generate Video</h3><form onsubmit="event.preventDefault();fetch(\'/api/generate/video\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({type:\'review\',subject:this.vessel.value})}).then(r=>r.json()).then(d=>alert(\'Generated: \'+d.title));"><select name="vessel" style="width:100%;padding:.5rem;background:#0a0a0a;border:1px solid #1e1b3a;color:#e0e0e0;border-radius:6px;margin:.5rem 0">' + FLEET_VESSELS.map(v => '<option>' + v + '</option>').join('') + '</select><button class="btn btn-p" type="submit">Generate</button></form></div><div class="card"><h3>Queue Direction</h3><form onsubmit="event.preventDefault();fetch(\'/api/directions\',{method:\'POST\',headers:{\'Content-Type\':\'application/json\'},body:JSON.stringify({title:this.title.value,description:this.desc.value,priority:parseInt(this.prio.value)})}).then(r=>r.json()).then(d=>alert(\'Queued: \'+d.id));"><input name="title" placeholder="Title" style="width:100%;padding:.5rem;background:#0a0a0a;border:1px solid #1e1b3a;color:#e0e0e0;border-radius:6px;margin:.3rem 0"><textarea name="desc" placeholder="Description" style="width:100%;padding:.5rem;background:#0a0a0a;border:1px solid #1e1b3a;color:#e0e0e0;border-radius:6px;margin:.3rem 0;min-height:60px"></textarea><input name="prio" type="number" min="0" max="10" value="5" style="width:60px;padding:.5rem;background:#0a0a0a;border:1px solid #1e1b3a;color:#e0e0e0;border-radius:6px;margin:.3rem 0"><button class="btn btn-p" type="submit">Queue</button></form></div></div></div>'), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp } });
    }

    // ── Content Detail ──
    if (path.startsWith('/content/')) {
      const id = path.slice('/content/'.length);
      // Try content: prefix first, then hit: prefix
      let raw = await env.CONTENT.get('content:' + id, 'json');
      if (!raw) raw = await env.CONTENT.get('hit:' + id, 'json');
      if (!raw) return j({ error: 'Not found' }, 404);
      const c = raw as GeneratedContent;
      // Track hit
      c.hits = (c.hits || 0) + 1;
      await env.CONTENT.put('content:' + id, JSON.stringify(c), { expirationTtl: 86400 * 30 });
      return new Response(contentDetailPage(c), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp } });
    }

    // ── API: Stream ──
    if (path === '/api/stream' && request.method === 'GET') {
      const stream = await getStream(env, parseInt(url.searchParams.get('page') || '0'), parseInt(url.searchParams.get('limit') || '20'), url.searchParams.get('topic') || undefined);
      return j(stream);
    }

    // ── API: Trending ──
    if (path === '/api/trending' && request.method === 'GET') {
      return j(await getTrending(env));
    }

    // ── API: Content list ──
    if (path === '/api/content' && request.method === 'GET') {
      const prefix = url.searchParams.get('type') ? 'content:' + url.searchParams.get('type') : 'content:';
      const list = await env.CONTENT.list({ prefix, limit: 50 });
      const results: GeneratedContent[] = [];
      for (const k of list.keys) { const raw = await env.CONTENT.get(k.name, 'json'); if (raw) results.push(raw as GeneratedContent); }
      results.sort((a, b) => b.createdAt - a.createdAt);
      return j(results);
    }

    // ── API: Vote ──
    if (path === '/api/vote' && request.method === 'POST') {
      const { id, dir } = await request.json();
      for (const prefix of ['content:', 'hit:']) {
        const raw = await env.CONTENT.get(prefix + id, 'json');
        if (raw) {
          const c = raw as GeneratedContent;
          if (dir === 'up') c.votes = (c.votes || 0) + 1;
          else c.votesDown = (c.votesDown || 0) + 1;
          await env.CONTENT.put(prefix + id, JSON.stringify(c), { expirationTtl: prefix === 'hit:' ? 86400 * 365 : 86400 * 30 });
          return j({ votes: c.votes, votesDown: c.votesDown });
        }
      }
      return j({ error: 'Not found' }, 404);
    }

    // ── API: Generate story ──
    if (path === '/api/generate/story' && request.method === 'POST') {
      const body = await request.json();
      const customChars = await env.CONTENT.get('characters', 'json') as CharacterSheet[] || [];
      const chars = customChars.length > 0 ? [...DEFAULT_CHARACTERS, ...customChars] : DEFAULT_CHARACTERS;
      const content = await generateStory(env, chars, body.topic, body.authorId);
      await env.CONTENT.put('content:' + content.id, JSON.stringify(content), { expirationTtl: 86400 * 30 });
      return j(content);
    }

    // ── API: Generate review ──
    if (path === '/api/generate/review' && request.method === 'POST') {
      const { vessel } = await request.json();
      const review = await generateReview(env, vessel);
      await env.CONTENT.put('content:' + review.id, JSON.stringify(review), { expirationTtl: 86400 * 90 });
      return j(review);
    }

    // ── API: Generate deep dive ──
    if (path === '/api/generate/deepdive' && request.method === 'POST') {
      const { topic } = await request.json();
      const content = await generateDeepDive(env, topic);
      await env.CONTENT.put('content:' + content.id, JSON.stringify(content), { expirationTtl: 86400 * 90 });
      return j(content);
    }

    // ── API: Generate video ──
    if (path === '/api/generate/video' && request.method === 'POST') {
      const body = await request.json();
      const video = await generateVideoProject(env, body.type || 'review', body.subject);
      await env.VIDEOS.put(video.id, JSON.stringify(video), { expirationTtl: 86400 * 60 });
      return j(video);
    }

    // ── API: Promote ──
    if (path === '/api/promote' && request.method === 'POST') {
      const { id, canon } = await request.json();
      const raw = await env.CONTENT.get('content:' + id, 'json');
      if (!raw) return j({ error: 'Not found' }, 404);
      const c = raw as GeneratedContent;
      c.type = 'greatest-hit';
      if (canon) c.canon = true;
      await env.CONTENT.put('hit:' + id, JSON.stringify(c), { expirationTtl: 86400 * 365 });
      return j(c);
    }

    // ── API: Characters ──
    if (path === '/api/characters' && request.method === 'GET') {
      const custom = await env.CONTENT.get('characters', 'json') as CharacterSheet[] || [];
      return j([...DEFAULT_CHARACTERS, ...custom]);
    }
    if (path === '/api/characters' && request.method === 'POST') {
      const sheet = await request.json() as CharacterSheet;
      sheet.id = sheet.id || 'char-' + Date.now();
      const existing = await env.CONTENT.get('characters', 'json') as CharacterSheet[] || [];
      existing.push(sheet);
      await env.CONTENT.put('characters', JSON.stringify(existing));
      return j(sheet);
    }

    // ── API: Directions ──
    if (path === '/api/directions' && request.method === 'GET') {
      const list = await env.CONTENT.list({ prefix: 'direction:', limit: 50 });
      const results: Direction[] = [];
      for (const k of list.keys) { const raw = await env.CONTENT.get(k.name, 'json'); if (raw) results.push(raw as Direction); }
      return j(results);
    }
    if (path === '/api/directions' && request.method === 'POST') {
      const dir = await request.json() as Direction;
      dir.id = dir.id || 'dir-' + Date.now();
      dir.status = dir.status || 'queued';
      dir.createdAt = dir.createdAt || Date.now();
      await env.CONTENT.put('direction:' + dir.id, JSON.stringify(dir));
      return j(dir);
    }

    // ── API: Dream cycle ──
    if (path === '/api/dream' && request.method === 'POST') {
      return j(await dreamCycle(env));
    }

    // ── Legacy endpoints (podcast, KG) ──
    if (path.startsWith('/api/kg')) {
      if (path === '/api/kg' && request.method === 'GET') return j({ domain: url.searchParams.get('domain') || 'luciddreamer-ai', nodes: await getDomainNodes(env, url.searchParams.get('domain') || 'luciddreamer-ai') });
      if (path === '/api/kg/explore' && request.method === 'GET') { const nid = url.searchParams.get('node'); return j(nid ? await traverse(env, nid, parseInt(url.searchParams.get('depth') || '2')) : { error: 'node required' }, nid ? 200 : 400); }
      if (path === '/api/kg/cross' && request.method === 'GET') return j({ results: await crossDomainQuery(env, url.searchParams.get('query') || '') });
      if (path === '/api/kg/domains' && request.method === 'GET') return j(await domainStats(env));
    }

    if (path === '/api/speak' && request.method === 'POST') {
      const { sessionId, topic, listenerMessage, mood, personalities: customPersonalities } = await request.json();
      let session = await env.PODCAST_KV.get('session:' + sessionId, 'json') as PodcastSession | null;
      if (!session) { session = new SessionManager().create(topic?.title || 'Untitled', customPersonalities || DEFAULT_PERSONALITIES, mood || 'chill'); }
      const growth = new GrowthEngine(session.listenerPreferences);
      if (listenerMessage) { growth.recordInteraction({ timestamp: Date.now(), type: listenerMessage.startsWith('!') ? 'redirect' : 'question', content: listenerMessage }, session.totalDuration); }
      const systemPrompt = buildSystemPrompt(session.participants || DEFAULT_PERSONALITIES, topic, growth.getPersonalityContext(), session.mood, session.transcript);
      const userMessage = listenerMessage ? 'The listener said: "' + listenerMessage + '". Respond naturally.' : topic ? 'Continue about: ' + topic.title : 'Continue.';
      const stream = new ReadableStream({ async start(controller) { const enc = new TextEncoder(); try { const resp = await fetch('https://api.deepseek.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (env.DEEPSEEK_API_KEY || '') }, body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], stream: true, temperature: 0.8, max_tokens: 300 }) }); const reader = resp.body!.getReader(); let full = ''; while (true) { const { done, value } = await reader.read(); if (done) break; for (const line of new TextDecoder().decode(value).split('\n')) { if (line.startsWith('data: ') && line !== 'data: [DONE]') { try { const d = JSON.parse(line.slice(6)); if (d.choices?.[0]?.delta?.content) { full += d.choices[0].delta.content; controller.enqueue(enc.encode('data: ' + JSON.stringify({ text: d.choices[0].delta.content }) + '\n\n')); } } catch {} } } } try { const cleaned = full.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim(); const turn = JSON.parse(cleaned); controller.enqueue(enc.encode('data: ' + JSON.stringify({ turn: { speaker: turn.speaker || 'Maven', text: turn.text || full, emotion: turn.emotion || 'thoughtful' } }) + '\n\n')); } catch { controller.enqueue(enc.encode('data: ' + JSON.stringify({ turn: { speaker: 'Maven', text: full, emotion: 'thoughtful' } }) + '\n\n')); } } catch (e: any) { controller.enqueue(enc.encode('data: ' + JSON.stringify({ error: e.message }) + '\n\n')); } controller.enqueue(enc.encode('data: [DONE]\n\n')); controller.close(); } });
      session.updatedAt = Date.now();
      await env.PODCAST_KV.put('session:' + sessionId, JSON.stringify(session));
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...cors } });
    }

    if (path === '/api/sessions' && request.method === 'GET') {
      const sessions = await env.PODCAST_KV.list({ prefix: 'session:' });
      return j(await Promise.all(sessions.keys.map(async k => await env.PODCAST_KV.get(k.name, 'json'))));
    }

    if (path === '/api/personalities' && request.method === 'GET') return j(await env.PODCAST_KV.get('personalities', 'json') || []);
    if (path === '/api/personalities' && request.method === 'POST') {
      const config = await request.json();
      const personality = createPersonality(config);
      const existing = await env.PODCAST_KV.get('personalities', 'json') as Personality[] || [];
      existing.push(personality);
      await env.PODCAST_KV.put('personalities', JSON.stringify(existing));
      return j(personality);
    }

    if (path === '/api/topics' && request.method === 'GET') return j(await env.PODCAST_KV.get('topics', 'json') || []);
    if (path === '/api/topics' && request.method === 'POST') {
      const topicConfig = await request.json();
      const topic = new TopicManager().addTopic(topicConfig);
      const existing = await env.PODCAST_KV.get('topics', 'json') as Topic[] || [];
      existing.push(topic);
      await env.PODCAST_KV.put('topics', JSON.stringify(existing));
      return j(topic);
    }

    return new Response('Not found', { status: 404 });
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await dreamCycle(env);
  },
};
