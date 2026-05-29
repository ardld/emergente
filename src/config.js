import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.join(__dirname, "..");

/**
 * Central config for the ContextPolitic × Argus hybrid.
 *
 * Lineage:
 *  - delivery skeleton + Node pipeline  ........ bla-main (BLA Media Monitor v2)
 *  - the single AI gateway ("creier") .......... argus  (Argus_Brain::generate)
 *  - self-healing live political context ....... contextpolitic_v6 + argus state-updater
 *  - tech subjects + tech feeds ................ OSINT "tehnologii emergente" catalog
 *
 * Everything that touches Anthropic goes through src/brain.js. Nothing else
 * is allowed to call the API directly — that is the whole point of the brain.
 */
export const CONFIG = {
  anthropicKey: process.env.ANTHROPIC_API_KEY || "",

  // Model aliases mirror argus capabilities (Sonnet for user-facing text,
  // Haiku for cheap classification/relevance). Aliases resolve to latest.
  models: {
    classify: process.env.MODEL_CLASSIFY || "claude-haiku-4-5",
    summary: process.env.MODEL_SUMMARY || "claude-sonnet-4-6",
    context: process.env.MODEL_CONTEXT || "claude-sonnet-4-6", // self-update regen
  },

  timezone: "Europe/Bucharest",
  lookbackHours: Number(process.env.LOOKBACK_HOURS || 24),

  // Self-update ("bring itself up to date"): regenerate the narrative political
  // context from the rolling article pool at most once every N hours.
  context: {
    regenEveryHours: Number(process.env.CONTEXT_REGEN_HOURS || 20),
    lookbackHours: Number(process.env.CONTEXT_LOOKBACK_HOURS || 168), // 7 days
    maxArticles: Number(process.env.CONTEXT_MAX_ARTICLES || 200),
    minChars: 500, // reject suspiciously short regenerations (argus guard)
    useWebSearch: (process.env.CONTEXT_WEB_SEARCH || "true") !== "false",
  },

  // Delivery to 2–3 recipients/day. Two supported transports (see deliver.js):
  //   (A) Zapier Catch Hook  — POST the built HTML, let the Zap fan out to recipients
  //   (B) SMTP via nodemailer
  delivery: {
    recipients: (process.env.REPORT_RECIPIENTS || "mihnead@protonmail.com, oltyboy@gmail.com")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    zapierHookUrl: process.env.ZAPIER_HOOK_URL || "",
    smtpUrl: process.env.SMTP_URL || "", // e.g. smtps://user:pass@smtp.host:465
    fromAddress: process.env.REPORT_FROM || "Monitorizare <no-reply@contextpolitic.ro>",
    subjectPrefix: process.env.REPORT_SUBJECT_PREFIX || "Raport politic & tech",
  },

  // Daily send time, LOCAL (Europe/Bucharest). Vercel crons are UTC-only, so
  // api/cron.js fires at both candidate UTC hours and only actually sends when
  // the Bucharest hour equals this — DST-proof, exactly one send/day at 08:00.
  sendHourLocal: Number(process.env.SEND_HOUR_LOCAL || 8),

  // Cron endpoint shared secret (api/cron.js checks this).
  cronSecret: process.env.CRON_SECRET || "",

  paths: {
    outDir: path.join(ROOT, "public"),
    dataDir: path.join(ROOT, "data"),
    cacheDir: path.join(ROOT, ".cache"),
    contextFile: path.join(ROOT, "data", "political-context.json"),
    snapshotFile: path.join(ROOT, "data", "political-snapshot.txt"),
    historyDir: path.join(ROOT, "data", "state-history"),
  },
};
