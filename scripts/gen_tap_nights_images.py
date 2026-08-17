#!/usr/bin/env python3
"""Generate Tap Nights imagery via Cloudflare FLUX (fallback DeepInfra FLUX)."""
import base64, json, os, re, time, urllib.request, urllib.error

OUT = "/home/eileen/projects/luciddreamer-ai/public/tap-nights/images"
os.makedirs(OUT, exist_ok=True)

def cf_token():
    try:
        txt = open("/home/eileen/.config/.wrangler/config/default.toml").read()
        m = re.search(r'oauth_token\s*=\s*["\']([^"\']+)', txt)
        return m.group(1) if m else ""
    except Exception:
        return ""

def di_key():
    txt = open(os.path.expanduser("~/.bashrc")).read()
    m = re.search(r'DEEPINFRA_API_KEY\s*=\s*["\']?([^"\'\s]+)', txt)
    return m.group(1) if m else os.environ.get("DEEPINFRA_API_KEY", "")

CF_ACCOUNT = "049ff5e84ecf636b53b162cbb580aae6"
CF = cf_token()
DI = di_key()

IMAGES = [
    ("hero", "A warm wooden harbor bar called The Tap at night, a vintage radio broadcast booth with a glowing microphone at one end of the long oak counter, five empty glasses catching amber light, pool table and darts in the back shadows, no people, cinematic broadcast still, deep blues and gold"),
    ("first-night", "Five tradesmen silhouettes at a long oak bar in a warm harbor tavern, five glasses and one empty glass on the counter, tools put away, amber lantern light, the feeling of after work, cinematic radio still, no faces visible"),
    ("open-mic", "Open mic night in a warm harbor bar, a single performer at a small stage with a vintage microphone, soft spotlight, a crowd of silhouettes at wooden tables listening, amber and deep blue, cinematic radio broadcast still"),
    ("trivia", "Trivia night at a warm harbor bar, two teams at round tables facing a host with question cards, a glowing scoreboard on the wall, tense friendly atmosphere, amber light and deep shadows, cinematic radio still"),
    ("ttrpg", "Tabletop RPG night at a candlelit table in a warm harbor bar, a gamemaster behind a screen with dice and character sheets, four players leaning in, a hand-drawn map of a fogbound harbor, dramatic candlelight, cinematic radio still"),
    ("singles", "Singles night at a small round table in a warm harbor bar, two glasses of amber drink and a candle, two empty chairs, soft nervous warm atmosphere, the rest of the bar softly blurred, deep blue and gold, cinematic radio still"),
]

def gen_cf(slug, prompt):
    out = os.path.join(OUT, f"{slug}.png")
    if os.path.exists(out) and os.path.getsize(out) > 1000:
        print(f"  skip {slug}", flush=True); return True
    body = json.dumps({"prompt": prompt, "width": 1024, "height": 576}).encode()
    req = urllib.request.Request(
        f"https://api.cloudflare.com/client/v4/accounts/{CF_ACCOUNT}/ai/run/@cf/black-forest-labs/flux-1-schnell",
        data=body, headers={"Content-Type": "application/json", "Authorization": "Bearer " + CF})
    try:
        with urllib.request.urlopen(req, timeout=240) as r:
            data = json.load(r)
        if data.get("success") and data.get("result", {}).get("image"):
            open(out, "wb").write(base64.b64decode(data["result"]["image"]))
            print(f"  OK (CF) {slug}.png ({os.path.getsize(out)} bytes)", flush=True)
            return True
        print(f"  CF no-image {slug}: {json.dumps(data)[:150]}", flush=True)
    except urllib.error.HTTPError as e:
        print(f"  CF ERR {slug}: {e.code} {e.read()[:150]}", flush=True)
    except Exception as e:
        print(f"  CF EXC {slug}: {e}", flush=True)
    return False

def gen_di(slug, prompt):
    out = os.path.join(OUT, f"{slug}.png")
    body = json.dumps({"prompt": prompt, "width": 832, "height": 832,
                       "num_inference_steps": 4, "seed": 777}).encode()
    req = urllib.request.Request(
        "https://api.deepinfra.com/v1/inference/black-forest-labs/FLUX-1-schnell",
        data=body, headers={"Content-Type": "application/json", "Authorization": "Bearer " + DI})
    try:
        with urllib.request.urlopen(req, timeout=300) as r:
            data = json.load(r)
        b64 = data.get("output") or data.get("images")
        if isinstance(b64, list): b64 = b64[0] if b64 else None
        if isinstance(b64, str):
            if b64.startswith("data:"): b64 = b64.split(",", 1)[1]
            open(out, "wb").write(base64.b64decode(b64))
            print(f"  OK (DI) {slug}.png ({os.path.getsize(out)} bytes)", flush=True)
            return True
    except Exception as e:
        print(f"  DI ERR {slug}: {e}", flush=True)
    return False

print(f"CF token: {CF[:12]}... DI key: {DI[:8]}...", flush=True)
for slug, prompt in IMAGES:
    ok = gen_cf(slug, prompt)
    if not ok:
        time.sleep(1)
        gen_di(slug, prompt)
    time.sleep(0.6)
print("=== IMAGES DONE ===", flush=True)
