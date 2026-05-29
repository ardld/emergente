import { getText } from "../src/store.js";

/**
 * GET /api/index — returns the last built report HTML from the durable store
 * (Vercel KV) or local FS. This is the URL Zapier (or a browser) fetches. The
 * build itself runs in /api/cron (Vercel Cron) or via the CLI `npm run build`.
 */
export default async function handler(req, res) {
  const html = await getText("report-html");
  if (html) {
    res.setHeader("content-type", "text/html; charset=utf-8");
    res.setHeader("cache-control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).send(html);
  }
  res
    .status(503)
    .send("<p>Raportul nu a fost \u00eenc\u0103 generat. Ruleaz\u0103 /api/cron sau `npm run build`.</p>");
}
