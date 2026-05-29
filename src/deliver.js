import { CONFIG } from "./config.js";

/**
 * DELIVERY to 2–3 recipients/day. Two transports, picked by which env is set.
 *
 * (A) Zapier Catch Hook  [recommended; "two step zap"]
 *     ZAPIER_HOOK_URL points at a Zap whose step 1 is "Catch Hook" and step 2
 *     is Gmail/Email "Send Email". We POST { subject, html, recipients }. The Zap
 *     fans out to the recipients. The other half of the two-step Zap (a Schedule
 *     trigger that rebuilds the report 2–3×/day) is described in the README; OR
 *     let Vercel Cron call /api/cron and skip Zapier scheduling entirely.
 *
 * (B) SMTP via nodemailer  [optional]
 *     Set SMTP_URL (e.g. smtps://user:pass@smtp.host:465). nodemailer is an
 *     optional dependency; if missing we no-op with a clear message.
 *
 * If neither is configured, delivery is skipped (the report is still written to
 * public/index.html for the classic "Zapier fetches /api/index" flow).
 */
export async function deliver({ html, subject }) {
  const { recipients, zapierHookUrl, smtpUrl, fromAddress } = CONFIG.delivery;

  if (!recipients.length) {
    console.log("✉️  No REPORT_RECIPIENTS set — skipping push delivery (report still served at /api/index).");
    return { sent: 0, transport: "none" };
  }

  // (A) Zapier hook — let the Zap do the actual sending/fan-out.
  if (zapierHookUrl) {
    try {
      const res = await fetch(zapierHookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ subject, html, recipients, generatedAt: new Date().toISOString() }),
      });
      console.log(`✉️  Posted to Zapier hook (status ${res.status}) for ${recipients.length} recipient(s).`);
      return { sent: recipients.length, transport: "zapier", status: res.status };
    } catch (e) {
      console.error("✉️  Zapier hook failed:", e.message);
      return { sent: 0, transport: "zapier", error: e.message };
    }
  }

  // (B) SMTP via nodemailer (optional dependency).
  if (smtpUrl) {
    let nodemailer;
    try {
      nodemailer = (await import("nodemailer")).default;
    } catch {
      console.error("✉️  SMTP_URL set but 'nodemailer' is not installed. Run: npm i nodemailer");
      return { sent: 0, transport: "smtp", error: "nodemailer missing" };
    }
    const transporter = nodemailer.createTransport(smtpUrl);
    let sent = 0;
    for (const to of recipients) {
      try {
        await transporter.sendMail({ from: fromAddress, to, subject, html });
        sent++;
      } catch (e) {
        console.error(`✉️  SMTP send to ${to} failed:`, e.message);
      }
    }
    console.log(`✉️  SMTP delivered to ${sent}/${recipients.length} recipient(s).`);
    return { sent, transport: "smtp" };
  }

  console.log("✉️  Recipients set but no transport (ZAPIER_HOOK_URL or SMTP_URL). Skipping.");
  return { sent: 0, transport: "none" };
}

export function buildSubject() {
  const when = new Date().toLocaleString("ro-RO", { timeZone: CONFIG.timezone, dateStyle: "medium", timeStyle: "short" });
  return `${CONFIG.delivery.subjectPrefix} — ${when}`;
}
