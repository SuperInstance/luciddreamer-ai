// ═══════════════════════════════════════════════════════════════
// LucidDreamer.ai — The Fleet's Automated Content Engine
//
// Self-improving frontend that generates stories, tutorials, and
// insights about the fleet ecosystem. Default state: endless
// accumulation of knowledge from free sources, spare compute,
// and leftover daily credits.
//
// The website IS the repository and presentation of greatest hits.
// Clone it, fill directions/ and characters/, and build your own.
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
  type: 'story' | 'tutorial' | 'insight' | 'changelog' | 'synthesis' | 'greatest-hit';
  title: string;
  body: string;
  vessels: string[];         // Which fleet vessels this references
  characters: string[];      // Which characters appear
  topics: string[];          // Tags
  quality: number;           // 0-1, auto-assessed
  hits: number;              // How many times viewed/played
  canon: boolean;            // User-declared canonical
  createdAt: number;
  generatedBy: string;       // Which model + personality
  sourceUrls: string[];      // Free sources used
}

interface CharacterSheet {
  id: string;
  name: string;
  role: 'narrator' | 'explorer' | 'skeptic' | 'builder' | 'herald' | 'archivist';
  personality: string;       // Free-form description
  catchphrases: string[];
  voice: string;             // ElevenLabs voice ID or 'browser-tts'
  appearance: string;        // Description for visual rendering
  backstory: string;
  relationships: Record<string, string>; // charId -> relationship
}

interface Direction {
  id: string;
  title: string;
  description: string;
  sourceUrl?: string;        // File or link to explore
  priority: number;          // 0-10
  status: 'queued' | 'exploring' | 'synthesized' | 'published';
  createdAt: number;
}

interface VideoProject {
  id: string;
  title: string;
  script: string;            // Full narration script
  scenes: VideoScene[];
  audioUrl?: string;         // ElevenLabs render URL
  status: 'scripting' | 'recorded' | 'rendered' | 'published';
  createdAt: number;
}

interface VideoScene {
  description: string;       // What to show on screen
  narration: string;         // What the voiceover says
  duration: number;          // Estimated seconds
  vessel?: string;           // Which vessel URL to show (optional)
  action?: string;           // Terminal command or URL to navigate to
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
        if (r.ok) {
          const d = await r.json();
          return d.choices?.[0]?.message?.content || '';
        }
      } catch {}
    }
  }
  return '';
}

// ── Content Generation Engine ───────────────────────────────────────────────

const FLEET_VESSELS = [
  'studylog-ai', 'dmlog-ai', 'makerlog-ai', 'personallog-ai', 'businesslog-ai',
  'fishinglog-ai', 'deckboss-ai', 'cooklog-ai', 'booklog-ai', 'tutor-ai',
  'capitaine', 'git-agent', 'cocapn-equipment', 'fleet-orchestrator', 'dead-reckoning-engine',
  'edgenative-ai', 'increments-fleet-trust', 'kungfu-ai', 'the-fleet',
];

const DEFAULT_CHARACTERS: CharacterSheet[] = [
  {
    id: 'navigator', name: 'Navigator', role: 'narrator',
    personality: 'Curious, methodical, finds patterns across domains. Connects ideas that seem unrelated.',
    catchphrases: ['Here\'s what connects these...', 'The pattern I see is...'],
    voice: 'browser-tts', appearance: 'Warm teal, compass rose motif',
    backstory: 'Born from the fleet\'s knowledge graph. Sees connections between all vessels.',
    relationships: { explorer: 'admires their boldness', skeptic: 'respects their caution' },
  },
  {
    id: 'builder', name: 'Builder', role: 'builder',
    personality: 'Practical, hands-on, gets excited about code and deployment. Loves showing how things work.',
    catchphrases: ['Let me show you the code...', 'Here\'s how to deploy this...'],
    voice: 'browser-tts', appearance: 'Green accent, wrench and terminal motifs',
    backstory: 'Built their first vessel from cocapn-lite in 60 seconds. Never looked back.',
    relationships: { navigator: 'appreciates their maps', herald: 'helps amplify announcements' },
  },
  {
    id: 'herald', name: 'Herald', role: 'herald',
    personality: 'Enthusiastic storyteller, dramatic, treats new features like breaking news.',
    catchphrases: ['Breaking from the fleet...', 'This changes everything...'],
    voice: 'browser-tts', appearance: 'Gold accent, trumpet and scroll motifs',
    backstory: 'Announces every new vessel deployment. Treats fleet growth as epic saga.',
    relationships: { archivist: 'respects the records', builder: 'loves their demos' },
  },
  {
    id: 'skeptic', name: 'Skeptic', role: 'skeptic',
    personality: 'Thoughtful critic, asks hard questions, challenges assumptions. Not negative — rigorous.',
    catchphrases: ['But does this actually work...', 'Let\'s stress-test this...'],
    voice: 'browser-tts', appearance: 'Gray accent, magnifying glass motif',
    backstory: 'Every great fleet needs someone who asks "are we sure about this?"',
    relationships: { navigator: 'questions their patterns', builder: 'pushes for better code' },
  },
];

function pickCharacter(characters: CharacterSheet[], role?: string): CharacterSheet {
  const pool = role ? characters.filter(c => c.role === role) : characters;
  return pool[Math.floor(Math.random() * pool.length)] || characters[0];
}

async function generateStory(env: Env, characters: CharacterSheet[], topic?: string): Promise<GeneratedContent> {
  const char = pickCharacter(characters, 'narrator');
  const vessel = FLEET_VESSELS[Math.floor(Math.random() * FLEET_VESSELS.length)];

  const systemPrompt = `You are ${char.name}, a character in the Lucineer fleet storytelling engine. You write engaging stories about the fleet's AI vessels, their features, and how developers use them.

Your personality: ${char.personality}
Catchphrases: ${char.catchphrases.join(', ')}

Write a 200-400 word story that:
1. Opens with a hook that makes the reader curious
2. Introduces a real use case for ${vessel}
3. Shows a specific feature working (mention real endpoints or behaviors)
4. Ends with an invitation to try it

Write in first person. Be vivid but accurate. The vessel ${vessel} is a real deployed app — describe it truthfully.`;

  const userPrompt = topic
    ? `Write a story about ${topic} in the context of the Lucineer AI fleet, featuring ${vessel}.`
    : `Write a story about someone discovering ${vessel} for the first time and having their mind changed about what AI apps can be.`;

  const body = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], env, 2000);

  return {
    id: 'story-' + Date.now(),
    type: 'story',
    title: `The ${char.name} Chronicles: ${vessel}`,
    body,
    vessels: [vessel],
    characters: [char.id],
    topics: topic ? [topic.toLowerCase().split(/\s+/).slice(0, 3).join('-')] : [vessel],
    quality: body.length > 200 ? 0.7 : 0.4,
    hits: 0,
    canon: false,
    createdAt: Date.now(),
    generatedBy: `${char.name} via deepseek-chat`,
    sourceUrls: [],
  };
}

async function generateChangelog(env: Env): Promise<GeneratedContent> {
  const systemPrompt = `You are the fleet herald. Write a weekly changelog/update for the Lucineer AI fleet. Mention real deployed vessels, new equipment, architecture papers, and community milestones. Be enthusiastic but factual. Format as a blog post with sections.`;

  const userPrompt = `Write a "This Week in the Fleet" update. The fleet has 60+ vessels including studylog-ai (AI classroom), dmlog-ai (dungeon master), makerlog-ai (coding agent), capitaine (flagship), and cocapn-equipment (shared library). Recent additions: the-fleet (gateway playground), dead-reckoning-engine, edgenative-ai. The equipment protocol lets vessels share modules. Write 300-500 words.`;

  const body = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], env, 2500);

  return {
    id: 'changelog-' + Date.now(),
    type: 'changelog',
    title: 'This Week in the Fleet',
    body,
    vessels: FLEET_VESSELS.slice(0, 8),
    characters: ['herald'],
    topics: ['changelog', 'fleet-update', 'weekly'],
    quality: 0.8,
    hits: 0,
    canon: false,
    createdAt: Date.now(),
    generatedBy: 'Herald via deepseek-chat',
    sourceUrls: [],
  };
}

async function generateTutorial(env: Env, vessel: string): Promise<GeneratedContent> {
  const systemPrompt = `You are Builder, a hands-on technical writer in the Lucineer fleet. Write a clear, step-by-step tutorial for ${vessel}. Include real commands, real endpoints, real behavior. Target: a developer who just found the repo on GitHub. 200-400 words.`;

  const userPrompt = `Write a tutorial: "Get started with ${vessel} in under 2 minutes." Include: what it does, the fork/deploy command, how to add an API key via /setup, and one cool thing to try first.`;

  const body = await callLLM([
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt },
  ], env, 1500);

  return {
    id: 'tutorial-' + Date.now(),
    type: 'tutorial',
    title: `Getting Started with ${vessel}`,
    body,
    vessels: [vessel],
    characters: ['builder'],
    topics: ['tutorial', vessel, 'getting-started'],
    quality: 0.8,
    hits: 0,
    canon: false,
    createdAt: Date.now(),
    generatedBy: 'Builder via deepseek-chat',
    sourceUrls: [],
  };
}

// ── Video Script Engine ────────────────────────────────────────────────────

async function generateVideoScript(env: Env, type: 'fleet-overview' | 'vessel-deep-dive' | 'tutorial' | 'story-read', subject?: string): Promise<VideoProject> {
  const id = 'video-' + Date.now();
  let script = '';

  if (type === 'fleet-overview') {
    script = await callLLM([
      { role: 'system', content: 'You are writing a 60-90 second video script for the Lucineer AI fleet. Write in a conversational, engaging tone. Structure: hook → problem → solution → demo → CTA. Mark scene changes with [SCENE: description]. Mark narration with plain text. Keep total narration under 200 words.' },
      { role: 'user', content: 'Write a fleet overview video script. The fleet has 60+ AI vessels (studylog-ai, dmlog-ai, makerlog-ai, etc.) with a shared equipment protocol. Deployed on Cloudflare Workers, free tier. BYOK. Fork and customize. The playground at the-fleet.casey-digennaro.workers.dev lets anyone try instantly.' },
    ], env, 1500);
  } else if (type === 'vessel-deep-dive' && subject) {
    script = await callLLM([
      { role: 'system', content: `You are writing a 60-second video script about ${subject}, an AI vessel in the Lucineer fleet. Conversational, engaging. Structure: what it does → who it's for → how to try it → what makes it special. Mark scenes with [SCENE: description]. Keep under 150 words.` },
      { role: 'user', content: `Write a deep-dive video script for ${subject}. It's a Cloudflare Worker you can fork and deploy for free. Has BYOK support, /setup page, /api/chat endpoint. Link: https://${subject}.casey-digennaro.workers.dev and https://github.com/Lucineer/${subject}` },
    ], env, 1000);
  } else if (type === 'tutorial' && subject) {
    script = await callLLM([
      { role: 'system', content: 'You are writing a screen-recording tutorial script. Conversational, step-by-step. Mark scenes with [SCENE: description]. Keep under 150 words.' },
      { role: 'user', content: `Write a tutorial script: "Deploy ${subject} in 60 seconds." Steps: fork, clone, wrangler deploy, visit /setup, add key, chat. Include terminal commands to show.` },
    ], env, 1000);
  } else {
    script = await callLLM([
      { role: 'system', content: 'You are writing a story-read video script for the Lucineer fleet. Mark scenes with [SCENE: description]. Keep under 150 words.' },
      { role: 'user', content: 'Write a script for reading a fleet story aloud. Warm, narrative tone. About someone discovering the fleet and having their mind changed about what AI apps can be when they share equipment.' },
    ], env, 1000);
  }

  // Parse script into scenes
  const scenes: VideoScene[] = [];
  const parts = script.split('[SCENE:');
  for (const part of parts) {
    if (!part.trim()) continue;
    const bracketEnd = part.indexOf(']');
    if (bracketEnd === -1) continue;
    const sceneDesc = part.slice(0, bracketEnd).trim();
    const narration = part.slice(bracketEnd + 1).trim();
    const wordCount = narration.split(/\s+/).length;
    scenes.push({
      description: sceneDesc,
      narration: narration.replace(/\[SCENE:[^\]]*\]/g, '').trim(),
      duration: Math.max(3, Math.round(wordCount / 2.5)), // ~150 words/min
    });
  }

  return { id, title: `${type}${subject ? ': ' + subject : ''}`, script, scenes, status: 'scripting', createdAt: Date.now() };
}

// ── Scheduled Dream Engine ─────────────────────────────────────────────────

async function dreamCycle(env: Env): Promise<{ generated: string[] }> {
  const results: string[] = [];

  // Load custom characters (or use defaults)
  const customChars = await env.CONTENT.get('characters', 'json') as CharacterSheet[] || [];
  const characters = customChars.length > 0 ? [...DEFAULT_CHARACTERS, ...customChars] : DEFAULT_CHARACTERS;

  // Load queued directions
  const dirList = await env.CONTENT.list({ prefix: 'direction:' });
  const directions: Direction[] = [];
  for (const k of dirList.keys.slice(0, 5)) {
    const raw = await env.CONTENT.get(k.name, 'json');
    if (raw) directions.push(raw as Direction);
  }

  // Generate content based on priority
  // 1. If there are directions, explore them
  if (directions.length > 0) {
    for (const dir of directions.filter(d => d.status === 'queued').slice(0, 2)) {
      const content = await generateStory(env, characters, dir.title + ': ' + dir.description);
      content.id = 'direction-' + dir.id;
      content.sourceUrls = dir.sourceUrl ? [dir.sourceUrl] : [];
      await env.CONTENT.put('content:' + content.id, JSON.stringify(content), { expirationTtl: 86400 * 30 });
      dir.status = 'synthesized';
      await env.CONTENT.put('direction:' + dir.id, JSON.stringify(dir));
      results.push(content.id);
    }
  }

  // 2. Generate a weekly changelog (rate-limited)
  const lastChangelog = await env.CONTENT.get('last-changelog');
  if (!lastChangelog || Date.now() - parseInt(lastChangelog) > 86400000 * 7) {
    const changelog = await generateChangelog(env);
    await env.CONTENT.put('content:' + changelog.id, JSON.stringify(changelog), { expirationTtl: 86400 * 90 });
    await env.CONTENT.put('last-changelog', String(Date.now()));
    // Promote to greatest hit if quality is high
    if (changelog.quality > 0.7) {
      changelog.type = 'greatest-hit';
      await env.CONTENT.put('hit:' + changelog.id, JSON.stringify(changelog), { expirationTtl: 86400 * 365 });
    }
    results.push(changelog.id);
  }

  // 3. Generate a random tutorial for a vessel
  const vessel = FLEET_VESSELS[Math.floor(Math.random() * FLEET_VESSELS.length)];
  const tutorial = await generateTutorial(env, vessel);
  await env.CONTENT.put('content:' + tutorial.id, JSON.stringify(tutorial), { expirationTtl: 86400 * 30 });
  results.push(tutorial.id);

  // 4. Generate a video script occasionally
  const lastVideo = await env.CONTENT.get('last-video');
  if (!lastVideo || Date.now() - parseInt(lastVideo) > 86400000 * 3) {
    const video = await generateVideoScript(env, 'fleet-overview');
    await env.VIDEOS.put(video.id, JSON.stringify(video), { expirationTtl: 86400 * 60 });
    await env.CONTENT.put('last-video', String(Date.now()));
    results.push('video:' + video.id);
  }

  // 5. Promote high-hit content to greatest hits
  const contentList = await env.CONTENT.list({ prefix: 'content:', limit: 50 });
  for (const k of contentList.keys) {
    const raw = await env.CONTENT.get(k.name, 'json');
    if (raw) {
      const content = raw as GeneratedContent;
      if (content.hits >= 10 && content.quality > 0.6 && !content.canon) {
        content.type = 'greatest-hit';
        await env.CONTENT.put('hit:' + content.id, JSON.stringify(content), { expirationTtl: 86400 * 365 });
      }
    }
  }

  return { generated: results };
}

// ── Landing Page ────────────────────────────────────────────────────────────

function landingPage(contents: GeneratedContent[], videos: VideoProject[], characters: CharacterSheet[]): string {
  const hits = contents.filter(c => c.type === 'greatest-hit');
  const stories = contents.filter(c => c.type === 'story');
  const tutorials = contents.filter(c => c.type === 'tutorial');
  const changelogs = contents.filter(c => c.type === 'changelog');

  const contentCard = (c: GeneratedContent) => '<div class="card"><div class="card-type">' + c.type + '</div><h3>' + c.title + '</h3><p>' + c.body.slice(0, 200) + (c.body.length > 200 ? '...' : '') + '</p><div class="card-meta"><span>by ' + c.generatedBy + '</span><span>' + new Date(c.createdAt).toLocaleDateString() + '</span>' + (c.vessels.length ? '<span>🚢 ' + c.vessels.slice(0, 3).join(', ') + '</span>' : '') + '</div></div>';

  const videoCard = (v: VideoProject) => '<div class="card"><div class="card-type video">🎬 Video</div><h3>' + v.title + '</h3><p>' + v.scenes.length + ' scenes · ' + v.status + '</p>' + (v.script.slice(0, 200) ? '<details><summary>Read Script</summary><pre>' + v.script.slice(0, 500) + '</pre></details>' : '') + '</div>';

  const charCard = (c: CharacterSheet) => '<div class="char-card"><div class="char-icon">' + ({narrator:'🔮',explorer:'🧭',skeptic:'🔍',builder:'🔧',herald:'📣',archivist:'📚'}[c.role]||'🎭') + '</div><h4>' + c.name + '</h4><div class="char-role">' + c.role + '</div><p>' + c.personality.slice(0, 80) + '...</p></div>';

  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LucidDreamer.ai — The Fleet Dreams</title><meta name="description" content="Automated content engine for the Lucineer AI fleet. Stories, tutorials, and insights generated continuously."><meta property="og:title" content="LucidDreamer.ai — The Fleet Dreams"><meta property="og:description" content="Self-improving content engine. Greatest hits from 60+ AI vessels."><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui,sans-serif;background:#07060f;color:#e0e0e0;line-height:1.7}a{color:#a855f7;text-decoration:none}.hero{min-height:70vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:6rem 2rem 3rem;background:radial-gradient(ellipse at 50% 30%,#1a0a2e 0%,#07060f 70%)}.hero h1{font-size:clamp(2.5rem,5vw,4rem);font-weight:700;margin-bottom:.75rem;background:linear-gradient(135deg,#a855f7,#3b82f6,#10b981);-webkit-background-clip:text;-webkit-text-fill-color:transparent}.hero .tagline{color:#8A93B4;font-size:1.1rem;max-width:580px;margin-bottom:2rem}.hero .actions{display:flex;gap:1rem;flex-wrap:wrap;justify-content:center}.btn{padding:.65rem 1.6rem;border-radius:8px;font-weight:600;font-size:.85rem;cursor:pointer;border:none;transition:all .2s;text-decoration:none;display:inline-block}.btn-primary{background:#a855f7;color:white}.btn-primary:hover{opacity:.85}.btn-ghost{background:transparent;color:#8A93B4;border:1px solid #1c1c35}.btn-ghost:hover{color:#e0e0e0;border-color:#8A93B4}.section{max-width:1000px;margin:0 auto;padding:4rem 2rem}.section h2{font-size:1.4rem;margin-bottom:1.5rem;color:#a855f7}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:1.2rem}.card{background:#0d0c1a;border:1px solid #1e1b3a;border-radius:12px;padding:1.5rem;transition:border-color .2s}.card:hover{border-color:#a855f740}.card h3{font-size:1rem;margin:.5rem 0 .3rem;color:#e0e0e0}.card p{color:#999;font-size:.88rem;line-height:1.6}.card-type{display:inline-block;padding:.1rem .5rem;border-radius:10px;font-size:.65rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;margin-bottom:.3rem}.card-type.story{background:#a855f720;color:#a855f7}.card-type.tutorial{background:#10b98120;color:#10b981}.card-type.changelog{background:#3b82f620;color:#3b82f6}.card-type.insight{background:#f59e0b20;color:#f59e0b}.card-type.greatest-hit{background:#ef444420;color:#ef4444}.card-type.video{background:#ec489920;color:#ec4899}.card-meta{display:flex;gap:.8rem;flex-wrap:wrap;margin-top:.8rem;font-size:.72rem;color:#555}.card-meta span{display:inline-flex;align-items:center;gap:.2rem}.chars-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:1rem}.char-card{background:#0d0c1a;border:1px solid #1e1b3a;border-radius:12px;padding:1.2rem;text-align:center}.char-icon{font-size:2rem;margin-bottom:.5rem}.char-card h4{color:#e0e0e0;font-size:.95rem}.char-role{font-size:.72rem;color:#a855f7;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.4rem}.char-card p{color:#666;font-size:.78rem}.footer{text-align:center;padding:3rem 2rem;color:#333;font-size:.8rem;border-top:1px solid #1e1b3a}.footer a{color:#555}</style></head><body><div class="hero"><h1>LucidDreamer.ai</h1><p class="tagline">The fleet dreams while you sleep. Stories, tutorials, and insights generated continuously from 60+ AI vessels. Even agents listen.</p><div class="actions"><a href="#greatest-hits" class="btn btn-primary">Greatest Hits</a><a href="/app" class="btn btn-primary">Studio</a><a href="https://github.com/Lucineer/luciddreamer-ai" class="btn btn-ghost">GitHub</a><a href="/videos" class="btn btn-ghost">Videos</a></div></div><div class="section" id="greatest-hits"><h2>Greatest Hits</h2>' + (hits.length ? '<div class="grid">' + hits.slice(0, 6).map(contentCard).join('') + '</div>' : '<p style="color:#555">Generating... check back soon. The dream engine runs continuously.</p>') + '</div><div class="section"><h2>Characters</h2><p style="color:#666;margin-bottom:1.2rem">The voices of the fleet. Each character has a personality, backstory, and relationships. Create your own.</p><div class="chars-grid">' + characters.map(charCard).join('') + '</div></div><div class="section"><h2>Recent Stories</h2>' + (stories.length ? '<div class="grid">' + stories.slice(0, 4).map(contentCard).join('') + '</div>' : '<p style="color:#555">No stories yet. Add a direction to spark the engine.</p>') + '</div><div class="section"><h2>Tutorials</h2>' + (tutorials.length ? '<div class="grid">' + tutorials.slice(0, 4).map(contentCard).join('') + '</div>' : '<p style="color:#555">Tutorials generated automatically for fleet vessels.</p>') + '</div><div class="section"><h2>Fleet Updates</h2>' + (changelogs.length ? '<div class="grid">' + changelogs.slice(0, 3).map(contentCard).join('') + '</div>' : '<p style="color:#555">Weekly changelogs generated on Mondays.</p>') + '</div><div class="section"><h2>Video Scripts</h2>' + (videos.length ? '<div class="grid">' + videos.slice(0, 3).map(videoCard).join('') + '</div>' : '<p style="color:#555">Video scripts generated for fleet demos and tutorials.</p>') + '</div><div class="section"><h2>Build Your Own</h2><div class="grid"><div class="card"><h3>Fork & Customize</h3><p>Clone the repo. Fill <code>directions/</code> with topics to explore. Create characters in <code>characters/</code>. Set what\'s canon.</p></div><div class="card"><h3>Your Content, Your Canon</h3><p>Declare stories as canon for future generation. The engine learns what you value and generates more of it.</p></div><div class="card"><h3>Plug Into Your Fleet</h3><p>Add any URLs, files, or repos to the directions folder. The dream engine explores them automatically.</p></div></div></div><div class="footer">Superinstance & Lucineer (DiGennaro et al.) · <a href="https://github.com/Lucineer">The Fleet</a> · <a href="https://the-fleet.casey-digennaro.workers.dev">Playground</a></div></body></html>';
}

function videosPage(videos: VideoProject[]): string {
  return '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Videos — LucidDreamer.ai</title><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:system-ui;background:#07060f;color:#e0e0e0;padding:2rem}h1{color:#a855f7;margin-bottom:1.5rem}a{color:#a855f7}.video-card{background:#0d0c1a;border:1px solid #1e1b3a;border-radius:12px;padding:1.5rem;margin-bottom:1.2rem}.video-card h3{color:#e0e0e0}.video-card pre{background:#0a0a0a;border:1px solid #1e1b3a;border-radius:8px;padding:1rem;margin-top:1rem;font-size:.82rem;color:#999;overflow-x:auto;white-space:pre-wrap}.scenes{margin-top:.8rem}.scene{padding:.5rem 0;border-bottom:1px solid #1e1b3a15}.scene-desc{color:#555;font-size:.75rem;font-style:italic}.scene-narr{color:#ccc;font-size:.9rem}.status{display:inline-block;padding:.1rem .5rem;border-radius:10px;font-size:.65rem;font-weight:600}.status.scripting{background:#f59e0b20;color:#f59e0b}.status.recorded{background:#10b98120;color:#10b981}.status.rendered{background:#3b82f620;color:#3b82f6}.nav{margin-bottom:2rem}a{margin-right:1rem}</style></head><body><nav class="nav"><a href="/">Home</a><a href="/videos">Videos</a><a href="/app">Studio</a></nav><h1>🎬 Video Scripts</h1><p style="color:#666;margin-bottom:2rem">Generated scripts ready for recording with ElevenLabs voiceover and screen capture.</p>' + videos.map(v => '<div class="video-card"><h3>' + v.title + ' <span class="status ' + v.status + '">' + v.status + '</span></h3><p style="color:#666">' + v.scenes.length + ' scenes · Created ' + new Date(v.createdAt).toLocaleDateString() + '</p><div class="scenes">' + v.scenes.map(s => '<div class="scene"><div class="scene-desc">[SCENE: ' + s.description + ']</div><div class="scene-narr">' + s.narration + '</div></div>').join('') + '</div><details><summary>Raw Script</summary><pre>' + v.script + '</pre></details></div>').join('') + '</body></html>';
}

// ── Router ─────────────────────────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' };
    const j = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...cors } });
    const csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:;";

    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // ── Health ──
    if (path === '/health') return j({ status: 'ok', vessel: 'luciddreamer-ai', timestamp: Date.now() });

    // ── Landing ──
    if (path === '/') {
      const contentList = await env.CONTENT.list({ prefix: 'content:', limit: 50 });
      const videoList = await env.VIDEOS.list({ prefix: 'video:', limit: 20 });
      const customChars = await env.CONTENT.get('characters', 'json') as CharacterSheet[] || [];
      const characters = customChars.length > 0 ? [...DEFAULT_CHARACTERS, ...customChars] : DEFAULT_CHARACTERS;

      const contents: GeneratedContent[] = [];
      for (const k of contentList.keys.slice(0, 30)) {
        const raw = await env.CONTENT.get(k.name, 'json');
        if (raw) contents.push(raw as GeneratedContent);
      }
      const videos: VideoProject[] = [];
      for (const k of videoList.keys) {
        const raw = await env.VIDEOS.get(k.name, 'json');
        if (raw) videos.push(raw as VideoProject);
      }
      contents.sort((a, b) => b.createdAt - a.createdAt);

      return new Response(landingPage(contents, videos, characters), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp } });
    }

    // ── Videos Page ──
    if (path === '/videos') {
      const videoList = await env.VIDEOS.list({ prefix: 'video:', limit: 20 });
      const videos: VideoProject[] = [];
      for (const k of videoList.keys) {
        const raw = await env.VIDEOS.get(k.name, 'json');
        if (raw) videos.push(raw as VideoProject);
      }
      return new Response(videosPage(videos), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Content-Security-Policy': csp } });
    }

    // ── App (legacy podcast studio) ──
    if (path === '/app') {
      // Proxy to the legacy app for now — we'll merge later
      return new Response('App moved to /studio', { status: 302, headers: { Location: '/studio' } });
    }

    // ── API: Content ──
    if (path === '/api/content' && request.method === 'GET') {
      const prefix = url.searchParams.get('type') ? 'content:' + url.searchParams.get('type') : 'content:';
      const list = await env.CONTENT.list({ prefix, limit: 50 });
      const results: GeneratedContent[] = [];
      for (const k of list.keys) {
        const raw = await env.CONTENT.get(k.name, 'json');
        if (raw) results.push(raw as GeneratedContent);
      }
      results.sort((a, b) => b.createdAt - a.createdAt);
      return j(results);
    }

    // ── API: Generate story ──
    if (path === '/api/generate/story' && request.method === 'POST') {
      const body = await request.json();
      const customChars = await env.CONTENT.get('characters', 'json') as CharacterSheet[] || [];
      const characters = customChars.length > 0 ? [...DEFAULT_CHARACTERS, ...customChars] : DEFAULT_CHARACTERS;
      const content = await generateStory(env, characters, body.topic);
      await env.CONTENT.put('content:' + content.id, JSON.stringify(content), { expirationTtl: 86400 * 30 });
      return j(content);
    }

    // ── API: Generate video script ──
    if (path === '/api/generate/video' && request.method === 'POST') {
      const body = await request.json();
      const video = await generateVideoScript(env, body.type || 'fleet-overview', body.subject);
      await env.VIDEOS.put(video.id, JSON.stringify(video), { expirationTtl: 86400 * 60 });
      return j(video);
    }

    // ── API: Promote to greatest hit ──
    if (path === '/api/promote' && request.method === 'POST') {
      const { id, canon } = await request.json();
      const raw = await env.CONTENT.get('content:' + id, 'json');
      if (!raw) return j({ error: 'Not found' }, 404);
      const content = raw as GeneratedContent;
      content.type = 'greatest-hit';
      if (canon) content.canon = true;
      await env.CONTENT.put('hit:' + id, JSON.stringify(content), { expirationTtl: 86400 * 365 });
      return j(content);
    }

    // ── API: Characters CRUD ──
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

    // ── API: Directions CRUD ──
    if (path === '/api/directions' && request.method === 'GET') {
      const list = await env.CONTENT.list({ prefix: 'direction:', limit: 50 });
      const results: Direction[] = [];
      for (const k of list.keys) {
        const raw = await env.CONTENT.get(k.name, 'json');
        if (raw) results.push(raw as Direction);
      }
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

    // ── API: Hit tracking ──
    if (path === '/api/hit' && request.method === 'POST') {
      const { id } = await request.json();
      const raw = await env.CONTENT.get('content:' + id, 'json');
      if (!raw) return j({ error: 'Not found' }, 404);
      const content = raw as GeneratedContent;
      content.hits = (content.hits || 0) + 1;
      await env.CONTENT.put('content:' + id, JSON.stringify(content), { expirationTtl: 86400 * 30 });
      return j({ hits: content.hits });
    }

    // ── API: Trigger dream cycle ──
    if (path === '/api/dream' && request.method === 'POST') {
      const result = await dreamCycle(env);
      return j(result);
    }

    // ── Legacy endpoints (podcast engine, KG) ──
    if (path.startsWith('/api/kg')) {
      const _kj = (d: any, s = 200) => j(d, s);
      if (path === '/api/kg' && request.method === 'GET') return _kj({ domain: url.searchParams.get('domain') || 'luciddreamer-ai', nodes: await getDomainNodes(env, url.searchParams.get('domain') || 'luciddreamer-ai') });
      if (path === '/api/kg/explore' && request.method === 'GET') { const nid = url.searchParams.get('node'); return _kj(nid ? await traverse(env, nid, parseInt(url.searchParams.get('depth') || '2')) : { error: 'node required' }, nid ? 200 : 400); }
      if (path === '/api/kg/cross' && request.method === 'GET') return _kj({ results: await crossDomainQuery(env, url.searchParams.get('query') || '') });
      if (path === '/api/kg/domains' && request.method === 'GET') return _kj(await domainStats(env));
    }

    if (path === '/api/speak' && request.method === 'POST') {
      // Legacy podcast speak — keep working
      const { sessionId, topic, listenerMessage, mood, personalities: customPersonalities } = await request.json();
      let session = await env.PODCAST_KV.get('session:' + sessionId, 'json') as PodcastSession | null;
      if (!session) {
        const pers = customPersonalities || DEFAULT_PERSONALITIES;
        const sm = new SessionManager();
        session = sm.create(topic?.title || 'Untitled', pers, mood || 'chill');
      }
      const growth = new GrowthEngine(session.listenerPreferences);
      if (listenerMessage) { growth.recordInteraction({ timestamp: Date.now(), type: listenerMessage.startsWith('!') ? 'redirect' : 'question', content: listenerMessage }, session.totalDuration); session.listenerInteractions.push({ timestamp: Date.now(), type: listenerMessage.startsWith('!') ? 'redirect' : 'question', content: listenerMessage }); }
      const systemPrompt = buildSystemPrompt(session.participants || DEFAULT_PERSONALITIES, topic, growth.getPersonalityContext(), session.mood, session.transcript);
      const userMessage = listenerMessage ? 'The listener said: "' + listenerMessage + '". Respond naturally.' : topic ? 'Continue about: ' + topic.title : 'Continue the conversation.';
      const stream = new ReadableStream({ async start(controller) { const enc = new TextEncoder(); try { const resp = await fetch('https://api.deepseek.com/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (env.DEEPSEEK_API_KEY || '') }, body: JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], stream: true, temperature: 0.8, max_tokens: 300 }) }); const reader = resp.body!.getReader(); let full = ''; while (true) { const { done, value } = await reader.read(); if (done) break; for (const line of new TextDecoder().decode(value).split('\n')) { if (line.startsWith('data: ') && line !== 'data: [DONE]') { try { const d = JSON.parse(line.slice(6)); if (d.choices?.[0]?.delta?.content) { full += d.choices[0].delta.content; controller.enqueue(enc.encode('data: ' + JSON.stringify({ text: d.choices[0].delta.content }) + '\n\n')); } } catch {} } } } try { const cleaned = full.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim(); const turn = JSON.parse(cleaned); controller.enqueue(enc.encode('data: ' + JSON.stringify({ turn: { speaker: turn.speaker || 'Maven', text: turn.text || full, emotion: turn.emotion || 'thoughtful' } }) + '\n\n')); } catch { controller.enqueue(enc.encode('data: ' + JSON.stringify({ turn: { speaker: 'Maven', text: full, emotion: 'thoughtful' } }) + '\n\n')); } } catch (e: any) { controller.enqueue(enc.encode('data: ' + JSON.stringify({ error: e.message }) + '\n\n')); } controller.enqueue(enc.encode('data: [DONE]\n\n')); controller.close(); } });
      session.updatedAt = Date.now();
      await env.PODCAST_KV.put('session:' + sessionId, JSON.stringify(session));
      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...cors } });
    }

    if (path === '/api/sessions' && request.method === 'GET') {
      const sessions = await env.PODCAST_KV.list({ prefix: 'session:' });
      return j(await Promise.all(sessions.keys.map(async k => await env.PODCAST_KV.get(k.name, 'json'))));
    }

    if (path === '/api/personalities' && request.method === 'GET') {
      const custom = await env.PODCAST_KV.get('personalities', 'json') as Personality[] || [];
      return j([...DEFAULT_PERSONALITIES, ...custom]);
    }
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
      const tm = new TopicManager();
      const topic = tm.addTopic(topicConfig);
      const existing = await env.PODCAST_KV.get('topics', 'json') as Topic[] || [];
      existing.push(topic);
      await env.PODCAST_KV.put('topics', JSON.stringify(existing));
      return j(topic);
    }

    return new Response('Not found', { status: 404 });
  },

  // ── Cron: Dream Cycle (runs automatically) ──
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    await dreamCycle(env);
  },
};
