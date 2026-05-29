import he from "he";
import { CONFIG } from "./config.js";
import { SUBJECT_COLORS } from "./subjects.js";

const fmtDomain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const fmtSources = (n) => (n === 1 ? "1 surs\u0103" : `${n} surse`);
const sentColor = (s) => ({ pozitiv: "#22c55e", mai_degraba_pozitiv: "#3b82f6", neutru: "#9ca3af", mai_degraba_negativ: "#f97316", negativ: "#ef4444" }[s] || "#9ca3af");
const sentLabel = (s) => ({ pozitiv: "pozitiv", mai_degraba_pozitiv: "oarecum pozitiv", neutru: "neutru", mai_degraba_negativ: "oarecum negativ", negativ: "negativ" }[s] || "neutru");

/** Romanian-aware slug for anchor IDs */
function toSlug(name) {
  return name.toLowerCase()
    .replace(/[\u0103\u00e2]/g, "a")   // ă â
    .replace(/\u00ee/g, "i")            // î
    .replace(/[\u0219\u015f]/g, "s")    // ș ş
    .replace(/[\u021b\u0163]/g, "t")    // ț ţ
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// ── Subject card ─────────────────────────────────────────────────────────────
function subjectCard(s, isPresidency, accent) {
  const primary = s.primaryLink || (s.items[0] ? s.items[0].link : "#");
  const isViral = s.isViral;
  let links = "";
  for (const it of s.items.slice(1, 4)) {
    links += `<tr><td style="padding:${isViral ? "4" : "3"}px 0;border-bottom:1px solid #f0f0f0;">
      <a href="${he.encode(it.link)}" target="_blank" style="color:#3d5a80;text-decoration:none;font-size:${isViral ? "13" : "12"}px;">${he.encode(it.title)}</a>
      <br><span style="color:#6b7c93;font-size:10px;">${fmtDomain(it.link)}</span>
    </td></tr>`;
  }
  const thumb = s.thumbnail
    ? `<tr><td style="padding:0;"><a href="${he.encode(primary)}" target="_blank"><img src="${he.encode(s.thumbnail)}" width="100%" style="display:block;width:100%;max-width:568px;height:auto;" alt=""></a></td></tr>`
    : "";
  const sentiment = isPresidency && s.presidencySentiment
    ? `<p style="margin:10px 0 0 0;font-size:10px;color:#6b7c93;">sentiment: <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${sentColor(s.presidencySentiment)};vertical-align:middle;margin-right:3px;"></span>${sentLabel(s.presidencySentiment)}</p>`
    : "";
  const border = isViral ? `2px solid ${accent}` : "1px solid #d1d9e6";
  const pad = isViral ? "20px" : "14px";
  const titleSize = isViral ? "18px" : "14px";
  const badge = isViral
    ? `<span style="display:inline-block;padding:4px 10px;background:${accent};color:#fff;font-size:11px;font-weight:600;text-transform:uppercase;margin-bottom:8px;">Subiect de interes</span><br>`
    : "";
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:${isViral ? "20" : "12"}px;border:${border};background:#fff;">
    ${thumb}
    <tr><td style="padding:${pad};">
      <p style="margin:0 0 8px 0;">
        ${badge}
        <span style="display:inline-block;padding:3px 8px;border:1px solid ${accent};color:${accent};font-size:10px;font-weight:600;">${fmtSources(s.sourceDiversity)}</span>
      </p>
      <h3 style="margin:0 0 8px 0;font-size:${titleSize};font-weight:${isViral ? "700" : "600"};line-height:1.35;">
        <a href="${he.encode(primary)}" target="_blank" style="color:#002855;text-decoration:none;">${he.encode(s.titlu_ro)}</a>
      </h3>
      ${s.context_ro ? `<p style="margin:0 0 6px 0;font-size:11px;color:#6b7c93;font-style:italic;">${he.encode(s.context_ro)}</p>` : ""}
      <p style="margin:0 0 10px 0;font-size:${isViral ? "14" : "12"}px;color:#3d5a80;line-height:1.5;">${he.encode(s.sumar_ro)}</p>
      ${links ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #d1d9e6;padding-top:8px;">${links}</table>` : ""}
      ${sentiment}
    </td></tr>
  </table>`;
}

// ── Section block (with anchor target) ───────────────────────────────────────
function sectionBlock(entity) {
  if (!entity.subjects.length) return "";
  const slug = toSlug(entity.name);
  const accent = SUBJECT_COLORS[entity.name] || "#002855";
  const isPresidency = entity.name === "Pre\u015fedин\u021bie";
  const cards = entity.subjects.map((s) => subjectCard(s, isPresidency, accent)).join("");
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:30px;">
    <tr>
      <td id="${slug}" style="padding-bottom:10px;border-bottom:3px solid ${accent};">
        <a name="${slug}" style="display:block;font-size:0;line-height:0;">&nbsp;</a>
        <h2 style="margin:0;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:${accent};">${he.encode(entity.name)}</h2>
      </td>
    </tr>
    <tr><td style="padding-top:16px;">${cards}</td></tr>
  </table>`;
}

// ── Cuprins ───────────────────────────────────────────────────────────────────
function renderCuprins(entities) {
  if (!entities.length) return "";
  const polItems = entities.filter(e => e.kind === "political").map(e => {
    const slug = toSlug(e.name);
    const accent = SUBJECT_COLORS[e.name] || "#002855";
    return `<a href="#${slug}" style="display:inline-block;margin:3px 6px 3px 0;padding:5px 10px;border-left:3px solid ${accent};background:#f8f9fc;color:#002855;text-decoration:none;font-size:12px;font-weight:600;line-height:1.3;">${he.encode(e.name)}</a>`;
  }).join("");
  const techItems = entities.filter(e => e.kind === "tech").map(e => {
    const slug = toSlug(e.name);
    const accent = SUBJECT_COLORS[e.name] || "#0891b2";
    return `<a href="#${slug}" style="display:inline-block;margin:3px 6px 3px 0;padding:5px 10px;border-left:3px solid ${accent};background:#f0f9ff;color:#0c4a6e;text-decoration:none;font-size:12px;font-weight:600;line-height:1.3;">${he.encode(e.name)}</a>`;
  }).join("");
  return `
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
    <tr><td style="padding:14px 0 14px;border-top:3px solid #002855;border-bottom:1px solid #e5e7eb;">
      <p style="margin:0 0 10px 0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#9ca3af;">CUPRINS</p>
      <div style="line-height:2.2;">${polItems}</div>
      ${techItems ? `<div style="margin-top:6px;line-height:2.2;">${techItems}</div>` : ""}
    </td></tr>
  </table>`;
}

// ── Main render ───────────────────────────────────────────────────────────────
export function renderHTML(report) {
  const year = new Date().getFullYear();
  const when = new Date(report.generatedAt).toLocaleString("ro-RO", {
    timeZone: CONFIG.timezone, dateStyle: "long", timeStyle: "short"
  });

  const political = report.entities.filter(e => e.kind === "political");
  const tech      = report.entities.filter(e => e.kind === "tech");
  const allEntities = [...political, ...tech];

  const cuprins = renderCuprins(allEntities);
  const polHTML  = political.map(sectionBlock).join("");
  const techHTML = tech.length
    ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">
        <tr><td id="tech" style="padding:14px 0 18px;border-top:3px solid #0891b2;">
          <a name="tech" style="display:block;font-size:0;line-height:0;">&nbsp;</a>
          <h2 style="margin:0;font-size:15px;font-weight:800;letter-spacing:.3px;color:#0891b2;">TEHNOLOGII EMERGENTE</h2>
        </td></tr>
      </table>${tech.map(sectionBlock).join("")}`
    : "";

  return `<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>Monitorizare pres\u0103 &amp; tech &mdash; ${he.encode(when)}</title>
  <style>
    body { margin:0; padding:0; font-family:Arial,Helvetica,sans-serif; background:#f8f9fc; }
    img  { max-width:100%; height:auto; display:block; }
    a    { color:#3d5a80; }
    @media only screen and (max-width:620px) {
      .outer-td  { padding:12px 8px 32px !important; }
      .main-wrap { width:100% !important; }
      h2         { font-size:11px !important; }
      h3.viral   { font-size:15px !important; }
      h3.normal  { font-size:13px !important; }
      .card-pad  { padding:12px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f8f9fc;color:#002855;line-height:1.5;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8f9fc;">
  <tr>
    <td class="outer-td" align="center" style="padding:20px 16px 40px;">
      <table class="main-wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

        <!-- CUPRINS -->
        <tr><td>${cuprins}</td></tr>

        <!-- POLITIC -->
        <tr><td>${polHTML}</td></tr>

        <!-- TECH -->
        <tr><td>${techHTML}</td></tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding-top:24px;border-top:1px solid #d1d9e6;text-align:center;font-size:11px;color:#9ca3af;">
            &copy; ${year} Uzina din Nori
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
