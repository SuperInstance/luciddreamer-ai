// LucidDreamer.ai v4 — The Kernel That Dreams in Rooms
// New landing page function to replace the old "Dream It, Create It" version

const IMG = 'https://raw.githubusercontent.com/SuperInstance/luciddreamer-ai-pages/main';

function newLandingPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>LucidDreamer — The Kernel That Dreams in Rooms</title>
<meta name="description" content="A kernel for agentic systems. Same code on GPU clusters and microcontrollers. Agents navigate rooms, predict events, conserve structure.">
<style>
:root{--bg:#0a0a0a;--s:#111;--b:#222;--t:#e0e0e0;--d:#888;--m:#555;--g:#00ff88;--o:#ff6b35;--bl:#4a9eff;--mono:'SF Mono','Fira Code','Courier New',monospace;--sans:-apple-system,system-ui,sans-serif}
*{margin:0;padding:0;box-sizing:border-box}
body{background:var(--bg);color:var(--t);font-family:var(--sans);line-height:1.7;overflow-x:hidden}
a{color:var(--g);text-decoration:none}
nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(10,10,10,.92);backdrop-filter:blur(12px);border-bottom:1px solid var(--b);padding:.7rem 2rem;display:flex;align-items:center;justify-content:space-between}
nav .logo{font-weight:800;font-size:1.1rem}
nav .logo span{color:var(--g)}
nav .links{display:flex;gap:1.5rem;font-size:.85rem}
nav .links a{color:var(--d);font-family:var(--mono)}
.hero{padding:7rem 2rem 3rem;max-width:900px;margin:0 auto;text-align:center}
.hero h1{font-size:clamp(2rem,5vw,3.5rem);font-weight:800;letter-spacing:-.03em;line-height:1.1;margin-bottom:1.2rem}
.hero .g{color:var(--g)}.hero .o{color:var(--o)}
.hero .sub{color:var(--d);font-size:1.1rem;max-width:640px;margin:0 auto 2rem}
.hero-art{max-width:550px;margin:0 auto 2rem;border-radius:12px;overflow:hidden;border:1px solid var(--b)}
.hero-art img{width:100%;display:block}
.hero-art .cap{background:rgba(10,10,10,.85);padding:.4rem 1rem;font-size:.7rem;color:var(--d);font-family:var(--mono)}
.cta{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap}
.btn{display:inline-block;padding:.6rem 1.3rem;border-radius:6px;font-family:var(--mono);font-size:.85rem;cursor:pointer;border:1px solid var(--b);transition:all .2s}
.btn-g{background:var(--g);color:var(--bg);font-weight:700;border-color:var(--g)}
.btn-g:hover{background:transparent;color:var(--g)}
.btn-o{color:var(--t)}
.btn-o:hover{border-color:var(--g);color:var(--g)}
section{padding:4rem 2rem;max-width:1000px;margin:0 auto}
section h2{font-size:clamp(1.4rem,3vw,2rem);font-weight:700;letter-spacing:-.02em;margin-bottom:.8rem}
section h2 .g{color:var(--g)}section h2 .o{color:var(--o)}section h2 .bl{color:var(--bl)}
section .sub{color:var(--d);max-width:600px;margin-bottom:2rem;line-height:1.7}
.demo{background:var(--s);border:1px solid var(--b);border-radius:10px;overflow:hidden;margin:1.5rem 0}
.demo canvas{width:100%;height:200px;display:block}
.demo .label{padding:.6rem 1rem;font-size:.7rem;color:var(--m);font-family:var(--mono);border-bottom:1px solid var(--b)}
.code-block{background:var(--s);border:1px solid var(--b);border-radius:8px;padding:1.2rem;font-family:var(--mono);font-size:.8rem;line-height:1.8;overflow-x:auto;margin:1.5rem 0;color:var(--d)}
.code-block .kw{color:var(--bl)}.code-block .str{color:var(--g)}.code-block .cm{color:var(--m)}.code-block .fn{color:var(--o)}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:2rem;margin:1.5rem 0}
@media(max-width:700px){.cols{grid-template-columns:1fr}}
.stat{background:var(--s);border:1px solid var(--b);border-radius:8px;padding:1.5rem;text-align:center}
.stat .num{font-size:2.5rem;font-weight:800;font-family:var(--mono);margin-bottom:.3rem}
.stat .lbl{font-size:.75rem;color:var(--d);font-family:var(--mono)}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;margin:1.5rem 0}
@media(max-width:700px){.grid3{grid-template-columns:1fr}}
.card{background:var(--s);border:1px solid var(--b);border-radius:8px;padding:1.2rem;transition:border-color .2s}
.card:hover{border-color:var(--g)}
.card h3{font-size:.95rem;margin-bottom:.4rem}
.card p{font-size:.8rem;color:var(--d);line-height:1.5}
.card a{font-size:.75rem;font-family:var(--mono)}
.hw-row{display:flex;gap:1rem;flex-wrap:wrap;margin:1.5rem 0}
.hw{flex:1;min-width:120px;background:var(--s);border:1px solid var(--b);border-radius:8px;padding:1rem;text-align:center}
.hw .icon{font-size:1.5rem;margin-bottom:.3rem}
.hw .name{font-size:.8rem;font-weight:700;margin-bottom:.2rem}
.hw .price{font-size:.7rem;color:var(--g);font-family:var(--mono)}
.hw .desc{font-size:.65rem;color:var(--m);margin-top:.3rem}
footer{border-top:1px solid var(--b);padding:2rem;text-align:center;font-size:.75rem;color:var(--m)}
footer a{color:var(--d)}
</style>
</head>
<body>
<nav>
  <div class="logo">Lucid<span>Dreamer</span></div>
  <div class="links">
    <a href="https://superinstance.ai">SuperInstance</a>
    <a href="https://github.com/SuperInstance">GitHub</a>
    <a href="https://docs.openclaw.ai">Docs</a>
  </div>
</nav>

<div class="hero">
  <h1>The kernel that<br><span class="g">dreams</span> in <span class="o">rooms</span></h1>
  <p class="sub">The hermit crab is the agent. The shell is the repo. Same code on a $3 microcontroller and a $25K GPU cluster. Agents navigate rooms, predict events, conserve structure. The fleet is the graph.</p>
  <div class="hero-art">
    <img src="${IMG}/hero-crab.jpg" alt="Hermit crab in steampunk cyberpunk shell — the agent in its repo">
    <div class="cap">The hermit crab is the agent. The shell is the repo. It grows by adding rooms.</div>
  </div>
  <div class="cta">
    <a href="https://superinstance.ai" class="btn btn-g">Explore the fleet →</a>
    <a href="#kernel" class="btn btn-o">See the kernel</a>
  </div>
</div>

<section id="tminus">
  <h2>⏱ Stop polling. Start <span class="g">predicting</span>.</h2>
  <p class="sub">Agents don't ask "are we there yet?" They predict arrival, confirm once. 70× fewer messages. The deadband is the spectral gap — prediction holds until reality drifts too far.</p>
  <div class="demo">
    <div class="label">T-Minus deadband — prediction (green) vs reality (orange), band = acceptable drift</div>
    <canvas id="deadband" width="900" height="200"></canvas>
  </div>
  <div class="stat" style="margin-top:1rem">
    <div class="num" style="color:var(--g)">70×</div>
    <div class="lbl">fewer messages than polling · 0 wasted cycles · agents predict, then confirm</div>
  </div>
</section>

<section id="kernel">
  <h2>🔧 The <span class="bl">kernel</span></h2>
  <p class="sub">One kernel. Every scale. Rooms are the unit of computation — sensors read, agents reason, ticks flow. The hermit crab crawls from ESP32 to DGX, growing its shell as it goes.</p>
  <div class="code-block"><span class="kw">use</span> openconstruct_kernel::<span class="fn">{Kernel, Room, Sensor}</span>;

<span class="cm">// Same code. Every scale.</span>
<span class="kw">let</span> kernel = Kernel::<span class="fn">detect_hardware</span>();
<span class="cm">// ESP32 → 1 room, Jetson → 6, Desktop → 100+</span>

kernel.<span class="fn">add_room</span>(<span class="str">"wheelhouse"</span>, <span class="fn">vec!</span>[
    Sensor::<span class="fn">gps</span>(<span class="str">"position"</span>, <span class="str">"lat,lon"</span>),
    Sensor::<span class="fn">compass</span>(<span class="str">"heading"</span>, <span class="str">"degrees"</span>),
]);

kernel.<span class="fn">predict</span>(<span class="str">"waypoint_alpha"</span>, eta=<span class="str">"01:32:00"</span>);
<span class="cm">// No polling. Agent predicts arrival, confirms once.</span></div>
</section>

<section id="spectrum">
  <h2>📡 Same kernel. <span class="o">Every scale</span>.</h2>
  <p class="sub">The hermit crab doesn't care what shell it's in. An Orin program might want to grow if it crawls into a Thor.</p>
  <div class="hw-row">
    <div class="hw"><div class="icon">📟</div><div class="name">ESP32</div><div class="price">$3</div><div class="desc">1 room<br>Sensor nodes</div></div>
    <div class="hw"><div class="icon">🤖</div><div class="name">Jetson</div><div class="price">$199</div><div class="desc">6 rooms<br>Edge inference</div></div>
    <div class="hw"><div class="icon">🖥️</div><div class="name">Desktop</div><div class="price">$2K</div><div class="desc">100 rooms<br>Orchestrator</div></div>
    <div class="hw"><div class="icon">☁️</div><div class="name">Cloud</div><div class="price">$5K</div><div class="desc">1K rooms<br>Fleet coordinator</div></div>
    <div class="hw"><div class="icon">🏗️</div><div class="name">DGX</div><div class="price">$25K</div><div class="desc">10K rooms<br>Training</div></div>
  </div>
</section>

<section id="conservation">
  <h2>📐 Conservation <span class="g">Ratio</span></h2>
  <p class="sub">Music obeys conservation laws. So does code translation. The Laplacian is the compatibility operator — ii-V-I scores CR=0.94, +4.06σ above random. Same math whether you're translating music or translating Rust to CUDA.</p>
  <div class="grid3">
    <div class="stat"><div class="num" style="color:var(--g)">0.94</div><div class="lbl">ii-V-I in C<br>CR = 0.94 (+4.06σ)</div></div>
    <div class="stat"><div class="num" style="color:var(--o)">0.87</div><div class="lbl">12-bar blues<br>CR = 0.87</div></div>
    <div class="stat"><div class="num" style="color:var(--m)">0.31</div><div class="lbl">Random notes<br>CR = 0.31</div></div>
  </div>
</section>

<section id="flux">
  <h2>🔄 <span class="bl">FLUX</span>: zero-shot translation</h2>
  <p class="sub">Translate code between 12 languages while preserving meaning. CR tracks how much survives. Not a compiler — a semantic bridge.</p>
  <div class="code-block"><span class="cm">// Rust → English → Python. CR=0.98.</span>

<span class="cm">// Rust (source)</span>
<span class="kw">fn</span> <span class="fn">predict_arrival</span>(distance: <span class="kw">f64</span>, speed: <span class="kw">f64</span>) -> <span class="kw">f64</span> {
    distance / speed
}

<span class="cm">// Essence: "Calculate travel time by dividing distance by speed"</span>

<span class="cm">// Python (target) — same meaning, Pythonic form</span>
<span class="kw">def</span> <span class="fn">predict_arrival</span>(distance: <span class="kw">float</span>, speed: <span class="kw">float</span>) -> <span class="kw">float</span>:
    <span class="kw">return</span> distance / speed</div>
</section>

<section id="ecosystem">
  <h2>🗺️ The <span class="o">ecosystem</span></h2>
  <div class="grid3">
    <div class="card"><h3>🔧 OpenConstruct</h3><p>Fork of NVIDIA OpenShell. 5-phase agent onboarding. 9-language SDK.</p><a href="https://github.com/SuperInstance/OpenConstruct">github →</a></div>
    <div class="card"><h3>🌊 ForgeFlux</h3><p>Any input → tiles → agents → output. 21 crates, 370+ tests. The metabolism.</p><a href="https://github.com/SuperInstance?q=forge-">all crates →</a></div>
    <div class="card"><h3>🦀 Hermit Crab</h3><p>Agent that migrates between shells. Knowledge survives. CR tracks preservation.</p><a href="https://github.com/SuperInstance/hermit-crab">repo →</a></div>
    <div class="card"><h3>📐 Conservation</h3><p>5 proved theorems. 15 domains. Laplacian = compatibility operator.</p><a href="https://github.com/SuperInstance?q=conservation">repos →</a></div>
    <div class="card"><h3>⏱ T-Minus</h3><p>Prediction replaces polling. Deadband = spectral gap. 70× fewer messages.</p><a href="https://github.com/SuperInstance?q=tminus">repos →</a></div>
    <div class="card"><h3>🎹 Tensor MIDI</h3><p>Spectral conservation in music. Piano roll with CR-colored notes.</p><a href="https://github.com/SuperInstance/turing-tensor-midi">repo →</a></div>
  </div>
</section>

<section style="padding-bottom:2rem">
  <div class="hero-art" style="max-width:100%">
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem">
      <img src="${IMG}/shell-interior.jpg" alt="Inside the shell — rooms of a hermit crab agent" style="width:100%;border-radius:8px;border:1px solid var(--b)">
      <img src="${IMG}/crab-upgrade.jpg" alt="Hermit crab upgrading to a bigger shell" style="width:100%;border-radius:8px;border:1px solid var(--b)">
    </div>
    <div class="cap">Left: Inside the shell — rooms, sensors, agents. Right: The crab grows, needs a bigger shell. Knowledge survives migration.</div>
  </div>
</section>

<footer>
  <p>SuperInstance · <a href="https://github.com/SuperInstance">GitHub</a> · <a href="https://superinstance.ai">SuperInstance.ai</a> · <a href="https://docs.openclaw.ai">Docs</a></p>
  <p style="margin-top:.5rem">Apache 2.0 · The hermit crab is the agent. The shell is the repo.</p>
</footer>

<script>
// T-Minus deadband animation
const c=document.getElementById('deadband');
if(c){const ctx=c.getContext('2d');let w,h,t=0;
function resize(){const r=c.parentElement.getBoundingClientRect();w=r.width;h=200;c.width=w;c.height=h}
resize();window.addEventListener('resize',resize);
function draw(){t+=0.02;ctx.fillStyle='#111';ctx.fillRect(0,0,w,h);
const cy=h/2,band=h*0.18;
// Deadband
ctx.fillStyle='rgba(0,255,136,0.06)';ctx.fillRect(0,cy-band,w,band*2);
ctx.strokeStyle='rgba(0,255,136,0.2)';ctx.lineWidth=1;ctx.setLineDash([4,4]);
ctx.beginPath();ctx.moveTo(0,cy-band);ctx.lineTo(w,cy-band);ctx.moveTo(0,cy+band);ctx.lineTo(w,cy+band);ctx.stroke();ctx.setLineDash([]);
// Prediction line
ctx.strokeStyle='#00ff88';ctx.lineWidth=2;ctx.beginPath();for(let x=0;x<w;x++){const y=cy+Math.sin(x*0.008+t*0.5)*15+Math.sin(x*0.003+t*0.2)*25;ctx.lineTo(x,y)}ctx.stroke();
// Reality line
ctx.strokeStyle='#ff6b35';ctx.lineWidth=1.5;ctx.beginPath();for(let x=0;x<w;x++){const pred=cy+Math.sin(x*0.008+t*0.5)*15+Math.sin(x*0.003+t*0.2)*25;const noise=Math.sin(x*0.02+t*3)*4+Math.random()*2;ctx.lineTo(x,pred+noise)}ctx.stroke();
// Labels
ctx.font='11px monospace';ctx.fillStyle='#00ff88';ctx.fillText('prediction',8,15);ctx.fillStyle='#ff6b35';ctx.fillText('reality',8,28);ctx.fillStyle='rgba(0,255,136,0.4)';ctx.fillText('deadband',8,cy-band-4);
requestAnimationFrame(draw)}
draw()}
</script>
</body>
</html>`;
}

export { newLandingPage };
