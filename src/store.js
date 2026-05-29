import fs from "fs";
import path from "path";
import os from "os";
import { CONFIG } from "./config.js";

/**
 * STORE — durable key/value with three backends, picked automatically:
 *
 *   1. Vercel KV / Upstash Redis (REST)   — when KV_REST_API_URL + KV_REST_API_TOKEN
 *      are set. Dependency-free (plain fetch). This is what makes the self-update
 *      and the served report PERSIST across serverless invocations on Vercel.
 *   2. Local filesystem                    — when those env vars are absent (local
 *      dev, a VPS, any long-lived host). Maps keys to files under data/ and public/.
 *   3. /tmp fallback                       — if a filesystem write throws EROFS/EACCES
 *      (read-only serverless bundle and no KV configured), we degrade to /tmp so the
 *      run never crashes. /tmp is ephemeral, so this is best-effort only.
 *
 * Keys used by the app:
 *   "political-context" (json)  — the brain's living context
 *   "report-html"       (text)  — last rendered email HTML (served by /api/index)
 *   "ctx:<stamp>"       (json)  — self-update checkpoints
 */

const KV_URL = process.env.KV_REST_API_URL || "";
const KV_TOKEN = process.env.KV_REST_API_TOKEN || "";
export const backend = KV_URL && KV_TOKEN ? "kv" : "fs";

// ── Vercel KV / Upstash REST (command-array form) ────────────────────────────
async function kvCmd(args) {
  const res = await fetch(KV_URL, {
    method: "POST",
    headers: { authorization: `Bearer ${KV_TOKEN}`, "content-type": "application/json" },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`KV ${args[0]} → HTTP ${res.status}`);
  const data = await res.json();
  return data.result;
}

// ── Local FS key→path map ────────────────────────────────────────────────────
function fsPathFor(key) {
  if (key === "political-context") return CONFIG.paths.contextFile;
  if (key === "report-html") return path.join(CONFIG.paths.outDir, "report.html");
  if (key.startsWith("ctx:")) return path.join(CONFIG.paths.historyDir, key.slice(4) + ".json");
  return path.join(CONFIG.paths.dataDir, key.replace(/[^\w.-]/g, "_"));
}
function tmpPathFor(key) {
  return path.join(os.tmpdir(), "serban-" + key.replace(/[^\w.-]/g, "_"));
}
function fsWrite(key, str) {
  const p = fsPathFor(key);
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    const tmp = p + ".tmp";
    fs.writeFileSync(tmp, str, "utf-8");
    fs.renameSync(tmp, p); // atomic
    return { ok: true, where: p };
  } catch (e) {
    // read-only bundle (Vercel) without KV → degrade to /tmp, never crash
    try {
      fs.writeFileSync(tmpPathFor(key), str, "utf-8");
      return { ok: true, where: "tmp", degraded: true };
    } catch (e2) {
      return { ok: false, error: e2.message };
    }
  }
}
function fsRead(key) {
  for (const p of [fsPathFor(key), tmpPathFor(key)]) {
    try { return fs.readFileSync(p, "utf-8"); } catch {}
  }
  return null;
}

// ── public API ───────────────────────────────────────────────────────────────
export async function getText(key) {
  if (backend === "kv") {
    try { const v = await kvCmd(["GET", key]); return v == null ? null : String(v); }
    catch { return null; }
  }
  return fsRead(key);
}
export async function setText(key, value) {
  if (backend === "kv") {
    try { await kvCmd(["SET", key, value]); return { ok: true, where: "kv" }; }
    catch (e) { return { ok: false, error: e.message }; }
  }
  return fsWrite(key, value);
}
export async function getJson(key) {
  const t = await getText(key);
  if (t == null) return null;
  try { return JSON.parse(t); } catch { return null; }
}
export async function setJson(key, obj) {
  return setText(key, JSON.stringify(obj, null, 2));
}

/** Read the bundled seed file directly (always shipped, always readable). */
export function readSeed(relFromData) {
  try { return fs.readFileSync(path.join(CONFIG.paths.dataDir, relFromData), "utf-8"); }
  catch { return null; }
}
