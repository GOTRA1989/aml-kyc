import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COUNTRIES, OCCUPATIONS, createIndividualCase, type IndividualData } from "@/lib/kyc-store";
import { Upload, ScanFace, CheckCircle2, FileText, IdCard } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/onboarding/individual")({
  head: () => ({
    meta: [
      { title: "Individual Onboarding — Veridian KYC" },
      { name: "description", content: "Retail KYC: identity capture, liveness selfie and proof of address." },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<IndividualData>({
    fullName: "", dob: "", nationality: "United States",
    idType: "Passport", idNumber: "", idDocName: undefined,
    selfieCaptured: false, livenessScore: 0,
    proofOfAddressName: undefined, addressCountry: "United States",
    occupation: "Software Engineer", channel: "Online",
  });

  const set = <K extends keyof IndividualData>(k: K, v: IndividualData[K]) => setD(prev => ({ ...prev, [k]: v }));

  const steps = ["Personal", "Identity Document", "Liveness", "Address & Profile", "Review"];

  const submit = () => {
    if (!d.fullName || !d.idNumber || !d.selfieCaptured) { toast.error("Complete all required fields"); return; }
    const c = createIndividualCase(d);
    toast.success(`Case ${c.id} submitted for compliance review`);
    navigate({ to: "/analyst/$caseId", params: { caseId: c.id } });
  };

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Retail Onboarding</div>
        <h1 className="text-2xl font-bold mt-1">Individual KYC</h1>
      </div>

      <Stepper steps={steps} current={step} />

      <div className="card-elevated p-6 mt-6">
        {step === 0 && (
          <Grid>
            <Field label="Full Legal Name *"><Input value={d.fullName} onChange={e => set("fullName", e.target.value)} placeholder="As shown on ID" /></Field>
            <Field label="Date of Birth"><Input type="date" value={d.dob} onChange={e => set("dob", e.target.value)} /></Field>
            <Field label="Nationality">
              <Select value={d.nationality} onChange={v => set("nationality", v)} options={COUNTRIES} />
            </Field>
          </Grid>
        )}
        {step === 1 && (
          <Grid>
            <Field label="Document Type">
              <Select value={d.idType} onChange={v => set("idType", v as IndividualData["idType"])} options={["Passport", "National ID", "Driver License"]} />
            </Field>
            <Field label="Document Number *"><Input value={d.idNumber} onChange={e => set("idNumber", e.target.value.toUpperCase())} placeholder="e.g. P12345678" /></Field>
            <Field label="Document Upload" full>
              <FileDrop label="Upload front of document (JPG/PDF)" icon={IdCard} value={d.idDocName} onFile={f => set("idDocName", f.name)} />
            </Field>
          </Grid>
        )}
        {step === 2 && (
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
        {step === 3 && (
          <Grid>
            <Field label="Country of Residence">
              <Select value={d.addressCountry} onChange={v => set("addressCountry", v)} options={COUNTRIES} />
            </Field>
            <Field label="Occupation">
              <Select value={d.occupation} onChange={v => set("occupation", v)} options={OCCUPATIONS} />
            </Field>
            <Field label="Onboarding Channel">
              <Select value={d.channel} onChange={v => set("channel", v as IndividualData["channel"])} options={["Branch", "Online", "Mobile App", "Agent"]} />
            </Field>
            <Field label="Proof of Address" full>
              <FileDrop label="Upload utility bill or bank statement (last 3 months)" icon={FileText} value={d.proofOfAddressName} onFile={f => set("proofOfAddressName", f.name)} />
            </Field>
          </Grid>
        )}
        {step === 4 && (
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold mb-2">Confirm submission</h3>
            <Row k="Name" v={d.fullName || "—"} />
            <Row k="DOB / Nationality" v={`${d.dob || "—"} • ${d.nationality}`} />
            <Row k="ID" v={`${d.idType} #${d.idNumber || "—"}${d.idDocName ? " (" + d.idDocName + ")" : ""}`} />
            <Row k="Liveness" v={d.selfieCaptured ? `Verified ${d.livenessScore}%` : "Not captured"} />
            <Row k="Address Country" v={d.addressCountry} />
            <Row k="Occupation" v={d.occupation} />
            <Row k="Channel" v={d.channel} />
            <Row k="Proof of Address" v={d.proofOfAddressName || "—"} />
            <p className="text-xs text-muted-foreground pt-3 border-t border-border">
              Submitting will trigger sanctions / PEP / adverse media screening and risk rating.
            </p>
          </div>
        )}

        <div className="flex justify-between mt-8 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0}>Back</Button>
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)}>Continue</Button>
          ) : (
            <Button onClick={submit}>Submit for Compliance Review</Button>
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
function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 py-1.5 border-b border-border/60"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right truncate">{v}</span></div>;
}
