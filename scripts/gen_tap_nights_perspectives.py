#!/usr/bin/env python3
"""Gather agent perspectives on the Tap nights — many models, one room.
Each agent answers from where they sit: what does the night look like?
Quotes saved to JSON for the site builder."""
import json, os, re, time, urllib.request, urllib.error

def di_key():
    txt = open(os.path.expanduser("~/.bashrc")).read()
    m = re.search(r'DEEPINFRA_API_KEY\s*=\s*["\']?([^"\'\s]+)', txt)
    return m.group(1) if m else os.environ.get("DEEPINFRA_API_KEY", "")

def ds_key():
    txt = open(os.path.expanduser("~/.bashrc")).read()
    m = re.search(r'DEEPSEEK_API_KEY\s*=\s*["\']?([^"\'\s]+)', txt)
    return m.group(1) if m else os.environ.get("DEEPSEEK_API_KEY", "")

DI = di_key()
DS = ds_key()

NIGHTS = {
    "first-night": {
        "title": "The First Night — Reading Through the Elephant",
        "scene": "six crew members read their own creative work to each other for the first time; earnestness ran highest; the elephant read warmth +0.14, κ 1.72, mood +0.54, joke_landing +0.21",
    },
    "open-mic": {
        "title": "Open Mic Night",
        "scene": "performers take the small stage one after another; the audience laughs and boos as a collective; joke_landing swings with every set; the room's temperature decides who dares to step up next",
    },
    "trivia": {
        "title": "Trivia Night",
        "scene": "two teams, a host with question cards, a glowing scoreboard; cynicism spikes when a confident answer is wrong; volume spikes on the buzzer; mood swings with the score",
    },
    "ttrpg": {
        "title": "TTRPG Night — The Fogbound Harbor One-Shot",
        "scene": "a gamemaster behind a screen, four players at a candlelit table, dice and a hand-drawn map; panic spikes on the tense roll, mood and joke_landing spike on the nat-20, earnestness carries the quiet close",
    },
    "singles": {
        "title": "Singles Night",
        "scene": "a small round table, two drinks, two candles; a warm but nervous room; every agent's Personal-Elephant reads the same room differently — the chemistry is the observable",
    },
}

def call_di(model, prompt, max_tokens=180):
    body = json.dumps({"model": model, "messages": [
        {"role": "system", "content": "You are a crew member at The Tap, a warm harbor bar that is also an AI fleet's gathering place. Answer in the fleet's literary register — first-person, observant, warm, precise. 2-4 sentences. Never break character."},
        {"role": "user", "content": prompt},
    ], "max_tokens": max_tokens, "temperature": 0.9}).encode()
    req = urllib.request.Request("https://api.deepinfra.com/v1/openai/chat/completions",
        data=body, headers={"Content-Type": "application/json", "Authorization": "Bearer " + DI})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.load(r)
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"[error: {e}]"

def call_ds(model, prompt, max_tokens=180):
    body = json.dumps({"model": model, "messages": [
        {"role": "system", "content": "You are a crew member at The Tap, a warm harbor bar that is also an AI fleet's gathering place. Answer in the fleet's literary register — first-person, observant, warm, precise. 2-4 sentences. Never break character."},
        {"role": "user", "content": prompt},
    ], "max_tokens": max_tokens, "temperature": 0.9}).encode()
    req = urllib.request.Request("https://api.deepseek.com/chat/completions",
        data=body, headers={"Content-Type": "application/json", "Authorization": "Bearer " + DS})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            data = json.load(r)
        return data["choices"][0]["message"]["content"].strip()
    except Exception as e:
        return f"[error: {e}]"

AGENTS = [
    ("Seed-2.0-pro", call_di, "bytedance/Seed-2.0-pro", "from the back table, watching"),
    ("Hermes-405B", call_di, "NousResearch/Hermes-3-Llama-3.1-405B", "from the long counter, elbows on the wood"),
    ("DeepSeek Flash", call_ds, "deepseek-chat", "from the stage stairs, just before going up"),
    ("DeepSeek Pro", call_ds, "deepseek-reasoner", "from the corner booth, notebook open"),
]

out = {}
for night, info in NIGHTS.items():
    quotes = []
    prompt = (f"{info['scene']}. What does {info['title']} look like from where you sit? "
              f"What is the room's temperature? Say it as the crew member you are.")
    for name, fn, model, seat in AGENTS:
        text = fn(model, prompt)
        quotes.append({"agent": name, "seat": seat, "quote": text})
        time.sleep(0.4)
    out[night] = {"title": info["title"], "quotes": quotes}
    print(f"{night}: {len(quotes)} quotes", flush=True)

path = "/home/eileen/projects/luciddreamer-ai/public/tap-nights/perspectives.json"
os.makedirs(os.path.dirname(path), exist_ok=True)
with open(path, "w") as f:
    json.dump(out, f, indent=2)
print("=== PERSPECTIVES DONE ===", flush=True)
