/**
 * SUBJECTS — the brain's classification taxonomy.
 *
 * Political subjects (8) are ported verbatim from contextpolitic_v6
 * (CP_Config::get_entities) so the hybrid keeps "the brain of contextpolitic
 * and its subjects". Tech subjects (3) come from the OSINT "tehnologii
 * emergente" catalog — kept deliberately to 2–3 as requested.
 *
 * Each subject carries:
 *   - kind: "political" | "tech"  (drives which relevance gate + context layer)
 *   - description: fed to the classifier prompt (the brain)
 *   - strongKeywords: regexes for the keyword pre-filter (skip an API call)
 *   - hasSentiment: run presidency-style sentiment pass (Președinție only)
 */
export const SUBJECTS = [
  // ───────────────────────── POLITICAL (contextpolitic_v6) ─────────────────────────
  {
    name: "Președinție",
    kind: "political",
    description:
      "Articole despre Președintele României (Nicușor Dan), Administrația Prezidențială, Palatul Cotroceni, decrete prezidențiale, sau activitatea oficială a președintelui.",
    strongKeywords: [/nicu[sș]or dan/i, /cotroceni/i, /pre[sș]edint\w* rom/i, /decret preziden/i, /administra[tț]ia preziden/i],
    hasSentiment: true,
  },
  {
    name: "Societate",
    kind: "political",
    description:
      "Articole despre probleme sociale și de politici publice: economie, buget, taxe, pensii, sănătate, educație, energie, mediu, transport, infrastructură, proteste, greve, sărăcie, migrație, demografie, piața muncii, prețuri, inflație.",
    strongKeywords: [/\bbuget\w*/i, /\bdeficit/i, /\btaxe\b/i, /\bimpozit/i, /\bpensii?\b/i, /\binfla[tț]i/i, /\bproteste?\b/i, /\bgrev[aă]/i, /\bsalari/i, /\bpre[tț]uri/i, /\bspital/i, /\bANAF\b/, /\bANRE\b/],
  },
  {
    name: "Guvern",
    kind: "political",
    description:
      "Articole despre Guvernul României, Premierul Ilie Bolojan, Palatul Victoria, miniștri, ministere, ordonanțe de urgență (OUG), decizii guvernamentale, politici guvernamentale pe orice temă.",
    strongKeywords: [/\bbolojan/i, /palatul victoria/i, /guvernul rom/i, /prim.?ministr/i, /\bOUG\b/, /ordonan[tț][aă]/i, /[sș]edin[tț][aă] de guvern/i],
  },
  {
    name: "Justiție",
    kind: "political",
    description:
      "Articole despre Curtea Constituțională (CCR), decizii CCR, judecători CCR, magistrați, reforma justiției, DNA, DIICOT, parchet, instanțe, ÎCCJ, CSM.",
    strongKeywords: [/\bCCR\b/, /curtea constitu[tț]ional/i, /\bDNA\b/, /\bDIICOT\b/, /\bCSM\b/, /\b[ÎI]CCJ\b/i, /magistra[tț]i/i, /parchet/i],
  },
  {
    name: "Parlament",
    kind: "political",
    description:
      "Articole despre activitatea Parlamentului României, Camera Deputaților, Senat, legi votate în plen, dezbateri parlamentare, moțiuni.",
    strongKeywords: [/camera deputa/i, /senatul rom/i, /parlamentul rom/i, /plen\w* parlam/i, /mo[tț]iune/i, /proiect de lege/i],
  },
  {
    name: "Putere",
    kind: "political",
    description:
      "Articole despre partidele din coaliția de guvernare (PSD, PNL, USR, UDMR) - decizii de partid, conflicte interne, negocieri politice de coaliție.",
    strongKeywords: [/coali[tț]i\w* de guvern/i, /\bgrindeanu/i, /kelemen hunor/i, /dominic fritz/i],
  },
  {
    name: "Opoziție",
    kind: "political",
    description:
      "Articole PRIMORDIAL despre partidele de opoziție: AUR, George Simion, SOS România, Diana Șoșoacă, Partidul POT, Anamaria Gavrilă, Călin Georgescu.",
    strongKeywords: [/george simion/i, /[sș]o[sș]oac/i, /c[aă]lin georgescu/i, /partidul pot\b/i, /anamaria gavril/i, /\bAUR\b/],
  },
  {
    name: "Local",
    kind: "political",
    description:
      "Articole despre administrația locală: primari, primării, consilii locale, decizii ale autorităților locale, București (PMB, sectoare).",
    strongKeywords: [/consiliul local/i, /administra[tț]i\w* local/i, /\bprim[aă]ri[ae]/i, /prim[aă]ria municipiului/i],
  },

  // ───────────────────────── TECH (OSINT "tehnologii emergente") ─────────────────────────
  {
    name: "AI & Machine Learning",
    kind: "tech",
    description:
      "Emerging-tech news on artificial intelligence and machine learning: frontier labs (OpenAI, Anthropic, Google DeepMind, Meta AI, Mistral), model releases, AI regulation (EU AI Act / AI Office), research, agents, alignment, compute.",
    strongKeywords: [/\bAI\b/, /\bartificial intelligence/i, /machine learning/i, /\bLLM\b/i, /\bGPT\b/i, /\bClaude\b/, /\bGemini\b/, /OpenAI/i, /Anthropic/i, /DeepMind/i, /Mistral/i, /\bAI Act\b/i, /inteligen[tț][aă] artificial/i],
  },
  {
    name: "Semiconductori & Hardware",
    kind: "tech",
    description:
      "Emerging-tech news on semiconductors and computing hardware: chips, foundries and fabs (TSMC, ASML, NVIDIA, Intel), GPUs/accelerators, export controls, supply chain, advanced packaging.",
    strongKeywords: [/semiconductor/i, /\bchip(s|set)?\b/i, /\bGPU\b/, /\bTSMC\b/, /\bASML\b/, /\bNVIDIA\b/i, /\bfab\b/i, /foundry/i, /wafer/i, /export controls?/i],
  },
  {
    name: "Securitate cibernetică",
    kind: "tech",
    description:
      "Emerging-tech news on cybersecurity: breaches, vulnerabilities (CVEs), ransomware, advisories (CISA, ENISA), state-sponsored hacking, critical-infrastructure threats, hybrid/cyber war.",
    strongKeywords: [/cybersecurity/i, /securitate cibernetic/i, /\bransomware\b/i, /\bmalware\b/i, /\bCVE-\d/i, /vulnerab/i, /\bbreach\b/i, /\bhack(er|ing|ed)?\b/i, /\bCISA\b/, /\bENISA\b/, /atac cibernetic/i],
  },
];

export const POLITICAL_SUBJECTS = SUBJECTS.filter((s) => s.kind === "political");
export const TECH_SUBJECTS = SUBJECTS.filter((s) => s.kind === "tech");

/** Romania-relevance keyword pre-filter (from bla-main) — gates POLITICAL feeds only. */
export const ROMANIA_KEYWORDS = [
  /\brom[aâ]n/i, /\bbucure[sș]ti/i, /\bguver/i, /\bparlament/i, /\bpre[sș]edint/i,
  /\bministr/i, /\bsenatul/i, /\bcamera deputa/i, /\boug\b/i, /\bpsd\b/i, /\bpnl\b/i,
  /\busr\b/i, /\budmr\b/i, /\baur\b/i, /\bbolojan/i, /\bnicu[sș]or dan/i, /\bsimion/i,
  /\bgeorgescu/i, /\b[sș]o[sș]oac/i, /\bcotroceni/i, /\bsri\b/i, /\banaf\b/i, /\bbnr\b/i,
  /\bccr\b/i, /\bdna\b/i, /\bdiicot/i, /\bcluj/i, /\btimi[sș]oara/i, /\bia[sș]i\b/i,
  /\bconstanța/i, /\bbra[sș]ov/i, /\bsibiu/i, /\boradea/i, /\bcraiova/i,
];

export const SUBJECT_COLORS = {
  "Președinție": "#1d4ed8", "Societate": "#c02020", "Guvern": "#0d9488",
  "Justiție": "#7c3aed", "Parlament": "#ea580c", "Putere": "#0d0d0d",
  "Opoziție": "#b91c1c", "Local": "#4f46e5",
  "AI & Machine Learning": "#0891b2", "Semiconductori & Hardware": "#65a30d",
  "Securitate cibernetică": "#db2777",
};
