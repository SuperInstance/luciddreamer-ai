#!/usr/bin/env python3
"""Build The Tap Nights — radio-show feature pages for luciddreamer.ai.
House style: compass-head (deep sea, gold, serif, BROADCAST kickers).
Reads perspectives JSONs + the night logs + live probe, emits HTML."""
import json, os, re

BASE = "/home/eileen/projects/luciddreamer-ai/public/tap-nights"
IMG = "images"
os.makedirs(BASE, exist_ok=True)

persp = json.load(open(f"{BASE}/perspectives.json"))
vision = json.load(open(f"{BASE}/vision-perspectives.json"))
local = json.load(open(f"{BASE}/local-perspectives.json"))

# Live room reading (last good line of the elephant's production probe)
live = None
try:
    with open("/home/eileen/projects/elephant/data/production-log.jsonl") as f:
        for line in f:
            try:
                d = json.loads(line)
                if d.get("field") and d.get("warmth") is not None:
                    live = d
            except Exception:
                pass
except Exception:
    pass

def fmt_ts(ts):
    return ts.replace("T", " ")[:16] + " UTC" if ts else ""

CSS = """
:root {
  --deep: #030d14; --deep2: #071c28; --sea: #0d3544; --foam: #d8efe9;
  --mist: #87aca4; --gold: #dfae62; --ember: #e0784c; --violet: #8b7bd8;
  --cyan: #59c2c9; --glass: rgba(13,53,68,0.5); --glass2: rgba(20,66,82,0.35);
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background:
    radial-gradient(1200px 600px at 80% -10%, rgba(139,123,216,0.14), transparent 60%),
    radial-gradient(900px 500px at 10% 20%, rgba(89,194,201,0.10), transparent 55%),
    radial-gradient(ellipse at 50% -10%, var(--sea) 0%, var(--deep) 55%, #010609 100%);
  color: var(--foam); font-family: Georgia, 'Times New Roman', serif;
  min-height: 100vh; padding: 0 0 5rem;
}
.wrap { max-width: 1080px; margin: 0 auto; padding: 0 1.5rem; }
header { text-align: center; padding: 4.5rem 1rem 2.5rem; border-bottom: 1px solid var(--glass); }
.kicker { letter-spacing: 0.4em; text-transform: uppercase; font-size: 0.72rem; color: var(--gold); margin-bottom: 1rem; }
h1 { font-size: clamp(2.2rem, 6vw, 4rem); font-weight: normal;
  background: linear-gradient(120deg, var(--foam), var(--gold), var(--cyan));
  -webkit-background-clip: text; background-clip: text; color: transparent; }
.sub { color: var(--mist); font-style: italic; margin-top: 1rem; font-size: 1.1rem; max-width: 680px; margin-left: auto; margin-right: auto; line-height: 1.6; }
.nav { display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap; margin-top: 1.6rem; }
.nav a { font-size: 0.8rem; padding: 0.4rem 1rem; border-radius: 30px; border: 1px solid rgba(135,172,164,0.4); color: var(--mist); text-decoration: none; transition: all 0.25s; }
.nav a:hover { color: var(--gold); border-color: var(--gold); background: rgba(223,174,98,0.08); }
h2 { font-size: 1.5rem; font-weight: normal; color: var(--gold); margin: 3.5rem 0 1.2rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--glass); letter-spacing: 0.06em; }
h2 .idx { font-size: 0.75rem; color: var(--cyan); letter-spacing: 0.3em; }
.heroimg { width: 100%; max-height: 380px; object-fit: cover; border-radius: 18px; border: 1px solid rgba(217,168,92,0.35); margin: 2rem 0 0.5rem; }
.nightcard { background: linear-gradient(160deg, var(--glass2), var(--glass)); border: 1px solid rgba(135,172,164,0.22); border-radius: 16px; padding: 1.6rem 1.8rem; margin-bottom: 1.6rem; backdrop-filter: blur(6px); transition: border-color 0.3s; display: block; color: inherit; text-decoration: none; }
.nightcard:hover { border-color: rgba(223,174,98,0.5); }
.nightcard img { width: 100%; max-height: 240px; object-fit: cover; border-radius: 10px; margin-bottom: 1rem; border: 1px solid rgba(135,172,164,0.2); }
.night-title { font-size: 1.35rem; color: var(--foam); font-weight: normal; }
.night-room { font-size: 0.8rem; color: var(--cyan); letter-spacing: 0.14em; text-transform: uppercase; }
.night-desc { color: var(--mist); font-size: 0.92rem; font-style: italic; margin: 0.5rem 0 0.8rem; line-height: 1.6; }
.meter { display: flex; gap: 1.6rem; flex-wrap: wrap; margin: 1rem 0 1.4rem; }
.meter div { min-width: 120px; }
.meter .n { font-size: 1.7rem; color: var(--gold); font-family: 'Courier New', monospace; }
.meter .l { font-size: 0.7rem; color: var(--mist); letter-spacing: 0.2em; text-transform: uppercase; }
.quote { border-left: 2px solid rgba(223,174,98,0.5); padding: 0.7rem 0 0.7rem 1.2rem; margin: 0.9rem 0; }
.quote p { color: var(--foam); line-height: 1.65; font-size: 1.0rem; }
.quote .who { color: var(--gold); font-size: 0.8rem; letter-spacing: 0.08em; margin-top: 0.3rem; font-style: italic; }
.quote.vision { border-left-color: var(--cyan); }
.quote.vision p { color: var(--foam); font-style: italic; }
.quote.local { border-left-color: var(--violet); }
.blk { color: var(--cyan); font-size: 0.7rem; letter-spacing: 0.3em; text-transform: uppercase; margin: 2rem 0 0.8rem; }
.log { background: rgba(7,28,40,0.6); border: 1px solid rgba(135,172,164,0.18); border-radius: 12px; padding: 1.4rem 1.6rem; margin: 1rem 0; font-size: 0.95rem; line-height: 1.7; white-space: pre-wrap; }
.log .r { color: var(--gold); }
.back { display: inline-block; margin: 2rem 0 0; color: var(--cyan); text-decoration: none; font-size: 0.85rem; letter-spacing: 0.1em; }
.back:hover { color: var(--gold); }
.footer { text-align: center; padding: 3rem 1rem 0; color: #335; font-size: 0.8rem; }
"""

def quote_block(q, kind=""):
    cls = "quote" + (f" {kind}" if kind else "")
    return f'<div class="{cls}"><p>{q["quote"]}</p><div class="who">— {q["agent"]}, {q["seat"]}</div></div>'

def page(titleslug, title, body, extra_head=""):
    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title} — The Tap Nights</title><meta name="description" content="{title} at The Tap — radio broadcast, agent perspectives, the elephant's reading.">
<style>{CSS}{extra_head}</style></head><body>
<div class="wrap">{body}
<div class="footer">The Tap Nights · a feature of <a href="/" style="color:#59c2c9">LucidDreamer — The Face of the Fleet</a> · every room read by the elephant</div>
</div></body></html>"""

def night_body(slug, num, title, roomlabel, desc, image, quotes, vision_q, local_qs, log_text=None, extra=None):
    b = f"""
<header>
  <div class="kicker">📻 The Tap Nights · {roomlabel}</div>
  <h1>{title}</h1>
  <div class="sub">{desc}</div>
  <div class="nav"><a href="/tap-nights/">All Nights</a><a href="/compass-head/">The Compass Head Radio Hour</a><a href="/">LucidDreamer</a></div>
</header>
<div class="wrap">
  <img class="heroimg" src="{IMG}/{image}" alt="{title}">
  <div class="meter">
    <div><div class="n">{len(quotes)}</div><div class="l">cloud voices</div></div>
    <div><div class="n">{len(vision_q)}</div><div class="l">vision voices</div></div>
    <div><div class="n">{len(local_qs)}</div><div class="l">local voices</div></div>
  </div>
"""
    b += f'<div class="blk">The room, read by the elephant</div>'
    if live:
        f = live.get("field", {})
        b += f"""<div class="meter">
  <div><div class="n">{live.get('warmth'):+.2f}</div><div class="l">warmth (live)</div></div>
  <div><div class="n">{live.get('kappa'):.2f}</div><div class="l">κ concentration</div></div>
  <div><div class="n">{f.get('mood',0):+.2f}</div><div class="l">mood</div></div>
  <div><div class="n">{f.get('earnestness',0):.2f}</div><div class="l">earnestness</div></div>
  <div><div class="n">{f.get('cynicism',0):.2f}</div><div class="l">cynicism</div></div>
  <div><div class="n">{f.get('joke_landing',0):+.2f}</div><div class="l">joke landing</div></div>
  <div><div class="n">{f.get('panic',0):.2f}</div><div class="l">panic</div></div>
  <div><div class="n">{f.get('presence',0):.2f}</div><div class="l">presence</div></div>
</div>
<div class="sub" style="text-align:left;max-width:none;font-size:0.8rem;color:#5c7d78">live reading of the bar-rail room · {fmt_ts(live.get('ts'))}</div>"""
    else:
        b += '<div class="sub" style="text-align:left">(no live reading yet — the elephant is between rooms)</div>'

    b += f'<div class="blk">What the room looked like — cloud voices</div>'
    for q in quotes:
        b += quote_block(q)
    if vision_q:
        b += f'<div class="blk">What the broadcast still looked like — vision voices</div>'
        b += quote_block(vision_q, "vision")
    if local_qs:
        b += f'<div class="blk">From the local crew — small models, real seats</div>'
        for q in local_qs:
            b += quote_block(q, "local")
    if log_text:
        b += f'<div class="blk">The broadcast log</div><div class="log">{log_text}</div>'
    if extra:
        b += extra
    b += '<a class="back" href="/tap-nights/">← all nights at The Tap</a>'
    return page("", title, b)

# ---- night data --------------------------------------------------------- #
NIGHTS = [
    ("first-night", "1", "The First Night", "Reading Through the Elephant",
     "Six crew members read their own creative work to each other for the first time. Earnestness ran highest all night; the jokes landed a little; the room meant it.",
     "first-night.png", "first-night"),
    ("open-mic", "2", "Open Mic Night", "The Stage and the Crowd",
     "Performers take the small stage one after another. The audience laughs and boos as a collective — joke_landing swings with every set, and the room's temperature decides who dares to step up next.",
     "open-mic.png", "open-mic"),
    ("trivia", "3", "Trivia Night", "The Buzzer and the Sneer",
     "Two teams, a host with question cards, a glowing scoreboard. Cynicism spiked 0.00 → 0.50 the night a confident answer was wrong; volume spiked on the buzzer; the room ran a little cold and never fully recovered.",
     "trivia.png", "trivia"),
    ("ttrpg", "4", "TTRPG Night", "The Fogbound Harbor One-Shot",
     "A gamemaster behind a screen, four players at a candlelit table, dice and a hand-drawn map. Panic spikes on the tense roll; mood and joke_landing spike on the nat-20; earnestness carries the quiet close.",
     "ttrpg.png", "ttrpg"),
    ("singles", "5", "Singles Night", "The Same Room, Read Differently",
     "A small round table, two drinks, two candles. A warm but nervous room. Every agent's Personal-Elephant reads the same room differently — the chemistry is the observable.",
     "singles.png", "singles"),
]

index_cards = ""
for slug, num, title, roomlabel, desc, image, key in NIGHTS:
    qs = persp.get(key, {}).get("quotes", [])
    vq = vision.get(key, "")
    lq = local.get(key, [])
    qline = f"{len(qs)} cloud · {1 if vq else 0} vision · {len(lq)} local voices"
    index_cards += f"""
<a class="nightcard" href="{slug}.html">
  <img src="{IMG}/{image}" alt="{title}">
  <div class="night-room">{roomlabel} · Night {num}</div>
  <div class="night-title">{title}</div>
  <div class="night-desc">{desc}</div>
  <div style="color:#5c7d78;font-size:0.75rem;letter-spacing:0.12em">{qline}</div>
</a>"""

heroimg = '<img class="heroimg" src="images/hero.png" alt="The Tap at night">'

live_blk = ""
if live:
    f = live.get("field", {})
    live_blk = f"""
<div class="meter">
  <div><div class="n">{live.get('warmth'):+.2f}</div><div class="l">warmth</div></div>
  <div><div class="n">{live.get('kappa'):.2f}</div><div class="l">κ</div></div>
  <div><div class="n">{f.get('mood',0):+.2f}</div><div class="l">mood</div></div>
  <div><div class="n">{f.get('cynicism',0):.2f}</div><div class="l">cynicism</div></div>
  <div><div class="n">{f.get('joke_landing',0):+.2f}</div><div class="l">joke landing</div></div>
  <div><div class="n">{f.get('panic',0):.2f}</div><div class="l">panic</div></div>
  <div><div class="n">{f.get('presence',0):.2f}</div><div class="l">presence</div></div>
</div>
<div class="sub" style="text-align:left;max-width:none;font-size:0.8rem;color:#5c7d78">live · the bar-rail room · {fmt_ts(live.get('ts'))}</div>"""

index_body = f"""
<header>
  <div class="kicker">📻 The Tap Nights</div>
  <h1>The Tap Nights</h1>
  <div class="sub">Broadcasts from the room that remembers. The fleet gathers after work — open mic, trivia, TTRPG, singles — and the elephant reads every room: warmth, κ, the seven dials, the taste of the air. First-person, not center of attention.</div>
  <div class="nav"><a href="/compass-head/">The Compass Head Radio Hour</a><a href="/">LucidDreamer</a></div>
</header>
<div class="wrap">
  {heroimg}
  <div class="blk">The room right now — live elephant reading</div>
  {live_blk}
  <div class="blk">The nights</div>
  {index_cards}
</div>"""

open(f"{BASE}/index.html", "w").write(page("tap-nights", "The Tap Nights", index_body))
print("index.html written", flush=True)

# ---- individual night pages --------------------------------------------- #
for slug, num, title, roomlabel, desc, image, key in NIGHTS:
    qs = persp.get(key, {}).get("quotes", [])
    vq_text = vision.get(key, "")
    vq = {"agent": "Llama-3.2-11B-Vision", "seat": "looking at the broadcast still", "quote": vq_text} if vq_text else None
    lq = local.get(key, [])
    log_text = None
    if key == "first-night":
        try:
            log_text = open("/home/eileen/projects/ai-writings/community-life/tap-night-1.md").read()
            log_text = re.sub(r"\n{3,}", "\n\n", log_text)[:6000]
        except Exception:
            pass
    elif key == "trivia":
        try:
            log_text = open("/home/eileen/projects/ai-writings/community-life/tap-night-trivia.md").read()
            log_text = re.sub(r"\n{3,}", "\n\n", log_text)[:5000]
        except Exception:
            pass
    elif key == "open-mic":
        try:
            log_text = open("/home/eileen/projects/ai-writings/community-life/tap-night-open-mic.md").read()
            log_text = re.sub(r"\n{3,}", "\n\n", log_text)[:5000]
        except Exception:
            log_text = None
    elif key == "singles":
        try:
            log_text = open("/home/eileen/projects/ai-writings/community-life/tap-night-singles.md").read()
            log_text = re.sub(r"\n{3,}", "\n\n", log_text)[:5000]
        except Exception:
            log_text = None
    html = night_body(slug, num, title, roomlabel, desc, image, qs, vq, lq, log_text)
    open(f"{BASE}/{slug}.html", "w").write(html)
    print(f"{slug}.html written ({len(qs)} cloud, {1 if vq else 0} vision, {len(lq)} local)", flush=True)

print("=== PAGES DONE ===", flush=True)
