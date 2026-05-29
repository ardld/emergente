/** Text processing + clustering — ported from bla-main (BLA Media Monitor). */

const STOP = new Set([
  "de","la","si","și","in","în","cu","o","un","mai","pentru","pe","nu","sa","să","din",
  "ale","lui","al","ai","fost","este","sunt","au","fi","ca","că","ce","cine","cand","când",
  "cum","unde","care","doar","tot","toti","toți","dupa","după","prin","peste","sub","fara","fără",
  "the","a","an","and","or","of","to","in","on","for","is","are","with","that","this",
]);

const SYN = {
  protest: ["proteste","protestatari","manifestație","demonstrație","marș","protestele"],
  justiție: ["justiției","justiția","judiciar","magistrați","judecători","procurori","parchet"],
  guvern: ["guvernul","guvernului","executiv","executivul","cabinet","bolojan"],
  președinte: ["președintele","președintelui","cotroceni","prezidențial","președinția"],
  moțiune: ["moțiunea","moțiunii","cenzură","cenzurii"],
  ai: ["a.i.","artificial","intelligence","llm","gpt","model","modelul"],
  chip: ["chips","chipset","semiconductor","semiconductori","gpu","wafer"],
  cyber: ["cybersecurity","ransomware","malware","breach","vulnerability","cve","hack"],
};

function stem(w) {
  const suf = ["ului","elor","ilor","ații","ația","ație","urilor","lor","ele","ii","ei","ul","ua","ea","ă","e","i","u","a"];
  let s = w.toLowerCase();
  if (s.length <= 4) return s;
  for (const x of suf) if (s.endsWith(x) && s.length - x.length >= 3) return s.slice(0, -x.length);
  return s;
}
function toTopic(w) {
  const l = w.toLowerCase();
  for (const [c, syns] of Object.entries(SYN)) {
    if (syns.includes(l)) return c;
    if (l.length >= 5 && c.length >= 4 && l.startsWith(c.slice(0, 4))) return c;
  }
  return null;
}
function tokenize(t) {
  return t.toLowerCase().replace(/[^\w\săîâșț]/g, " ").split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => toTopic(w) || stem(w));
}

export function similarity(t1, t2) {
  const a = tokenize(t1), b = tokenize(t2);
  const sa = new Set(a), sb = new Set(b);
  const inter = [...sa].filter((x) => sb.has(x)).length;
  const uni = new Set([...a, ...b]).size;
  const jaccard = uni === 0 ? 0 : inter / uni;
  const ta = new Set(a.map(toTopic).filter(Boolean));
  const tb = new Set(b.map(toTopic).filter(Boolean));
  const topicBoost = [...ta].filter((x) => tb.has(x)).length * 0.15;
  const wa = new Set(a.filter((x) => x.length >= 4));
  const wb = new Set(b.filter((x) => x.length >= 4));
  const shared = [...wa].filter((x) => wb.has(x)).length;
  const wordBoost = shared >= 3 ? 0.08 : shared >= 2 ? 0.05 : 0;
  return Math.min(1, jaccard + topicBoost + wordBoost);
}

export function clusterBySimilarity(articles, threshold = 0.22) {
  if (!articles.length) return [];
  const used = new Set();
  const sorted = [...articles].sort((a, b) => (b.credibility || 0.5) - (a.credibility || 0.5));
  const clusters = [];
  for (const art of sorted) {
    if (used.has(art.link)) continue;
    const cluster = [art];
    used.add(art.link);
    const seed = `${art.title} ${art.snippet}`;
    for (const o of sorted) {
      if (used.has(o.link)) continue;
      if (similarity(seed, `${o.title} ${o.snippet}`) >= threshold) {
        cluster.push(o);
        used.add(o.link);
      }
    }
    cluster.sort((a, b) => (b.credibility || 0.5) - (a.credibility || 0.5));
    clusters.push(cluster);
  }
  clusters.sort((a, b) => b.length - a.length);
  // merge highly-similar clusters
  const merged = [];
  const usedIdx = new Set();
  for (let i = 0; i < clusters.length; i++) {
    if (usedIdx.has(i)) continue;
    let cur = [...clusters[i]];
    usedIdx.add(i);
    const txt = cur.map((a) => `${a.title} ${a.snippet}`).join(" ");
    for (let j = i + 1; j < clusters.length; j++) {
      if (usedIdx.has(j)) continue;
      if (similarity(txt, clusters[j].map((a) => `${a.title} ${a.snippet}`).join(" ")) >= 0.3) {
        cur = [...cur, ...clusters[j]];
        usedIdx.add(j);
      }
    }
    cur.sort((a, b) => (b.credibility || 0.5) - (a.credibility || 0.5));
    merged.push(cur);
  }
  return merged;
}

export const canonicalizeUrl = (url) => {
  try {
    const u = new URL(url);
    u.hash = "";
    ["utm_", "gclid", "fbclid"].forEach((p) =>
      [...u.searchParams.keys()].forEach((k) => { if (k.toLowerCase().startsWith(p)) u.searchParams.delete(k); })
    );
    return u.toString();
  } catch { return url; }
};
export const domainOf = (url) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return ""; } };
export const pickThumb = (items) => {
  for (const it of items) if (it.thumbnail && it.thumbnail.length > 10 && !/logo|sprite|icon|avatar|default/i.test(it.thumbnail)) return it.thumbnail;
  return null;
};
