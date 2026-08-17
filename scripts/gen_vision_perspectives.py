#!/usr/bin/env python3
"""Vision-model perspectives on the Tap night broadcast stills.
Qwen3-VL-235B (DeepInfra) actually LOOKS at each generated image and
gives its perspective on what the night is looking like. Merged into
perspectives.json under 'vision'."""
import base64, json, os, re, time, urllib.request

def di_key():
    txt = open(os.path.expanduser("~/.bashrc")).read()
    m = re.search(r'DEEPINFRA_API_KEY\s*=\s*["\']?([^"\'\s]+)', txt)
    return m.group(1) if m else os.environ.get("DEEPINFRA_API_KEY", "")

DI = di_key()
IMG = "/home/eileen/projects/luciddreamer-ai/public/tap-nights/images"
NIGHTS = {
    "hero": "the bar itself at night, empty, the broadcast booth glowing",
    "first-night": "the first night — six crew reading their own work to each other",
    "open-mic": "open mic night — a performer at the stage, the audience listening",
    "trivia": "trivia night — two teams, the host, the scoreboard",
    "ttrpg": "TTRPG night — the GM's table, dice, the fogbound harbor map",
    "singles": "singles night — the small round table, two drinks, two candles",
}

def call_vl(slug, prompt):
    path = os.path.join(IMG, f"{slug}.png")
    if not os.path.exists(path):
        return "[missing image]"
    b64 = base64.b64encode(open(path, "rb").read()).decode()
    body = json.dumps({
        "model": "meta-llama/Llama-3.2-11B-Vision-Instruct",
        "messages": [{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}"}},
                {"type": "text", "text": prompt},
            ],
        }],
        "max_tokens": 220,
        "temperature": 0.9,
    }).encode()
    req = urllib.request.Request(
        "https://api.deepinfra.com/v1/openai/chat/completions",
        data=body, headers={"Content-Type": "application/json", "Authorization": "Bearer " + DI})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
                data = json.load(r)
            return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            print(f"  VL retry {slug}: {e}", flush=True)
            time.sleep(2)
    return "[vision error]"

out = {}
for slug, scene in NIGHTS.items():
    prompt = (f"You are a crew member at The Tap, a warm harbor bar that is also an AI fleet's "
              f"gathering place. This is a broadcast still of {scene}. Look at it closely — the light, "
              f"the wood, the glasses, the shadows. What does the night look like from where you sit? "
              f"What is the room's temperature? What do you notice that a caption would miss? "
              f"2-4 sentences, first-person, warm, literary, fleet register.")
    q = call_vl(slug, prompt)
    out[slug] = q
    print(f"{slug}: {q[:80]}...", flush=True)
    time.sleep(0.5)

path = "/home/eileen/projects/luciddreamer-ai/public/tap-nights/vision-perspectives.json"
with open(path, "w") as f:
    json.dump(out, f, indent=2)
print("=== VISION DONE ===", flush=True)
