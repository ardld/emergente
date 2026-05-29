import fs from "fs";
import path from "path";
import { CONFIG } from "./src/config.js";
import { resetStats, getStats, Brain } from "./src/brain.js";
import { fetchAll, filterRelevance, classify, buildSubjects } from "./src/pipeline.js";
import { renderHTML } from "./src/render.js";
import { refreshContext } from "./src/refresh-context.js";
import { deliver, buildSubject } from "./src/deliver.js";
import { loadContext, contextAgeHours } from "./src/context-store.js";
import { setText, backend } from "./src/store.js";
import { domainOf } from "./src/text.js";

/**
 * One full run of the hybrid:
 *   1. fetch political + tech feeds
 *   2. relevance gate (RO for political, on-topic for tech)
 *   3. self-update the brain's political context if it's due (uses this run's pool)
 *   4. classify into the 8 political + 3 tech subjects (via brain)
 *   5. summarise clusters (via brain)
 *   6. render Mailchimp-safe HTML → public/index.html (+ data.json)
 *   7. deliver to 2–3 recipients
 *
 * @param {object} opts { deliver?: boolean, forceContext?: boolean }
 */
export async function run(opts = {}) {
  const { deliver: doDeliver = true, forceContext = false } = opts;
  resetStats();
  Brain.clearDataCache();
  console.log("\n🚀 serban — ContextPolitic × Argus hybrid — run start");
  console.log(`   store backend: ${backend}${backend === "fs" ? " (local files; set KV_REST_API_* for Vercel persistence)" : " (durable)"}\n`);

  await fs.promises.mkdir(CONFIG.paths.outDir, { recursive: true });

  // Load the brain's living context into memory (from KV/FS, seeding if empty).
  await loadContext();

  // 1–2. ingest + relevance
  let articles = await fetchAll();
  articles = await filterRelevance(articles);

  // 3. self-update the brain ("bring itself up to date") — gated by age, uses this pool
  const ageBefore = contextAgeHours();
  const ctx = await refreshContext(articles, { force: forceContext });
  if (ctx.skipped) console.log(`🧠 context fresh (${ctx.ageHours}h old) — regen skipped`);
  else if (!ctx.ok) console.warn(`🧠 context regen failed: ${ctx.error} (continuing on last-known context)`);

  // 4–5. classify + summarise (all via the brain)
  const { classified, unclassified } = await classify(articles);
  const { output: entities, usedSources } = await buildSubjects(classified);

  // "Other news" tail (unclassified, recent)
  const otherNews = unclassified
    .sort((a, b) => ((b.thumbnail ? 1 : 0) - (a.thumbnail ? 1 : 0)) || (new Date(b.date) - new Date(a.date)))
    .slice(0, 10)
    .map((a) => ({ title: a.title, link: a.link, source: domainOf(a.link), thumbnail: a.thumbnail || null, kind: a.kind }));

  const report = {
    generatedAt: new Date().toISOString(),
    timezone: CONFIG.timezone,
    entities,
    otherNews,
    sources: [...usedSources].sort(),
    contextAgeHoursBefore: Number.isFinite(ageBefore) ? Number(ageBefore.toFixed(1)) : null,
    contextRegen: ctx.ok && !ctx.skipped ? { chars: ctx.chars, persons: ctx.persons } : null,
  };

  const html = renderHTML(report);
  // Persist for /api/index (durable on KV; best-effort on FS/serverless).
  await setText("report-html", html);
  try {
    await fs.promises.writeFile(path.join(CONFIG.paths.outDir, "data.json"), JSON.stringify(report, null, 2));
    await fs.promises.writeFile(path.join(CONFIG.paths.outDir, "report.html"), html, "utf-8");
  } catch (e) {
    console.warn("  ⚠️  local report write skipped (read-only FS):", e.message);
  }

  // 7. deliver
  let delivery = { sent: 0, transport: "skipped" };
  if (doDeliver) delivery = await deliver({ html, subject: buildSubject() });

  const stats = getStats();
  console.log("\n────────────────────────────────────────");
  console.log(`✅ entities: ${entities.length} (pol ${entities.filter(e=>e.kind==="political").length} / tech ${entities.filter(e=>e.kind==="tech").length})`);
  console.log(`✅ sources: ${report.sources.length} · otherNews: ${otherNews.length}`);
  console.log(`💰 brain: ${stats.calls} calls, ~$${stats.costUsd} (cacheRead ${stats.cacheRead} tok)`);
  console.log(`✉️  delivery: ${delivery.sent} via ${delivery.transport}`);
  console.log("────────────────────────────────────────\n");

  return { report, html, stats, delivery, contextRegen: ctx };
}

// CLI entry: `node build-report.js [--no-deliver] [--force-context]`
const isMain = process.argv[1] && process.argv[1].endsWith("build-report.js");
if (isMain) {
  if (!CONFIG.anthropicKey) { console.error("❌ ANTHROPIC_API_KEY required"); process.exit(1); }
  const argv = process.argv.slice(2);
  run({ deliver: !argv.includes("--no-deliver"), forceContext: argv.includes("--force-context") })
    .catch((e) => { console.error("FATAL:", e); process.exit(1); });
}
