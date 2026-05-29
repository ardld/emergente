import he from "he";
import { CONFIG } from "./config.js";
import { SUBJECT_COLORS } from "./subjects.js";

const fmtDomain  = (u) => { try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return ""; } };
const sentColor  = (s) => ({ pozitiv:"#16a34a", mai_degraba_pozitiv:"#2563eb", neutru:"#94a3b8", mai_degraba_negativ:"#ea580c", negativ:"#dc2626" }[s] || "#94a3b8");
const sentLabel  = (s) => ({ pozitiv:"pozitiv", mai_degraba_pozitiv:"oarecum pozitiv", neutru:"neutru", mai_degraba_negativ:"oarecum negativ", negativ:"negativ" }[s] || "neutru");
const fmtSources = (n) => n === 1 ? "1 surs\u0103" : `${n} surse`;

function toSlug(name) {
  return name.toLowerCase()
    .replace(/[\u0103\u00e2]/g,"a").replace(/\u00ee/g,"i")
    .replace(/[\u0219\u015f]/g,"s").replace(/[\u021b\u0163]/g,"t")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}

// ── Featured (viral) card ─────────────────────────────────────────────────────
function featuredCard(s, accent, isPresidency) {
  const href   = he.encode(s.primaryLink || s.items[0]?.link || "#");
  const srcBadge = `<span style="font-size:10px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:.8px;">${fmtSources(s.sourceDiversity)}</span>`;
  const thumb  = s.thumbnail
    ? `<a href="${href}" target="_blank"><img src="${he.encode(s.thumbnail)}" width="100%" alt="" style="display:block;width:100%;height:auto;"></a>`
    : "";
  const links  = s.items.slice(1,4).map(it =>
    `<tr><td style="padding:5px 0;border-bottom:1px solid #f1f5f9;">
       <a href="${he.encode(it.link)}" target="_blank" style="font-size:12px;color:#475569;text-decoration:none;">${he.encode(it.title)}</a>
       <span style="display:block;font-size:10px;color:#94a3b8;">${fmtDomain(it.link)}</span>
     </td></tr>`
  ).join("");
  const sentiment = isPresidency && s.presidencySentiment
    ? `<p style="margin:10px 0 0;font-size:10px;color:#94a3b8;"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${sentColor(s.presidencySentiment)};vertical-align:middle;margin-right:4px;"></span>${sentLabel(s.presidencySentiment)}</p>`
    : "";
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;background:#fff;border:1px solid #e2e8f0;">
  <tr><td style="padding:0;">${thumb}</td></tr>
  <tr><td style="padding:20px 20px 16px;">
    <p style="margin:0 0 10px;">${srcBadge}</p>
    <h3 style="margin:0 0 8px;font-size:19px;font-weight:800;line-height:1.3;color:#0f172a;">
      <a href="${href}" target="_blank" style="color:#0f172a;text-decoration:none;">${he.encode(s.titlu_ro)}</a>
    </h3>
    ${s.context_ro ? `<p style="margin:0 0 8px;font-size:12px;color:#64748b;font-style:italic;line-height:1.5;">${he.encode(s.context_ro)}</p>` : ""}
    <p style="margin:0 0 12px;font-size:14px;color:#334155;line-height:1.6;">${he.encode(s.sumar_ro)}</p>
    ${links ? `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid #e2e8f0;margin-top:8px;">${links}</table>` : ""}
    ${sentiment}
  </td></tr>
</table>`;
}

// ── Normal card ───────────────────────────────────────────────────────────────
function normalCard(s, accent, isPresidency) {
  const href    = he.encode(s.primaryLink || s.items[0]?.link || "#");
  const thumb   = s.thumbnail
    ? `<td width="100" style="padding:0 0 0 14px;vertical-align:top;"><a href="${href}" target="_blank"><img src="${he.encode(s.thumbnail)}" width="100" height="70" alt="" style="display:block;width:100px;height:70px;object-fit:cover;"></a></td>`
    : "";
  const sentiment = isPresidency && s.presidencySentiment
    ? ` &nbsp;<span style="font-size:10px;color:#94a3b8;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${sentColor(s.presidencySentiment)};vertical-align:middle;margin-right:3px;"></span>${sentLabel(s.presidencySentiment)}</span>`
    : "";
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:0;">
  <tr>
    <td style="padding:14px 0 14px;border-bottom:1px solid #f1f5f9;vertical-align:top;">
      <p style="margin:0 0 5px;font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.8px;">${fmtSources(s.sourceDiversity)}${sentiment}</p>
      <h3 style="margin:0 0 5px;font-size:14px;font-weight:700;line-height:1.4;color:#0f172a;">
        <a href="${href}" target="_blank" style="color:#0f172a;text-decoration:none;">${he.encode(s.titlu_ro)}</a>
      </h3>
      <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5;">${he.encode(s.sumar_ro)}</p>
    </td>
    ${thumb}
  </tr>
</table>`;
}

// ── Section block ─────────────────────────────────────────────────────────────
function sectionBlock(entity) {
  if (!entity.subjects.length) return "";
  const slug         = toSlug(entity.name);
  const accent       = SUBJECT_COLORS[entity.name] || "#1e293b";
  const isPresidency = entity.name === "Pre\u0219edin\u021Bie";
  const [first, ...rest] = entity.subjects;
  const cards = [
    first ? featuredCard(first, accent, isPresidency) : "",
    ...rest.map(s => normalCard(s, accent, isPresidency)),
  ].join("");

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:36px;">
  <tr>
    <td id="${slug}" style="padding:10px 0 10px;border-top:3px solid ${accent};border-bottom:1px solid #e2e8f0;margin-bottom:16px;">
      <a name="${slug}" style="display:block;height:0;overflow:hidden;font-size:0;"> </a>
      <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:${accent};">${he.encode(entity.name)}</span>
    </td>
  </tr>
  <tr><td style="padding-top:16px;">${cards}</td></tr>
</table>`;
}

// ── Cuprins ───────────────────────────────────────────────────────────────────
function renderCuprins(entities) {
  if (!entities.length) return "";
  const links = entities.map((e, i) => {
    const slug   = toSlug(e.name);
    const accent = SUBJECT_COLORS[e.name] || "#1e293b";
    const sep    = i < entities.length - 1 ? `<span style="color:#cbd5e1;margin:0 6px;">|</span>` : "";
    return `<a href="#${slug}" style="color:${accent};text-decoration:none;font-size:12px;font-weight:700;white-space:nowrap;">${he.encode(e.name)}</a>${sep}`;
  }).join("");
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
  <tr><td style="padding:12px 0;border-bottom:1px solid #e2e8f0;">
    <p style="margin:0 0 8px;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#cbd5e1;">CUPRINS</p>
    <p style="margin:0;line-height:2;">${links}</p>
  </td></tr>
</table>`;
}

// ── Tech header ───────────────────────────────────────────────────────────────
function techDivider() {
  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;margin-top:8px;">
  <tr><td style="padding:10px 0;border-top:3px solid #0f172a;border-bottom:1px solid #e2e8f0;">
    <a name="tech" style="display:block;height:0;overflow:hidden;font-size:0;"> </a>
    <span style="font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1.5px;color:#0f172a;">Tehnologii emergente</span>
  </td></tr>
</table>`;
}

// ── Main export ───────────────────────────────────────────────────────────────
export function renderHTML(report) {
  const year = new Date().getFullYear();
  const when = new Date(report.generatedAt).toLocaleString("ro-RO", {
    timeZone: CONFIG.timezone, day: "numeric", month: "long", year: "numeric",
  });

  const political  = report.entities.filter(e => e.kind === "political");
  const tech       = report.entities.filter(e => e.kind === "tech");
  const allEntities = [...political, ...tech];

  const cuprins = renderCuprins(allEntities);
  const polHTML  = political.map(sectionBlock).join("");
  const techHTML = tech.length
    ? techDivider() + tech.map(sectionBlock).join("")
    : "";

  return `<!doctype html>
<html lang="ro">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta name="color-scheme" content="light"/>
  <title>Monitorizare &mdash; ${he.encode(when)}</title>
  <style>
    body,table,td{font-family:Arial,Helvetica,sans-serif;}
    img{max-width:100%;height:auto;display:block;}
    a{color:inherit;}
    @media only screen and (max-width:620px){
      .wrap{width:100%!important;}
      .outer{padding:16px 12px 32px!important;}
      h3.big{font-size:16px!important;}
      .thumb-td{display:none!important;}
    }
  </style>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;color:#0f172a;line-height:1.5;-webkit-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;">
  <tr>
    <td class="outer" align="center" style="padding:24px 16px 48px;">
      <table class="wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#fff;">
        <tr>
          <td style="padding:24px 28px 20px;border-bottom:1px solid #e2e8f0;">
            <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#94a3b8;">${he.encode(when)}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 0;">
            ${cuprins}
            ${polHTML}
            ${techHTML}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 28px 28px;border-top:1px solid #e2e8f0;text-align:center;">
            <p style="margin:0;font-size:10px;color:#94a3b8;">&copy; ${year} Uzina din Nori</p>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
