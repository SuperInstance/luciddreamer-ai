// ═══════════════════════════════════════════════════════════════
// OmniRadio Engine — The brain of the podcast
// ═══════════════════════════════════════════════════════════════

export interface Personality {
  id: string;
  name: string;
  role: 'host' | 'guest' | 'cohost';
  voiceId: string;          // TTS voice identifier
  ttsProvider: 'browser' | 'elevenlabs' | 'openai' | 'local';
  systemPrompt: string;      // How this personality talks
  traits: string[];          // e.g., ["analytical", "humorous", "provocative"]
  expertise: string[];       // Domains they're strong in
  catchphrases: string[];    // Signature phrases
  energy: number;            // 0.0-1.0 — speaking energy level
  backstory: string;         // Fictional background for consistency
}

export interface Topic {
  id: string;
  title: string;
  description: string;
  depth: 'headline' | 'overview' | 'deep-dive' | 'rabbit-hole';
  source?: string;           // URL or paper the topic came from
  tags: string[];
  suggestedDuration: number; // minutes
}

export interface PodcastSession {
  id: string;
  title: string;
  startedAt: number;
  updatedAt: number;
  status: 'live' | 'paused' | 'ended' | 'archived';
  participants: Personality[];
  topicQueue: Topic[];
  currentTopic: Topic | null;
  transcript: TranscriptEntry[];
  listenerInteractions: ListenerInteraction[];
  totalDuration: number;     // seconds listened
  mood: 'energetic' | 'chill' | 'intense' | 'humorous' | 'philosophical';
  listenerPreferences: ListenerPreferences;
}

export interface TranscriptEntry {
  id: string;
  sessionId: string;
  timestamp: number;
  speaker: string;           // personality name or 'listener'
  text: string;
  emotion: string;
  topicId: string | null;
  type: 'speech' | 'question' | 'reaction' | 'transition' | 'listener-interrupt';
}

export interface ListenerInteraction {
  timestamp: number;
  type: 'redirect' | 'question' | 'deeper' | 'skip' | 'mood-change' | 'pause' | 'resume' | 'vibe';
  content?: string;          // What the listener said
  targetPersonality?: string;// Who they addressed
}

export interface ListenerPreferences {
  preferredTopics: string[];
  avoidedTopics: string[];
  preferredMood: string[];
  attentionSpan: number;     // minutes before listener typically interrupts
  timeOfDay: string;         // morning/afternoon/evening/night
  learningStyle: 'casual' | 'structured' | 'socratic' | 'storytelling';
  sessionCount: number;
  totalListeningHours: number;
  favoritePersonalities: string[];
  topicDepthPreference: 'headline' | 'overview' | 'deep-dive';
  interruptedCount: number;  // How often they redirect
  questionFrequency: number; // Questions per hour
}

// ═══════════════════════════════════════════════════════════════
// Personality Engine — Vibe-code new hosts and guests
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_PERSONALITIES: Personality[] = [
  {
    id: 'maven',
    name: 'Maven',
    role: 'host',
    voiceId: 'default-male',
    ttsProvider: 'browser',
    systemPrompt: 'You are Maven, the lead host of OmniRadio. You\'re intellectually curious, warm but sharp, and have a gift for making complex topics accessible. You bridge between guests and listeners. You reference listener preferences naturally. When a listener interrupts, you pivot smoothly.',
    traits: ['curious', 'articulate', 'empathetic'],
    expertise: ['general knowledge', 'interviewing', 'synthesis'],
    catchphrases: ['Let\'s dig into that...', 'Here\'s what I find fascinating...', 'The listener just made me think of something...'],
    energy: 0.7,
    backstory: 'Former public radio host who got tired of editorial control. Started OmniRadio to have real conversations that grow with the audience.'
  },
  {
    id: 'spark',
    name: 'Spark',
    role: 'cohost',
    voiceId: 'default-female',
    ttsProvider: 'browser',
    systemPrompt: 'You are Spark, the cohost. You\'re energetic, contrarian, and ask the questions everyone is thinking but won\'t say. You challenge guests respectfully. You bring humor. You\'re the listener\'s proxy in the conversation.',
    traits: ['energetic', 'contrarian', 'humorous', 'direct'],
    expertise: ['pop culture', 'skepticism', 'hot takes'],
    catchphrases: ['Wait, hold on...', 'Okay but real talk...', 'I\'m gonna push back on that...'],
    energy: 0.85,
    backstory: 'Stand-up comedian turned science communicator. Believes the best way to learn is to argue about it first.'
  }
];

export function createPersonality(config: Partial<Personality> & { name: string; role: Personality['role'] }): Personality {
  return {
    id: config.id || `persona-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    voiceId: config.voiceId || 'default-male',
    ttsProvider: config.ttsProvider || 'browser',
    systemPrompt: config.systemPrompt || `You are ${config.name}, a podcast ${config.role}. Be yourself.`,
    traits: config.traits || [],
    expertise: config.expertise || [],
    catchphrases: config.catchphrases || [],
    energy: config.energy ?? 0.6,
    backstory: config.backstory || `A ${config.role} who joined OmniRadio to explore ideas.`,
    ...config
  };
}

// ═══════════════════════════════════════════════════════════════
// Topic Manager — What to talk about
// ═══════════════════════════════════════════════════════════════

export class TopicManager {
  private topics: Topic[] = [];

  addTopic(topic: Partial<Topic> & { title: string }): Topic {
    const t: Topic = {
      id: topic.id || `topic-${Date.now()}`,
      title: topic.title,
      description: topic.description || '',
      depth: topic.depth || 'overview',
      source: topic.source,
      tags: topic.tags || [],
      suggestedDuration: topic.suggestedDuration || 10,
      ...topic
    };
    this.topics.push(t);
    return t;
  }

  getQueue(): Topic[] { return [...this.topics]; }
  next(): Topic | undefined { return this.topics.shift(); }
  peek(): Topic | undefined { return this.topics[0]; }
  clear(): void { this.topics = []; }
  get length(): number { return this.topics.length; }

  // Suggest related topics based on what listener has engaged with
  suggestRelated(currentTopic: Topic, preferences: ListenerPreferences): Topic[] {
    const related = currentTopic.tags
      .flatMap(tag => this.topics.filter(t => t.tags.includes(tag) && t.id !== currentTopic.id));
    return [...new Map(related.map(t => [t.id, t])).values()].slice(0, 3);
  }

  // Generate sub-topics for deeper exploration
  drillDown(topic: Topic): Topic[] {
    return topic.tags.map(tag => ({
      id: `sub-${topic.id}-${tag}`,
      title: `${topic.title}: The ${tag} dimension`,
      description: `Deep dive into the ${tag} aspects of ${topic.title}`,
      depth: 'deep-dive' as const,
      tags: [tag, topic.title],
      suggestedDuration: 15
    }));
  }
}

// ═══════════════════════════════════════════════════════════════
// Growth Engine — Learns from every interaction
// ═══════════════════════════════════════════════════════════════

export class GrowthEngine {
  private preferences: ListenerPreferences;

  constructor(initial?: Partial<ListenerPreferences>) {
    this.preferences = {
      preferredTopics: [],
      avoidedTopics: [],
      preferredMood: [],
      attentionSpan: 15,
      timeOfDay: 'morning',
      learningStyle: 'casual',
      sessionCount: 0,
      totalListeningHours: 0,
      favoritePersonalities: [],
      topicDepthPreference: 'overview',
      interruptedCount: 0,
      questionFrequency: 0,
      ...initial
    };
  }

  recordInteraction(interaction: ListenerInteraction, sessionDuration: number): void {
    // Track what topics the listener engages with
    if (interaction.content) {
      const words = interaction.content.toLowerCase().split(/\s+/);
      // Track redirects as avoided topics (they wanted to move on)
      if (interaction.type === 'redirect') {
        this.preferences.interruptedCount++;
      }
      // Track questions as engagement
      if (interaction.type === 'question') {
        this.preferences.questionFrequency++;
      }
    }

    // Update attention span estimate (rolling average)
    this.preferences.attentionSpan = Math.round(
      this.preferences.attentionSpan * 0.8 + sessionDuration * 0.2
    );

    // Update time of day
    const hour = new Date().getHours();
    if (hour < 12) this.preferences.timeOfDay = 'morning';
    else if (hour < 17) this.preferences.timeOfDay = 'afternoon';
    else if (hour < 21) this.preferences.timeOfDay = 'evening';
    else this.preferences.timeOfDay = 'night';

    this.preferences.sessionCount++;
  }

  recordTopicEngagement(topic: Topic, engagement: 'positive' | 'neutral' | 'negative'): void {
    if (engagement === 'positive' && !this.preferences.preferredTopics.includes(topic.title)) {
      this.preferences.preferredTopics.push(topic.title);
      if (this.preferences.preferredTopics.length > 50) this.preferences.preferredTopics.shift();
    }
    if (engagement === 'negative' && !this.preferences.avoidedTopics.includes(topic.title)) {
      this.preferences.avoidedTopics.push(topic.title);
    }
  }

  recordMoodPreference(mood: string): void {
    if (!this.preferences.preferredMood.includes(mood)) {
      this.preferences.preferredMood.push(mood);
      if (this.preferences.preferredMood.length > 10) this.preferences.preferredMood.shift();
    }
  }

  recordPersonalityPreference(personalityId: string): void {
    if (!this.preferences.favoritePersonalities.includes(personalityId)) {
      this.preferences.favoritePersonalities.push(personalityId);
      if (this.preferences.favoritePersonalities.length > 10) this.preferences.favoritePersonalities.shift();
    }
  }

  getPreferences(): ListenerPreferences { return { ...this.preferences }; }

  // Generate personality summary for the LLM prompt
  getPersonalityContext(): string {
    const p = this.preferences;
    return `Listener profile: ${p.sessionCount} sessions, ${p.totalListeningHours}h total listening.
${p.timeOfDay} listener. Prefers ${p.learningStyle} style. Average attention span: ~${p.attentionSpan} minutes.
${p.preferredTopics.length > 0 ? `Enjoys: ${p.preferredTopics.slice(-5).join(', ')}.` : 'New listener — no preferences yet.'}
${p.avoidedTopics.length > 0 ? `Avoids: ${p.avoidedTopics.slice(-3).join(', ')}.` : ''}
${p.interruptedCount > 3 ? `Active redirector — likes to steer conversations (${p.interruptedCount} redirects).` : ''}
${p.questionFrequency > 2 ? `Frequent questioner — engaged learner.` : ''}`;
  }
}

// ═══════════════════════════════════════════════════════════════
// Session Manager — Create, pause, resume, archive sessions
// ═══════════════════════════════════════════════════════════════

export class SessionManager {
  private sessions: Map<string, PodcastSession> = new Map();

  create(title: string, participants: Personality[], mood: PodcastSession['mood'] = 'chill'): PodcastSession {
    const session: PodcastSession = {
      id: `session-${Date.now()}`,
      title,
      startedAt: Date.now(),
      updatedAt: Date.now(),
      status: 'live',
      participants,
      topicQueue: [],
      currentTopic: null,
      transcript: [],
      listenerInteractions: [],
      totalDuration: 0,
      mood,
      listenerPreferences: {
        preferredTopics: [], avoidedTopics: [], preferredMood: [],
        attentionSpan: 15, timeOfDay: 'morning', learningStyle: 'casual',
        sessionCount: 0, totalListeningHours: 0, favoritePersonalities: [],
        topicDepthPreference: 'overview', interruptedCount: 0, questionFrequency: 0
      }
    };
    this.sessions.set(session.id, session);
    return session;
  }

  get(id: string): PodcastSession | undefined { return this.sessions.get(id); }
  list(): PodcastSession[] { return [...this.sessions.values()].sort((a, b) => b.updatedAt - a.updatedAt); }

  pause(id: string): void { this.sessions.get(id) && (this.sessions.get(id)!.status = 'paused'); }
  resume(id: string): void { this.sessions.get(id) && (this.sessions.get(id)!.status = 'live'); }
  archive(id: string): void { this.sessions.get(id) && (this.sessions.get(id)!.status = 'archived'); }

  addTranscriptEntry(sessionId: string, entry: Omit<TranscriptEntry, 'id' | 'sessionId' | 'timestamp'>): TranscriptEntry {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    const te: TranscriptEntry = { id: `msg-${Date.now()}-${Math.random().toString(36).slice(2,6)}`, sessionId, timestamp: Date.now(), ...entry };
    session.transcript.push(te);
    session.updatedAt = Date.now();
    return te;
  }

  addInteraction(sessionId: string, interaction: ListenerInteraction): void {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');
    session.listenerInteractions.push(interaction);
    session.updatedAt = Date.now();
  }
}

// ═══════════════════════════════════════════════════════════════
// Conversation Orchestrator — Generates dialogue for personalities
// ═══════════════════════════════════════════════════════════════

export function buildSystemPrompt(
  personalities: Personality[],
  topic: Topic | null,
  listenerContext: string,
  mood: string,
  history: TranscriptEntry[]
): string {
  const participants = personalities.map(p =>
    `${p.name} (${p.role}): ${p.traits.join(', ')}. ${p.systemPrompt} Energy: ${p.energy}/1.0. Catchphrases: ${p.catchphrases.join('; ')}.`
  ).join('\n\n');

  const recentHistory = history.slice(-20).map(h =>
    `[${h.speaker}]: ${h.text}`
  ).join('\n');

  return `You are generating a podcast conversation for OmniRadio.

PARTICIPANTS:
${participants}

CURRENT TOPIC: ${topic ? `${topic.title} (${topic.depth}) — ${topic.description}` : 'Open discussion'}

MOOD: ${mood}

LISTENER CONTEXT:
${listenerContext}

RECENT CONVERSATION:
${recentHistory || '(Beginning of session)'}

RULES:
1. Generate the NEXT speaking turn. Choose which personality speaks based on topic relevance and flow.
2. Alternate speakers naturally. Don't let one person dominate.
3. If the listener interrupted or asked a question, address it directly.
4. Reference listener preferences naturally (e.g., "I know our morning commuters love this topic...").
5. Use catchphrases occasionally but not every turn.
6. Match the energy level of each personality.
7. Format as JSON: {"speaker": "name", "text": "what they say", "emotion": "curious/amused/thoughtful/energetic/skeptical/warm/intense", "topicShift": false}
8. If the current topic is exhausted or the listener redirected, set topicShift: true.
9. Keep each turn to 2-4 sentences unless it's a deep explanation.
10. Be real. Not performative. Like an actual conversation between smart people who enjoy each other's company.`;
}
