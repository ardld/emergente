/**
 * FEEDS — two pools.
 *
 * Political: ported from contextpolitic_v6 (CP_Config::get_feeds) with its
 * tiered credibility scores. Gated by Romania-relevance.
 *
 * Tech: a curated subset of the OSINT "tehnologii emergente" catalog (B1/B2/B7),
 * mapping to the 3 tech subjects. Native RSS only (no Google-News fallbacks here).
 */

export const POLITICAL_FEEDS = [
  // TIER 1 (0.85+)
  "https://recorder.ro/feed",
  "https://www.riseproject.ro/feed/",
  "https://romania.europalibera.org/api/zvo_mml-vomx_-tpeukvm_",
  "https://pressone.ro/api/rss",
  "https://www.rfi.fr/ro/rss",
  "https://www.gds.ro/feed/",
  // TIER 2 (0.70–0.84)
  "https://www.presshub.ro/feed/",
  "https://www.veridica.ro/feeds",
  "https://www.digi24.ro/rss",
  "https://hotnews.ro/c/actualitate/feed",
  "https://rss.stirileprotv.ro/",
  "https://www.europafm.ro/feed/",
  "https://universul.net/categorie/politica/feed/",
  "https://b365.ro/feed/",
  "https://financialintelligence.ro/feed/",
  "https://www.biziday.ro/feed/",
  "https://www.agerpres.ro/home.rss",
  // TIER 3 (0.55–0.69)
  "https://libertatea.ro/feed/",
  "https://www.g4media.ro/feed",
  "https://spotmedia.ro/feed",
  // TIER 4 (0.30–0.55)
  "https://adevarul.ro/rss/index",
  "https://www.cotidianul.ro/feed/",
  "https://www.mediafax.ro/rss-feed.xml",
  "https://www.antena3.ro/rss",
];

export const POLITICAL_CREDIBILITY = {
  "recorder.ro": 0.95, "riseproject.ro": 0.95, "europalibera.org": 0.9,
  "pressone.ro": 0.88, "rfi.fr": 0.85, "gds.ro": 0.85, "presshub.ro": 0.82,
  "veridica.ro": 0.82, "digi24.ro": 0.82, "hotnews.ro": 0.8, "stirileprotv.ro": 0.8,
  "europafm.ro": 0.78, "universul.net": 0.75, "b365.ro": 0.75,
  "financialintelligence.ro": 0.75, "biziday.ro": 0.72, "agerpres.ro": 0.7,
  "libertatea.ro": 0.68, "g4media.ro": 0.65, "spotmedia.ro": 0.6,
  "adevarul.ro": 0.55, "cotidianul.ro": 0.5, "mediafax.ro": 0.45, "antena3.ro": 0.3,
};

// Tech feeds tagged with the tech subject they prime (used as a hint; the brain
// still classifies). Native RSS endpoints from the OSINT catalog.
export const TECH_FEEDS = [
  // AI & Machine Learning
  { url: "https://openai.com/blog/rss.xml", subject: "AI & Machine Learning", cred: 0.85 },
  { url: "https://www.anthropic.com/rss.xml", subject: "AI & Machine Learning", cred: 0.9 },
  { url: "https://deepmind.google/blog/rss.xml", subject: "AI & Machine Learning", cred: 0.9 },
  { url: "https://the-decoder.com/feed/", subject: "AI & Machine Learning", cred: 0.7 },
  { url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", subject: "AI & Machine Learning", cred: 0.85 },
  { url: "https://venturebeat.com/category/ai/feed/", subject: "AI & Machine Learning", cred: 0.7 },
  // Semiconductori & Hardware
  { url: "https://nvidianews.nvidia.com/releases.xml", subject: "Semiconductori & Hardware", cred: 0.8 },
  { url: "https://www.tomshardware.com/feeds/all", subject: "Semiconductori & Hardware", cred: 0.75 },
  { url: "https://www.eetimes.com/feed/", subject: "Semiconductori & Hardware", cred: 0.78 },
  { url: "https://semianalysis.com/feed/", subject: "Semiconductori & Hardware", cred: 0.85 },
  // Securitate cibernetică
  { url: "https://krebsonsecurity.com/feed/", subject: "Securitate cibernetică", cred: 0.92 },
  { url: "https://www.bleepingcomputer.com/feed/", subject: "Securitate cibernetică", cred: 0.82 },
  { url: "https://therecord.media/feed/", subject: "Securitate cibernetică", cred: 0.85 },
  { url: "https://www.cisa.gov/cybersecurity-advisories/all.xml", subject: "Securitate cibernetică", cred: 0.9 },
  { url: "https://feeds.feedburner.com/TheHackersNews", subject: "Securitate cibernetică", cred: 0.78 },
];
