// ═══════════════════════════════════════════════════════════════
// Discourse Handler — Wire Reactive Improv Engine into the Worker
//
// Endpoints:
//   POST /api/discourse/start  → create a 4-agent discourse session
//   POST /api/discourse/tick   → advance one beat, LLM-generate the turn
//   GET  /api/discourse/state   → return current discourse state
//
// State is persisted in the CONTENT KV namespace.
// LLM calls use the worker's built-in provider chain.
// ═══════════════════════════════════════════════════════════════

import {
  createAgent,
  createDiscourse,
  processTurn,
  advanceBeat,
  generateNudges,
  applyNudges,
  shouldRedraft,
  scheduleNextTurns,
  adaptBpm,
  serializeState,
  getDiscourseSummary,
  type DiscourseState,
  type ImprovAgent,
  type Nudge,
  type TranscriptLine,
  type TMinusEvent,
} from './reactive-improv.js';

// ── KV Key ──

function discourseKey(sessionId: string): string {
  return `discourse:${sessionId}`;
}

// ── Deserialize state from KV ──
// We store JSON; Maps need reconstruction.

function deserializeState(raw: any): DiscourseState {
  const agents = new Map<string, ImprovAgent>();
  for (const [id, a] of Object.entries(raw.agents)) {
    const agent = a as any;
    agents.set(id, {
      ...agent,
      cadence: agent.cadence,
      nudges: (agent.nudges || []).map((n: any) => ({
        ...n,
        timestamp: n.timestamp,
      })),
    });
  }

  const clock = {
    ...raw.clock,
    beatMap: new Map(Object.entries(raw.clock.beatMap || {})),
  };

  return {
    agents,
    clock,
    eventQueue: raw.eventQueue || [],
    transcript: raw.transcript || [],
    topic: raw.topic,
    topicDepth: raw.topicDepth || 0,
    globalEnergy: raw.globalEnergy || 0.5,
    turnCount: raw.turnCount || 0,
    lastAdjustment: raw.lastAdjustment || 0,
  };
}

// ── Load / Save ──

async function loadState(KV: any, sessionId: string): Promise<DiscourseState | null> {
  const raw = await KV.get(discourseKey(sessionId), 'json');
  if (!raw) return null;
  return deserializeState(raw);
}

async function saveState(KV: any, sessionId: string, state: DiscourseState): Promise<void> {
  await KV.put(discourseKey(sessionId), serializeState(state), { expirationTtl: 86400 });
}

// ── System Prompt Builder ──

function buildAgentPrompt(agent: ImprovAgent, state: DiscourseState, recentTranscript: TranscriptLine[]): string {
  const lastFew = recentTranscript.slice(-6).map(l => {
    const a = state.agents.get(l.agentId);
    return `${a?.name || l.agentId}: ${l.text}`;
  }).join('\n');

  const nudgeContext = agent.nudges.length > 0
    ? `\n\nRecent signals from other agents:\n${agent.nudges.map(n => `- ${n.type} (strength ${n.strength.toFixed(1)}): ${n.content.slice(0, 80)}`).join('\n')}`
    : '';

  return `You are ${agent.name}, the ${agent.role} in a multi-agent discourse about "${state.topic}".

Your perspective: ${agent.perspective}
Your energy level: ${(agent.energy * 100).toFixed(0)}%
Speaking style: ${agent.cadence.vocabulary}, ${agent.cadence.tendency}s, ~${agent.cadence.avgTurnLength} sentences per turn.

${lastFew ? `Recent transcript:\n${lastFew}\n` : ''}
${nudgeContext}

Continue the discourse. Stay in character. Be concise (2-4 sentences). React to what others said. Do not repeat what was already said. Advance the conversation.

Reply with ONLY your spoken text, no meta-commentary, no quotes, no speaker labels.`;
}

// ── LLM Call ──

async function generateAgentText(
  agent: ImprovAgent,
  state: DiscourseState,
  callLLMFn: (messages: Array<{ role: string; content: string }>) => Promise<string>,
): Promise<string> {
  const messages = [
    {
      role: 'system' as const,
      content: buildAgentPrompt(agent, state, state.transcript),
    },
    {
      role: 'user' as const,
      content: state.transcript.length === 0
        ? `Begin the discourse on "${state.topic}". Share your opening perspective as the ${agent.role}.`
        : `It's your turn. Respond to the conversation so far as the ${agent.role}.`,
    },
  ];

  const text = await callLLMFn(messages);
  return text.trim() || `...thinking about ${state.topic}...`;
}

// ── Default Agent Configs ──

interface AgentDef {
  id: string;
  name: string;
  role: string;
  perspective: string;
}

const DEFAULT_AGENT_DEFS: AgentDef[] = [
  {
    id: 'architect',
    name: 'Architect',
    role: 'architect',
    perspective: 'I think in systems and patterns. I design the big picture and connect abstract concepts into coherent frameworks.',
  },
  {
    id: 'implementer',
    name: 'Implementer',
    role: 'implementer',
    perspective: 'I care about what ships. Code, deployments, practical tradeoffs. Theory is nice but working code is better.',
  },
  {
    id: 'critic',
    name: 'Critic',
    role: 'critic',
    perspective: 'I find the gaps. Every system has weaknesses and I ask the hard questions that others avoid.',
  },
  {
    id: 'historian',
    name: 'Historian',
    role: 'historian',
    perspective: 'I see everything in context. What happened before, what patterns repeat, where this fits in the larger arc of technology.',
  },
];

// ── Handler Functions ──

export async function handleDiscourseStart(
  request: Request,
  KV: any,
  callLLMFn: (messages: Array<{ role: string; content: string }>) => Promise<string>,
): Promise<Response> {
  let body: { topic?: string; bpm?: number; agents?: AgentDef[] } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const topic = body.topic || 'The future of AI-native software architecture';
  const bpm = body.bpm || 80;
  const agentDefs = body.agents?.length === 4 ? body.agents : DEFAULT_AGENT_DEFS;

  const agents = agentDefs.map(def => createAgent(def.id, def.name, def.role, def.perspective));
  const state = createDiscourse(agents, topic, bpm);

  // Have the first agent (architect) open the discourse
  const firstAgent = agents[0];
  const openingText = await generateAgentText(firstAgent, state, callLLMFn);
  processTurn(state, firstAgent.id, openingText);

  const sessionId = `disc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  await saveState(KV, sessionId, state);

  const headers = { 'Content-Type': 'application/json' };
  return new Response(JSON.stringify({
    sessionId,
    topic,
    agents: agents.map(a => ({ id: a.id, name: a.name, role: a.role, energy: a.energy })),
    transcript: state.transcript,
    globalEnergy: state.globalEnergy,
    bpm: state.clock.bpm,
    turnCount: state.turnCount,
    summary: getDiscourseSummary(state),
  }), { headers });
}

export async function handleDiscourseTick(
  request: Request,
  KV: any,
  callLLMFn: (messages: Array<{ role: string; content: string }>) => Promise<string>,
): Promise<Response> {
  let body: { sessionId?: string; agentId?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { sessionId, agentId: requestedAgentId } = body;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'sessionId required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  const state = await loadState(KV, sessionId);
  if (!state) {
    return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  // Determine which agent speaks next (clock-driven rotation)
  const agentOrder = [...state.agents.keys()];
  const nextAgentId = requestedAgentId || agentOrder[state.turnCount % agentOrder.length];
  const agent = state.agents.get(nextAgentId);

  if (!agent) {
    return new Response(JSON.stringify({ error: `Agent ${nextAgentId} not found` }), { status: 400, headers: { 'Content-Type': 'application/json' } });
  }

  // Apply any pending nudges before generating
  applyNudges(agent);

  // Generate text via LLM
  const text = await generateAgentText(agent, state, callLLMFn);

  // Process the turn (advances clock, generates nudges, schedules events)
  const result = processTurn(state, agent.id, text);

  // Increase topic depth slightly each turn
  state.topicDepth = Math.min(1, state.topicDepth + 0.03);

  await saveState(KV, sessionId, state);

  return new Response(JSON.stringify({
    sessionId,
    agent: { id: agent.id, name: agent.name, role: agent.role },
    text,
    beatInMeasure: result.transcript.beatInMeasure,
    energy: result.transcript.energy,
    nudgesSent: result.nudges.size,
    redraftedAgents: result.redraftedAgents,
    globalEnergy: state.globalEnergy,
    bpm: state.clock.bpm,
    turnCount: state.turnCount,
    topicDepth: state.topicDepth,
    summary: getDiscourseSummary(state),
  }), { headers: { 'Content-Type': 'application/json' } });
}

export async function handleDiscourseState(
  request: Request,
  KV: any,
): Promise<Response> {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');

  if (!sessionId) {
    // List all discourse sessions
    const list = await KV.list({ prefix: 'discourse:' });
    const sessions = await Promise.all(
      list.keys.map(async (k: { name: string }) => {
        const raw = await KV.get(k.name, 'json') as any;
        if (!raw) return null;
        return {
          sessionId: k.name.replace('discourse:', ''),
          topic: raw.topic,
          turnCount: raw.turnCount,
          globalEnergy: raw.globalEnergy,
          bpm: raw.clock?.bpm,
        };
      })
    );
    return new Response(JSON.stringify({ sessions: sessions.filter(Boolean) }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const state = await loadState(KV, sessionId);
  if (!state) {
    return new Response(JSON.stringify({ error: 'Session not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    sessionId,
    topic: state.topic,
    topicDepth: state.topicDepth,
    globalEnergy: state.globalEnergy,
    bpm: state.clock.bpm,
    turnCount: state.turnCount,
    agents: [...state.agents.values()].map(a => ({
      id: a.id, name: a.name, role: a.role,
      energy: a.energy, lastSpoke: a.lastSpoke,
      totalTokens: a.totalTokens, hasDraft: a.draft !== null,
      pendingNudges: a.nudges.length,
    })),
    transcript: state.transcript.slice(-50),
    summary: getDiscourseSummary(state),
  }), { headers: { 'Content-Type': 'application/json' } });
}
