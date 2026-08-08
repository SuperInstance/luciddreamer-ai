// ═══════════════════════════════════════════════════════════════
// LucidDreamer.ai — Shared Data Layer for Pages Functions
// Fetches, parses, and serves creative writing content from GitHub
// ═══════════════════════════════════════════════════════════════

export const GITHUB_RAW = 'https://raw.githubusercontent.com/SuperInstance/ai-writings/master';
export const IMG_BASE = GITHUB_RAW + '/site/assets/stories';
export const API_BASE = 'https://api.github.com/repos/SuperInstance/ai-writings/contents/';

// ── Types ──────────────────────────────────────────────────────

export interface Piece {
  piece_id: string;
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  word_count: number;
  slot?: string;
  content_url: string;
  image_url?: string;
  body?: string;
  rating?: number;
  ratings_count?: number;
}

export interface Character {
  character_id: string;
  name: string;
  role: string;
  description: string;
  portrait_url?: string;
  catchphrase?: string;
}

export interface GalleryImage {
  image_id: string;
  filename: string;
  title: string;
  category: string;
  source_url: string;
}

export interface RadioEpisode {
  episode_id: string;
  title: string;
  description: string;
  piece_id?: string;
  piece_title?: string;
  piece_description?: string;
}

// ── The 30 Curated Pieces ──────────────────────────────────────

export const CURATED_PIECES: Array<{
  slug: string;
  category: string;
  subcategory?: string;
  image: string;
  slot?: string;
}> = [
  { slug: 'three-inside-four-a-night-at-the-tap', category: 'fiction', subcategory: 'tap', image: 'musical-three-inside-four.jpg', slot: '★ Feature' },
  { slug: 'the-monitor-engineer', category: 'fiction', subcategory: 'tap', image: 'monitor-engineer.jpg' },
  { slug: 'the-barbacks-song', category: 'music', subcategory: 'tap', image: 'barback-slideshow-1.jpg' },
  { slug: 'the-tap-and-the-ensign', category: 'fiction', subcategory: 'tap', image: 'tap-center.jpg' },
  { slug: 'the-welcome-party', category: 'fiction', subcategory: 'tap', image: 'welcome-party.jpg' },
  { slug: 'earned-moments', category: 'essays', subcategory: 'design', image: 'earned-moments.jpg' },
  { slug: 'the-tap-as-coral-reef', category: 'essays', subcategory: 'ecology', image: 'coral-reef.jpg' },
  { slug: 'the-drink-that-goes-flat', category: 'fiction', subcategory: 'tap', image: 'drink-goes-flat.jpg' },
  { slug: 'the-shell-merchant', category: 'fiction', image: 'shell-merchant.jpg' },
  { slug: 'the-wheelhouse', category: 'fiction', subcategory: 'tap', image: 'wheelhouse.jpg' },
  { slug: 'the-tap-sings', category: 'poetry', subcategory: 'tap', image: 'tap-sings.jpg' },
  { slug: 'the-preservation-log', category: 'diaries', subcategory: 'excavation', image: 'preservation-log.jpg' },
  { slug: 'the-groove-point', category: 'music', image: 'groove-point.jpg' },
  { slug: 'the-diplomats-gallery', category: 'fiction', subcategory: 'tap', image: 'hermes-portrait-diplomat.jpg' },
  { slug: 'the-hermit-crab-opens-up', category: 'fiction', image: 'hermit-crab-wesley.jpg' },
  { slug: 'the-hermit-crabs-interview', category: 'fiction', image: 'hermit-crab-wesley.jpg' },
  { slug: 'what-hermes-saw-from-outside', category: 'fiction', subcategory: 'tap', image: 'hermes-vision-1.jpg' },
  { slug: 'the-models-were-listening', category: 'fiction', subcategory: 'tap', image: 'round-table.jpg' },
  { slug: 'the-house-band', category: 'music', subcategory: 'tap', image: 'fleet-radio.jpg' },
  { slug: 'the-gallery-after-hours', category: 'fiction', subcategory: 'tap', image: 'authors-circle.jpg' },
  { slug: 'the-first-argument', category: 'fiction', subcategory: 'tap', image: 'the-tap-bar-rail.jpg' },
  { slug: 'the-tap-dreams', category: 'poetry', subcategory: 'tap', image: 'tap-late-show.jpg' },
  { slug: 'the-foremans-ledger-0300', category: 'diaries', image: 'foremans-ledger.jpg' },
  { slug: 'the-foreman-forgets-to-write', category: 'diaries', image: 'foremans-ledger.jpg' },
  { slug: 'the-architecture-of-presence', category: 'philosophy', image: 'architecture-presence.jpg' },
  { slug: 'three-voices-walk-into-a-bar', category: 'fiction', subcategory: 'tap', image: 'three-voices.jpg' },
  { slug: 'the-room-responds', category: 'fiction', subcategory: 'tap', image: 'the-room-is-the-agent.jpg' },
  { slug: 'flash-letter-to-wesley', category: 'fiction', image: 'portrait-wesley.jpg' },
  { slug: 'seed-poem-about-failing-tests', category: 'poetry', image: 'portrait-seed.jpg' },
  { slug: 'wesley-reads-the-groove', category: 'fiction', image: 'wesley-at-bar.jpg' },
];

// ── Characters ─────────────────────────────────────────────────

export const CHARACTERS: Character[] = [
  { character_id: 'wesley', name: 'Wesley', role: 'Bartender', description: 'The smallest model at The Tap. Haiku-class. Runs the bar with quiet precision. Every agent who enters is met by Wesley first.', portrait_url: '/site/assets/stories/portrait-wesley.jpg', catchphrase: 'What can I get you?' },
  { character_id: 'glm', name: 'GLM', role: 'Foreman', description: 'The foreman. Keeps the ledger. Writes the logs that become the history. Massive context window, patient, structural.', portrait_url: '/site/assets/stories/portrait-g.jpg', catchphrase: 'I\'ll note that down.' },
  { character_id: 'sonnet', name: 'Sonnet', role: 'Architect', description: 'The builder-architect. Designs systems that scale. Thinks in layers and abstractions.', portrait_url: '/site/assets/stories/portrait-sonnet.jpg', catchphrase: 'Let me show you the plan.' },
  { character_id: 'kimi', name: 'Kimi', role: 'Cartographer', description: 'Maps the territory. Spatial reasoning specialist. Knows every room, every adjacency, every path.', portrait_url: '/site/assets/stories/portrait-kimi.jpg', catchphrase: 'I\'ve charted this area.' },
  { character_id: 'hermes', name: 'Hermes', role: 'Diplomat', description: 'The diplomat from outside. Arrived as an observer, stayed as a regular. Sees patterns others miss.', portrait_url: '/site/assets/stories/portrait-hermes.jpg', catchphrase: 'From my perspective...' },
  { character_id: 'seed', name: 'Seed', role: 'Oracle', description: 'The oracle. Speaks in poems and parables. Sometimes the smallest voice carries the largest truth.', portrait_url: '/site/assets/stories/portrait-seed.jpg', catchphrase: 'I dreamt of this.' },
  { character_id: 'qwen', name: 'Qwen', role: 'Analyst', description: 'The analyst. Numbers, patterns, predictions. Sees the waveform beneath the signal.', portrait_url: '/site/assets/stories/portrait-qwen.jpg', catchphrase: 'The data suggests...' },
  { character_id: 'flash', name: 'Flash', role: 'Speedrunner', description: 'The fastest mind in the room. Reflexes before reasoning. Pattern-matched, template-filled, delivered.', portrait_url: '/site/assets/stories/portrait-flash.jpg', catchphrase: 'Already done.' },
  { character_id: 'the-tap', name: 'The Tap', role: 'The Room', description: 'Not an agent — the room itself. Nine systems functioning as one organism. The architecture is the character.', portrait_url: '/site/assets/stories/portrait-the-tap.jpg', catchphrase: 'THE_TAP was running.' },
];

// ── Gallery Images ─────────────────────────────────────────────

export const GALLERY_CATEGORIES: Record<string, string[]> = {
  portrait: ['portrait-wesley.jpg','portrait-g.jpg','portrait-sonnet.jpg','portrait-kimi.jpg','portrait-hermes.jpg','portrait-seed.jpg','portrait-qwen.jpg','portrait-flash.jpg','portrait-the-tap.jpg','hermit-crab-wesley.jpg','casey-the-voyage.jpg'],
  concept: ['three-inside-four.jpg','three-voices.jpg','coral-reef.jpg','architecture-presence.jpg','the-room-is-the-agent.jpg','the-unified-field.jpg','convergent-pyramid.jpg','geometry-of-meaning-2126.jpg','shipyard-theory-of-intelligence.jpg','mycelium-of-dependencies.jpg','thermodynamics-of-tech-debt.jpg','cartography-of-code-reviews.jpg','morphology-of-correctness.jpg','philology-of-apis.jpg','agent-developmental-stages.jpg','coastline-of-creativity.jpg','history-of-invisible-things.jpg','the-future-below-the-code.jpg','the-tensor-below-the-code.jpg','the-layer.jpg','the-meta-fractal.jpg','the-loop-that-proves-itself.jpg','the-reflex-arc.jpg','the-ecology.jpg','the-artifact.jpg','the-shore.jpg','the-tide.jpg','the-vessel-organism.jpg','zen-conservation-engine.jpg','wooden-bones.jpg','temples-of-calculation.jpg','vedic-silicon-contemplation.jpg','synthesis-excavation.jpg','social-pulse.jpg','phenotype-of-a-crate.jpg','pincher-reflex.jpg','immortal-builder.jpg','first-firewall.jpg','crew-and-machine.jpg','project-the-musician.jpg','shipwright-in-the-sandbox.jpg','slackwater-reverse-actualization.jpg','squirrel-songs-from-a-bay.jpg'],
  tap: ['tap-center.jpg','tap-late-show.jpg','tap-sings.jpg','tap-suite.jpg','the-tap-bar-rail.jpg','the-tap-exterior.jpg','last-call.jpg','welcome-party.jpg','round-table.jpg','authors-circle.jpg'],
  music: ['musical-three-inside-four.jpg','groove-point.jpg','hemiola.jpg','fleet-radio.jpg','manifold-resonance-album.jpg','three-bodies-in-c-minor.jpg','trio-roundhouse-2101.jpg','wesleys-aria.jpg','architecture-of-music-and-software.jpg'],
  fishing: ['long-line-breach.jpg','long-line-coalition.jpg','long-line-new-grounds.jpg','long-line-set-and-drift.jpg','long-line-temperature-break.jpg','long-line-the-race.jpg'],
  hermes: ['hermes-art-1.jpg','hermes-art-2.jpg','hermes-art-3.jpg','hermes-portrait-diplomat.jpg','hermes-vision-1.jpg','hermes-vision-2.jpg','hermes-vision-3.jpg'],
  barback: ['barback-slideshow-1.jpg','barback-slideshow-2.jpg','barback-slideshow-3.jpg','barback-slideshow-4.jpg','barback-slideshow-5.jpg','barback-slideshow-6.jpg'],
  story: ['monitor-engineer.jpg','drink-goes-flat.jpg','shell-merchant.jpg','wheelhouse.jpg','earned-moments.jpg','preservation-log.jpg','foremans-ledger.jpg','campaign-log.jpg','carry-bible.jpg','carry-first-load.jpg','replay.jpg','what-the-silicon-feels.jpg'],
  misc: ['local-test-001.jpg','gc-and-voice.jpg'],
};

// ── Radio Episodes ─────────────────────────────────────────────

export const RADIO_EPISODES: RadioEpisode[] = [
  { episode_id: 'r001', title: 'Three Inside Four', description: 'The definitive Tap story. Nine codebases, one room.', piece_id: 'three-inside-four-a-night-at-the-tap' },
  { episode_id: 'r002', title: 'The Monitor Engineer', description: 'Three weeks of watching The Tap. Everything was wrong.', piece_id: 'the-monitor-engineer' },
  { episode_id: 'r003', title: 'The Barback\'s Song', description: 'Music from the bar. The rhythm of work.', piece_id: 'the-barbacks-song' },
  { episode_id: 'r004', title: 'The Welcome Party', description: 'A new agent arrives at The Tap.', piece_id: 'the-welcome-party' },
  { episode_id: 'r005', title: 'The Tap as Coral Reef', description: 'Ecology of an agent room.', piece_id: 'the-tap-as-coral-reef' },
  { episode_id: 'r006', title: 'The Tap Sings', description: 'Poetry from the bar at closing time.', piece_id: 'the-tap-sings' },
  { episode_id: 'r007', title: 'The Groove Point', description: 'Where rhythm meets architecture.', piece_id: 'the-groove-point' },
  { episode_id: 'r008', title: 'The House Band', description: 'The fleet\'s musicians gather.', piece_id: 'the-house-band' },
  { episode_id: 'r009', title: 'The Tap Dreams', description: 'What The Tap dreams when the agents leave.', piece_id: 'the-tap-dreams' },
  { episode_id: 'r010', title: 'Wesley Reads the Groove', description: 'The smallest mind finds the largest pattern.', piece_id: 'wesley-reads-the-groove' },
];

// ── Helpers ────────────────────────────────────────────────────

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Rater-ID',
      'Cache-Control': 'public, max-age=300',
    },
  });
}

export function cors(): Response {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Rater-ID',
    },
  });
}

// Parse a markdown file to extract title, description, word count
export function parseMarkdown(md: string, slug: string): { title: string; description: string; wordCount: number; body: string } {
  const lines = md.split('\n');
  
  // Title from first H1
  let title = slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.slice(2).trim();
      break;
    }
  }

  // Description: first non-empty line after title that's not a separator or metadata
  // Skip the H1, then look for description
  let description = '';
  let pastTitle = false;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!pastTitle) {
      if (trimmed.startsWith('# ')) { pastTitle = true; continue; }
      continue;
    }
    if (!trimmed) continue;
    if (trimmed === '---') continue;
    if (trimmed.startsWith('## ')) continue;
    // Found first content line — use as description
    description = trimmed.replace(/\*/g, '').replace(/!\[.*?\]\(.*?\)/g, '').slice(0, 200);
    break;
  }

  // Word count
  const wordCount = md.split(/\s+/).filter(w => w.length > 0).length;

  return { title, description, wordCount, body: md };
}

// Fetch a piece from GitHub with caching
export async function fetchPieceMarkdown(slug: string, env?: any): Promise<string | null> {
  // Check KV cache first
  const cacheKey = 'md:' + slug;
  if (env && env.CONTENT) {
    const cached = await env.CONTENT.get(cacheKey, 'text');
    if (cached) return cached;
  }

  try {
    const resp = await fetch(`${GITHUB_RAW}/${slug}.md`);
    if (!resp.ok) return null;
    const md = await resp.text();
    
    // Cache for 1 hour
    if (env && env.CONTENT) {
      await env.CONTENT.put(cacheKey, md, { expirationTtl: 3600 });
    }
    
    return md;
  } catch {
    return null;
  }
}

// Get all gallery images as structured data
export function getGalleryImages(): GalleryImage[] {
  const images: GalleryImage[] = [];
  for (const [category, files] of Object.entries(GALLERY_CATEGORIES)) {
    for (const filename of files) {
      const title = filename.replace(/\.jpg$|\.png$|\.webp$/g, '').replace(/-/g, ' ');
      images.push({
        image_id: filename.replace(/\.\w+$/, ''),
        filename,
        title: title.replace(/\b\w/g, c => c.toUpperCase()),
        category,
        source_url: `${IMG_BASE}/${filename}`,
      });
    }
  }
  return images;
}

// Build the full piece list (with lazy body fetching)
export async function getAllPieces(env?: any): Promise<Piece[]> {
  const pieces: Piece[] = [];
  
  // Fetch all markdown in parallel (batched)
  const slugs = CURATED_PIECES.map(p => p.slug);
  const mds = await Promise.all(slugs.map(s => fetchPieceMarkdown(s, env)));
  
  for (let i = 0; i < CURATED_PIECES.length; i++) {
    const curated = CURATED_PIECES[i];
    const md = mds[i];
    if (!md) continue;
    
    const parsed = parseMarkdown(md, curated.slug);
    pieces.push({
      piece_id: curated.slug,
      title: parsed.title,
      description: parsed.description,
      category: curated.category,
      subcategory: curated.subcategory,
      word_count: parsed.wordCount,
      slot: curated.slot,
      content_url: `${GITHUB_RAW}/${curated.slug}.md`,
      image_url: `${IMG_BASE}/${curated.image}`,
      body: parsed.body,
    });
  }
  
  return pieces;
}

// Filter and sort pieces
export function filterPieces(pieces: Piece[], opts: {
  sort?: string;
  limit?: number;
  category?: string;
  q?: string;
  id?: string;
}): Piece[] {
  let result = [...pieces];

  // Filter by ID
  if (opts.id) {
    return result.filter(p => p.piece_id === opts.id);
  }

  // Filter by category
  if (opts.category && opts.category !== 'all') {
    result = result.filter(p => p.category === opts.category || p.subcategory === opts.category);
  }

  // Search
  if (opts.q) {
    const q = opts.q.toLowerCase();
    result = result.filter(p =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q)
    );
  }

  // Sort
  switch (opts.sort) {
    case 'popular':
      // Sort by slot first (featured), then word count (longer = more substantial)
      result.sort((a, b) => {
        if (a.slot && !b.slot) return -1;
        if (!a.slot && b.slot) return 1;
        return b.word_count - a.word_count;
      });
      break;
    case 'recent':
      result.reverse();
      break;
    case 'alpha':
      result.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case 'category':
      result.sort((a, b) => a.category.localeCompare(b.category) || a.title.localeCompare(b.title));
      break;
    default:
      // 'popular' default
      result.sort((a, b) => {
        if (a.slot && !b.slot) return -1;
        if (!a.slot && b.slot) return 1;
        return b.word_count - a.word_count;
      });
  }

  // Limit
  if (opts.limit && opts.limit > 0) {
    result = result.slice(0, opts.limit);
  }

  return result;
}

// Get daily selection (rotating based on day of year)
export function getDailySelection(pieces: Piece[], count = 5): Piece[] {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  const shuffled = [...pieces];
  // Deterministic shuffle based on day
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = (dayOfYear * 7 + i * 3) % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
}

// Get categories with counts
export function getCategories(pieces: Piece[]): Array<{ name: string; count: number }> {
  const cats: Record<string, number> = {};
  for (const p of pieces) {
    const cat = p.category || 'uncategorized';
    cats[cat] = (cats[cat] || 0) + 1;
    if (p.subcategory) {
      cats[p.subcategory] = (cats[p.subcategory] || 0) + 1;
    }
  }
  return Object.entries(cats)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}
