// ═══════════════════════════════════════════════════════════════
// Reactive Improv Engine — Multi-agent discourse with mid-stream adjustment
// 
// Not queued turns. Reactive improvisation.
// Each agent drafts their next line, hears the others, and re-drafts.
// The "path of least resistance" is the default next token.
// Nudges from the group cadence override that default.
//
// Timing driven by Tensor MIDI patterns (T-Minus event scheduling).
// Voices simulate each other's cadences — the system breathes.
// ═══════════════════════════════════════════════════════════════

export interface ImprovAgent {
  id: string;
  name: string;
  role: string;              // e.g., "architect", "implementer", "critic", "historian"
  voice: string;             // TTS voice identifier
  cadence: CadenceProfile;   // How this agent speaks (rhythm, length, energy)
  perspective: string;       // What they bring to the conversation
  draft: string | null;      // What they're ABOUT to say (updated reactively)
  lastSpoke: number;         // Timestamp of last utterance
  totalTokens: number;       // Cumulative tokens spoken
  energy: number;            // 0-1, current energy level (fluctuates)
  nudges: Nudge[];           // Incoming nudges from other agents
}

export interface CadenceProfile {
  avgSentenceLength: number;   // words per sentence
  avgTurnLength: number;       // sentences per turn
  preferredGap: number;        // ms of silence before they speak
  energyBaseline: number;      // 0-1 baseline energy
  energyVariance: number;      // how much energy fluctuates
  tendency: 'build' | 'release' | 'hold'; // do they escalate, calm, or maintain
  vocabulary: 'technical' | 'casual' | 'poetic' | 'mix';
}

export interface Nudge {
  fromAgent: string;
  type: 'agreement' | 'pushback' | 'question' | 'excitement' | 'topic-shift' | 'energy-boost' | 'energy-dampen';
  content: string;           // What triggered the nudge
  strength: number;          // 0-1, how strongly it affects
  timestamp: number;
}

export interface TensorMidiClock {
  bpm: number;               // Beats per minute of the discourse
  beatDuration: number;      // ms per beat
  currentBeat: number;       // Current beat in the measure
  measureLength: number;     // Beats per measure (4 = standard, 3 = waltz, 7 = odd)
  swing: number;             // 0 = straight, 1 = full swing
  // Who speaks on which beat: beat index → agent id
  beatMap: Map<number, string[]>;
}

export interface TMinusEvent {
  id: string;
  agentId: string;
  firesAt: number;           // Timestamp when this agent should speak
  priority: 'primary' | 'reaction' | 'aside' | 'bridge';
  draft: string | null;      // Pre-computed content
  adjusted: boolean;         // Has this been re-drafted since creation?
}

export interface DiscourseState {
  agents: Map<string, ImprovAgent>;
  clock: TensorMidiClock;
  eventQueue: TMinusEvent[];
  transcript: TranscriptLine[];
  topic: string;
  topicDepth: number;        // 0-1, how deep into the topic we are
  globalEnergy: number;      // 0-1, overall conversation energy
  turnCount: number;
  lastAdjustment: number;    // When was the last mid-stream re-draft
}

export interface TranscriptLine {
  agentId: string;
  text: string;
  timestamp: number;
  beatInMeasure: number;
  energy: number;
  type: 'primary' | 'reaction' | 'aside' | 'bridge' | 'interruption';
  nudgesReceived: number;    // How many nudges shaped this line
  redraftCount: number;      // How many times the draft was adjusted before speaking
}

// ── Tensor MIDI Clock ──────────────────────────────────────────
// The discourse has musical timing. Agents speak on beats.
// The BPM adapts to the conversation energy.

export function createClock(bpm: number = 80, measureLength: number = 4): TensorMidiClock {
  return {
    bpm,
    beatDuration: 60000 / bpm,
    currentBeat: 0,
    measureLength,
    swing: 0.3,
    beatMap: new Map(),
  };
}

export function advanceBeat(clock: TensorMidiClock): number {
  const beat = clock.currentBeat;
  clock.currentBeat = (clock.currentBeat + 1) % clock.measureLength;
  return beat;
}

export function setAgentOnBeat(clock: TensorMidiClock, beat: number, agentId: string): void {
  const agents = clock.beatMap.get(beat) || [];
  if (!agents.includes(agentId)) agents.push(agentId);
  clock.beatMap.set(beat, agents);
}

export function adaptBpm(clock: TensorMidiClock, globalEnergy: number): void {
  // Higher energy = faster BPM (more rapid exchange)
  // Lower energy = slower BPM (thoughtful pauses)
  const targetBpm = 60 + globalEnergy * 60; // 60-120 BPM range
  clock.bpm = clock.bpm * 0.8 + targetBpm * 0.2; // Smooth transition
  clock.beatDuration = 60000 / clock.bpm;
}

// ── Agent Creation ─────────────────────────────────────────────

export function createAgent(
  id: string, name: string, role: string, perspective: string
): ImprovAgent {
  const cadences: Record<string, CadenceProfile> = {
    architect: {
      avgSentenceLength: 18, avgTurnLength: 3, preferredGap: 800,
      energyBaseline: 0.5, energyVariance: 0.2, tendency: 'build',
      vocabulary: 'technical',
    },
    implementer: {
      avgSentenceLength: 12, avgTurnLength: 2, preferredGap: 400,
      energyBaseline: 0.7, energyVariance: 0.3, tendency: 'release',
      vocabulary: 'casual',
    },
    critic: {
      avgSentenceLength: 20, avgTurnLength: 2, preferredGap: 1200,
      energyBaseline: 0.4, energyVariance: 0.15, tendency: 'hold',
      vocabulary: 'mix',
    },
    historian: {
      avgSentenceLength: 25, avgTurnLength: 3, preferredGap: 1000,
      energyBaseline: 0.35, energyVariance: 0.1, tendency: 'hold',
      vocabulary: 'poetic',
    },
  };

  return {
    id, name, role, voice: id,
    cadence: cadences[role] || cadences.architect,
    perspective,
    draft: null,
    lastSpoke: 0,
    totalTokens: 0,
    energy: 0.5,
    nudges: [],
  };
}

// ── Nudge System ───────────────────────────────────────────────
// When an agent speaks, it generates nudges for all other agents.
// These nudges shape what the others will say when it's their turn.

export function generateNudges(
  speakerId: string,
  text: string,
  agents: Map<string, ImprovAgent>,
): Map<string, Nudge> {
  const nudges = new Map<string, Nudge>();
  const lower = text.toLowerCase();

  for (const [agentId, agent] of agents) {
    if (agentId === speakerId) continue;

    let type: Nudge['type'] = 'agreement';
    let strength = 0.3;
    let content = text.slice(0, 100);

    // Detect pushback signals
    if (lower.includes('but') || lower.includes('however') || lower.includes('actually')) {
      type = 'pushback';
      strength = 0.6;
    }
    // Detect questions directed at this agent
    else if (lower.includes(agent.name.toLowerCase()) || lower.includes(agent.role.toLowerCase())) {
      type = 'question';
      strength = 0.8;
    }
    // Detect excitement
    else if (text.includes('!') || lower.includes('exactly') || lower.includes('right')) {
      type = 'excitement';
      strength = 0.5;
    }
    // Detect topic shifts
    else if (lower.includes('moving on') || lower.includes('what about') || lower.includes('shift')) {
      type = 'topic-shift';
      strength = 0.7;
    }

    // Energy modulation based on speaker's energy
    const speaker = agents.get(speakerId)!;
    if (speaker.energy > 0.7) {
      strength += 0.1; // High energy is contagious
    }

    nudges.set(agentId, {
      fromAgent: speakerId,
      type,
      content,
      strength: Math.min(1, strength),
      timestamp: Date.now(),
    });
  }

  return nudges;
}

export function applyNudges(agent: ImprovAgent): void {
  // Apply accumulated nudges to agent's energy and draft strategy
  for (const nudge of agent.nudges) {
    switch (nudge.type) {
      case 'excitement':
        agent.energy = Math.min(1, agent.energy + 0.1 * nudge.strength);
        break;
      case 'pushback':
        agent.energy = Math.min(1, agent.energy + 0.05 * nudge.strength);
        break;
      case 'question':
        agent.energy = Math.min(1, agent.energy + 0.15 * nudge.strength);
        break;
      case 'topic-shift':
        agent.draft = null; // Clear draft — need to re-draft for new topic
        break;
      case 'energy-dampen':
        agent.energy = Math.max(0, agent.energy - 0.1 * nudge.strength);
        break;
      default:
        break;
    }
  }

  // Decay nudges over time
  agent.nudges = agent.nudges.filter(n => Date.now() - n.timestamp < 30000);
}

// ── Draft System ───────────────────────────────────────────────
// Each agent maintains a "draft" of what they'll say next.
// When nudges arrive, the draft gets adjusted (re-drafted).
// This is the "path of least resistance" correction.

export function shouldRedraft(agent: ImprovAgent, newNudge: Nudge | null): boolean {
  // Redraft if:
  // 1. A strong nudge arrived (> 0.6 strength)
  // 2. Agent has no draft yet
  // 3. Topic shifted
  if (!agent.draft) return true;
  if (newNudge && newNudge.strength > 0.6) return true;
  if (agent.nudges.some(n => n.type === 'topic-shift' && Date.now() - n.timestamp < 5000)) return true;
  return false;
}

// ── T-Minus Event Scheduling ───────────────────────────────────
// Schedule future speaking events based on the Tensor MIDI clock.

export function scheduleNextTurns(
  state: DiscourseState,
  currentBeat: number,
): TMinusEvent[] {
  const events: TMinusEvent[] = [];
  const now = Date.now();

  // Which agents speak on upcoming beats?
  for (let i = 1; i <= state.clock.measureLength; i++) {
    const futureBeat = (currentBeat + i) % state.clock.measureLength;
    const agentIds = state.clock.beatMap.get(futureBeat) || [];

    for (const agentId of agentIds) {
      const agent = state.agents.get(agentId);
      if (!agent) continue;

      const timingOffset = state.clock.beatDuration * i;
      // Add swing: off-beats get delayed
      const swingOffset = futureBeat % 2 === 1 ? state.clock.swing * state.clock.beatDuration * 0.3 : 0;

      events.push({
        id: `tminus-${agentId}-${futureBeat}-${now}`,
        agentId,
        firesAt: now + timingOffset + swingOffset,
        priority: futureBeat === 0 ? 'primary' : futureBeat === 2 ? 'reaction' : 'aside',
        draft: agent.draft,
        adjusted: false,
      });
    }
  }

  return events;
}

// ── Discourse Engine ───────────────────────────────────────────
// The main loop: beat → speak → nudge → re-draft → beat

export function createDiscourse(
  agents: ImprovAgent[],
  topic: string,
  bpm: number = 80,
): DiscourseState {
  const agentMap = new Map(agents.map(a => [a.id, a]));
  const clock = createClock(bpm, agents.length >= 3 ? 4 : 3);

  // Assign agents to beats
  agents.forEach((agent, i) => {
    setAgentOnBeat(clock, i % clock.measureLength, agent.id);
  });

  return {
    agents: agentMap,
    clock,
    eventQueue: [],
    transcript: [],
    topic,
    topicDepth: 0,
    globalEnergy: 0.5,
    turnCount: 0,
    lastAdjustment: 0,
  };
}

export function processTurn(
  state: DiscourseState,
  agentId: string,
  text: string,
): {
  transcript: TranscriptLine;
  nudges: Map<string, Nudge>;
  events: TMinusEvent[];
  redraftedAgents: string[];
} {
  const agent = state.agents.get(agentId)!;
  const beat = advanceBeat(state.clock);

  // Record the turn
  const line: TranscriptLine = {
    agentId,
    text,
    timestamp: Date.now(),
    beatInMeasure: beat,
    energy: agent.energy,
    type: beat === 0 ? 'primary' : beat === 2 ? 'reaction' : 'aside',
    nudgesReceived: agent.nudges.length,
    redraftCount: 0, // Would be tracked during actual generation
  };
  state.transcript.push(line);

  // Update agent state
  agent.lastSpoke = Date.now();
  agent.totalTokens += text.split(/\s+/).length;
  agent.draft = null; // Clear draft after speaking
  agent.nudges = [];  // Clear nudges after they've been applied

  // Generate nudges for all other agents
  const nudges = generateNudges(agentId, text, state.agents);

  // Apply nudges and check for re-drafts
  const redraftedAgents: string[] = [];
  for (const [targetId, nudge] of nudges) {
    const target = state.agents.get(targetId);
    if (!target) continue;
    target.nudges.push(nudge);
    applyNudges(target);
    if (shouldRedraft(target, nudge)) {
      redraftedAgents.push(targetId);
    }
  }

  // Update global energy
  const totalEnergy = [...state.agents.values()].reduce((sum, a) => sum + a.energy, 0);
  state.globalEnergy = totalEnergy / state.agents.size;

  // Adapt clock BPM to energy
  adaptBpm(state.clock, state.globalEnergy);

  // Schedule next turns
  const events = scheduleNextTurns(state, beat);

  state.turnCount++;

  return { transcript: line, nudges, events, redraftedAgents };
}

// ── Serialization ──────────────────────────────────────────────

export function serializeState(state: DiscourseState): string {
  return JSON.stringify({
    agents: Object.fromEntries(
      [...state.agents.entries()].map(([id, a]) => [id, {
        ...a,
        cadence: a.cadence,
        draft: a.draft,
        nudges: a.nudges,
      }])
    ),
    clock: {
      ...state.clock,
      beatMap: Object.fromEntries(state.clock.beatMap),
    },
    eventQueue: state.eventQueue,
    transcript: state.transcript.slice(-100), // Keep last 100 lines
    topic: state.topic,
    topicDepth: state.topicDepth,
    globalEnergy: state.globalEnergy,
    turnCount: state.turnCount,
  });
}

export function getDiscourseSummary(state: DiscourseState): string {
  const agentSummary = [...state.agents.values()].map(a =>
    `${a.name} (${a.role}): energy=${a.energy.toFixed(2)}, nudges=${a.nudges.length}, hasDraft=${a.draft !== null}`
  ).join('\n');

  return `Topic: "${state.topic}" (depth: ${(state.topicDepth * 100).toFixed(0)}%)
Turn: ${state.turnCount} | Energy: ${state.globalEnergy.toFixed(2)} | BPM: ${state.clock.bpm.toFixed(0)}
Agents:
${agentSummary}
Last line: ${state.transcript.length > 0 ? state.transcript[state.transcript.length - 1].text.slice(0, 80) + '...' : '(none)'}`;
}
