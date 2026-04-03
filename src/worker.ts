import { addNode, addEdge, traverse, crossDomainQuery, findPath, domainStats, getDomainNodes } from './lib/knowledge-graph.js';
import { loadSeedIntoKG, FLEET_REPOS, loadAllSeeds } from './lib/seed-loader.js';
import { DEFAULT_PERSONALITIES, createPersonality, TopicManager, GrowthEngine, SessionManager, buildSystemPrompt } from './podcast/engine';
import type { Personality, Topic, ListenerInteraction, PodcastSession } from './podcast/engine';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;
    const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': '*', 'Access-Control-Allow-Headers': '*' };
    if (method === 'OPTIONS') return new Response(null, { headers: cors });

    const json = () => request.json().catch(() => ({}));
    const headers = { 'Content-Type': 'application/json', ...cors };

    // ── Knowledge Graph (Phase 4B) ──
    if (path.startsWith('/api/kg')) {
      const _kj = (d: any, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      if (path === '/api/kg' && method === 'GET') return _kj({ domain: url.searchParams.get('domain') || 'podcast-ai', nodes: await getDomainNodes(env, url.searchParams.get('domain') || 'podcast-ai') });
      if (path === '/api/kg/explore' && method === 'GET') {
        const nid = url.searchParams.get('node');
        if (!nid) return _kj({ error: 'node required' }, 400);
        return _kj(await traverse(env, nid, parseInt(url.searchParams.get('depth') || '2'), url.searchParams.get('domain') || undefined));
      }
      if (path === '/api/kg/cross' && method === 'GET') return _kj({ query: url.searchParams.get('query') || '', domain: url.searchParams.get('domain') || 'podcast-ai', results: await crossDomainQuery(env, url.searchParams.get('query') || '', url.searchParams.get('domain') || 'podcast-ai') });
      if (path === '/api/kg/domains' && method === 'GET') return _kj(await domainStats(env));
      if (path === '/api/kg/sync' && method === 'POST') return _kj(await loadAllSeeds(env, FLEET_REPOS));
      if (path === '/api/kg/seed' && method === 'POST') { const b = await request.json(); return _kj(await loadSeedIntoKG(env, b, b.domain || 'podcast-ai')); }

  if (path === '/api/efficiency' && request.method === 'GET') {    return new Response(JSON.stringify({ totalCached: 0, totalHits: 0, cacheHitRate: 0, tokensSaved: 0, repo: 'podcast-ai', timestamp: Date.now() }), { headers: { 'Content-Type': 'application/json', ...corsHeaders() } });  }
    }

    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(getLandingHTML(), { headers: { 'Content-Type': 'text/html' } });
    }

    // ── App ──
    if (url.pathname === '/app' && request.method === 'GET') {
      return new Response(getAppHTML(), { headers: { 'Content-Type': 'text/html' } });
    }

    // ── Generate Next Turn (SSE) ──
    if (url.pathname === '/api/speak' && request.method === 'POST') {
      const { sessionId, topic, listenerMessage, mood, personalities: customPersonalities } = await json();

      // Load or create session
      let session = await env.PODCAST_KV.get(`session:${sessionId}`, 'json') as PodcastSession | null;
      if (!session) {
        const pers = customPersonalities || DEFAULT_PERSONALITIES;
        const sm = new SessionManager();
        session = sm.create(topic?.title || 'Untitled Session', pers, mood || 'chill');
      }

      const personalities = session.participants || DEFAULT_PERSONALITIES;
      const growth = new GrowthEngine(session.listenerPreferences);

      // Record listener interaction if any
      if (listenerMessage) {
        const interaction: ListenerInteraction = {
          timestamp: Date.now(),
          type: listenerMessage.startsWith('!') ? 'redirect' : 'question',
          content: listenerMessage
        };
        session.listenerInteractions.push(interaction);
        growth.recordInteraction(interaction, session.totalDuration);
      }

      // Build the prompt and stream from DeepSeek
      const systemPrompt = buildSystemPrompt(
        personalities,
        topic,
        growth.getPersonalityContext(),
        session.mood,
        session.transcript
      );

      const userMessage = listenerMessage
        ? `The listener just said: "${listenerMessage}". Respond naturally as the podcast. If they asked a question, answer it. If they redirected, acknowledge and shift.`
        : topic
        ? `Continue the conversation about: ${topic.title}. ${topic.description}. Depth: ${topic.depth}.`
        : 'Continue the podcast conversation naturally.';

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            const resp = await fetch('https://api.deepseek.com/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.DEEPSEEK_API_KEY}` },
              body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: userMessage }
                ],
                stream: true,
                temperature: 0.8,
                max_tokens: 300
              })
            });
            const reader = resp.body!.getReader();
            let fullText = '';
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              const chunk = new TextDecoder().decode(value);
              for (const line of chunk.split('\n')) {
                if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                  try {
                    const d = JSON.parse(line.slice(6));
                    if (d.choices?.[0]?.delta?.content) {
                      fullText += d.choices[0].delta.content;
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: d.choices[0].delta.content })}\n\n`));
                    }
                  } catch {}
                }
              }
            }
            // Try to parse as JSON turn, fallback to raw text
            try {
              const cleaned = fullText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
              const turn = JSON.parse(cleaned);
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ turn: { speaker: turn.speaker || 'Maven', text: turn.text || fullText, emotion: turn.emotion || 'thoughtful' } })}\n\n`));
            } catch {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ turn: { speaker: 'Maven', text: fullText, emotion: 'thoughtful' } })}\n\n`));
            }
          } catch (e: any) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`));
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });

      // Save session state
      session.updatedAt = Date.now();
      await env.PODCAST_KV.put(`session:${sessionId}`, JSON.stringify(session));

      return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', ...cors } });
    }

    // ── Sessions CRUD ──
    if (url.pathname === '/api/sessions') {
      const sessions = await env.PODCAST_KV.list({ prefix: 'session:' });
      const result = await Promise.all(sessions.keys.map(async k => {
        const data = await env.PODCAST_KV.get(k.name, 'json');
        return data;
      }));
      return new Response(JSON.stringify(result), { headers });
    }

    // ── Personalities ──
    if (url.pathname === '/api/personalities' && request.method === 'GET') {
      const custom = await env.PODCAST_KV.get('personalities', 'json') as Personality[] || [];
      return new Response(JSON.stringify([...DEFAULT_PERSONALITIES, ...custom]), { headers });
    }
    if (url.pathname === '/api/personalities' && request.method === 'POST') {
      const config = await json();
      const personality = createPersonality(config);
      const existing = await env.PODCAST_KV.get('personalities', 'json') as Personality[] || [];
      existing.push(personality);
      await env.PODCAST_KV.put('personalities', JSON.stringify(existing));
      return new Response(JSON.stringify(personality), { headers });
    }

    // ── Topics ──
    if (url.pathname === '/api/topics' && request.method === 'POST') {
      const topicConfig = await json();
      const tm = new TopicManager();
      const topic = tm.addTopic(topicConfig);
      const existing = await env.PODCAST_KV.get('topics', 'json') as Topic[] || [];
      existing.push(topic);
      await env.PODCAST_KV.put('topics', JSON.stringify(existing));
      return new Response(JSON.stringify(topic), { headers });
    }
    if (url.pathname === '/api/topics' && request.method === 'GET') {
      const topics = await env.PODCAST_KV.get('topics', 'json') as Topic[] || [];
      return new Response(JSON.stringify(topics), { headers });
    }

    // ── Preferences ──
    if (url.pathname === '/api/preferences' && request.method === 'GET') {
      const prefs = await env.PODCAST_KV.get('preferences', 'json') || {};
      return new Response(JSON.stringify(prefs), { headers });
    }
    if (url.pathname === '/api/preferences' && request.method === 'POST') {
      const prefs = await json();
      await env.PODCAST_KV.put('preferences', JSON.stringify(prefs));
      return new Response(JSON.stringify(prefs), { headers });
    }

    return new Response('Not found', { status: 404, headers });
  }
};

// ═══════════════════════════════════════════════════════════════
// Landing Page — The pitch
// ═══════════════════════════════════════════════════════════════
function getLandingHTML(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OmniRadio — Your Personal Podcast That Never Stops</title>
<style>
body{margin:0;font-family:system-ui;background:#0A0A0A;color:#E5E5E5}
.hero{min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:2rem;background:linear-gradient(135deg,#0A0A0A 0%,#1A0A2E 50%,#0A0A0A 100%)}
h1{font-size:3.5rem;background:linear-gradient(90deg,#A855F7,#3B82F6,#10B981);-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:1rem}
.tagline{font-size:1.3rem;color:#999;max-width:600px;line-height:1.6;margin:0 auto 2rem}
.features{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem;padding:4rem 2rem;max-width:1100px;margin:0 auto}
.card{background:#141414;border:1px solid #222;padding:2rem;border-radius:16px}
.card h3{margin-top:0;font-size:1.1rem}
.card p{color:#888;line-height:1.5;font-size:0.95rem}
.btn{display:inline-block;margin-top:2rem;padding:1rem 2.5rem;background:linear-gradient(90deg,#A855F7,#7C3AED);color:white;border-radius:12px;text-decoration:none;font-weight:700;font-size:1.1rem;transition:transform 0.2s}
.btn:hover{transform:scale(1.05)}
.badge{display:inline-block;padding:0.25rem 0.75rem;background:#1E1E1E;border:1px solid #333;border-radius:20px;font-size:0.75rem;color:#A855F7;margin:0.25rem}
.section{padding:4rem 2rem;max-width:900px;margin:0 auto;text-align:center}
.wave{color:#666;font-size:0.9rem;max-width:700px;margin:0 auto;line-height:1.8}
</style></head><body>
<div class="hero">
<div>
<h1>📻 OmniRadio</h1>
<p class="tagline">A podcast that grows with you. Tell it what you want to hear. Interrupt when you want to change direction. It learns your mind, your mood, your curiosity. Not a companion — a radio tuned to your frequency.</p>
<a href="/app" class="btn">Start Listening</a>
<div style="margin-top:1.5rem">
<span class="badge">Free: Browser TTS</span>
<span class="badge">Premium: ElevenLabs</span>
<span class="badge">Grows Over Time</span>
<span class="badge">Vibe-Code Personalities</span>
</div>
</div>
</div>
<div class="section"><h2 style="color:#A855F7">For the Morning Drive</h2>
<p class="wave">Describe what you want to hear about on your commute. Listen 90% of the time. Interrupt to ask questions or redirect. The system learns your patterns — what engages you, what loses you, what makes you think.</p></div>
<div class="section"><h2 style="color:#3B82F6">For the Student</h2>
<p class="wave">Feed it a textbook. Banter your way through the subject. It learns your learning style. It knows what parts inspire you. It pushes you where you're weak and rewards you where you're strong. The repo becomes your personalized syllabus.</p></div>
<div class="section"><h2 style="color:#10B981">For the Creator</h2>
<p class="wave">Produce a real podcast with robotic voices for iteration. Refine topics, personalities, flow. Then render with ElevenLabs for production. The repo IS your production studio.</p></div>
<div class="features">
<div class="card"><h3>🎙️ Endless Generation</h3><p>Topics never run out. Feed it articles, papers, news. It generates discussion. You steer. It adapts.</p></div>
<div class="card"><h3>🗣️ Interruptible</h3><p>Real-time control. Redirect topics. Ask questions. Change mood. Like talking to the radio and the radio talks back.</p></div>
<div class="card"><h3>🎭 Vibe-Code Personalities</h3><p>Create hosts and guests by describing them. "A contrarian physicist who loves bad puns." Done. They stay consistent.</p></div>
<div class="card"><h3>🧠 Grows With You</h3><p>After 100 sessions it knows your attention span, your interests, your moods. It gets better every time you listen.</p></div>
<div class="card"><h3>🔊 Free or Premium</h3><p>Browser TTS works out of the box. Plug in ElevenLabs or OpenAI for production quality. Same system, different voice.</p></div>
<div class="card"><h3>📝 Every Session Saved</h3><p>Transcripts, topics, preferences — all in the repo. Rewind any session. Search your listening history. It's YOUR archive.</p></div>
</div>
<div style="text-align:center;padding:4rem;color:#444;font-size:0.85rem">A cocapn vessel. The repo IS the podcast.</div>
</body></html>`;
}

// ═══════════════════════════════════════════════════════════════
// App UI — The studio
// ═══════════════════════════════════════════════════════════════
function getAppHTML(): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OmniRadio</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui;background:#0A0A0A;color:#E5E5E5;display:flex;height:100vh;overflow:hidden}
.sidebar{width:300px;background:#111;border-right:1px solid #222;padding:1rem;overflow-y:auto;flex-shrink:0}
.sidebar h2{font-size:0.85rem;color:#A855F7;text-transform:uppercase;letter-spacing:0.1em;margin:1rem 0 0.5rem}
.sidebar input,.sidebar textarea,.sidebar select{width:100%;padding:0.5rem;background:#1A1A1A;border:1px solid #333;border-radius:8px;color:#E5E5E5;font-size:0.85rem;margin-bottom:0.5rem}
.sidebar textarea{height:60px;resize:vertical}
.sidebar button{width:100%;padding:0.5rem;background:#A855F7;color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem;margin-bottom:0.5rem}
.sidebar button:hover{background:#7C3AED}
.sidebar button.secondary{background:#333;color:#A855F7}
.persona-card{background:#1A1A1A;padding:0.5rem;border-radius:8px;margin-bottom:0.5rem;font-size:0.8rem}
.persona-card .name{font-weight:700;color:#A855F7}
.persona-card .role{color:#666;font-size:0.75rem}
.topic-chip{display:inline-block;padding:0.2rem 0.6rem;background:#1E1E1E;border:1px solid #333;border-radius:12px;font-size:0.75rem;margin:0.15rem;cursor:pointer}
.topic-chip:hover{border-color:#A855F7}
.main{flex:1;display:flex;flex-direction:column}
.topbar{padding:0.75rem 1.5rem;background:#111;border-bottom:1px solid #222;display:flex;align-items:center;gap:1rem}
.topbar .live{color:#EF4444;font-weight:700;font-size:0.8rem;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
.transcript{flex:1;overflow-y:auto;padding:1.5rem 2rem}
.turn{margin-bottom:1.5rem;animation:fadeIn 0.3s ease}
@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.turn .speaker{font-weight:700;font-size:0.9rem;margin-bottom:0.25rem}
.turn .speaker.host{color:#A855F7}
.turn .speaker.cohost{color:#3B82F6}
.turn .speaker.guest{color:#10B981}
.turn .speaker.listener{color:#F59E0B}
.turn .text{line-height:1.6;color:#CCC;font-size:0.95rem;max-width:700px}
.turn .emotion{color:#555;font-size:0.75rem;font-style:italic}
.typing{color:#555;font-style:italic;padding:0.5rem 0}
.controls{padding:1rem 1.5rem;background:#111;border-top:1px solid #222}
.control-row{display:flex;gap:0.5rem;margin-bottom:0.5rem;flex-wrap:wrap}
.controls input{flex:1;padding:0.75rem;background:#1A1A1A;border:1px solid #333;border-radius:8px;color:#E5E5E5;font-size:0.9rem;min-width:200px}
.controls button{padding:0.75rem 1.5rem;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.85rem}
.btn-send{background:#A855F7;color:white}
.btn-send:hover{background:#7C3AED}
.btn-interrupt{background:#EF4444;color:white}
.btn-interrupt:hover{background:#DC2626}
.btn-mood{background:#333;color:#E5E5E5;font-size:0.75rem;padding:0.5rem 1rem}
.btn-mood:hover{background:#444}
.btn-mood.active{background:#A855F7;color:white}
.quick-actions{display:flex;gap:0.5rem;flex-wrap:wrap;margin-top:0.5rem}
.quick-btn{padding:0.3rem 0.75rem;background:#1A1A1A;border:1px solid #333;border-radius:20px;color:#888;font-size:0.75rem;cursor:pointer}
.quick-btn:hover{border-color:#A855F7;color:#A855F7}
</style></head><body>
<div class="sidebar">
<h2>📻 OmniRadio</h2>
<div style="color:#888;font-size:0.8rem;margin-bottom:1rem">Your personal podcast that never stops</div>

<h2>🎙️ Personalities</h2>
<div id="personalities-list"></div>
<button onclick="togglePersonaForm()">+ New Personality</button>
<div id="persona-form" style="display:none">
<input id="p-name" placeholder="Name">
<textarea id="p-desc" placeholder="Describe them... e.g. A contrarian physicist who loves bad puns"></textarea>
<select id="p-role"><option value="guest">Guest</option><option value="host">Host</option><option value="cohost">Co-host</option></select>
<button onclick="addPersonality()">Create</button>
</div>

<h2>📋 Topics</h2>
<div id="topics-list"></div>
<button onclick="toggleTopicForm()">+ Add Topic</button>
<div id="topic-form" style="display:none">
<input id="t-title" placeholder="Topic title">
<textarea id="t-desc" placeholder="What to discuss..."></textarea>
<select id="t-depth"><option value="headline">Headline</option><option value="overview">Overview</option><option value="deep-dive">Deep Dive</option><option value="rabbit-hole">Rabbit Hole</option></select>
<button onclick="addTopic()">Add</button>
</div>

<h2>📊 Listener Profile</h2>
<div id="listener-profile" style="font-size:0.8rem;color:#888">Loading...</div>
</div>

<div class="main">
<div class="topbar">
<span class="live">● LIVE</span>
<span id="session-title" style="font-weight:600">New Session</span>
<span style="color:#555;font-size:0.8rem" id="session-time">00:00</span>
</div>
<div class="transcript" id="transcript">
<div style="text-align:center;color:#444;padding:4rem">
<div style="font-size:2rem;margin-bottom:1rem">📻</div>
<div>Tell OmniRadio what you want to hear about</div>
<div style="font-size:0.85rem;margin-top:0.5rem">Type a topic below or use quick actions to get started</div>
</div>
</div>
<div class="controls">
<div class="control-row">
<input id="msg-input" placeholder="What do you want to hear about? Or interrupt to redirect..." onkeypress="if(event.key==='Enter')send()">
<button class="btn-send" onclick="send()">▶ Send</button>
<button class="btn-interrupt" onclick="interrupt()">⏸ Interrupt</button>
</div>
<div class="control-row" style="justify-content:center">
<button class="btn-mood active" onclick="setMood('chill',this)">😌 Chill</button>
<button class="btn-mood" onclick="setMood('energetic',this)">⚡ Energy</button>
<button class="btn-mood" onclick="setMood('intense',this)">🔥 Intense</button>
<button class="btn-mood" onclick="setMood('humorous',this)">😄 Humor</button>
<button class="btn-mood" onclick="setMood('philosophical',this)">🤔 Philo</button>
</div>
<div class="quick-actions">
<button class="quick-btn" onclick="quickSend('Tell me about AI consciousness')">🤖 AI Consciousness</button>
<button class="quick-btn" onclick="quickSend('What is the nature of time?')">⏳ Nature of Time</button>
<button class="quick-btn" onclick="quickSend('Explain quantum computing simply')">⚛️ Quantum Computing</button>
<button class="quick-btn" onclick="quickSend('Go deeper on that')">🔄 Go Deeper</button>
<button class="quick-btn" onclick="quickSend('Skip to something else')">⏭️ Skip</button>
<button class="quick-btn" onclick="quickSend('Summarize what we discussed')">📝 Summarize</button>
</div>
</div>
</div>

<script>
const API='/api';
let sessionId='default';
let currentMood='chill';
let isSpeaking=false;

async function init(){
  const [pers,topics,prefs]=await Promise.all([
    fetch(API+'/personalities').then(r=>r.json()),
    fetch(API+'/topics').then(r=>r.json()),
    fetch(API+'/preferences').then(r=>r.json())
  ]);
  document.getElementById('personalities-list').innerHTML=pers.map(p=>'<div class="persona-card"><div class="name">'+p.name+'</div><div class="role">'+p.role+' · '+p.traits?.slice(0,2).join(', ')+'</div></div>').join('');
  document.getElementById('topics-list').innerHTML=topics.map(t=>'<span class="topic-chip" onclick="quickSend(\''+t.title.replace(/'/g,"\\\\'")+'\')">'+t.title+'</span>').join('');
  document.getElementById('listener-profile').innerHTML='Sessions: '+(prefs.sessionCount||0)+'<br>Style: '+(prefs.learningStyle||'casual')+'<br>Attention: ~'+(prefs.attentionSpan||15)+'min';
}

function togglePersonaForm(){document.getElementById('persona-form').style.display=document.getElementById('persona-form').style.display==='none'?'block':'none'}
function toggleTopicForm(){document.getElementById('topic-form').style.display=document.getElementById('topic-form').style.display==='none'?'block':'none'}

async function addPersonality(){
  const name=document.getElementById('p-name').value;
  const desc=document.getElementById('p-desc').value;
  const role=document.getElementById('p-role').value;
  if(!name)return;
  await fetch(API+'/personalities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,role,systemPrompt:'You are '+name+'. '+desc,traits:desc.split(/[,;]/).map(s=>s.trim().toLowerCase()).slice(0,5),catchphrases:[],energy:0.7})});
  document.getElementById('p-name').value='';document.getElementById('p-desc').value='';document.getElementById('persona-form').style.display='none';init();
}

async function addTopic(){
  const title=document.getElementById('t-title').value;
  const desc=document.getElementById('t-desc').value;
  const depth=document.getElementById('t-depth').value;
  if(!title)return;
  await fetch(API+'/topics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title,description:desc,depth,tags:title.toLowerCase().split(/\\s+/)})});
  document.getElementById('t-title').value='';document.getElementById('t-desc').value='';document.getElementById('topic-form').style.display='none';init();
}

function setMood(mood,btn){currentMood=mood;document.querySelectorAll('.btn-mood').forEach(b=>b.classList.remove('active'));btn.classList.add('active')}

function addTurn(speaker,text,emotion,type){
  const div=document.createElement('div');div.className='turn';
  const role=type||'host';
  div.innerHTML='<div class="speaker '+role+'">'+speaker+'</div><div class="text">'+text+'</div>'+(emotion?'<div class="emotion">'+emotion+'</div>':'');
  document.getElementById('transcript').appendChild(div);
  div.scrollIntoView({behavior:'smooth',block:'end'});
}

function showTyping(name){
  const div=document.createElement('div');div.className='typing';div.id='typing-indicator';div.textContent=name+' is speaking...';
  document.getElementById('transcript').appendChild(div);div.scrollIntoView({behavior:'smooth'});
}
function hideTyping(){const el=document.getElementById('typing-indicator');if(el)el.remove()}

async function send(){
  const input=document.getElementById('msg-input');const msg=input.value;if(!msg||isSpeaking)return;
  input.value='';addTurn('You',msg,'','listener');isSpeaking=true;
  showTyping('OmniRadio');
  const resp=await fetch(API+'/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,topic:{title:msg,description:msg,depth:'overview',tags:msg.toLowerCase().split(/\\s+/)},listenerMessage:null,mood:currentMood})});
  const reader=resp.body.getReader();const decoder=new TextDecoder();
  let fullText='',speaker='Maven',emotion='thoughtful';
  while(true){const{done,value}=await reader.read();if(done)break;const text=decoder.decode(value);for(const line of text.split('\\n')){if(line.startsWith('data: ')&&line!=='data: [DONE]'){try{const d=JSON.parse(line.slice(6));if(d.text){fullText+=d.text;hideTyping();const existing=document.querySelector('.turn:last-child .text');if(existing)existing.textContent=fullText}else if(d.turn){hideTyping();speaker=d.turn.speaker;emotion=d.turn.emotion;addTurn(speaker,d.turn.text,emotion,speaker==='Spark'?'cohost':'host')}}catch{}}}}
  isSpeaking=false;hideTyping();
}

async function interrupt(){
  const msg='!redirect: change topic';isSpeaking=false;
  addTurn('You','⏸ *interrupts*','interrupt','listener');
  showTyping('OmniRadio');
  const resp=await fetch(API+'/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId,listenerMessage:msg,mood:currentMood})});
  const reader=resp.body.getReader();const decoder=new TextDecoder();let fullText='';
  while(true){const{done,value}=await reader.read();if(done)break;const text=decoder.decode(value);for(const line of text.split('\\n')){if(line.startsWith('data: ')&&line!=='data: [DONE]'){try{const d=JSON.parse(line.slice(6));if(d.text){fullText+=d.text;hideTyping();const el=document.querySelector('.turn:last-child .text');if(el)el.textContent=fullText}else if(d.turn){hideTyping();addTurn(d.turn.speaker,d.turn.text,d.turn.emotion,d.turn.speaker==='Spark'?'cohost':'host')}}catch{}}}}
  isSpeaking=false;hideTyping();
}

function quickSend(msg){document.getElementById('msg-input').value=msg;send()}

// Session timer
let seconds=0;setInterval(()=>{seconds++;const m=String(Math.floor(seconds/60)).padStart(2,'0');const s=String(seconds%60).padStart(2,'0');document.getElementById('session-time').textContent=m+':'+s},1000);

init();
</script></body></html>`;
}

interface Env {
  PODCAST_KV: KVNamespace;
  DEEPSEEK_API_KEY: string;
}
