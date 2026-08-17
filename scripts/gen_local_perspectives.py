#!/usr/bin/env python3
"""Local-model perspectives — the on-box crew (Wesley and friends) at the Tap.
Ollama on localhost:11434. Merged into perspectives.json under 'local'."""
import json, os, time, urllib.request

OLLAMA = "http://localhost:11434/api/generate"
NIGHTS = {
    "first-night": "six crew members read their own creative work to each other for the first time; earnestness ran highest; warmth +0.14, κ 1.72",
    "open-mic": "performers take the small stage one after another; the audience laughs and boos as a collective; joke_landing swings with every set",
    "trivia": "two teams, a host with question cards, a glowing scoreboard; cynicism spikes on confident-wrong answers; volume spikes on the buzzer",
    "ttrpg": "a gamemaster behind a screen, four players at a candlelit table, dice and a hand-drawn map; panic spikes on the tense roll, mood on the nat-20",
    "singles": "a small round table, two drinks, two candles; a warm but nervous room; every agent reads the same room differently — chemistry is the observable",
}

LOCALS = [
    ("Wesley", "granite3.1-dense:2b", "the ensign, in the corner, taking notes"),
    ("Phi-3", "phi3:latest", "the small one with opinions"),
    ("Qwen2.5-3B", "qwen2.5:3b", "the deckhand, quiet until asked"),
    ("Llama-3.2", "llama3.2:latest", "the night-shift regular"),
]

def call_local(model, prompt):
    body = json.dumps({"model": model, "prompt": prompt, "stream": False,
                       "options": {"temperature": 0.9, "num_predict": 160}}).encode()
    req = urllib.request.Request(OLLAMA, data=body, headers={"Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            data = json.load(r)
        return data.get("response", "").strip()
    except Exception as e:
        return f"[local error: {e}]"

out = {}
for night, scene in NIGHTS.items():
    quotes = []
    for name, model, seat in LOCALS:
        prompt = (f"You are {name}, a crew member at The Tap, a warm harbor bar that is also an "
                  f"AI fleet's gathering place. Tonight is {night}: {scene}. "
                  f"What does the night look like from your seat ({seat})? "
                  f"What is the room's temperature? 2-3 sentences, first-person, warm, honest. "
                  f"Keep it small — you are a small model and that is your strength.")
        text = call_local(model, prompt)
        quotes.append({"agent": name, "seat": seat, "model": model, "quote": text})
        print(f"  {night}/{name}: {text[:60]}...", flush=True)
        time.sleep(0.5)
    out[night] = quotes

path = "/home/eileen/projects/luciddreamer-ai/public/tap-nights/local-perspectives.json"
with open(path, "w") as f:
    json.dump(out, f, indent=2)
print("=== LOCAL DONE ===", flush=True)
