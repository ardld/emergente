/**
 * SUBJECTS — 3 political + 3 tech = 6 total.
 * Societate, Guvern, Justiție, Parlament, Local removed per editorial decision.
 */
export const SUBJECTS = [
  {
    name: "Pre\u0219edin\u021Bie",
    kind: "political",
    description: "Articole despre Pre\u0219edintele Rom\u00e2niei (Nicu\u0219or Dan), Administra\u021Bia Preziden\u021Bial\u0103, Palatul Cotroceni, decrete preziden\u021Biale, sau activitatea oficial\u0103 a pre\u0219edintelui.",
    strongKeywords: [/nicu[s\u015f\u0219]or dan/i, /cotroceni/i, /pre[s\u015f\u0219]edint\w* rom/i, /decret preziden/i, /administra[t\u0163\u021b]ia preziden/i],
    hasSentiment: true,
  },
  {
    name: "Putere",
    kind: "political",
    description: "Articole despre partidele din coali\u021Bia de guvernare (PSD, PNL, USR, UDMR) \u2014 decizii de partid, conflicte interne, negocieri politice de coali\u021Bie.",
    strongKeywords: [/coali[t\u0163\u021b]i\w* de guvern/i, /\bgrindeanu/i, /kelemen hunor/i, /dominic fritz/i, /\bPSD\b/, /\bPNL\b/, /\bUSR\b/, /\bUDMR\b/],
  },
  {
    name: "Opozi\u021Bie",
    kind: "political",
    description: "Articole PRIMORDIAL despre partidele de opozi\u021Bie: AUR, George Simion, SOS Rom\u00e2nia, Diana \u0218o\u0219oac\u0103, Partidul POT, Anamaria Gavril\u0103, C\u0103lin Georgescu.",
    strongKeywords: [/george simion/i, /[s\u015f\u0219]o[s\u015f\u0219]oac/i, /c[a\u0103]lin georgescu/i, /partidul pot\b/i, /anamaria gavril/i, /\bAUR\b/],
  },
  {
    name: "AI \u0026 Machine Learning",
    kind: "tech",
    description: "Emerging-tech news on artificial intelligence and machine learning: frontier labs (OpenAI, Anthropic, Google DeepMind, Meta AI, Mistral), model releases, AI regulation (EU AI Act), research, agents, alignment.",
    strongKeywords: [/\bAI\b/, /artificial intelligence/i, /machine learning/i, /\bLLM\b/i, /\bGPT\b/i, /\bClaude\b/, /\bGemini\b/, /OpenAI/i, /Anthropic/i, /DeepMind/i, /\bAI Act\b/i],
  },
  {
    name: "Semiconductori \u0026 Hardware",
    kind: "tech",
    description: "Emerging-tech news on semiconductors and computing hardware: chips, foundries (TSMC, ASML, NVIDIA, Intel), GPUs, export controls, supply chain.",
    strongKeywords: [/semiconductor/i, /\bchip(s|set)?\b/i, /\bGPU\b/, /\bTSMC\b/, /\bASML\b/, /\bNVIDIA\b/i, /foundry/i, /wafer/i],
  },
  {
    name: "Securitate cibernetic\u0103",
    kind: "tech",
    description: "Emerging-tech news on cybersecurity: breaches, vulnerabilities (CVEs), ransomware, advisories (CISA, ENISA), state-sponsored hacking, critical-infrastructure threats.",
    strongKeywords: [/cybersecurity/i, /securitate cibernetic/i, /\bransomware\b/i, /\bmalware\b/i, /\bCVE-\d/i, /\bhack(er|ing|ed)?\b/i, /\bCISA\b/, /atac cibernetic/i],
  },
];

export const POLITICAL_SUBJECTS = SUBJECTS.filter(s => s.kind === "political");
export const TECH_SUBJECTS      = SUBJECTS.filter(s => s.kind === "tech");

export const ROMANIA_KEYWORDS = [
  /\brom[a\u00e2]n/i, /\bbucure[s\u015f\u0219]ti/i, /\bguver/i, /\bparlament/i, /\bpre[s\u015f\u0219]edint/i,
  /\bministr/i, /\bsenatul/i, /\bcamera deputa/i, /\boug\b/i, /\bpsd\b/i, /\bpnl\b/i,
  /\busr\b/i, /\budmr\b/i, /\baur\b/i, /\bbolojan/i, /\bnicu[s\u015f\u0219]or dan/i, /\bsimion/i,
  /\bgeorgescu/i, /\b[s\u015f\u0219]o[s\u015f\u0219]oac/i, /\bcotroceni/i, /\bsri\b/i, /\banaf\b/i,
  /\bbnr\b/i, /\bccr\b/i, /\bdna\b/i, /\bdiicot\b/i, /\bcluj/i, /\btimi[s\u015f\u0219]oara/i,
  /\bia[s\u015f\u0219]i\b/i, /\bconstanta/i, /\bbra[s\u015f\u0219]ov/i,
];

export const SUBJECT_COLORS = {
  "Pre\u0219edin\u021Bie":          "#1d4ed8",
  "Putere":                          "#0f172a",
  "Opozi\u021Bie":                   "#b91c1c",
  "AI \u0026 Machine Learning":      "#0891b2",
  "Semiconductori \u0026 Hardware":  "#65a30d",
  "Securitate cibernetic\u0103":     "#db2777",
};
