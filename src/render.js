import he from "he";
import { CONFIG } from "./config.js";
import { SUBJECT_COLORS } from "./subjects.js";

const fmtDomain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const fmtSources = (n) => (n === 1 ? "1 sursă" : `${n} surse`);
const sentColor = (s) => ({ pozitiv: "#22c55e", mai_degraba_pozitiv: "#3b82f6", neutru: "#9ca3af", mai_degraba_negativ: "#f97316", negativ: "#ef4444" }[s] || "#9ca3af");
const sentLabel = (s) => ({ pozitiv: "pozitiv", mai_degraba_pozitiv: "oarecum pozitiv", neutru: "neutru", mai_degraba_negativ: "oarecum negativ", negativ: "negativ" }[s] || "neutru");

function subjectCard(s, isPresidency, accent) {
  const primary = s.primaryLink || (s.items[0] ? s.items[0].link : "#");
  const isViral = s.isViral;
  let links = "";
  for (const it of s.items.slice(1, 4)) {
    links += `<tr><td style="padding:${isViral ? "4" : "3"}px 0;border-bottom:1px solid #f0f0f0;"><a href="${he.encode(it.link)}" target="_blank" style="color:#3d5a80;text-decoration:none;font-size:${isViral ? "13" : "12"}px;">${he.encode(it.title)}</a><br><span style="color:#6b7c93;font-size:10px;">${fmtDomain(it.link)}</span></td></tr>`;
  }
  const thumb = s.thumbnail ? `<tr><td style="padding:0;"><a href="${he.encode(primary)}" target="_blank"><img src="${he.encode(s.thumbnail)}" width="100%" style="display:block;width:100%;max-width:568px;height:auto;" alt=""></a></td></tr>` : "";
  const sentiment = isPresidency && s.presidencySentiment
    ? `<p style="margin:10px 0 0 0;font-size:10px;color:#6b7c93;">sentiment: <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sentColor(s.presidencySentiment)};vertical-align:middle;"></span> ${sentLabel(s.presidencySentiment)}</p>` : "";
  const border = isViral ? `2px solid ${accent}` : "1px solid #d1d9e6";
  const pad = isViral ? "20px" : "14px";
  const titleSize = isViral ? "18px" : "14px";
  const badge = isViral ? `<span style="display:inline-block;padding:4px 10px;background:${accent};color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;">Subiect de interes</span> ` : "";
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:${isViral ? "20" : "12"}px;border:${border};background:#fff;">
    ${thumb}
    <tr><td style="padding:${pad};">
      <p style="margin:0 0 8px 0;">${badge}<span style="display:inline-block;padding:3px 8px;border:1px solid ${accent};color:${accent};font-size:10px;font-weight:600;">${fmtSources(s.sourceDiversity)}</span></p>
      <h3 style="margin:0 0 8px 0;font-size:${titleSize};font-weight:${isViral ? "700" : "600"};line-height:1.35;"><a href="${he.encode(primary)}" target="_blank" style="color:#002855;text-decoration:none;">${he.encode(s.titlu_ro)}</a></h3>
      ${s.context_ro ? `<p style="margin:0 0 6px 0;font-size:11px;color:#6b7c93;font-style:italic;">${he.encode(s.context_ro)}</p>` : ""}
      <p style="margin:0 0 10px 0;font-size:${isViral ? "14" : "12"}px;color:#3d5a80;line-height:1.5;">${he.encode(s.sumar_ro)}</p>
      ${links ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #d1d9e6;padding-top:8px;">${links}</table>` : ""}
      ${sentiment}
    </td></tr>
  </table>`;
}

function sectionBlock(entity) {
  if (!entity.subjects.length) return "";
  const accent = SUBJECT_COLORS[entity.name] || "#002855";
  const isPresidency = entity.name === "Președinție";
  const cards = entity.subjects.map((s) => subjectCard(s, isPresidency, accent)).join("");
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:30px;">
    <tr><td style="padding-bottom:10px;border-bottom:3px solid ${accent};"><h2 style="margin:0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${accent};">${he.encode(entity.name)}</h2></td></tr>
    <tr><td style="padding-top:16px;">${cards}</td></tr>
  </table>`;
}

export function renderHTML(report) {
  const when = new Date(report.generatedAt).toLocaleString("ro-RO", { timeZone: CONFIG.timezone, dateStyle: "long", timeStyle: "short" });
  const political = report.entities.filter((e) => e.kind === "political");
  const tech = report.entities.filter((e) => e.kind === "tech");

  const polHTML = political.map(sectionBlock).join("");
  const techHTML = tech.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;border-top:3px solid #0891b2;padding-top:8px;">
        <tr><td style="padding:14px 0 18px;"><h2 style="margin:0;font-size:15px;font-weight:800;letter-spacing:.3px;color:#0891b2;">TEHNOLOGII EMERGENTE</h2></td></tr>
       </table>${tech.map(sectionBlock).join("")}`
    : "";

  return `<!doctype html>
<html lang="ro"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Raport politic & tech – ${he.encode(when)}</title></head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f8f9fc;color:#002855;line-height:1.5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f9fc;"><tr>
<td align="center" style="padding:24px 16px 40px;">
  <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">
    <tr><td style="text-align:right;font-size:11px;color:#6b7c93;padding-bottom:16px;border-bottom:1px solid #d1d9e6;">Raport generat: ${he.encode(when)}</td></tr>
    <tr><td style="padding-top:24px;">${polHTML}</td></tr>
    <tr><td>${techHTML}</td></tr>
    <tr><td style="padding-top:30px;border-top:1px solid #d1d9e6;text-align:center;font-size:11px;color:#6b7c93;">© ${new Date().getFullYear()} serban — ContextPolitic × Argus, creier unificat</td></tr>
  </table>
</td></tr></table></body></html>`;
}
