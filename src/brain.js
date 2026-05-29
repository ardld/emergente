import fs from "fs";
import Anthropic from "@anthropic-ai/sdk";
import { CONFIG } from "./config.js";
import { getPoliticalContext } from "./context-store.js";

/**
 * THE BRAIN ("creier") — ported from Argus_Brain::generate().
 *
 * This is the ONLY module in the whole system that talks to Anthropic.
 * Pipeline, classifier, summariser and the self-update all call brain.generate().
 * Nothing else constructs an Anthropic client. That single chokepoint is what
 * "filter everything through argus" means in practice: one place to enforce the
 * knowledge layers, prompt caching, cost accounting and JSON parsing.
 *
 * Layered system prompt (argus's 5 levels), assembled per capability:
 *   foundation         → data/foundation.txt   (psychohistorical constants)
 *   opus               → data/opus.txt          (electorate-reaction framework)
 *   voter_spectrum     → data/voter-spectrum.json + spectrum.json
 *   political_context  → live context_ro (self-updating) + snapshot
 *   tech_context       → appendix telling the model how to handle tech subjects
 *
 * Big static layers carry Anthropic ephemeral cache_control so repeated calls
 * in one run (classify, summarise, sentiment …) reuse the cached prefix.
 */

const anthropic = new Anthropic({ apiKey: CONFIG.anthropicKey });

// Per-million-token prices [input, output] — for the run cost estimate only.
const PRICES = {
  "claude-haiku-4-5": [1.0, 5.0],
  "claude-sonnet-4-6": [3.0, 15.0],
  "claude-opus-4-7": [15.0, 75.0],
};

let STATS = { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, byModel: {}, costUsd: 0 };
export function resetStats() {
  STATS = { calls: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, byModel: {}, costUsd: 0 };
}
export function getStats() {
  return { ...STATS, costUsd: Number(STATS.costUsd.toFixed(4)) };
}

// ── knowledge layers (lazy-loaded + cached in memory) ──────────────────────
const _cache = {};
function readData(file) {
  if (_cache[file] !== undefined) return _cache[file];
  try {
    _cache[file] = fs.readFileSync(file, "utf-8");
  } catch {
    _cache[file] = "";
  }
  return _cache[file];
}
function clearDataCache() {
  for (const k of Object.keys(_cache)) delete _cache[k];
}

function layerText(layer) {
  const p = CONFIG.paths.dataDir + "/";
  switch (layer) {
    case "foundation":
      return readData(p + "foundation.txt");
    case "opus":
      return readData(p + "opus.txt");
    case "voter_spectrum": {
      const vs = readData(p + "voter-spectrum.json");
      const sp = readData(p + "spectrum.json");
      return "VOTER SPECTRUM (segmentare electorat):\n" + vs + "\n\nSPECTRUM LABELS:\n" + sp;
    }
    case "political_context":
      return getPoliticalContext(); // live, self-updating (see context-store.js)
    case "tech_context":
      return [
        "STRAT TEHNOLOGIE (tehnologii emergente):",
        "Pentru subiectele tech (AI/ML, Semiconductori & Hardware, Securitate cibernetică),",
        "scrii pentru o audiență românească tehnică, dar în limba sursei nu o forța — titlul și",
        "sumarul în română, termenii tehnici păstrați (LLM, GPU, CVE, fab). Explică DE CE",
        "contează pentru România/UE când e relevant (reglementare AI Act, lanț de aprovizionare,",
        "atacuri asupra infrastructurii critice). Fără hype; factual, ca un buletin de specialitate.",
      ].join("\n");
    default:
      return "";
  }
}

/**
 * Build cached system blocks for a set of layers + a capability instruction.
 * Returns Anthropic `system` blocks array.
 */
function assembleSystem(layers, instruction) {
  const blocks = [];
  for (const layer of layers) {
    const text = layerText(layer);
    if (!text || !text.trim()) continue;
    blocks.push({
      type: "text",
      text: `### LAYER: ${layer}\n${text}`,
      cache_control: { type: "ephemeral" }, // cache the heavy knowledge prefix
    });
  }
  if (instruction && instruction.trim()) {
    blocks.push({ type: "text", text: instruction }); // capability instruction (uncached)
  }
  return blocks;
}

function track(model, usage) {
  STATS.calls++;
  const inTok = usage?.input_tokens || 0;
  const outTok = usage?.output_tokens || 0;
  const cr = usage?.cache_read_input_tokens || 0;
  const cw = usage?.cache_creation_input_tokens || 0;
  STATS.input += inTok;
  STATS.output += outTok;
  STATS.cacheRead += cr;
  STATS.cacheWrite += cw;
  if (!STATS.byModel[model]) STATS.byModel[model] = { calls: 0, input: 0, output: 0 };
  STATS.byModel[model].calls++;
  STATS.byModel[model].input += inTok;
  STATS.byModel[model].output += outTok;
  const tier = model.includes("opus") ? "claude-opus-4-7" : model.includes("haiku") ? "claude-haiku-4-5" : "claude-sonnet-4-6";
  const [pi, po] = PRICES[tier] || [3.0, 15.0];
  // cached reads are billed at ~10% of input; approximate.
  STATS.costUsd += ((inTok + cr * 0.1) * pi + outTok * po) / 1_000_000;
}

/**
 * Best-effort JSON extraction (mirrors Argus_Brain::maybe_parse_json):
 * strip ```fences, try direct, else brace-match the first object/array.
 */
function maybeParseJson(text) {
  if (!text) return null;
  let t = String(text).trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try {
    return JSON.parse(t);
  } catch {}
  const start = t.search(/[[{]/);
  if (start < 0) return null;
  const open = t[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < t.length; i++) {
    const c = t[i];
    if (esc) { esc = false; continue; }
    if (inStr) { if (c === "\\") esc = true; else if (c === '"') inStr = false; continue; }
    if (c === '"') { inStr = true; continue; }
    if (c === open) depth++;
    else if (c === close && --depth === 0) {
      try { return JSON.parse(t.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

/**
 * Single entry point. Always returns an envelope, never throws.
 *
 * @param {object} p
 * @param {string} p.capability   label for logging
 * @param {string[]} [p.layers]   knowledge layers to inject
 * @param {string} [p.system]     extra capability instruction (after layers)
 * @param {string} p.user         the user message
 * @param {string} [p.model]      defaults to Sonnet
 * @param {number} [p.maxTokens]
 * @param {boolean} [p.json]      if true, parse output to `.parsed`
 * @param {boolean} [p.webSearch] enable Anthropic web_search tool
 * @param {number} [p.retries]
 */
export async function generate(p) {
  const {
    capability = "generate",
    layers = [],
    system = "",
    user,
    model = CONFIG.models.summary,
    maxTokens = 1500,
    json = false,
    webSearch = false,
    retries = 2,
  } = p;

  const systemBlocks = assembleSystem(layers, system);
  const body = {
    model,
    max_tokens: maxTokens,
    system: systemBlocks.length ? systemBlocks : undefined,
    messages: [{ role: "user", content: user }],
  };
  if (webSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }];
  }

  const t0 = Date.now();
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await anthropic.messages.create(body);
      track(model, res.usage);
      // Concatenate all text blocks (web_search interleaves tool blocks).
      const output = (res.content || [])
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return {
        success: true,
        capability,
        output,
        parsed: json ? maybeParseJson(output) : null,
        meta: {
          model,
          layers,
          elapsedMs: Date.now() - t0,
          inputTokens: res.usage?.input_tokens || 0,
          outputTokens: res.usage?.output_tokens || 0,
          cacheRead: res.usage?.cache_read_input_tokens || 0,
        },
      };
    } catch (err) {
      if (attempt === retries) {
        return { success: false, capability, output: "", parsed: null, error: err.message, meta: { model, layers, elapsedMs: Date.now() - t0 } };
      }
      await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    }
  }
}

export const Brain = { generate, getStats, resetStats, clearDataCache };
