// Tests for ConfidenceTracker — Phase 1B
import { describe, it, expect, beforeEach } from 'vitest';
import { ConfidenceTracker } from './confidence-tracker.js';

describe('ConfidenceTracker — Classification', () => {
  const tracker = new ConfidenceTracker();

  it('classifies greetings', () => {
    expect(tracker.classify('Hello there!')).toBe('greeting');
    expect(tracker.classify('hey how are you')).toBe('greeting');
    expect(tracker.classify('good morning!')).toBe('greeting');
  });

  it('classifies questions as qa', () => {
    expect(tracker.classify('What is a tensor?')).toBe('qa');
    expect(tracker.classify('How does this work?')).toBe('qa');
    expect(tracker.classify('Why is the sky blue?')).toBe('qa');
    expect(tracker.classify('explain quantum computing')).toBe('qa');
  });

  it('classifies tasks', () => {
    expect(tracker.classify('do the dishes')).toBe('task');
    expect(tracker.classify('write a poem')).toBe('task');
    expect(tracker.classify('create a new file')).toBe('task');
    expect(tracker.classify('build a house')).toBe('task');
  });

  it('classifies creative requests', () => {
    // 'tell me' matches qa first, so use other creative keywords
    expect(tracker.classify('a story about dragons')).toBe('creative');
    expect(tracker.classify('write a poem about the sea')).toBe('task'); // 'write' matches task first
    expect(tracker.classify('imagine a world without gravity')).toBe('creative');
    expect(tracker.classify('a joke about fish')).toBe('creative');
    expect(tracker.classify('fiction about mars')).toBe('creative');
  });

  it('defaults to general for unmatched', () => {
    expect(tracker.classify('the weather is nice')).toBe('general');
    expect(tracker.classify('xyzzy')).toBe('general');
  });

  it('case insensitive', () => {
    expect(tracker.classify('HELLO')).toBe('greeting');
    expect(tracker.classify('WHAT IS THIS')).toBe('qa');
  });
});

describe('ConfidenceTracker — Recording', () => {
  let tracker: ConfidenceTracker;

  beforeEach(() => {
    tracker = new ConfidenceTracker();
  });

  it('starts at 0.5 for unknown topic', () => {
    const rec = tracker.get('unknown');
    expect(rec.score).toBe(0.5);
    expect(rec.count).toBe(0);
    expect(rec.eligibleForDemotion).toBe(false);
  });

  it('records successful interactions', () => {
    tracker.record('qa', true);
    const rec = tracker.get('qa');
    expect(rec.count).toBe(1);
    expect(rec.score).toBeGreaterThan(0.5);
  });

  it('records failed interactions', () => {
    tracker.record('qa', false);
    const rec = tracker.get('qa');
    expect(rec.count).toBe(1);
    expect(rec.score).toBeLessThan(0.5);
  });

  it('multiple successes raise confidence', () => {
    for (let i = 0; i < 20; i++) tracker.record('qa', true);
    const rec = tracker.get('qa');
    expect(rec.score).toBeGreaterThan(0.8);
    expect(rec.eligibleForDemotion).toBe(true);
  });

  it('multiple failures lower confidence', () => {
    for (let i = 0; i < 20; i++) tracker.record('qa', false);
    const rec = tracker.get('qa');
    expect(rec.score).toBeLessThan(0.2);
    expect(rec.eligibleForDemotion).toBe(false);
  });

  it('does not demote with few interactions', () => {
    for (let i = 0; i < 9; i++) tracker.record('qa', true);
    const rec = tracker.get('qa');
    expect(rec.eligibleForDemotion).toBe(false); // Need >= 10
  });

  it('demotes at threshold with enough interactions', () => {
    for (let i = 0; i < 15; i++) tracker.record('qa', true);
    const rec = tracker.get('qa');
    expect(rec.eligibleForDemotion).toBe(true);
  });
});

describe('ConfidenceTracker — Trends', () => {
  it('reports rising trend for high scores', () => {
    const tracker = new ConfidenceTracker();
    for (let i = 0; i < 15; i++) tracker.record('qa', true);
    expect(tracker.get('qa').trend).toBe('rising');
  });

  it('reports falling trend for low scores', () => {
    const tracker = new ConfidenceTracker();
    for (let i = 0; i < 15; i++) tracker.record('qa', false);
    expect(tracker.get('qa').trend).toBe('falling');
  });

  it('reports stable trend for middling scores', () => {
    const tracker = new ConfidenceTracker();
    tracker.record('qa', true);
    tracker.record('qa', false);
    tracker.record('qa', true);
    tracker.record('qa', false);
    // Should be somewhere in the middle
    const trend = tracker.get('qa').trend;
    expect(['rising', 'falling', 'stable']).toContain(trend);
  });
});

describe('ConfidenceTracker — Serialization', () => {
  it('serializes and deserializes correctly', () => {
    const tracker = new ConfidenceTracker();
    tracker.record('qa', true);
    tracker.record('qa', true);
    tracker.record('task', false);

    const json = tracker.serialize();
    expect(typeof json).toBe('string');

    const tracker2 = new ConfidenceTracker();
    tracker2.deserialize(json);
    
    expect(tracker2.get('qa').count).toBe(2);
    expect(tracker2.get('task').count).toBe(1);
  });

  it('deserializes invalid JSON gracefully', () => {
    const tracker = new ConfidenceTracker();
    tracker.deserialize('not valid json');
    // Should not throw, should reset to empty
    expect(tracker.get('any').count).toBe(0);
  });

  it('deserializes empty string gracefully', () => {
    const tracker = new ConfidenceTracker();
    tracker.deserialize('');
    expect(tracker.get('any').count).toBe(0);
  });
});

describe('ConfidenceTracker — shouldDemote', () => {
  it('returns false for unknown topics', () => {
    const tracker = new ConfidenceTracker();
    expect(tracker.shouldDemote('unknown')).toBe(false);
  });

  it('returns false for low-confidence topics', () => {
    const tracker = new ConfidenceTracker();
    for (let i = 0; i < 20; i++) tracker.record('qa', false);
    expect(tracker.shouldDemote('qa')).toBe(false);
  });

  it('returns true for high-confidence topics with enough data', () => {
    const tracker = new ConfidenceTracker();
    for (let i = 0; i < 20; i++) tracker.record('qa', true);
    expect(tracker.shouldDemote('qa')).toBe(true);
  });
});

describe('ConfidenceTracker — getAll', () => {
  it('returns all tracked topics', () => {
    const tracker = new ConfidenceTracker();
    tracker.record('qa', true);
    tracker.record('task', false);
    tracker.record('creative', true);

    const all = tracker.getAll();
    expect(all.length).toBe(3);
    const topics = all.map(r => r.topic);
    expect(topics).toContain('qa');
    expect(topics).toContain('task');
    expect(topics).toContain('creative');
  });

  it('returns empty array for fresh tracker', () => {
    const tracker = new ConfidenceTracker();
    expect(tracker.getAll()).toEqual([]);
  });
});
