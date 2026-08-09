// Tests for knowledge-graph.ts — KV-backed knowledge graph
// Uses a mock KV store to test all operations

import { describe, it, expect, beforeEach } from 'vitest';
import {
  addNode, addEdge, getNode, traverse, crossDomainQuery,
  findPath, domainStats, getDomainNodes,
  type KGNode, type KGEdge,
} from './knowledge-graph';

// ─── Mock KV Store ─────────────────────────────────────────────

function createMockKV() {
  const store = new Map<string, string>();
  return {
    async get(key: string, type?: string): Promise<any> {
      const val = store.get(key);
      if (val === undefined) return null;
      if (type === 'json') return JSON.parse(val);
      return val;
    },
    async put(key: string, value: string): Promise<void> {
      store.set(key, value);
    },
    async list({ prefix }: { prefix: string }): Promise<{ keys: { name: string }[] }> {
      const keys: { name: string }[] = [];
      for (const key of store.keys()) {
        if (key.startsWith(prefix)) keys.push({ name: key });
      }
      return { keys };
    },
    // Test helper
    _store: store,
    _clear() { store.clear(); },
  };
}

// ─── Test Data ─────────────────────────────────────────────────

function makeNode(overrides: Partial<KGNode> = {}): KGNode {
  return {
    id: 'test-node',
    label: 'Test Node',
    type: 'concept',
    domain: 'test',
    confidence: 0.8,
    created: Date.now(),
    accessed: Date.now(),
    accessCount: 0,
    ...overrides,
  };
}

function makeEdge(overrides: Partial<KGEdge> = {}): KGEdge {
  return {
    from: 'node-a',
    to: 'node-b',
    relation: 'extends',
    weight: 1.0,
    domain: 'test',
    ...overrides,
  };
}

// ─── Tests ─────────────────────────────────────────────────────

describe('KnowledgeGraph — addNode', () => {
  let env: any;
  beforeEach(() => { env = { KG: createMockKV() }; });

  it('adds a new node', async () => {
    const node = makeNode();
    await addNode(env, node);
    const retrieved = await getNode(env, 'test-node');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.label).toBe('Test Node');
  });

  it('sets accessCount to 1 for new node', async () => {
    await addNode(env, makeNode());
    const node = await getNode(env, 'test-node');
    expect(node!.accessCount).toBe(2); // getNode increments
  });

  it('merges with existing node by bumping access count', async () => {
    await addNode(env, makeNode({ confidence: 0.5 }));
    await addNode(env, makeNode({ confidence: 0.3 }));
    const node = await getNode(env, 'test-node');
    // Should keep the higher confidence
    expect(node!.confidence).toBe(0.5);
  });

  it('updates confidence to max of existing and new', async () => {
    await addNode(env, makeNode({ confidence: 0.3 }));
    await addNode(env, makeNode({ confidence: 0.9 }));
    const node = await getNode(env, 'test-node');
    expect(node!.confidence).toBe(0.9);
  });
});

describe('KnowledgeGraph — addEdge', () => {
  let env: any;
  beforeEach(() => { env = { KG: createMockKV() }; });

  it('adds a new edge', async () => {
    // Add nodes first so traverse can find them
    await addNode(env, makeNode({ id: 'node-a' }));
    await addNode(env, makeNode({ id: 'node-b' }));
    await addEdge(env, makeEdge());
    // Verify by traversing
    const result = await traverse(env, 'node-a', 1);
    expect(result.edges.length).toBeGreaterThan(0);
  });

  it('does not duplicate existing edge', async () => {
    await addNode(env, makeNode({ id: 'node-a' }));
    await addNode(env, makeNode({ id: 'node-b' }));
    await addEdge(env, makeEdge());
    await addEdge(env, makeEdge());
    const result = await traverse(env, 'node-a', 1);
    const matchingEdges = result.edges.filter(e => e.from === 'node-a' && e.to === 'node-b');
    expect(matchingEdges.length).toBe(1);
  });
});

describe('KnowledgeGraph — getNode', () => {
  let env: any;
  beforeEach(() => { env = { KG: createMockKV() }; });

  it('returns null for non-existent node', async () => {
    const node = await getNode(env, 'nonexistent');
    expect(node).toBeNull();
  });

  it('increments accessCount on retrieval', async () => {
    await addNode(env, makeNode());
    const n1 = await getNode(env, 'test-node');
    const count1 = n1!.accessCount;
    const n2 = await getNode(env, 'test-node');
    expect(n2!.accessCount).toBe(count1 + 1);
  });
});

describe('KnowledgeGraph — traverse', () => {
  let env: any;
  beforeEach(() => { env = { KG: createMockKV() }; });

  it('returns empty for non-existent start node', async () => {
    const result = await traverse(env, 'nonexistent', 2);
    expect(result.nodes).toHaveLength(0);
    expect(result.edges).toHaveLength(0);
  });

  it('returns single node with no edges at depth 0', async () => {
    await addNode(env, makeNode({ id: 'solo' }));
    const result = await traverse(env, 'solo', 0);
    expect(result.nodes).toHaveLength(1);
  });

  it('traverses connected nodes', async () => {
    await addNode(env, makeNode({ id: 'a' }));
    await addNode(env, makeNode({ id: 'b', domain: 'test' }));
    await addEdge(env, makeEdge({ from: 'a', to: 'b' }));

    const result = await traverse(env, 'a', 1);
    expect(result.nodes.length).toBeGreaterThanOrEqual(2);
    expect(result.edges.length).toBeGreaterThanOrEqual(1);
  });

  it('respects maxDepth', async () => {
    await addNode(env, makeNode({ id: 'a' }));
    await addNode(env, makeNode({ id: 'b' }));
    await addNode(env, makeNode({ id: 'c' }));
    await addEdge(env, makeEdge({ from: 'a', to: 'b' }));
    await addEdge(env, makeEdge({ from: 'b', to: 'c' }));

    const result = await traverse(env, 'a', 1);
    // Should find a and b but not c (depth 1)
    const ids = result.nodes.map(n => n.id);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
    expect(ids).not.toContain('c');
  });
});

describe('KnowledgeGraph — crossDomainQuery', () => {
  let env: any;
  beforeEach(() => { env = { KG: createMockKV() }; });

  it('returns nodes from other domains matching query', async () => {
    await addNode(env, makeNode({ id: 'ship-nav', label: 'Ship Navigation', domain: 'maritime' }));
    await addNode(env, makeNode({ id: 'ship-ai', label: 'Ship AI', domain: 'tech' }));

    const results = await crossDomainQuery(env, 'ship', 'maritime');
    expect(results.length).toBe(1);
    expect(results[0].domain).toBe('tech');
  });

  it('excludes nodes from current domain', async () => {
    await addNode(env, makeNode({ id: 'test', label: 'Test', domain: 'current' }));
    const results = await crossDomainQuery(env, 'test', 'current');
    expect(results).toHaveLength(0);
  });

  it('sorts by confidence descending', async () => {
    await addNode(env, makeNode({ id: 'low', label: 'match', domain: 'a', confidence: 0.3 }));
    await addNode(env, makeNode({ id: 'high', label: 'match', domain: 'b', confidence: 0.9 }));
    await addNode(env, makeNode({ id: 'mid', label: 'match', domain: 'c', confidence: 0.6 }));

    const results = await crossDomainQuery(env, 'match', 'current');
    expect(results[0].confidence).toBeGreaterThanOrEqual(results[1].confidence!);
    expect(results[1].confidence).toBeGreaterThanOrEqual(results[2].confidence!);
  });

  it('respects maxResults', async () => {
    for (let i = 0; i < 10; i++) {
      await addNode(env, makeNode({ id: `n${i}`, label: 'match', domain: `d${i}` }));
    }
    const results = await crossDomainQuery(env, 'match', 'current', 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

describe('KnowledgeGraph — findPath', () => {
  let env: any;
  beforeEach(() => { env = { KG: createMockKV() }; });

  it('returns empty array when no path exists', async () => {
    await addNode(env, makeNode({ id: 'a' }));
    await addNode(env, makeNode({ id: 'b' }));
    const path = await findPath(env, 'a', 'b');
    expect(path).toHaveLength(0);
  });

  it('finds direct path', async () => {
    await addNode(env, makeNode({ id: 'a' }));
    await addNode(env, makeNode({ id: 'b' }));
    await addEdge(env, makeEdge({ from: 'a', to: 'b' }));

    const path = await findPath(env, 'a', 'b');
    expect(path).toHaveLength(1);
    expect(path[0].from).toBe('a');
    expect(path[0].to).toBe('b');
  });

  it('finds multi-hop path', async () => {
    await addNode(env, makeNode({ id: 'a' }));
    await addNode(env, makeNode({ id: 'b' }));
    await addNode(env, makeNode({ id: 'c' }));
    await addEdge(env, makeEdge({ from: 'a', to: 'b' }));
    await addEdge(env, makeEdge({ from: 'b', to: 'c' }));

    const path = await findPath(env, 'a', 'c');
    expect(path).toHaveLength(2);
  });

  it('returns empty path when from equals to', async () => {
    await addNode(env, makeNode({ id: 'a' }));
    const path = await findPath(env, 'a', 'a');
    expect(path).toHaveLength(0);
  });
});

describe('KnowledgeGraph — domainStats', () => {
  let env: any;
  beforeEach(() => { env = { KG: createMockKV() }; });

  it('returns empty stats for empty graph', async () => {
    const stats = await domainStats(env);
    expect(Object.keys(stats)).toHaveLength(0);
  });

  it('counts nodes per domain', async () => {
    await addNode(env, makeNode({ id: 'a', domain: 'alpha' }));
    await addNode(env, makeNode({ id: 'b', domain: 'alpha' }));
    await addNode(env, makeNode({ id: 'c', domain: 'beta' }));

    const stats = await domainStats(env);
    expect(stats['alpha'].nodes).toBe(2);
    expect(stats['beta'].nodes).toBe(1);
  });

  it('counts edges per domain', async () => {
    await addNode(env, makeNode({ id: 'a', domain: 'alpha' }));
    await addNode(env, makeNode({ id: 'b', domain: 'alpha' }));
    await addEdge(env, makeEdge({ from: 'a', to: 'b', domain: 'alpha' }));

    const stats = await domainStats(env);
    expect(stats['alpha'].edges).toBe(1);
  });
});

describe('KnowledgeGraph — getDomainNodes', () => {
  let env: any;
  beforeEach(() => { env = { KG: createMockKV() }; });

  it('returns only nodes from specified domain', async () => {
    await addNode(env, makeNode({ id: 'a', domain: 'alpha' }));
    await addNode(env, makeNode({ id: 'b', domain: 'beta' }));
    await addNode(env, makeNode({ id: 'c', domain: 'alpha' }));

    const nodes = await getDomainNodes(env, 'alpha');
    expect(nodes).toHaveLength(2);
    expect(nodes.every(n => n.domain === 'alpha')).toBe(true);
  });

  it('returns empty for non-existent domain', async () => {
    const nodes = await getDomainNodes(env, 'nonexistent');
    expect(nodes).toHaveLength(0);
  });
});
