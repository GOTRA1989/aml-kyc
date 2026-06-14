// KYC/AML simulation store. Persists cases to localStorage.

export type CaseType = "individual" | "corporate";
export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";
export type Decision = "pending" | "approved" | "rejected" | "escalated";

export interface AuditEntry {
  timestamp: string;
  action: string;
  detail?: string;
}

export interface SanctionsMatch {
  list: "OFAC" | "UN" | "EU";
  hit: boolean;
  score: number;
  name?: string;
}

export interface AdverseMediaItem {
  severity: "none" | "low" | "high";
  headline: string;
  source: string;
  date: string;
}

export type IncomeBucket = "<$10k" | "$10k-$50k" | "$50k-$100k" | ">$100k";
export type CorpVolumeBucket = "<$50k" | "$50k-$250k" | "$250k-$1M" | ">$1M";

export interface IndividualData {
  title: "Mr." | "Mrs." | "Ms." | "Dr.";
  fullName: string;
  dob: string;
  placeOfBirth: string;
  gender: "Male" | "Female" | "Other" | "Prefer not to say";
  religion: string;
  nationality: string;
  dualCitizenship: string; // "None" or country
  phoneCountryCode: string; // +62
  phoneNumber: string;
  email: string;
  residentialAddress: string;
  permanentAddress: string;
  sameAsResidential: boolean;
  idType: "Passport" | "National ID / KTP" | "Driving License";
  idNumber: string;
  idDocName?: string;
  selfieCaptured: boolean;
  livenessScore: number;
  proofOfAddressName?: string;
  addressCountry: string;
  tin: string;
  taxResidencyCountry: string;
  employmentStatus: "Employed" | "Self-Employed" | "Business Owner" | "Retired" | "Student" | "Unemployed";
  occupation: string;
  industry: string;
  employerName: string;
  sourceOfWealth: string;
  sourceOfFunds: string;
  annualIncome: IncomeBucket;
  monthlyVolume: IncomeBucket;
  channel: "Branch" | "Online" | "Mobile App" | "Agent";
}

export interface UBO {
  name: string;
  ownership: number;
  nationality: string;
  idType?: "Passport" | "National ID";
  idNumber?: string;
  designation?: string;
}

export interface CorporateData {
  companyName: string;
  tradingName: string;
  legalEntityType: "LLC / PT" | "Limited Partnership" | "Trust" | "Foundation" | "Shell Corporation";
  registrationNumber: string;
  incorporationDate: string;
  incorporationCountry: string;
  corpTin: string;
  parentCompany: string;
  parentCountry: string;
  industry: string;
  hqAddress: string;
  sourceOfFunds: string;
  monthlyVolume: CorpVolumeBucket;
  ubos: UBO[];
  corpDocName?: string;
  channel: "Branch" | "Online" | "RM Onboarded" | "Agent";
}

export interface RiskBreakdown {
  geography: number;
  industry: number;
  channel: number;
  pep: number;
  sanctions: number;
  adverseMedia: number;
  total: number;          // 0-100 normalized
  level: RiskLevel;
}

export interface ScreeningSummary {
  pepStatus: "CLEAR" | "MATCHED";
  pepMatches: string[];
  sanctionsStatus: "CLEAR" | "MATCHED";
  sanctionsMatches: string[];
  adverseStatus: "CLEAR" | "ALERTS FOUND";
  adverseAlerts: string[];
  blocked: boolean; // any hit => EDD escalation
}

export interface AnalystAction {
  notesIssue: string;
  notesRule: string;
  notesAnalysis: string;
  notesConclusion: string;
  sourceOfFunds?: string;
  sourceOfWealth?: string;
  decision: Decision;
  decidedAt?: string;
  analyst: string;
}

export interface KycCase {
  id: string;
  createdAt: string;
  type: CaseType;
  subjectName: string;
  individual?: IndividualData;
  corporate?: CorporateData;
  ocr: Record<string, string>;
  sanctions: SanctionsMatch[];
  pepHit: boolean;
  pepScore: number;
  adverseMedia: AdverseMediaItem[];
  screening: ScreeningSummary;
  risk: RiskBreakdown;
  edd: boolean;
  audit: AuditEntry[];
  action: AnalystAction;
}

const KEY = "kyc_cases_v2";

// ===== Expanded Screening Dictionary =====
export const SANCTIONED_ENTITIES = [
  "Al-Khaleej Syndicate", "Cali Cartel Holdings", "SinoTrade Logistics",
  "Medellin Import-Export", "Vanguard Shell Corp", "Balkan Trust", "Alpha Shield",
];
export const SANCTIONED_INDIVIDUALS = [
  "Vladimir Volkov", "Mateo Santos", "Chen Wei",
  "Youssef Mansour", "Amir Haddad", "Elena Rostova",
];
// Same individuals double as PEPs for this simulation
export const PEP_INDIVIDUALS = SANCTIONED_INDIVIDUALS;

export const HIGH_RISK_COUNTRIES = [
  "Russia", "Iran", "North Korea", "Syria", "Belarus", "Venezuela", "Myanmar", "Cuba",
];
export const HIGH_RISK_INDUSTRIES = [
  "Gambling/Casino", "Crypto Trading", "Crypto Exchange",
  "Weapons/Defense", "Mining", "Shell Banking", "Arms",
];
const WATCHLIST_KEYWORDS = ["shell", "trust", "holdings"];
const LOW_RISK_COUNTRIES = [
  "United States", "United Kingdom", "Germany", "Canada", "France",
  "Singapore", "Japan", "Switzerland", "Australia", "Netherlands",
];

function uid() {
  return "CASE-" + Math.random().toString(36).slice(2, 8).toUpperCase() + "-" + Date.now().toString(36).slice(-4).toUpperCase();
}

function norm(s: string) { return (s || "").toLowerCase().trim(); }

function fuzzy(a: string, b: string): number {
  a = norm(a); b = norm(b);
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 90;
  const aw = new Set(a.split(/\s+/));
  const bw = new Set(b.split(/\s+/));
  const inter = [...aw].filter(x => bw.has(x)).length;
  if (inter === 0) return 0;
  const union = new Set([...aw, ...bw]).size;
  return Math.round((inter / union) * 100);
}

// ===== Screening helpers =====
function bestMatch(name: string, list: string[]): { score: number; matched?: string } {
  let best = 0; let matched: string | undefined;
  for (const s of list) {
    const sc = fuzzy(name, s);
    if (sc > best) { best = sc; matched = s; }
  }
  return { score: best, matched };
}

export function screenSanctions(names: string[]): { matches: SanctionsMatch[]; hits: string[] } {
  const lists: ("OFAC" | "UN" | "EU")[] = ["OFAC", "UN", "EU"];
  const combinedPool = [...SANCTIONED_ENTITIES, ...SANCTIONED_INDIVIDUALS];
  const hits: string[] = [];
  const matches: SanctionsMatch[] = lists.map(list => {
    let best = 0; let matched: string | undefined; let src: string | undefined;
    for (const n of names) {
      const r = bestMatch(n, combinedPool);
      if (r.score > best) { best = r.score; matched = r.matched; src = n; }
    }
    if (best >= 75 && matched && src) hits.push(`${src} ≈ ${matched}`);
    return { list, hit: best >= 75, score: best, name: best >= 60 ? matched : undefined };
  });
  return { matches, hits: Array.from(new Set(hits)) };
}

export function screenPEP(names: string[]): { hit: boolean; score: number; matches: string[] } {
  let best = 0;
  const matches: string[] = [];
  for (const n of names) {
    const r = bestMatch(n, PEP_INDIVIDUALS);
    if (r.score > best) best = r.score;
    if (r.score >= 75 && r.matched) matches.push(`${n} ≈ ${r.matched}`);
  }
  return { hit: best >= 75, score: best, matches: Array.from(new Set(matches)) };
}

export function screenAdverseMedia(opts: {
  names: string[]; country: string; industry: string; volumeHighest: boolean;
}): AdverseMediaItem[] {
  const alerts: AdverseMediaItem[] = [];
  const today = new Date().toISOString().slice(0, 10);

  // Direct name hits → high
  for (const n of opts.names) {
    const r = bestMatch(n, [...SANCTIONED_ENTITIES, ...SANCTIONED_INDIVIDUALS]);
    if (r.score >= 75) {
      alerts.push({
        severity: "high",
        headline: `🚨 ${n} flagged in global sanctions/PEP intelligence (closest: ${r.matched}).`,
        source: "Refinitiv World-Check",
        date: today,
      });
    }
  }

  // Country adverse media
  if (HIGH_RISK_COUNTRIES.includes(opts.country)) {
    alerts.push({
      severity: "high",
      headline: `📰 ADVERSE MEDIA: Entity linked to cross-border capital flight and sanctions evasion schemes (${opts.country}).`,
      source: "Reuters Compliance Wire",
      date: today,
    });
  }

  // Industry adverse media
  const ind = norm(opts.industry);
  if (ind.includes("gambling") || ind.includes("casino") || ind.includes("crypto")) {
    alerts.push({
      severity: "high",
      headline: "📰 ADVERSE MEDIA: Associated sector flagged by FATF for heightened vulnerability to integration-phase layering.",
      source: "FATF Typology Report",
      date: today,
    });
  }
  if (ind.includes("weapons") || ind.includes("defense") || ind.includes("mining") || ind.includes("arms")) {
    alerts.push({
      severity: "high",
      headline: "📰 ADVERSE MEDIA: Regulatory scrutiny regarding environmental, social, and illicit procurement risks.",
      source: "OECD Watch",
      date: today,
    });
  }

  // Fallback watchlist keyword + highest volume
  if (opts.volumeHighest) {
    for (const n of opts.names) {
      const lower = norm(n);
      if (WATCHLIST_KEYWORDS.some(k => lower.includes(k))) {
        alerts.push({
          severity: "low",
          headline: `🟡 Medium-High Risk Watchlist Match: "${n}" combined with highest-bracket transaction volume.`,
          source: "Internal Typology Engine",
          date: today,
        });
        break;
      }
    }
  }

  if (alerts.length === 0) {
    alerts.push({
      severity: "none",
      headline: "No adverse media identified across 240+ aggregated sources.",
      source: "Aggregated Media Scan",
      date: today,
    });
  }
  return alerts;
}

export function calcRisk(opts: {
  country: string; industry: string; channel: string;
  pepHit: boolean; sanctionsHit: boolean; adverseHigh: boolean;
  volumeHighest: boolean;
}): RiskBreakdown {
  const geography = HIGH_RISK_COUNTRIES.includes(opts.country) ? 25
    : LOW_RISK_COUNTRIES.includes(opts.country) ? 3 : 10;
  const industry = HIGH_RISK_INDUSTRIES.some(i => norm(opts.industry).includes(norm(i))) ? 20 : 6;
  const channel = opts.channel === "Branch" ? 2 : opts.channel === "Online" || opts.channel === "Mobile App" ? 8 : 12;
  const pep = opts.pepHit ? 25 : 0;
  const sanctions = opts.sanctionsHit ? 30 : 0;
  const adverseMedia = opts.adverseHigh ? 15 : 0;
  let total = geography + industry + channel + pep + sanctions + adverseMedia;
  if (opts.volumeHighest) total += 5;
  // Force HIGH band 85-95 when any hard trigger present
  if (opts.pepHit || opts.sanctionsHit) {
    total = Math.min(95, Math.max(85, total + 30));
  }
  total = Math.min(100, total);
  const level: RiskLevel = total >= 70 ? "HIGH" : total >= 40 ? "MEDIUM" : "LOW";
  return { geography, industry, channel, pep, sanctions, adverseMedia, total, level };
}

function buildScreening(p: {
  names: string[]; country: string; industry: string; volumeHighest: boolean;
}): { screening: ScreeningSummary; sanctions: SanctionsMatch[]; adverseMedia: AdverseMediaItem[]; pepHit: boolean; pepScore: number } {
  const sanc = screenSanctions(p.names);
  const pep = screenPEP(p.names);
  const media = screenAdverseMedia({ names: p.names, country: p.country, industry: p.industry, volumeHighest: p.volumeHighest });
  const adverseHits = media.filter(m => m.severity !== "none");
  const sanctionsHit = sanc.matches.some(m => m.hit);
  const screening: ScreeningSummary = {
    pepStatus: pep.hit ? "MATCHED" : "CLEAR",
    pepMatches: pep.matches,
    sanctionsStatus: sanctionsHit ? "MATCHED" : "CLEAR",
    sanctionsMatches: sanc.hits,
    adverseStatus: adverseHits.length > 0 ? "ALERTS FOUND" : "CLEAR",
    adverseAlerts: adverseHits.map(a => a.headline),
    blocked: pep.hit || sanctionsHit || adverseHits.some(a => a.severity === "high"),
  };
  return { screening, sanctions: sanc.matches, adverseMedia: media, pepHit: pep.hit, pepScore: pep.score };
}

export function loadCases(): KycCase[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveCases(cases: KycCase[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(cases));
}
export function getCase(id: string): KycCase | undefined { return loadCases().find(c => c.id === id); }
export function upsertCase(c: KycCase) {
  const all = loadCases();
  const i = all.findIndex(x => x.id === c.id);
  if (i >= 0) all[i] = c; else all.unshift(c);
  saveCases(all);
}
export function addAudit(id: string, entry: Omit<AuditEntry, "timestamp">) {
  const c = getCase(id); if (!c) return;
  c.audit.push({ ...entry, timestamp: new Date().toISOString() });
  upsertCase(c);
}

const HIGHEST_INDIV: IncomeBucket = ">$100k";
const HIGHEST_CORP: CorpVolumeBucket = ">$1M";

export function createIndividualCase(d: IndividualData): KycCase {
  const audit: AuditEntry[] = [];
  const stamp = (action: string, detail?: string) => audit.push({ timestamp: new Date().toISOString(), action, detail });
  stamp("Case Created", "Individual onboarding submitted");
  stamp("OCR Performed", `Extracted from ${d.idType}: ${d.idNumber}`);
  stamp("Liveness Check", `Score ${d.livenessScore}%`);

  const ocr: Record<string, string> = {
    "Title": d.title, "Full Name": d.fullName, "Date of Birth": d.dob, "Place of Birth": d.placeOfBirth,
    "Gender": d.gender, "Religion / Belief": d.religion,
    "Nationality": d.nationality, "Dual Citizenship": d.dualCitizenship,
    "Mobile Phone": `${d.phoneCountryCode} ${d.phoneNumber}`, "Email": d.email,
    "Residential Address": d.residentialAddress,
    "Permanent Address": d.sameAsResidential ? "Same as residential" : d.permanentAddress,
    "Country of Residence": d.addressCountry,
    "ID Type": d.idType, "ID Serial Number": d.idNumber,
    "Tax ID (TIN/NPWP)": d.tin, "Tax Residency": d.taxResidencyCountry,
    "Employment Status": d.employmentStatus, "Occupation": d.occupation,
    "Industry": d.industry, "Employer": d.employerName,
    "Source of Wealth": d.sourceOfWealth, "Source of Funds": d.sourceOfFunds,
    "Annual Income": d.annualIncome, "Expected Monthly Volume": d.monthlyVolume,
    "Onboarding Channel": d.channel,
  };

  const { screening, sanctions, adverseMedia, pepHit, pepScore } = buildScreening({
    names: [d.fullName],
    country: d.addressCountry,
    industry: d.industry,
    volumeHighest: d.monthlyVolume === HIGHEST_INDIV,
  });
  stamp("Sanctions Screening", `OFAC/UN/EU — ${screening.sanctionsStatus}`);
  stamp("PEP Screening", `${screening.pepStatus}${pepHit ? ` (${pepScore}%)` : ""}`);
  stamp("Adverse Media Scan", screening.adverseStatus);

  const risk = calcRisk({
    country: d.addressCountry, industry: d.industry, channel: d.channel,
    pepHit, sanctionsHit: sanctions.some(m => m.hit),
    adverseHigh: adverseMedia.some(m => m.severity === "high"),
    volumeHighest: d.monthlyVolume === HIGHEST_INDIV,
  });
  stamp("Risk Rating Calculated", `${risk.level} (${risk.total}/100)`);
  if (screening.blocked) stamp("Auto-Escalation", "Escalated to MLRO for EDD — screening trigger active");

  const c: KycCase = {
    id: uid(), createdAt: new Date().toISOString(),
    type: "individual", subjectName: d.fullName, individual: d, ocr,
    sanctions, pepHit, pepScore, adverseMedia, screening, risk,
    edd: risk.level === "HIGH" || screening.blocked,
    audit,
    action: {
      notesIssue: "", notesRule: "", notesAnalysis: "", notesConclusion: "",
      decision: screening.blocked ? "escalated" : "pending",
      analyst: screening.blocked ? "Auto-Routed → MLRO" : "Unassigned",
      decidedAt: screening.blocked ? new Date().toISOString() : undefined,
    },
  };
  upsertCase(c);
  return c;
}

export function createCorporateCase(d: CorporateData): KycCase {
  const audit: AuditEntry[] = [];
  const stamp = (action: string, detail?: string) => audit.push({ timestamp: new Date().toISOString(), action, detail });
  stamp("Case Created", "Corporate onboarding submitted");
  stamp("Corporate Registry Lookup", `Reg# ${d.registrationNumber} (${d.incorporationCountry})`);
  stamp("UBO Verification", `${d.ubos.length} UBO(s) declared`);

  const ocr: Record<string, string> = {
    "Registered Name": d.companyName, "Trading Name": d.tradingName || "—",
    "Legal Entity Type": d.legalEntityType,
    "Registration No. / NIB": d.registrationNumber,
    "Date of Incorporation": d.incorporationDate,
    "Country of Incorporation": d.incorporationCountry,
    "Corporate TIN / NPWP": d.corpTin,
    "Parent / Holding Entity": d.parentCompany || "—",
    "Country of Parent": d.parentCountry || "—",
    "Industry Sector": d.industry,
    "HQ Address": d.hqAddress,
    "Source of Capital / Funds": d.sourceOfFunds,
    "Expected Monthly Volume": d.monthlyVolume,
    "Onboarding Channel": d.channel,
  };
  d.ubos.forEach((u, i) => {
    ocr[`UBO ${i + 1}`] = `${u.name} — ${u.ownership}% • ${u.nationality}${u.designation ? " • " + u.designation : ""}${u.idNumber ? " • " + (u.idType || "ID") + " " + u.idNumber : ""}`;
  });

  const names = [d.companyName, d.tradingName, d.parentCompany, ...d.ubos.map(u => u.name)].filter(Boolean) as string[];
  const { screening, sanctions, adverseMedia, pepHit, pepScore } = buildScreening({
    names, country: d.incorporationCountry, industry: d.industry,
    volumeHighest: d.monthlyVolume === HIGHEST_CORP,
  });
  stamp("Sanctions Screening", `Screened company + ${d.ubos.length} UBO(s) — ${screening.sanctionsStatus}`);
  stamp("PEP Screening", `${screening.pepStatus}${pepHit ? ` (${pepScore}%)` : ""}`);
  stamp("Adverse Media Scan", screening.adverseStatus);

  const risk = calcRisk({
    country: d.incorporationCountry, industry: d.industry, channel: d.channel,
    pepHit, sanctionsHit: sanctions.some(m => m.hit),
    adverseHigh: adverseMedia.some(m => m.severity === "high"),
    volumeHighest: d.monthlyVolume === HIGHEST_CORP,
  });
  stamp("Risk Rating Calculated", `${risk.level} (${risk.total}/100)`);
  if (screening.blocked) stamp("Auto-Escalation", "Escalated to MLRO for EDD — screening trigger active");

  const c: KycCase = {
    id: uid(), createdAt: new Date().toISOString(),
    type: "corporate", subjectName: d.companyName, corporate: d, ocr,
    sanctions, pepHit, pepScore, adverseMedia, screening, risk,
    edd: risk.level === "HIGH" || screening.blocked,
    audit,
    action: {
      notesIssue: "", notesRule: "", notesAnalysis: "", notesConclusion: "",
      decision: screening.blocked ? "escalated" : "pending",
      analyst: screening.blocked ? "Auto-Routed → MLRO" : "Unassigned",
      decidedAt: screening.blocked ? new Date().toISOString() : undefined,
    },
  };
  upsertCase(c);
  return c;
}

// ===== Reference data =====
export const COUNTRIES = [
  "Argentina","Australia","Austria","Bahrain","Bangladesh","Belarus","Belgium","Bermuda","Brazil","British Virgin Islands","Canada",
  "Cayman Islands","Chile","China","Colombia","Cuba","Cyprus","Czech Republic","Denmark","Egypt","Estonia",
  "Finland","France","Germany","Ghana","Gibraltar","Greece","Guernsey","Hong Kong","Hungary","Iceland",
  "India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Japan","Jersey",
  "Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Liechtenstein","Lithuania","Luxembourg","Malaysia",
  "Malta","Mauritius","Mexico","Monaco","Morocco","Myanmar","Netherlands","New Zealand","Nigeria","North Korea",
  "Norway","Oman","Pakistan","Panama","Peru","Philippines","Poland","Portugal","Qatar","Romania",
  "Russia","Saudi Arabia","Seychelles","Singapore","Slovakia","Slovenia","South Africa","South Korea","South Sudan","Spain",
  "Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Thailand","Turkey","UAE","Ukraine","United Kingdom",
  "United States","Uruguay","Venezuela","Vietnam","Yemen",
];

export const INDUSTRIES = [
  "Banking","Technology","Retail","Manufacturing","Healthcare","Energy","Oil & Gas",
  "Crypto Exchange","Crypto Trading","Gambling/Casino","Weapons/Defense","Mining","Arms",
  "Import-Export","Real Estate","Precious Metals","Money Services","Shell Banking",
  "Consulting","Logistics","Telecommunications","Pharmaceuticals","Agriculture",
];

export const OCCUPATIONS = [
  "Software Engineer","Doctor","Lawyer","Teacher","Retail Worker","Executive",
  "Crypto Trader","Casino Operator","Politician","Arms Dealer","Cash Intensive Business",
  "Banker","Consultant","Trader","Real Estate Developer","Mining Executive",
  "Retired","Student","Unemployed",
];

export const RELIGIONS = [
  "Prefer not to say","Islam","Christianity","Catholicism","Protestantism","Orthodox",
  "Hinduism","Buddhism","Judaism","Sikhism","Confucianism","Atheist/Agnostic","Other",
];

export const PHONE_CODES = [
  "+1","+7","+20","+27","+30","+31","+32","+33","+34","+39","+41","+44","+49",
  "+52","+55","+60","+61","+62","+63","+64","+65","+66","+81","+82","+84","+86",
  "+90","+91","+92","+93","+94","+95","+98","+212","+213","+216","+218","+220",
  "+221","+234","+254","+255","+256","+260","+263","+351","+352","+353","+354",
  "+358","+359","+370","+371","+372","+373","+374","+375","+380","+381","+385",
  "+386","+387","+420","+421","+852","+853","+855","+856","+880","+886","+960",
  "+962","+963","+964","+965","+966","+967","+968","+970","+971","+972","+973",
  "+974","+975","+976","+977","+992","+993","+994","+995","+996","+998",
];

export const INCOME_BUCKETS: IncomeBucket[] = ["<$10k","$10k-$50k","$50k-$100k",">$100k"];
export const CORP_VOLUME_BUCKETS: CorpVolumeBucket[] = ["<$50k","$50k-$250k","$250k-$1M",">$1M"];
