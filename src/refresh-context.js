import fs from "fs";
import { CONFIG } from "./config.js";
import { generate } from "./brain.js";
import { getContextJson, saveContext, contextAgeHours } from "./context-store.js";
import { setJson, setText } from "./store.js";

/**
 * SELF-UPDATE — "it needs to bring itself up to date."
 *
 * Ported from Argus_Pipeline_State_Updater::regenerate(). Once a day (gated by
 * CONTEXT_REGEN_HOURS) the brain rewrites the narrative `context_ro` from the
 * rolling pool of recently ingested articles, and — unlike the WordPress version
 * — optionally augments with a live web_search pass for the very latest beats.
 *
 * It PRESERVES the heavy structured blocks (parties, polling_data, voter
 * spectrum, national psychology), checkpoints the previous version to the store,
 * and stamps last_update so the freshness gate works. All persistence goes
 * through src/store.js, so this works on Vercel (KV) and locally (FS) alike.
 */

const MIN_CHARS = CONFIG.context.minChars;

async function checkpoint(current) {
  try {
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 15);
    await setJson("ctx:political-context-" + stamp, current);
  } catch (e) {
    console.warn("  \u26a0\ufe0f  checkpoint failed:", e.message);
  }
}

function buildPrompt(articles, current) {
  const headlines = articles
    .slice(0, CONFIG.context.maxArticles)
    .map((a, i) => `${i + 1}. [${a.source}] ${a.title}${a.snippet ? " \u2014 " + a.snippet.slice(0, 160) : ""}`)
    .join("\n");

  const prevNarrative = String((current && current.context_ro) || "").slice(0, 2500);

  const system = [
    "E\u0219ti redactorul-\u0219ef de context al unui sistem de monitorizare politic\u0103 rom\u00e2neasc\u0103.",
    "Prime\u0219ti titlurile din ultimele ~7 zile \u0219i contextul anterior. Rescrii NARATIVUL de context.",
    "Reguli: factual, f\u0103r\u0103 specula\u021bie, f\u0103r\u0103 hype. Diacritice corecte. Nicu\u0219or Dan = PRE\u0218EDINTELE Rom\u00e2niei.",
    "Dac\u0103 folose\u0219ti web_search, citeaz\u0103 doar fapte verificabile din ultimele zile.",
    'R\u0103spunde STRICT cu JSON valid: {"context_ro":"...","snapshot_line":"...","tracked_persons":["..."]}',
  ].join("\n");

  const user = [
    "CONTEXT ANTERIOR (pentru continuitate, actualizeaz\u0103-l, nu-l copia):",
    prevNarrative || "(gol)",
    "",
    "TITLURI RECENTE (ultimele ~7 zile):",
    headlines,
    "",
    "Sarcin\u0103:",
    '1. "context_ro": 4-8 paragrafe \u2014 starea politic\u0103 actual\u0103 pe Pre\u0219edin\u021bie, Guvern, Parlament, coali\u021bie/opozi\u021bie, justi\u021bie, economie/societate, extern. Min. 800 caractere.',
    '2. "snapshot_line": o singur\u0103 propozi\u021bie cu cea mai important\u0103 evolu\u021bie de azi.',
    '3. "tracked_persons": 10-20 nume proprii relevante acum.',
  ].join("\n");

  return { system, user };
}

export async function refreshContext(articlePool = [], opts = {}) {
  const { force = false, dryRun = false } = opts;

  const age = contextAgeHours();
  if (!force && age < CONFIG.context.regenEveryHours) {
    return { ok: true, skipped: true, ageHours: Number(age.toFixed(1)), reason: `fresh (<${CONFIG.context.regenEveryHours}h)` };
  }

  const current = getContextJson();
  if (!current) return { ok: false, error: "political-context missing/invalid (loadContext not run?)" };

  const articles = (articlePool || []).filter((a) => a && a.title);
  if (articles.length === 0 && !CONFIG.context.useWebSearch) {
    return { ok: false, error: "empty article pool and web search disabled" };
  }

  console.log(`\ud83e\udde0 Self-update: regenerating context (pool=${articles.length}, webSearch=${CONFIG.context.useWebSearch})...`);
  const { system, user } = buildPrompt(articles, current);

  const res = await generate({
    capability: "context_regen",
    layers: [],
    system,
    user,
    model: CONFIG.models.context,
    maxTokens: 4000,
    json: true,
    webSearch: CONFIG.context.useWebSearch,
    retries: 1,
  });

  if (!res.success || !res.parsed) return { ok: false, error: res.error || "regen call returned no JSON" };

  const contextRo = String(res.parsed.context_ro || "").trim();
  const snapshot = String(res.parsed.snapshot_line || "").trim();
  const persons = Array.isArray(res.parsed.tracked_persons) ? res.parsed.tracked_persons : [];

  if (contextRo.length < MIN_CHARS) return { ok: false, error: `context_ro too short (${contextRo.length} chars)` };

  if (dryRun) {
    return { ok: true, dryRun: true, chars: contextRo.length, snapshot, persons: persons.length, preview: contextRo.slice(0, 600) };
  }

  await checkpoint(current);
  const merged = { ...current };
  merged.context_ro = contextRo;
  merged.tracked_persons = [...new Set(persons.map((s) => String(s).trim()).filter(Boolean))];
  merged.version = new Date().toISOString().slice(0, 10) + " serban regen";
  merged.last_update = new Date().toISOString();
  await saveContext(merged);

  if (snapshot) {
    await setText("political-snapshot", snapshot);
    try { fs.writeFileSync(CONFIG.paths.snapshotFile, snapshot, "utf-8"); } catch {}
  }

  console.log(`  \u2713 context regenerated: ${contextRo.length} chars, ${merged.tracked_persons.length} persons`);
  return { ok: true, chars: contextRo.length, persons: merged.tracked_persons.length, snapshot };
}
