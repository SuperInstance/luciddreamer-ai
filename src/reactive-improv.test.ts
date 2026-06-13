// Tests for Reactive Improv Engine
import { describe, it, expect } from 'vitest';
import {
  createAgent, createDiscourse, createClock, processTurn,
  generateNudges, applyNudges, shouldRedraft, adaptBpm,
  setAgentOnBeat, advanceBeat, scheduleNextTurns,
  getDiscourseSummary,
} from './reactive-improv.js';

describe('Tensor MIDI Clock', () => {
  it('creates clock with default BPM', () => {
    const clock = createClock(80);
    expect(clock.bpm).toBe(80);
    expect(clock.measureLength).toBe(4);
    expect(clock.beatDuration).toBe(750); // 60000/80
  });

  it('advances beats within measure', () => {
    const clock = createClock(80, 4);
    expect(advanceBeat(clock)).toBe(0);
    expect(advanceBeat(clock)).toBe(1);
    expect(advanceBeat(clock)).toBe(2);
    expect(advanceBeat(clock)).toBe(3);
    expect(advanceBeat(clock)).toBe(0); // Wraps
  });

  it('adapts BPM to energy', () => {
    const clock = createClock(80);
    adaptBpm(clock, 0.2); // Low energy → slower
    expect(clock.bpm).toBeLessThan(80);
    
    const clock2 = createClock(80);
    adaptBpm(clock2, 0.9); // High energy → faster
    expect(clock2.bpm).toBeGreaterThan(80);
  });

  it('assigns agents to beats', () => {
    const clock = createClock(80, 4);
    setAgentOnBeat(clock, 0, 'architect');
    setAgentOnBeat(clock, 2, 'critic');
    expect(clock.beatMap.get(0)).toEqual(['architect']);
    expect(clock.beatMap.get(2)).toEqual(['critic']);
  });
});

describe('Agent Creation', () => {
  it('creates agent with role-specific cadence', () => {
    const agent = createAgent('arc', 'Architect', 'architect', 'System design');
    expect(agent.name).toBe('Architect');
    expect(agent.cadence.vocabulary).toBe('technical');
    expect(agent.cadence.avgSentenceLength).toBe(18);
    expect(agent.draft).toBeNull();
  });

  it('creates implementer with casual cadence', () => {
    const agent = createAgent('imp', 'Implementer', 'implementer', 'Code execution');
    expect(agent.cadence.vocabulary).toBe('casual');
    expect(agent.cadence.preferredGap).toBeLessThan(500);
  });
});

describe('Nudge System', () => {
  it('generates nudges from excitement', () => {
    const agents = new Map([
      ['arc', createAgent('arc', 'Architect', 'architect', 'design')],
      ['imp', createAgent('imp', 'Implementer', 'implementer', 'code')],
    ]);
    const nudges = generateNudges('arc', 'Exactly! That\'s the right approach!', agents);
    expect(nudges.has('imp')).toBe(true);
    expect(nudges.get('imp')!.type).toBe('excitement');
  });

  it('generates question nudge when agent is mentioned', () => {
    const agents = new Map([
      ['arc', createAgent('arc', 'Architect', 'architect', 'design')],
      ['crit', createAgent('crit', 'Critic', 'critic', 'review')],
    ]);
    const nudges = generateNudges('arc', 'Critic, what do you think about this?', agents);
    expect(nudges.get('crit')!.type).toBe('question');
    expect(nudges.get('crit')!.strength).toBeGreaterThanOrEqual(0.8);
  });

  it('generates pushback nudge', () => {
    const agents = new Map([
      ['arc', createAgent('arc', 'Architect', 'architect', 'design')],
      ['imp', createAgent('imp', 'Implementer', 'implementer', 'code')],
    ]);
    const nudges = generateNudges('arc', 'But actually the signal chain doesn\'t work that way.', agents);
    expect(nudges.get('imp')!.type).toBe('pushback');
  });

  it('applies nudges to agent energy', () => {
    const agent = createAgent('imp', 'Implementer', 'implementer', 'code');
    const initialEnergy = agent.energy;
    agent.nudges.push({
      fromAgent: 'arc', type: 'excitement', content: 'Yes!', strength: 0.8, timestamp: Date.now(),
    });
    applyNudges(agent);
    expect(agent.energy).toBeGreaterThan(initialEnergy);
  });
});

describe('Draft System', () => {
  it('redrafts when no draft exists', () => {
    const agent = createAgent('arc', 'Architect', 'architect', 'design');
    expect(shouldRedraft(agent, null)).toBe(true);
  });

  it('redrafts on strong nudge', () => {
    const agent = createAgent('arc', 'Architect', 'architect', 'design');
    agent.draft = 'I think we should...';
    expect(shouldRedraft(agent, { 
      fromAgent: 'imp', type: 'pushback', content: 'No', strength: 0.8, timestamp: Date.now() 
    })).toBe(true);
  });

  it('keeps draft on weak nudge', () => {
    const agent = createAgent('arc', 'Architect', 'architect', 'design');
    agent.draft = 'I think we should...';
    expect(shouldRedraft(agent, { 
      fromAgent: 'imp', type: 'agreement', content: 'Yeah', strength: 0.2, timestamp: Date.now() 
    })).toBe(false);
  });

  it('redrafts on topic shift', () => {
    const agent = createAgent('arc', 'Architect', 'architect', 'design');
    agent.draft = 'About the kernel...';
    agent.nudges.push({
      fromAgent: 'imp', type: 'topic-shift', content: 'Moving on...', strength: 0.7, timestamp: Date.now(),
    });
    expect(shouldRedraft(agent, null)).toBe(true);
  });
});

describe('Discourse Engine', () => {
  it('creates discourse with multiple agents', () => {
    const agents = [
      createAgent('arc', 'Architect', 'architect', 'System design'),
      createAgent('imp', 'Implementer', 'implementer', 'Building'),
      createAgent('crit', 'Critic', 'critic', 'Quality'),
    ];
    const discourse = createDiscourse(agents, 'The Signal Chain', 80);
    expect(discourse.agents.size).toBe(3);
    expect(discourse.clock.bpm).toBe(80);
    expect(discourse.globalEnergy).toBe(0.5);
  });

  it('processes a turn and generates nudges', () => {
    const agents = [
      createAgent('arc', 'Architect', 'architect', 'System design'),
      createAgent('imp', 'Implementer', 'implementer', 'Building'),
    ];
    const discourse = createDiscourse(agents, 'The Signal Chain', 80);
    
    const result = processTurn(discourse, 'arc', 
      'The signal chain is fundamentally a distillation pipeline.'
    );
    
    expect(result.transcript.agentId).toBe('arc');
    expect(result.transcript.text).toContain('distillation');
    expect(result.nudges.has('imp')).toBe(true);
    expect(discourse.turnCount).toBe(1);
  });

  it('tracks global energy across turns', () => {
    const agents = [
      createAgent('arc', 'Architect', 'architect', 'System design'),
      createAgent('imp', 'Implementer', 'implementer', 'Building'),
    ];
    const discourse = createDiscourse(agents, 'Energy Test', 80);
    
    // High-energy turn
    processTurn(discourse, 'arc', 'Exactly! This is brilliant! The Conservation Ratio ties everything together!');
    const energyAfterFirst = discourse.globalEnergy;
    
    // More turns should shift energy
    processTurn(discourse, 'imp', 'But wait, what about the edge case where CR drops?');
    expect(discourse.globalEnergy).not.toBe(0.5);
  });

  it('schedules T-Minus events for upcoming beats', () => {
    const agents = [
      createAgent('arc', 'Architect', 'architect', 'design'),
      createAgent('imp', 'Implementer', 'implementer', 'code'),
    ];
    const discourse = createDiscourse(agents, 'Scheduling', 80);
    
    const events = scheduleNextTurns(discourse, 0);
    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.agentId === 'arc' || e.agentId === 'imp')).toBe(true);
  });

  it('maintains transcript across multiple turns', () => {
    const agents = [
      createAgent('arc', 'Architect', 'architect', 'design'),
      createAgent('imp', 'Implementer', 'implementer', 'code'),
    ];
    const discourse = createDiscourse(agents, 'Transcript', 80);
    
    processTurn(discourse, 'arc', 'First point.');
    processTurn(discourse, 'imp', 'Building on that...');
    processTurn(discourse, 'arc', 'Right, and here\'s the key insight.');
    
    expect(discourse.transcript.length).toBe(3);
    expect(discourse.transcript[0].agentId).toBe('arc');
    expect(discourse.transcript[1].agentId).toBe('imp');
    expect(discourse.turnCount).toBe(3);
  });

  it('generates readable summary', () => {
    const agents = [
      createAgent('arc', 'Architect', 'architect', 'design'),
    ];
    const discourse = createDiscourse(agents, 'Summary Test', 80);
    processTurn(discourse, 'arc', 'Testing the summary.');
    
    const summary = getDiscourseSummary(discourse);
    expect(summary).toContain('Summary Test');
    expect(summary).toContain('Architect');
    expect(summary).toContain('Testing');
  });
});
