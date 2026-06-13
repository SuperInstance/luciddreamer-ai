# LucidDreamer AI

A **dream journal web application** deployed as a Cloudflare Worker — helping users log dreams, track lucid dreaming practice, identify recurring dream signs, and follow evidence-based induction techniques (Reality Testing, WBTB, MILD).

## Why It Matters

Lucid dreaming — becoming aware you're dreaming while still asleep — is a learnable skill backed by peer-reviewed research (Stumbrys et al., 2012). But the skill requires consistent practice: daily reality checks, dream journaling within minutes of waking, and pattern recognition across hundreds of dream entries. This app provides the structured practice tool: voice logging for half-asleep mornings, automated theme detection, and progress tracking (lucid rate over time). Unlike dream dictionaries or crystal shops, every technique recommended is backed by sleep science with citations. The app serves luciddreamer.ai — a public-facing site in the SuperInstance portfolio.

## How It Works

**Architecture**: Single Cloudflare Worker serving a complete HTML page. No client-side JavaScript framework — the entire UI is server-rendered HTML with inline CSS. This keeps the Worker under the 1MB compressed size limit and delivers sub-50ms TTFB globally.

**Content sections**:

1. **Recent dream entries**: Structured entries with date, lucidity flag, title, narrative, and tags (location, people, symbols). Each entry demonstrates the journaling format.

2. **Statistics**: Monthly aggregates — total dreams logged, lucid dreams, and lucid rate (lucid / total). The percentage is the key progress metric.

3. **Reality check prompt**: Interactive reminder to practice reality checks (finger-through-palm, nose pinch, text-reread) — the foundational technique.

4. **Technique guides**: Three evidence-based induction methods:
   - **Reality Testing (RCT)**: 5-10 checks/day, triggered by dream signs
   - **WBTB (Wake Back to Bed)**: Set alarm 4.5-5h after sleep, wake 15-20 min, return with intention
   - **MILD (Mnemonic Induction)**: Repeat "I will recognize I'm dreaming" as you fall asleep

5. **Feature descriptions**: Voice logging, theme detection, lucid practice tracker

**Design philosophy**: Dark theme (#0a0a0a) with purple accent (#a78bfa) reflecting the dreamy aesthetic. Serif typography (Georgia) for narrative content, monospace (JetBrains Mono) for metadata. Minimal JavaScript — the app works without JS enabled.

**Deployment**: Cloudflare Worker with custom domain `luciddreamer.ai` via the Workers custom domain routing. The Worker is a single `fetch` handler returning the full HTML document.

## Quick Start

```bash
# Deploy to Cloudflare
npx wrangler deploy

# Or run locally
npx wrangler dev
```

## API

| Route | Method | Description |
|-------|--------|-------------|
| `/` | GET | Full HTML dream journal application |

## Architecture Notes

LucidDreamer AI is a public-facing web property in the SuperInstance portfolio. It demonstrates the pattern for deploying single-file HTML applications on Cloudflare Workers with custom domains. The Worker is stateless — future versions will integrate D1 for persistent dream storage and Workers AI for automated dream sign extraction. In **γ + η = C**, the serverless deployment minimizes γ (zero infrastructure management). See [Architecture](https://github.com/SuperInstance/SuperInstance/blob/main/ARCHITECTURE.md).

**Dream journal entries**: Sample entries demonstrate the journaling format — structured narratives with metadata tags for location (📍), objects (🏠📚), actions (✈️), and themes (🎭🔄). The tag system enables retrospective pattern analysis: recurring tags reveal dream signs.

**Statistics dashboard**: Three key metrics — lucid dreams this month, total dreams logged, and lucid rate (percentage). The lucid rate is the primary progress indicator, tracking how often reality checks and induction techniques succeed.

**Reality check reminder**: A built-in prompt encourages habit formation. The principle: if you perform reality checks 5–10 times daily while awake, the habit carries into dreams, triggering lucidity.

## References

- Stumbrys, T. et al. "Induction of Lucid Dreams: A Systematic Review," International Journal of Dream Research (2012).
- LaBerge, S. & Rheingold, H. *Exploring the World of Lucid Dreaming*, Ballantine (1990).
- Cloudflare Workers Custom Domains. https://developers.cloudflare.com/workers/custom-domains/
- Hobson, J. *The Dreaming Brain*, Basic Books (1988). — Neurobiological foundation.

## License

MIT
