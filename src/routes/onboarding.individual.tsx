import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  COUNTRIES, OCCUPATIONS, INDUSTRIES, RELIGIONS, PHONE_CODES, INCOME_BUCKETS,
  createIndividualCase, type IndividualData,
} from "@/lib/kyc-store";
import { Upload, ScanFace, CheckCircle2, FileText, IdCard, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/individual")({
  head: () => ({
    meta: [
      { title: "Individual Onboarding — Veridian KYC" },
      { name: "description", content: "Retail KYC: demographics, identity, liveness, tax & financial profile." },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<IndividualData>({
    title: "Mr.", fullName: "", dob: "", placeOfBirth: "",
    gender: "Male", religion: "Prefer not to say",
    nationality: "United Kingdom", dualCitizenship: "None",
    phoneCountryCode: "+44", phoneNumber: "", email: "",
    residentialAddress: "", permanentAddress: "", sameAsResidential: true,
    idType: "Passport", idNumber: "", idDocName: undefined,
    selfieCaptured: false, livenessScore: 0,
    proofOfAddressName: undefined, addressCountry: "United Kingdom",
    tin: "", taxResidencyCountry: "United Kingdom",
    employmentStatus: "Employed", occupation: "Software Engineer",
    industry: "Technology", employerName: "",
    sourceOfWealth: "Salary & Savings", sourceOfFunds: "Monthly Salary",
    annualIncome: "$50k-$100k", monthlyVolume: "$10k-$50k",
    channel: "Online",
  });

  const set = <K extends keyof IndividualData>(k: K, v: IndividualData[K]) => setD(prev => ({ ...prev, [k]: v }));

  const steps = ["Demographics", "Contact", "Identification", "Liveness", "Tax & Financial", "Submit"];

  const submit = () => {
    if (!d.fullName || !d.dob || !d.idNumber || !d.selfieCaptured || !d.phoneNumber || !d.email || !d.residentialAddress) {
      toast.error("Complete all required fields before running screening");
      return;
    }
    const c = createIndividualCase(d);
    toast.success(`Case ${c.id} submitted — running compliance screening…`);
    navigate({ to: "/analyst/$caseId", params: { caseId: c.id } });
  };

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Retail Onboarding</div>
        <h1 className="text-2xl font-bold mt-1">Individual KYC</h1>
        <p className="text-sm text-muted-foreground mt-1">Citi/HSBC-grade data capture. All inputs are processed in the secure compliance layer.</p>
      </div>

      <Stepper steps={steps} current={step} />

      <div className="card-elevated p-6 mt-6">
        {step === 0 && (
          <Grid>
            <Field label="Title">
              <Select value={d.title} onChange={v => set("title", v as IndividualData["title"])} options={["Mr.", "Mrs.", "Ms.", "Dr."]} />
            </Field>
            <Field label="Full Legal Name *">
              <Input value={d.fullName} onChange={e => set("fullName", e.target.value)} placeholder="As shown on ID" />
            </Field>
            <Field label="Date of Birth *"><Input type="date" value={d.dob} onChange={e => set("dob", e.target.value)} /></Field>
            <Field label="Place of Birth"><Input value={d.placeOfBirth} onChange={e => set("placeOfBirth", e.target.value)} placeholder="City, Country" /></Field>
            <Field label="Gender">
              <Select value={d.gender} onChange={v => set("gender", v as IndividualData["gender"])} options={["Male", "Female", "Other", "Prefer not to say"]} />
            </Field>
            <Field label="Religion / Belief System">
              <Select value={d.religion} onChange={v => set("religion", v)} options={RELIGIONS} />
            </Field>
            <Field label="Nationality">
              <Select value={d.nationality} onChange={v => set("nationality", v)} options={COUNTRIES} />
            </Field>
            <Field label="Dual Citizenship">
              <Select value={d.dualCitizenship} onChange={v => set("dualCitizenship", v)} options={["None", ...COUNTRIES]} />
            </Field>
          </Grid>
        )}

        {step === 1 && (
          <Grid>
            <Field label="Mobile Phone *">
              <div className="flex gap-2">
                <div className="w-28">
                  <Select value={d.phoneCountryCode} onChange={v => set("phoneCountryCode", v)} options={PHONE_CODES} />
                </div>
                <Input value={d.phoneNumber} onChange={e => set("phoneNumber", e.target.value)} placeholder="812 3456 7890" />
              </div>
            </Field>
            <Field label="Verified Email *">
              <Input type="email" value={d.email} onChange={e => set("email", e.target.value)} placeholder="name@example.com" />
            </Field>
            <Field label="Current Residential Address *" full>
              <Input value={d.residentialAddress} onChange={e => set("residentialAddress", e.target.value)} placeholder="Street, City, Postal Code, Country" />
            </Field>
            <Field label="Country of Residence">
              <Select value={d.addressCountry} onChange={v => set("addressCountry", v)} options={COUNTRIES} />
            </Field>
            <Field label="Permanent Address" full>
              <div className="flex items-center gap-2 mb-2">
                <Checkbox id="sameAddr" checked={d.sameAsResidential} onCheckedChange={v => set("sameAsResidential", Boolean(v))} />
                <label htmlFor="sameAddr" className="text-sm text-muted-foreground select-none cursor-pointer">Same as residential address</label>
              </div>
              {!d.sameAsResidential && (
                <Input value={d.permanentAddress} onChange={e => set("permanentAddress", e.target.value)} placeholder="Permanent address if different" />
              )}
            </Field>
          </Grid>
        )}

        {step === 2 && (
          <Grid>
            <Field label="Government ID Type">
              <Select value={d.idType} onChange={v => set("idType", v as IndividualData["idType"])} options={["Passport", "National ID / KTP", "Driving License"]} />
            </Field>
            <Field label="ID Serial Number *">
              <Input value={d.idNumber} onChange={e => set("idNumber", e.target.value.toUpperCase())} placeholder="e.g. P12345678" />
            </Field>
            <Field label="Tax ID (TIN / NPWP)">
              <Input value={d.tin} onChange={e => set("tin", e.target.value)} placeholder="Tax identification number" />
            </Field>
            <Field label="Tax Residency Country">
              <Select value={d.taxResidencyCountry} onChange={v => set("taxResidencyCountry", v)} options={COUNTRIES} />
            </Field>
            <Field label="ID Document Upload" full>
              <FileDrop label="Upload front of document (JPG/PDF)" icon={IdCard} value={d.idDocName} onFile={f => set("idDocName", f.name)} />
            </Field>
            <Field label="Proof of Address" full>
              <FileDrop label="Utility bill or bank statement (last 3 months)" icon={FileText} value={d.proofOfAddressName} onFile={f => set("proofOfAddressName", f.name)} />
            </Field>
          </Grid>
        )}

        {step === 3 && (
          <div className="grid place-items-center py-6">
            <div className="text-center max-w-md">
              <div className="size-32 mx-auto rounded-full border-4 border-dashed border-primary/40 grid place-items-center bg-primary/5 mb-4">
                {d.selfieCaptured ? <CheckCircle2 className="size-14 text-success" /> : <ScanFace className="size-14 text-primary" />}
              </div>
              <h3 className="font-semibold">Liveness Selfie</h3>
              <p className="text-sm text-muted-foreground mt-1">Simulated active liveness — blink and turn left/right.</p>
              {d.selfieCaptured ? (
                <div className="mt-4 p-3 rounded-md bg-success/10 border border-success/30 text-success text-sm">
                  Liveness verified — {d.livenessScore}% confidence
                </div>
              ) : (
                <Button className="mt-4" onClick={() => { const s = 88 + Math.floor(Math.random() * 11); set("selfieCaptured", true); set("livenessScore", s); }}>
                  Capture Selfie
                </Button>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <Grid>
            <Field label="Employment Status">
              <Select value={d.employmentStatus} onChange={v => set("employmentStatus", v as IndividualData["employmentStatus"])}
                options={["Employed", "Self-Employed", "Business Owner", "Retired", "Student", "Unemployed"]} />
            </Field>
            <Field label="Occupation">
              <Select value={d.occupation} onChange={v => set("occupation", v)} options={OCCUPATIONS} />
            </Field>
            <Field label="Industry">
              <Select value={d.industry} onChange={v => set("industry", v)} options={INDUSTRIES} />
            </Field>
            <Field label="Employer Name">
              <Input value={d.employerName} onChange={e => set("employerName", e.target.value)} placeholder="Company name (or 'Self')" />
            </Field>
            <Field label="Source of Wealth" full>
              <Input value={d.sourceOfWealth} onChange={e => set("sourceOfWealth", e.target.value)} placeholder="e.g. Inheritance 2018, property sale, business profits" />
            </Field>
            <Field label="Source of Funds" full>
              <Input value={d.sourceOfFunds} onChange={e => set("sourceOfFunds", e.target.value)} placeholder="e.g. Monthly salary from Acme Corp" />
            </Field>
            <Field label="Estimated Annual Income">
              <Select value={d.annualIncome} onChange={v => set("annualIncome", v as IndividualData["annualIncome"])} options={INCOME_BUCKETS} />
            </Field>
            <Field label="Expected Monthly Transaction Volume">
              <Select value={d.monthlyVolume} onChange={v => set("monthlyVolume", v as IndividualData["monthlyVolume"])} options={INCOME_BUCKETS} />
            </Field>
            <Field label="Onboarding Channel">
              <Select value={d.channel} onChange={v => set("channel", v as IndividualData["channel"])} options={["Branch", "Online", "Mobile App", "Agent"]} />
            </Field>
          </Grid>
        )}

        {step === 5 && (
          <div className="text-center py-8 max-w-lg mx-auto">
            <div className="size-16 mx-auto rounded-full bg-primary/10 grid place-items-center mb-4">
              <ShieldCheck className="size-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Ready to run compliance screening</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Customer data is held in the secure compliance state. The full file is only rendered inside the
              audit-trail case view after screening completes.
            </p>
            <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-3">
              Submitting triggers sanctions, PEP and adverse-media screening against OFAC, UN and EU lists
              and computes a Customer Risk Rating.
            </p>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={submit}><ShieldCheck className="size-4" /> Run Screening</Button>
          )}
        </div>
      </div>
    </AppShell>
  );
}

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2 overflow-x-auto">
      {steps.map((s, i) => {
        const done = i < current; const active = i === current;
        return (
          <li key={s} className="flex items-center gap-2 min-w-fit">
            <div className={`size-7 rounded-full grid place-items-center text-xs font-semibold border ${active ? "bg-primary text-primary-foreground border-primary" : done ? "bg-success text-success-foreground border-success" : "bg-muted text-muted-foreground border-border"}`}>
              {done ? "✓" : i + 1}
            </div>
            <span className={`text-xs ${active ? "text-foreground font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < steps.length - 1 && <span className="w-8 h-px bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}
export function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid md:grid-cols-2 gap-4">{children}</div>;
}
export function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className={full ? "md:col-span-2" : ""}>
      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</Label>
      {children}
    </div>
  );
}
export function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring">
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
export function FileDrop({ label, icon: Icon, value, onFile }: { label: string; icon: any; value?: string; onFile: (f: File) => void }) {
  return (
    <label className="flex items-center gap-3 p-4 border-2 border-dashed border-border rounded-md cursor-pointer hover:border-primary/50 hover:bg-accent/40 transition">
      <div className="size-10 rounded-md bg-primary/10 text-primary grid place-items-center"><Icon className="size-5" /></div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{value || label}</div>
        <div className="text-xs text-muted-foreground">{value ? "Click to replace" : "Drag & drop or click to browse"}</div>
      </div>
      <Upload className="size-4 text-muted-foreground" />
      <input type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
    </label>
  );
}
