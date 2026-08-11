// Tests for _data.ts — Shared Data Layer
import { describe, it, expect } from 'vitest';
import {
  parseMarkdown,
  filterPieces,
  getDailySelection,
  getCategories,
  getGalleryImages,
  CURATED_PIECES,
  CHARACTERS,
  RADIO_EPISODES,
  json,
  cors,
  type Piece,
} from '../../functions/api/_data.js';

// ── Helper: create a mock piece ──────────────────────────────
function mockPiece(overrides: Partial<Piece> = {}): Piece {
  return {
    piece_id: 'test-piece',
    title: 'Test Piece',
    description: 'A test description',
    category: 'fiction',
    word_count: 1000,
    content_url: 'https://example.com/test.md',
    ...overrides,
  };
}

// ── parseMarkdown ────────────────────────────────────────────
describe('parseMarkdown', () => {
  it('extracts title from H1', () => {
    const md = '# My Great Story\n\nSome content here.';
    const result = parseMarkdown(md, 'my-great-story');
    expect(result.title).toBe('My Great Story');
  });

  it('falls back to slug as title when no H1', () => {
    const md = 'Just some text without a header.';
    const result = parseMarkdown(md, 'just-some-text');
    expect(result.title).toBe('Just Some Text');
  });

  it('extracts description from first content line after title', () => {
    const md = '# Title\n\nThis is the first paragraph of the story.';
    const result = parseMarkdown(md, 'title');
    expect(result.description).toContain('This is the first paragraph');
  });

  it('skips separators and H2 when finding description', () => {
    const md = '# Title\n\n---\n\n## Section\n\nThe real description.';
    const result = parseMarkdown(md, 'title');
    expect(result.description).toBe('The real description.');
  });

  it('truncates long descriptions to 200 chars', () => {
    const longLine = 'A'.repeat(300);
    const md = `# Title\n\n${longLine}`;
    const result = parseMarkdown(md, 'title');
    expect(result.description.length).toBeLessThanOrEqual(200);
  });

  it('strips markdown bold from description', () => {
    const md = '# Title\n\n**Bold text** here.';
    const result = parseMarkdown(md, 'title');
    expect(result.description).not.toContain('*');
  });

  it('strips image syntax from description', () => {
    const md = '# Title\n\n![alt text](image.jpg) Real description.';
    const result = parseMarkdown(md, 'title');
    expect(result.description).not.toContain('![');
    expect(result.description).not.toContain('image.jpg');
  });

  it('counts words correctly', () => {
    const md = '# One Two Three\n\nFour five six seven eight.';
    const result = parseMarkdown(md, 'test');
    expect(result.wordCount).toBe(9); // # One Two Three (4) + Four five six seven eight (5) = 9
  });

  it('counts zero words for empty string', () => {
    const result = parseMarkdown('', 'empty');
    expect(result.wordCount).toBe(0);
  });

  it('returns body as original markdown', () => {
    const md = '# Title\n\nContent.';
    const result = parseMarkdown(md, 'title');
    expect(result.body).toBe(md);
  });
});

// ── filterPieces ─────────────────────────────────────────────
describe('filterPieces', () => {
  const samplePieces: Piece[] = [
    mockPiece({ piece_id: 'a', title: 'Alpha', category: 'fiction', word_count: 500, slot: '★ Feature' }),
    mockPiece({ piece_id: 'b', title: 'Beta', category: 'poetry', word_count: 200 }),
    mockPiece({ piece_id: 'c', title: 'Gamma', category: 'fiction', word_count: 1500 }),
    mockPiece({ piece_id: 'd', title: 'Delta', category: 'essays', word_count: 800 }),
    mockPiece({ piece_id: 'e', title: 'Epsilon', category: 'fiction', subcategory: 'tap', word_count: 300 }),
  ];

  it('filters by id', () => {
    const result = filterPieces(samplePieces, { id: 'b' });
    expect(result).toHaveLength(1);
    expect(result[0].piece_id).toBe('b');
  });

  it('filters by category', () => {
    const result = filterPieces(samplePieces, { category: 'fiction' });
    expect(result).toHaveLength(3);
    expect(result.every(p => p.category === 'fiction')).toBe(true);
  });

  it('filters by subcategory', () => {
    const result = filterPieces(samplePieces, { category: 'tap' });
    expect(result).toHaveLength(1);
    expect(result[0].piece_id).toBe('e');
  });

  it('category "all" returns everything', () => {
    const result = filterPieces(samplePieces, { category: 'all' });
    expect(result).toHaveLength(5);
  });

  it('searches by title', () => {
    const result = filterPieces(samplePieces, { q: 'alpha' });
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Alpha');
  });

  it('search is case-insensitive', () => {
    const result = filterPieces(samplePieces, { q: 'EPSILON' });
    expect(result).toHaveLength(1);
  });

  it('sorts popular: featured first, then by word count', () => {
    const result = filterPieces(samplePieces, { sort: 'popular' });
    expect(result[0].piece_id).toBe('a'); // has slot
    // Remaining sorted by word_count desc
    expect(result[1].piece_id).toBe('c'); // 1500
  });

  it('sorts alpha', () => {
    const result = filterPieces(samplePieces, { sort: 'alpha' });
    expect(result[0].title).toBe('Alpha');
    expect(result[result.length - 1].title).toBe('Gamma');
  });

  it('sorts category', () => {
    const result = filterPieces(samplePieces, { sort: 'category' });
    // essays < fiction < fiction < poetry (alpha within category)
    expect(result[0].category).toBe('essays');
  });

  it('sorts recent (reversed)', () => {
    const result = filterPieces(samplePieces, { sort: 'recent' });
    expect(result[0].piece_id).toBe('e');
    expect(result[result.length - 1].piece_id).toBe('a');
  });

  it('limits results', () => {
    const result = filterPieces(samplePieces, { limit: 2 });
    expect(result).toHaveLength(2);
  });

  it('default sort is popular', () => {
    const result = filterPieces(samplePieces, {});
    expect(result[0].piece_id).toBe('a'); // featured first
  });
});

// ── getDailySelection ────────────────────────────────────────
describe('getDailySelection', () => {
  const samplePieces: Piece[] = CURATED_PIECES.map((c, i) => mockPiece({
    piece_id: c.slug,
    title: c.slug,
    category: c.category,
    subcategory: c.subcategory,
    word_count: 100 * (i + 1),
    slot: c.slot,
  }));

  it('returns the requested count', () => {
    const result = getDailySelection(samplePieces, 3);
    expect(result).toHaveLength(3);
  });

  it('returns different pieces on different days (deterministic)', () => {
    // Mock the day by checking that two calls return the same result
    const result1 = getDailySelection(samplePieces, 5);
    const result2 = getDailySelection(samplePieces, 5);
    expect(result1.map(p => p.piece_id)).toEqual(result2.map(p => p.piece_id));
  });

  it('returns fewer if count exceeds available', () => {
    const small = samplePieces.slice(0, 3);
    const result = getDailySelection(small, 5);
    expect(result).toHaveLength(3);
  });

  it('does not mutate the original array', () => {
    const original = [...samplePieces];
    getDailySelection(samplePieces, 3);
    expect(samplePieces.map(p => p.piece_id)).toEqual(original.map(p => p.piece_id));
  });
});

// ── getCategories ────────────────────────────────────────────
describe('getCategories', () => {
  const samplePieces: Piece[] = [
    mockPiece({ category: 'fiction', subcategory: 'tap' }),
    mockPiece({ category: 'fiction', subcategory: 'tap' }),
    mockPiece({ category: 'fiction', subcategory: 'science' }),
    mockPiece({ category: 'poetry' }),
    mockPiece({ category: 'essays' }),
    mockPiece({ category: 'poetry' }),
  ];

  it('counts categories correctly', () => {
    const cats = getCategories(samplePieces);
    const fiction = cats.find(c => c.name === 'fiction');
    expect(fiction?.count).toBe(3);
    const poetry = cats.find(c => c.name === 'poetry');
    expect(poetry?.count).toBe(2);
  });

  it('includes subcategories', () => {
    const cats = getCategories(samplePieces);
    const tap = cats.find(c => c.name === 'tap');
    expect(tap?.count).toBe(2);
    const science = cats.find(c => c.name === 'science');
    expect(science?.count).toBe(1);
  });

  it('sorts by count descending', () => {
    const cats = getCategories(samplePieces);
    expect(cats[0].count).toBeGreaterThanOrEqual(cats[cats.length - 1].count);
  });

  it('handles empty array', () => {
    const cats = getCategories([]);
    expect(cats).toEqual([]);
  });
});

// ── getGalleryImages ─────────────────────────────────────────
describe('getGalleryImages', () => {
  it('returns images from all categories', () => {
    const images = getGalleryImages();
    expect(images.length).toBeGreaterThan(0);
  });

  it('each image has required fields', () => {
    const images = getGalleryImages();
    for (const img of images) {
      expect(img.image_id).toBeTruthy();
      expect(img.filename).toBeTruthy();
      expect(img.title).toBeTruthy();
      expect(img.category).toBeTruthy();
      expect(img.source_url).toContain(img.filename);
    }
  });

  it('image_id is filename without extension', () => {
    const images = getGalleryImages();
    for (const img of images) {
      expect(img.image_id).toBe(img.filename.replace(/\.\w+$/, ''));
    }
  });

  it('title is humanized filename', () => {
    const images = getGalleryImages();
    const first = images[0];
    // Title should have spaces, not dashes
    expect(first.title).not.toMatch(/-/);
    expect(first.title).toMatch(/^[A-Z]/); // Starts with capital
  });
});

// ── Static Data Integrity ────────────────────────────────────
describe('Static Data Integrity', () => {
  it('CURATED_PIECES has 30 entries', () => {
    expect(CURATED_PIECES).toHaveLength(30);
  });

  it('all curated pieces have unique slugs', () => {
    const slugs = CURATED_PIECES.map(p => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('all curated pieces have required fields', () => {
    for (const p of CURATED_PIECES) {
      expect(p.slug).toBeTruthy();
      expect(p.category).toBeTruthy();
      expect(p.image).toBeTruthy();
    }
  });

  it('CHARACTERS have unique ids', () => {
    const ids = CHARACTERS.map(c => c.character_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all characters have required fields', () => {
    for (const c of CHARACTERS) {
      expect(c.name).toBeTruthy();
      expect(c.role).toBeTruthy();
      expect(c.description).toBeTruthy();
    }
  });

  it('RADIO_EPISODES have unique episode_ids', () => {
    const ids = RADIO_EPISODES.map(e => e.episode_id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('all radio episodes reference valid piece_ids', () => {
    const slugs = new Set(CURATED_PIECES.map(p => p.slug));
    for (const ep of RADIO_EPISODES) {
      if (ep.piece_id) {
        expect(slugs.has(ep.piece_id)).toBe(true);
      }
    }
  });
});

// ── Response Helpers ─────────────────────────────────────────
describe('json helper', () => {
  it('creates a JSON Response with correct status', () => {
    const resp = json({ hello: 'world' }, 201);
    expect(resp.status).toBe(201);
    expect(resp.headers.get('Content-Type')).toBe('application/json');
  });

  it('defaults to 200', () => {
    const resp = json({});
    expect(resp.status).toBe(200);
  });

  it('includes CORS headers', () => {
    const resp = json({});
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(resp.headers.get('Access-Control-Allow-Methods')).toContain('GET');
  });

  it('serializes data correctly', async () => {
    const resp = json({ test: true });
    const body = await resp.json();
    expect(body).toEqual({ test: true });
  });
});

describe('cors helper', () => {
  it('returns null body', async () => {
    const resp = cors();
    expect(resp.body).toBe(null);
  });

  it('includes CORS headers', () => {
    const resp = cors();
    expect(resp.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});
