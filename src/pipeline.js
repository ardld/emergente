import Parser from "rss-parser";
import { CONFIG } from "./config.js";
import { SUBJECTS, POLITICAL_SUBJECTS, TECH_SUBJECTS, ROMANIA_KEYWORDS } from "./subjects.js";
import { POLITICAL_FEEDS, POLITICAL_CREDIBILITY, TECH_FEEDS } from "./feeds.js";
import { generate } from "./brain.js";
import { clusterBySimilarity, canonicalizeUrl, domainOf, pickThumb } from "./text.js";

const parser = new Parser({ timeout: 10000 });

// Bounded-concurrency map so ~40 feeds fetch in parallel batches instead of
// one-at-a-time (sequential × 10–15s timeouts blew the serverless time limit).
async function mapPool(items, limit, fn) {
  const out = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });
  await Promise.all(workers);
  return out;
}

// ── 1. FETCH ────────────────────────────────────────────────────────────────
export async function fetchAll() {
  const cutoff = new Date(Date.now() - CONFIG.lookbackHours * 3600 * 1000);
  const out = [];

  const pull = async ({ url, kind, credHint }) => {
    try {
      const feed = await parser.parseURL(url);
      for (const item of feed.items) {
        const date = new Date(item.pubDate || item.isoDate || Date.now());
        if (date < cutoff) continue;
        const link = canonicalizeUrl(item.link || "");
        out.push({
          title: item.title || "",
          link,
          source: feed.title || domainOf(url),
          date: item.pubDate || item.isoDate || "",
          snippet: (item.contentSnippet || item.content || "").slice(0, 400),
          thumbnail: item.enclosure?.url || "",
          kind,
          credibility: kind === "political"
            ? (POLITICAL_CREDIBILITY[domainOf(link || url)] || 0.5)
            : (credHint || 0.6),
        });
      }
    } catch {
      console.error(`  ⚠️  feed failed: ${url}`);
    }
  };

  const jobs = [
    ...POLITICAL_FEEDS.map((url) => ({ url, kind: "political" })),
    ...TECH_FEEDS.map((f) => ({ url: f.url, kind: "tech", credHint: f.cred })),
  ];
  console.log(`📡 Fetching ${jobs.length} feeds (political + tech), concurrency 8...`);
  await mapPool(jobs, 8, pull);

  // dedup by canonical url
  const seen = new Map();
  for (const a of out) if (!seen.has(a.link)) seen.set(a.link, a);
  const deduped = [...seen.values()];
  console.log(`✓ ${deduped.length} articles after dedup (${CONFIG.lookbackHours}h)\n`);
  return deduped;
}

// ── 2. RELEVANCE (political → Romania; tech → on-topic) ──────────────────────
export async function filterRelevance(articles) {
  const political = articles.filter((a) => a.kind === "political");
  const tech = articles.filter((a) => a.kind === "tech");

  // Political: keyword gate, then brain for the uncertain ones.
  const confirmed = [];
  const uncertain = [];
  for (const a of political) {
    const t = `${a.title} ${a.snippet}`.toLowerCase();
    (ROMANIA_KEYWORDS.some((kw) => kw.test(t)) ? confirmed : uncertain).push(a);
  }
  if (uncertain.length) {
    const B = 60;
    for (let i = 0; i < uncertain.length; i += B) {
      const batch = uncertain.slice(i, i + B);
      const payload = batch.map((a, idx) => ({ id: idx, t: a.title, s: a.snippet.slice(0, 80) }));
      const res = await generate({
        capability: "ro_relevance",
        system: "News classifier. Output only valid JSON.",
        user: `Is each article about Romania (politics/society/government)? Return JSON array [{"id":N,"r":true|false}]\n${JSON.stringify(payload)}`,
        model: CONFIG.models.classify,
        json: true,
        maxTokens: 1024,
      });
      if (Array.isArray(res.parsed)) {
        for (const r of res.parsed) if (r.r === true && batch[r.id]) confirmed.push(batch[r.id]);
      } else {
        confirmed.push(...batch); // include on failure
      }
    }
  }
  // Tech already arrives on-topic from curated feeds; keep all.
  console.log(`🇷🇴 political relevant: ${confirmed.length}/${political.length} · 💻 tech: ${tech.length}`);
  return [...confirmed, ...tech];
}

// ── 3. CLASSIFY into subjects (keyword pre-filter + brain) ───────────────────
export async function classify(articles) {
  const classified = {};
  SUBJECTS.forEach((s) => (classified[s.name] = []));
  const needsAPI = [];

  for (const a of articles) {
    const text = `${a.title} ${a.snippet}`;
    // tech articles only match tech subjects; political only political.
    const pool = a.kind === "tech" ? TECH_SUBJECTS : POLITICAL_SUBJECTS;
    let matched = false;
    for (const s of pool) {
      if (s.strongKeywords?.some((kw) => kw.test(text))) { classified[s.name].push(a); matched = true; break; }
    }
    if (!matched) needsAPI.push(a);
  }

  const B = 50;
  const polDesc = POLITICAL_SUBJECTS.map((e, i) => `${i + 1}. ${e.name}: ${e.description}`).join("\n");
  const techDesc = TECH_SUBJECTS.map((e, i) => `${i + 1}. ${e.name}: ${e.description}`).join("\n");
  const unclassified = [];

  for (let i = 0; i < needsAPI.length; i += B) {
    const batch = needsAPI.slice(i, i + B);
    // split by kind for accurate category menus
    for (const kind of ["political", "tech"]) {
      const sub = batch.filter((a) => a.kind === kind);
      if (!sub.length) continue;
      const desc = kind === "political" ? polDesc : techDesc;
      const payload = sub.map((a, idx) => ({ id: idx, t: a.title, s: a.snippet.slice(0, 120) }));
      const res = await generate({
        capability: kind === "political" ? "classify_political" : "classify_tech",
        // give the classifier the live context so it disambiguates correctly
        layers: kind === "political" ? ["political_context"] : ["tech_context"],
        system: kind === "political"
          ? 'Clasificator știri politice românești. ATENȚIE: SRI = Serviciul Român de Informații, NU Sri Lanka! Output doar JSON valid.'
          : "Classifier for emerging-tech news. Output only valid JSON.",
        user: `Clasifică fiecare articol în UNA din categorii sau "none".\nCategorii:\n${desc}\nRăspunde cu: [{"id":N,"c":"categorie"}]\n${JSON.stringify(payload)}`,
        model: CONFIG.models.classify,
        json: true,
        maxTokens: 1024,
      });
      if (Array.isArray(res.parsed)) {
        for (const r of res.parsed) {
          const art = sub[r.id];
          if (!art) continue;
          if (r.c && r.c !== "none" && classified[r.c]) classified[r.c].push(art);
          else unclassified.push(art);
        }
      } else {
        unclassified.push(...sub);
      }
    }
  }

  for (const s of SUBJECTS) console.log(`  ✓ ${s.name}: ${classified[s.name].length}`);
  console.log(`  ○ unclassified: ${unclassified.length}`);
  return { classified, unclassified };
}

// ── 4. SUMMARISE clusters via the brain (Sonnet, batched) ────────────────────
async function summariseBatch(clustersMap, kind) {
  const B = 8;
  const results = {};
  for (let i = 0; i < clustersMap.length; i += B) {
    const batch = clustersMap.slice(i, i + B);
    const payload = batch.map((c) => ({
      id: c.idx,
      a: c.items.slice(0, 4).map((a) => ({ t: a.title, s: a.snippet.slice(0, 120), src: a.source })),
    }));
    const system = kind === "political"
      ? "Ești redactor-șef la o agenție de presă românească. Titluri și rezumate în română naturală, de calitate. Nicușor Dan = PREȘEDINTELE ROMÂNIEI (nu primar). Ilie Bolojan = prim-ministru. Diacritice corecte. Răspunde STRICT cu JSON valid."
      : "You are a tech-desk editor writing for a Romanian audience. Titles/summaries in Romanian, technical terms preserved (LLM, GPU, CVE). Factual, no hype. Respond STRICTLY with valid JSON.";
    const prompt = `Ai ${payload.length} grupuri de știri (fiecare grup = un subiect).
TITLU (max 10 cuvinte): verb activ, subiect-predicat-complement.
SUMAR (max 25 cuvinte): ce s-a întâmplat, cine, de ce contează.
CONTEXT: o propoziție de background sau null.
SENTIMENT: pozitiv/negativ/neutru/controversat
Răspunde DOAR cu: [{"id":N,"title":"...","summary":"...","context":"...","sentiment":"..."}]
${JSON.stringify(payload)}`;

    const res = await generate({
      capability: kind === "political" ? "summarise_political" : "summarise_tech",
      layers: kind === "political" ? ["foundation", "political_context"] : ["tech_context"],
      system,
      user: prompt,
      model: CONFIG.models.summary,
      json: true,
      maxTokens: 2048,
    });
    if (Array.isArray(res.parsed)) {
      for (const r of res.parsed) {
        results[r.id] = {
          title: clean(r.title),
          summary: clean(r.summary),
          context: r.context && !["null", "N/A"].includes(r.context) ? clean(r.context) : "",
          sentiment: r.sentiment || "neutru",
        };
      }
    }
  }
  return results;
}
const clean = (t) => (t || "").replace(/\*\*/g, "").replace(/##?\s*/g, "").replace(/`/g, "").trim();

async function presidencySentiment(subjects) {
  if (!subjects.length) return {};
  const payload = subjects.map((s, i) => ({ id: i, title: s.titlu_ro, articles: s.items.slice(0, 3).map((a) => a.title) }));
  const res = await generate({
    capability: "presidency_sentiment",
    layers: ["political_context"],
    system: "Analist media critic pe sentimentul față de Nicușor Dan și Președinție. La dubii între negativ și neutru, alege NEGATIV. Indicatori negativi: proteste, critici, eșec, criză, scandaluri, presiune.",
    user: `Sentiment față de Nicușor Dan/Președinție pentru fiecare subiect. JSON: [{"id":N,"s":"pozitiv|mai_degraba_pozitiv|neutru|mai_degraba_negativ|negativ"}]\n${JSON.stringify(payload)}`,
    model: CONFIG.models.classify,
    json: true,
    maxTokens: 1024,
  });
  const map = {};
  if (Array.isArray(res.parsed)) for (const r of res.parsed) map[r.id] = r.s;
  return map;
}

// ── orchestrate per subject ──────────────────────────────────────────────────
export async function buildSubjects(classified) {
  const usedUrls = new Set();
  const usedSources = new Set();
  const output = [];

  for (const subject of SUBJECTS) {
    let arts = (classified[subject.name] || []).filter((a) => !usedUrls.has(a.link));
    if (!arts.length) continue;

    const raw = clusterBySimilarity(arts);
    const valid = raw.filter((c) => c.length >= 2 || Math.max(...c.map((a) => a.credibility)) >= (subject.kind === "tech" ? 0.7 : 0.5));
    const cm = valid.map((cluster, idx) => ({
      idx,
      items: cluster.slice(0, 5),
      totalArticles: cluster.length,
      isViral: new Set(cluster.map((it) => domainOf(it.link))).size >= (subject.kind === "tech" ? 3 : 5),
    }));

    const summaries = await summariseBatch(cm, subject.kind);

    const subjects = [];
    for (const c of cm) {
      c.items.forEach((it) => { usedUrls.add(it.link); usedSources.add(domainOf(it.link)); });
      const s = summaries[c.idx] || { title: c.items[0].title, summary: "", context: "", sentiment: "neutru" };
      subjects.push({
        titlu_ro: s.title || c.items[0].title,
        sumar_ro: s.summary,
        context_ro: s.context,
        sentiment: s.sentiment,
        presidencySentiment: null,
        items: c.items.map((it) => ({ title: it.title, link: it.link })),
        sourceDiversity: new Set(c.items.map((it) => domainOf(it.link))).size,
        viralScore: c.totalArticles,
        isViral: c.isViral,
        thumbnail: pickThumb(c.items),
        primaryLink: c.items[0]?.link || "",
      });
    }

    if (subject.hasSentiment && subjects.length) {
      const sent = await presidencySentiment(subjects);
      for (const [i, v] of Object.entries(sent)) if (subjects[i]) subjects[i].presidencySentiment = v;
    }

    subjects.sort((a, b) => (b.isViral - a.isViral) || ((b.thumbnail ? 1 : 0) - (a.thumbnail ? 1 : 0)) || (b.viralScore - a.viralScore));
    if (subjects.length) output.push({ name: subject.name, kind: subject.kind, subjects });
  }

  return { output, usedSources };
}
