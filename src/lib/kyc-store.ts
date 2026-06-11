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
  score: number; // 0-100 fuzzy
  name?: string;
}

export interface AdverseMediaItem {
  severity: "none" | "low" | "high";
  headline: string;
  source: string;
  date: string;
}

export interface IndividualData {
  fullName: string;
  dob: string;
  nationality: string;
  idType: "Passport" | "National ID" | "Driver License";
  idNumber: string;
  idDocName?: string;
  selfieCaptured: boolean;
  livenessScore: number;
  proofOfAddressName?: string;
  addressCountry: string;
  occupation: string;
  channel: "Branch" | "Online" | "Mobile App" | "Agent";
}

export interface UBO {
  name: string;
  ownership: number;
  nationality: string;
}

export interface CorporateData {
  companyName: string;
  registrationNumber: string;
  incorporationCountry: string;
  industry: string;
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
  total: number;
  level: RiskLevel;
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
  risk: RiskBreakdown;
  edd: boolean;
  audit: AuditEntry[];
  action: AnalystAction;
}

const KEY = "kyc_cases_v1";
const FATF_GREYLIST = ["Syria", "Yemen", "Iran", "North Korea", "Myanmar", "Nigeria", "South Sudan", "Venezuela", "Pakistan", "Cuba"];
const HIGH_RISK_INDUSTRIES = ["Crypto", "Gambling", "Arms", "Precious Metals", "Money Services"];
const HIGH_RISK_OCCUPATIONS = ["Crypto Trader", "Casino Owner", "Politician", "Arms Dealer", "Cash Intensive Business"];
const PEP_NAMES = ["vladimir", "ahmed", "kim", "petrov", "ibrahim"];
const SANCTIONED_NAMES = ["ivan petrov", "ahmed khalil", "kim jong", "viktor bout"];

function uid() {
  return "CASE-" + Math.random().toString(36).slice(2, 8).toUpperCase() + "-" + Date.now().toString(36).slice(-4).toUpperCase();
}

function fuzzy(a: string, b: string): number {
  a = a.toLowerCase(); b = b.toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 100;
  if (a.includes(b) || b.includes(a)) return 88;
  const aw = new Set(a.split(/\s+/));
  const bw = new Set(b.split(/\s+/));
  const inter = [...aw].filter(x => bw.has(x)).length;
  const union = new Set([...aw, ...bw]).size;
  return Math.round((inter / union) * 100);
}

export function screenSanctions(name: string): { matches: SanctionsMatch[]; pepHit: boolean; pepScore: number } {
  const lists: ("OFAC" | "UN" | "EU")[] = ["OFAC", "UN", "EU"];
  const matches: SanctionsMatch[] = lists.map(list => {
    let best = 0; let matched: string | undefined;
    for (const s of SANCTIONED_NAMES) {
      const sc = fuzzy(name, s);
      if (sc > best) { best = sc; matched = s; }
    }
    return { list, hit: best >= 70, score: best, name: best >= 60 ? matched : undefined };
  });
  let pepScore = 0;
  for (const p of PEP_NAMES) {
    const sc = fuzzy(name, p);
    if (sc > pepScore) pepScore = sc;
  }
  return { matches, pepHit: pepScore >= 70, pepScore };
}

export function screenAdverseMedia(name: string): AdverseMediaItem[] {
  const hit = SANCTIONED_NAMES.some(s => fuzzy(name, s) >= 60) || /fraud|launder|scam/i.test(name);
  if (hit) {
    return [
      { severity: "high", headline: `${name} named in 2024 cross-border fraud investigation`, source: "Reuters", date: "2024-08-14" },
      { severity: "low", headline: `Regulatory inquiry mentions associates of ${name}`, source: "FT", date: "2024-11-02" },
    ];
  }
  return [{ severity: "none", headline: `No negative media found for ${name}`, source: "Aggregated 240+ sources", date: new Date().toISOString().slice(0, 10) }];
}

export function calcRisk(opts: {
  country: string; industry: string; channel: string; pepHit: boolean; sanctionsHit: boolean; adverseHigh: boolean;
}): RiskBreakdown {
  const geography = FATF_GREYLIST.includes(opts.country) ? 30 : ["United States", "United Kingdom", "Germany", "Canada", "France", "Singapore", "Japan", "Switzerland"].includes(opts.country) ? 5 : 15;
  const industry = HIGH_RISK_INDUSTRIES.includes(opts.industry) || HIGH_RISK_OCCUPATIONS.includes(opts.industry) ? 30 : 10;
  const channel = opts.channel === "Branch" ? 5 : opts.channel === "Online" || opts.channel === "Mobile App" ? 15 : 20;
  const pep = opts.pepHit ? 25 : 0;
  const sanctions = opts.sanctionsHit ? 40 : 0;
  const adverseMedia = opts.adverseHigh ? 20 : 0;
  const total = geography + industry + channel + pep + sanctions + adverseMedia;
  const level: RiskLevel = total >= 70 ? "HIGH" : total >= 40 ? "MEDIUM" : "LOW";
  return { geography, industry, channel, pep, sanctions, adverseMedia, total, level };
}

export function loadCases(): KycCase[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function saveCases(cases: KycCase[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(cases));
}

export function getCase(id: string): KycCase | undefined {
  return loadCases().find(c => c.id === id);
}

export function upsertCase(c: KycCase) {
  const all = loadCases();
  const i = all.findIndex(x => x.id === c.id);
  if (i >= 0) all[i] = c; else all.unshift(c);
  saveCases(all);
}

export function addAudit(id: string, entry: Omit<AuditEntry, "timestamp">) {
  const c = getCase(id);
  if (!c) return;
  c.audit.push({ ...entry, timestamp: new Date().toISOString() });
  upsertCase(c);
}

export function createIndividualCase(data: IndividualData): KycCase {
  const audit: AuditEntry[] = [];
  const stamp = (action: string, detail?: string) => audit.push({ timestamp: new Date().toISOString(), action, detail });
  stamp("Case Created", "Individual onboarding submitted");
  stamp("OCR Performed", `Extracted from ${data.idType}: ${data.idNumber}`);
  const ocr = { "Full Name": data.fullName, "Document Type": data.idType, "Document Number": data.idNumber, "DOB": data.dob, "Nationality": data.nationality };
  stamp("Liveness Check", `Score ${data.livenessScore}%`);
  const { matches, pepHit, pepScore } = screenSanctions(data.fullName);
  stamp("Sanctions Screening", `OFAC/UN/EU checked. Max score ${Math.max(...matches.map(m => m.score))}%`);
  stamp("PEP Screening", pepHit ? `PEP match (${pepScore}%)` : "No PEP match");
  const media = screenAdverseMedia(data.fullName);
  stamp("Adverse Media Scan", media[0].severity === "none" ? "Clear" : `${media.length} alerts`);
  const risk = calcRisk({
    country: data.addressCountry,
    industry: data.occupation,
    channel: data.channel,
    pepHit,
    sanctionsHit: matches.some(m => m.hit),
    adverseHigh: media.some(m => m.severity === "high"),
  });
  stamp("Risk Rating Calculated", `${risk.level} (${risk.total} pts)`);
  const c: KycCase = {
    id: uid(),
    createdAt: new Date().toISOString(),
    type: "individual",
    subjectName: data.fullName,
    individual: data,
    ocr,
    sanctions: matches,
    pepHit, pepScore,
    adverseMedia: media,
    risk,
    edd: risk.level === "HIGH",
    audit,
    action: { notesIssue: "", notesRule: "", notesAnalysis: "", notesConclusion: "", decision: "pending", analyst: "Unassigned" },
  };
  upsertCase(c);
  return c;
}

export function createCorporateCase(data: CorporateData): KycCase {
  const audit: AuditEntry[] = [];
  const stamp = (action: string, detail?: string) => audit.push({ timestamp: new Date().toISOString(), action, detail });
  stamp("Case Created", "Corporate onboarding submitted");
  stamp("Corporate Registry Lookup", `Reg# ${data.registrationNumber} in ${data.incorporationCountry}`);
  stamp("UBO Verification", `${data.ubos.length} UBO(s) declared`);
  const ocr: Record<string, string> = { "Company": data.companyName, "Registration #": data.registrationNumber, "Incorporated In": data.incorporationCountry, "Industry": data.industry };
  data.ubos.forEach((u, i) => { ocr[`UBO ${i + 1}`] = `${u.name} (${u.ownership}%, ${u.nationality})`; });
  const screened = [data.companyName, ...data.ubos.map(u => u.name)];
  const allMatches: SanctionsMatch[] = [];
  let pepHit = false, pepScore = 0;
  for (const n of screened) {
    const { matches, pepHit: ph, pepScore: ps } = screenSanctions(n);
    matches.forEach(m => allMatches.push({ ...m, name: m.name ?? n }));
    if (ph) pepHit = true;
    if (ps > pepScore) pepScore = ps;
  }
  // dedupe by list keeping highest
  const byList = new Map<string, SanctionsMatch>();
  for (const m of allMatches) {
    const cur = byList.get(m.list);
    if (!cur || m.score > cur.score) byList.set(m.list, m);
  }
  const matches = [...byList.values()];
  stamp("Sanctions Screening", `Screened company + ${data.ubos.length} UBOs against OFAC/UN/EU`);
  stamp("PEP Screening", pepHit ? `PEP match (${pepScore}%)` : "No PEP match");
  const media = screenAdverseMedia(data.companyName);
  stamp("Adverse Media Scan", media[0].severity === "none" ? "Clear" : `${media.length} alerts`);
  const risk = calcRisk({
    country: data.incorporationCountry,
    industry: data.industry,
    channel: data.channel,
    pepHit,
    sanctionsHit: matches.some(m => m.hit),
    adverseHigh: media.some(m => m.severity === "high"),
  });
  stamp("Risk Rating Calculated", `${risk.level} (${risk.total} pts)`);
  const c: KycCase = {
    id: uid(),
    createdAt: new Date().toISOString(),
    type: "corporate",
    subjectName: data.companyName,
    corporate: data,
    ocr,
    sanctions: matches,
    pepHit, pepScore,
    adverseMedia: media,
    risk,
    edd: risk.level === "HIGH",
    audit,
    action: { notesIssue: "", notesRule: "", notesAnalysis: "", notesConclusion: "", decision: "pending", analyst: "Unassigned" },
  };
  upsertCase(c);
  return c;
}

export const COUNTRIES = [
  "Argentina","Australia","Austria","Bahrain","Bangladesh","Belgium","Bermuda","Brazil","British Virgin Islands","Canada",
  "Cayman Islands","Chile","China","Colombia","Cuba","Cyprus","Czech Republic","Denmark","Egypt","Estonia",
  "Finland","France","Germany","Ghana","Gibraltar","Greece","Guernsey","Hong Kong","Hungary","Iceland",
  "India","Indonesia","Iran","Iraq","Ireland","Isle of Man","Israel","Italy","Japan","Jersey",
  "Jordan","Kazakhstan","Kenya","Kuwait","Latvia","Lebanon","Liechtenstein","Lithuania","Luxembourg","Malaysia",
  "Malta","Mauritius","Mexico","Monaco","Morocco","Myanmar","Netherlands","New Zealand","Nigeria","North Korea",
  "Norway","Oman","Pakistan","Panama","Peru","Philippines","Poland","Portugal","Qatar","Romania",
  "Russia","Saudi Arabia","Seychelles","Singapore","Slovakia","Slovenia","South Africa","South Korea","South Sudan","Spain",
  "Sri Lanka","Sweden","Switzerland","Syria","Taiwan","Thailand","Turkey","UAE","Ukraine","United Kingdom",
  "United States","Uruguay","Venezuela","Vietnam","Yemen"
];
export const INDUSTRIES = ["Banking", "Technology", "Retail", "Manufacturing", "Healthcare", "Energy", "Crypto", "Gambling", "Arms", "Precious Metals", "Money Services", "Real Estate", "Consulting"];
export const OCCUPATIONS = ["Software Engineer", "Doctor", "Lawyer", "Teacher", "Retail Worker", "Executive", "Crypto Trader", "Casino Owner", "Politician", "Arms Dealer", "Cash Intensive Business", "Retired", "Student"];
