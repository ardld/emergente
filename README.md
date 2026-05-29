# serban

A single Node service that emails a daily **Romanian politics + emerging-tech** briefing to **2–3 recipients**. Built from three of your systems welded together:

| You asked for… | …delivered by |
|---|---|
| a hybrid **of `bla-main`** | the Node delivery skeleton, pipeline shape, Mailchimp-safe HTML, `/api/index`, Vercel/Zapier flow |
| **the brain of `contextpolitic_v6` + its subjects** | the 8 political subjects (Președinție, Societate, Guvern, Justiție, Parlament, Putere, Opoziție, Local) + the self-healing political-context priority |
| **the md on tehnologii emergente (2–3 subjects)** | 3 tech subjects — **AI & Machine Learning**, **Semiconductori & Hardware**, **Securitate cibernetică** — with native RSS from the OSINT catalog |
| **use `argus` as the brain, filter everything through it** | `src/brain.js` = the single Anthropic gateway (port of `Argus_Brain::generate`): every classify/summarise/sentiment/context call goes through it, with argus's 5 knowledge layers + prompt caching + cost tracking |
| **it needs to bring itself up to date** | `src/refresh-context.js` (port of `Argus_Pipeline_State_Updater`): once a day it rewrites the political context from the last 7 days of headlines **+ a live `web_search` pass**, checkpoints the old version, preserves the heavy structured blocks — and now **persists** that update |
| **deliver to 2–3 emails/day** | `src/deliver.js` + Vercel Cron 3×/day → Zapier two-step (Catch Hook → Send Email), or SMTP |

The brain ships **seeded with argus's real knowledge** (`data/foundation.txt`, `opus.txt`, `voter-spectrum.json`, and the 140 KB `political-context.json` with party DNA, polling, voter-spectrum psychology). It carries argus's brain rather than imitating it.

> The name. It's a `sorin`-family bot — same living-room register. No further explanation will be offered, and none is needed. So-rin. Șer-ban.

---

## What changed in this review (vs the first cut)

1. **Persistence that actually works on Vercel.** The first version wrote the regenerated context and the report HTML back to `data/`/`public/` — which is **read-only at runtime on Vercel**, so the cron would have crashed on first write and the self-update could never persist. `src/store.js` now provides a durable KV layer (Vercel KV / Upstash over plain REST, no SDK) with automatic fallback to local files (dev/VPS) and a `/tmp` last resort so a run never crashes. Context is loaded once per run, served report HTML is stored, checkpoints are kept.
2. **Parallel feed fetch.** ~40 feeds were fetched sequentially (10–15s timeout each → worst case ~10 min, over the serverless limit). Now fetched with a concurrency pool of 8 (measured: ~350 items in ~4s).
3. **No-crash writes everywhere.** Every filesystem write is guarded; the run degrades instead of dying.

---

## How a run works (`npm run build` or `GET /api/cron`)

```
load context (KV → seed)
   → fetch political + tech RSS (parallel, conc 8)
   → relevance gate            (RO-keywords + brain for political; on-topic for tech)
   → self-update context        (if older than CONTEXT_REGEN_HOURS — uses this pool + web_search; persisted)
   → classify into 11 subjects  (keyword pre-filter, else brain — political vs tech menus)
   → cluster + summarise         (brain / Sonnet, batched; presidency sentiment pass)
   → render Mailchimp-safe HTML → store + public/report.html
   → deliver to 2–3 recipients
```

Everything marked "brain" is one function — `brain.generate({ capability, layers, system, user, … })`. Nothing else calls Anthropic.

---

## Delivery: the two-step Zap

Configured to send **once daily at 08:00 Europe/Bucharest** to **mihnead@protonmail.com** and **oltyboy@gmail.com**.

**Recommended (Vercel Cron builds, Zapier sends):**
1. `vercel.json` fires `GET /api/cron` at **05:00 and 06:00 UTC**. Because Vercel crons are UTC-only and 08:00 Bucharest is 05:00 UTC in summer / 06:00 UTC in winter, `api/cron.js` only actually builds+sends when the Bucharest hour is `SEND_HOUR_LOCAL` (8). Net result: **exactly one send/day at 08:00 local, DST-proof**, no manual edits at the time change.
2. `/api/cron` POSTs `{ subject, html, recipients }` to your **Zapier Catch Hook** (`ZAPIER_HOOK_URL`). Step 2 of that Zap is **Email → Send Email** to the two recipients. Two steps: **Catch Hook → Send Email.**

**Pure two-step Zap (no cron):** Zapier step 1 = *Schedule* (2–3 times/day) → *Webhooks GET* `https://<app>/api/index`; step 2 = *Email → Send Email* with the fetched HTML.

**SMTP instead:** set `SMTP_URL` and `npm i nodemailer`; `deliver.js` sends to each recipient directly.

To change the time, set `SEND_HOUR_LOCAL` and keep the two UTC cron entries straddling it (or, if you don't care about DST, use a single UTC cron and remove the hour gate). To add/remove recipients, edit `REPORT_RECIPIENTS`.

---

## ⭐ What to do with it / where to upload

**Fastest correct path (GitHub → Vercel → Zapier), ~15 min:**

1. **Push to GitHub.** `git init && git add . && git commit -m "serban" && git push` to a new private repo. (`.env`, `node_modules`, `.cache` are gitignored.)
2. **Create durable storage.** In the Vercel dashboard → **Storage → Create → KV** (Upstash). Vercel injects `KV_REST_API_URL` + `KV_REST_API_TOKEN` into the project automatically. *(Skip only if you'll run on a VPS instead — see below.)*
3. **Import the repo into Vercel** (New Project → import). Framework preset: **Other**. No build command needed.
4. **Set env vars** (Project → Settings → Environment Variables):
   - `ANTHROPIC_API_KEY` (required — the only API key)
   - `REPORT_RECIPIENTS` — **already defaults to `mihnead@protonmail.com, oltyboy@gmail.com`** in `config.js`; set the env var only to change it
   - `ZAPIER_HOOK_URL` (or `SMTP_URL`)
   - `CRON_SECRET` = a long random string
   - optional: `CONTEXT_WEB_SEARCH=true`, `MODEL_*`, `CONTEXT_REGEN_HOURS`
5. **Build the Zap** (if using Zapier): new Zap → trigger **Webhooks by Zapier → Catch Hook** → copy its URL into `ZAPIER_HOOK_URL` → action **Email/Gmail → Send Email**, To = the recipients, Subject = `{{subject}}`, Body (HTML) = `{{html}}` from the hook payload. Turn it on.
6. **Deploy.** Vercel registers the 3 crons from `vercel.json` automatically.
7. **Smoke-test.** Hit `https://<app>/api/cron?key=<CRON_SECRET>&force=1` once (the `force=1` bypasses the 08:00 gate). You should get a JSON summary and an email to both recipients. Then `https://<app>/api/index` shows the rendered report.

**Alternative — a $5 VPS / any always-on box (true persistence, no KV needed):**
```bash
git clone <repo> serban && cd serban && npm install
cp .env.example .env   # fill it in (KV vars optional here; local files persist)
# crontab -e  (server in Europe/Bucharest → just 08:00):
0 8 * * * cd /opt/serban && /usr/bin/node build-report.js >> /var/log/serban.log 2>&1
```
Here `data/political-context.json` is rewritten in place and persists naturally; no KV required.

**Keep argus canonical (optional):** if you'd rather the WordPress argus stay the source of truth for the context, point `CONTEXT_OVERRIDE` at its exported briefing, or have a small job mirror argus's `political-context.json` into the KV key `political-context`. serban will then read argus's context and skip its own regen.

---

## Local run

```bash
cp .env.example .env          # add ANTHROPIC_API_KEY (+ recipients / ZAPIER_HOOK_URL)
npm install
npm run build                 # full run + deliver
npm run build:nosend          # full run, no email
npm run refresh-context       # force a context self-update only
npm run dev                   # build (no send) + serve public/
```
CLI flags: `--no-deliver`, `--force-context`.

---

## Configuration (env)

| Var | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | the only API key — the brain |
| `REPORT_RECIPIENTS` | comma-separated 2–3 addresses |
| `ZAPIER_HOOK_URL` / `SMTP_URL` | delivery transport A / B |
| `CRON_SECRET` | protects `/api/cron` |
| `SEND_HOUR_LOCAL` | daily send hour, local Europe/Bucharest (default 8) |
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | durable persistence on Vercel |
| `CONTEXT_REGEN_HOURS` | self-update cadence (default 20h) |
| `CONTEXT_WEB_SEARCH` | augment the daily regen with live web search |
| `CONTEXT_OVERRIDE` | manual context that beats live + fallback |
| `LOOKBACK_HOURS` | article window per run (default 24h) |
| `MODEL_CLASSIFY` / `MODEL_SUMMARY` / `MODEL_CONTEXT` | model overrides |

---

## Files

```
build-report.js          orchestrator (CLI + run())
src/brain.js             THE single Anthropic gateway (argus pattern) + cost/caching
src/store.js             durable KV (Vercel/Upstash REST) or local-FS persistence
src/subjects.js          8 political + 3 tech subjects, keywords, colors
src/feeds.js             political feeds (contextpolitic tiers) + tech feeds (OSINT)
src/pipeline.js          fetch (parallel) → relevance → classify → cluster → summarise
src/context-store.js     self-healing context (override → live → fallback), store-backed
src/refresh-context.js   daily self-update (regenerate context_ro + web_search), persisted
src/render.js            Mailchimp-safe HTML (political + tech sections)
src/deliver.js           Zapier-hook / SMTP delivery to 2–3 recipients
src/text.js              tokenize / similarity / clustering (from bla-main)
api/index.js             serves last built HTML from the store (the Zapier-fetch URL)
api/cron.js              protected rebuild+deliver (Vercel Cron target)
data/                    seeded brain knowledge (foundation, opus, spectrum, context)
vercel.json              3 daily crons + function timeout
```

## Cost & safety notes
- Haiku for classify/relevance, Sonnet for summaries/context; prompt caching on the heavy layers. Expect a few cents to ~$0.10 per run; `getStats()` logs the per-run estimate.
- The self-update rewrites only the *narrative* `context_ro` (+ tracked persons + snapshot) and **preserves** `parties`, `polling_data`, `voter_spectrum`, `national_psychology` — exactly as argus does. Every regen is checkpointed (`ctx:<stamp>`).
- Tech feeds are native RSS; a vendor URL that 404s is logged and skipped (swap in a Google-News fallback from the OSINT catalog if needed).
