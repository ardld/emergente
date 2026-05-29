import { run } from "../build-report.js";
import { CONFIG } from "../src/config.js";

/**
 * GET /api/cron — rebuild the report, self-update the context if due, deliver.
 *
 * Protected by CRON_SECRET. Vercel Cron sends `Authorization: Bearer <secret>`.
 * `?key=<secret>` also works for manual triggers.
 *
 * DST-proof daily 08:00 send: Vercel crons are UTC-only, so vercel.json fires
 * this at BOTH 05:00 and 06:00 UTC (the two UTC times that map to 08:00
 * Europe/Bucharest across summer/winter). We only actually build+send when the
 * current Bucharest hour === CONFIG.sendHourLocal (8). So it sends exactly once
 * per day at 08:00 local, all year, with no manual DST edits.
 *
 * Manual override: add `&force=1` to bypass the hour gate (for testing).
 */
export const config = { maxDuration: 300 };

function bucharestHour() {
  const h = new Intl.DateTimeFormat("en-US", {
    timeZone: CONFIG.timezone,
    hour: "numeric",
    hour12: false,
  }).format(new Date());
  return parseInt(h, 10);
}

export default async function handler(req, res) {
  const auth = req.headers["authorization"] || "";
  const key = (req.query && req.query.key) || "";
  if (CONFIG.cronSecret && auth !== `Bearer ${CONFIG.cronSecret}` && key !== CONFIG.cronSecret) {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }

  const force = req.query && (req.query.force === "1" || req.query.force === "true");
  const hour = bucharestHour();
  if (!force && hour !== CONFIG.sendHourLocal) {
    // Wrong half of the DST pair (or a stray invocation) — do nothing.
    return res.status(200).json({ ok: true, skipped: `not send hour (Bucharest ${hour}:00, send at ${CONFIG.sendHourLocal}:00)` });
  }

  try {
    const { stats, delivery, report, contextRegen } = await run({ deliver: true });
    res.status(200).json({
      ok: true,
      sentAtLocalHour: hour,
      recipients: CONFIG.delivery.recipients.length,
      entities: report.entities.length,
      sources: report.sources.length,
      costUsd: stats.costUsd,
      delivery,
      contextRegen: contextRegen?.skipped ? "skipped(fresh)" : (contextRegen?.ok ? "regenerated" : "failed"),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
