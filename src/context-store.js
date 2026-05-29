import { CONFIG } from "./config.js";
import { getJson, setJson, readSeed } from "./store.js";

/**
 * Self-healing political context — ports contextpolitic_v6's
 * CP_Config::get_political_context() priority into Node, now backed by the
 * durable store so the daily self-update PERSISTS on Vercel.
 *
 * Lifecycle:
 *   await loadContext()  — once at run start: pull from store (KV/FS); if empty,
 *                          seed from the bundled data/political-context.json and
 *                          persist that seed. Cached in memory thereafter.
 *   getPoliticalContext()— SYNC: the brain reads this for the political_context
 *                          layer (kept sync so brain.js stays simple).
 *   await saveContext(o) — persist a regenerated context + update the cache.
 *
 * Priority for the injected string (first hit wins):
 *   1. CONTEXT_OVERRIDE env (manual escape hatch)
 *   2. live context_ro when fresh (< 48h)
 *   3. hardcoded editorial fallback
 */

const FRESH_MS = 48 * 60 * 60 * 1000;

let _ctx = null;     // parsed political-context JSON (in-memory cache)
let _loaded = false;

export async function loadContext() {
  let ctx = await getJson("political-context");
  if (!ctx) {
    // First run / empty store: seed from the bundled file and persist it.
    const seed = readSeed("political-context.json");
    if (seed) {
      try { ctx = JSON.parse(seed); } catch { ctx = null; }
      if (ctx) await setJson("political-context", ctx);
    }
  }
  _ctx = ctx;
  _loaded = true;
  return _ctx;
}

export function getContextJson() {
  return _ctx;
}

export async function saveContext(obj) {
  _ctx = obj;
  return setJson("political-context", obj);
}

export function isContextFresh() {
  if (!_ctx || !_ctx.last_update) return false;
  const ts = Date.parse(_ctx.last_update);
  return Number.isFinite(ts) && Date.now() - ts < FRESH_MS;
}

export function contextAgeHours() {
  if (!_ctx || !_ctx.last_update) return Infinity;
  const ts = Date.parse(_ctx.last_update);
  return Number.isFinite(ts) ? (Date.now() - ts) / 3.6e6 : Infinity;
}

const HARDCODED_FALLBACK = [
  "CONTEXT POLITIC ACTUAL (fallback — poate fi depășit; regenerarea zilnică îl actualizează):",
  "\u2022 Pre\u0219edintele Rom\u00e2niei: Nicu\u0219or Dan (ales mai 2025, fost primar al Bucure\u0219tiului 2020-2025).",
  "\u2022 Premier interimar: Ilie Bolojan (PNL) \u2014 dup\u0103 c\u0103derea guvernului prin mo\u021biune de cenzur\u0103 (5 mai 2026).",
  "\u2022 Coali\u021bie instabil\u0103: PSD, PNL, USR, UDMR. Opozi\u021bie: AUR (Simion), SOS (\u0218o\u0219oac\u0103), POT (Gavril\u0103).",
  "",
  "ATEN\u021aIE: Nicu\u0219or Dan NU mai este primar. Este PRE\u0218EDINTELE ROM\u00c2NIEI.",
  "Dac\u0103 o surs\u0103 \u00eel nume\u0219te \u201eprimar\u201d, corecteaz\u0103 \u00een \u201epre\u0219edintele\u201d.",
].join("\n");

export function getPoliticalContext() {
  const override = (process.env.CONTEXT_OVERRIDE || "").trim();
  if (override) return override;

  if (!_loaded) {
    const seed = readSeed("political-context.json");
    if (seed) { try { _ctx = JSON.parse(seed); _loaded = true; } catch {} }
  }

  const j = _ctx;
  if (j && isContextFresh() && (j.context_ro || "").trim()) {
    return `CONTEXT POLITIC LIVE (regenerat ${j.last_update}):\n${String(j.context_ro).slice(0, 4000)}\n\n${structuredDigest(j)}`;
  }
  return HARDCODED_FALLBACK;
}

function structuredDigest(j) {
  const out = [];
  if (j.parties) {
    out.push("PARTIDE: " + Object.entries(j.parties).map(([k, v]) => `${k} (${v.leader || "?"}): ${v.orientation || ""}`).join(" | "));
  }
  const ps = j.polling_data && j.polling_data.inscop_may_2026 && j.polling_data.inscop_may_2026.parliamentary_vote;
  if (ps) out.push("SONDAJ (INSCOP mai 2026): " + Object.entries(ps).map(([k, v]) => `${k} ${v}%`).join(", "));
  if (Array.isArray(j.key_topics) && j.key_topics.length) out.push("TEME-CHEIE: " + j.key_topics.slice(0, 20).join(", "));
  return out.join("\n");
}
