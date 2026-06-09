import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { COUNTRIES, INDUSTRIES, createCorporateCase, type CorporateData, type UBO } from "@/lib/kyc-store";
import { Building2, FileText, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Stepper, Grid, Field, Select, FileDrop } from "./onboarding.individual";

export const Route = createFileRoute("/onboarding/corporate")({
  head: () => ({
    meta: [
      { title: "Corporate Onboarding — Veridian KYC" },
      { name: "description", content: "Corporate KYC: entity verification, UBO mapping and document review." },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<CorporateData>({
    companyName: "", registrationNumber: "", incorporationCountry: "United Kingdom",
    industry: "Technology", ubos: [{ name: "", ownership: 100, nationality: "United Kingdom" }],
    corpDocName: undefined, channel: "RM Onboarded",
  });
  const set = <K extends keyof CorporateData>(k: K, v: CorporateData[K]) => setD(prev => ({ ...prev, [k]: v }));
  const setUBO = (i: number, p: Partial<UBO>) => set("ubos", d.ubos.map((u, idx) => idx === i ? { ...u, ...p } : u));
  const addUBO = () => set("ubos", [...d.ubos, { name: "", ownership: 0, nationality: "United Kingdom" }]);
  const delUBO = (i: number) => set("ubos", d.ubos.filter((_, idx) => idx !== i));

  const steps = ["Entity", "UBOs", "Documents & Channel", "Review"];

  const submit = () => {
    if (!d.companyName || !d.registrationNumber || d.ubos.some(u => !u.name)) { toast.error("Complete all required fields"); return; }
    const c = createCorporateCase(d);
    toast.success(`Case ${c.id} submitted for compliance review`);
    navigate({ to: "/analyst/$caseId", params: { caseId: c.id } });
  };

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Entity Onboarding</div>
        <h1 className="text-2xl font-bold mt-1">Corporate KYC</h1>
      </div>
      <Stepper steps={steps} current={step} />

      <div className="card-elevated p-6 mt-6">
        {step === 0 && (
          <Grid>
            <Field label="Legal Company Name *"><Input value={d.companyName} onChange={e => set("companyName", e.target.value)} placeholder="As registered" /></Field>
            <Field label="Registration Number *"><Input value={d.registrationNumber} onChange={e => set("registrationNumber", e.target.value.toUpperCase())} placeholder="e.g. 09876543" /></Field>
            <Field label="Country of Incorporation">
              <Select value={d.incorporationCountry} onChange={v => set("incorporationCountry", v)} options={COUNTRIES} />
            </Field>
            <Field label="Primary Industry">
              <Select value={d.industry} onChange={v => set("industry", v)} options={INDUSTRIES} />
            </Field>
          </Grid>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Ultimate Beneficial Owners</h3>
                <p className="text-xs text-muted-foreground">Declare every natural person owning ≥ 25% or exercising control.</p>
              </div>
              <Button variant="outline" size="sm" onClick={addUBO}><Plus className="size-4" /> Add UBO</Button>
            </div>
            <div className="space-y-3">
              {d.ubos.map((u, i) => (
                <div key={i} className="grid md:grid-cols-12 gap-3 p-3 border border-border rounded-md bg-muted/30">
                  <div className="md:col-span-5"><Input value={u.name} onChange={e => setUBO(i, { name: e.target.value })} placeholder="Full name" /></div>
                  <div className="md:col-span-2"><Input type="number" min={0} max={100} value={u.ownership} onChange={e => setUBO(i, { ownership: Number(e.target.value) })} placeholder="%" /></div>
                  <div className="md:col-span-4"><Select value={u.nationality} onChange={v => setUBO(i, { nationality: v })} options={COUNTRIES} /></div>
                  <div className="md:col-span-1 flex justify-end">
                    {d.ubos.length > 1 && <Button variant="ghost" size="icon" onClick={() => delUBO(i)}><Trash2 className="size-4 text-destructive" /></Button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {step === 2 && (
          <Grid>
            <Field label="Onboarding Channel">
              <Select value={d.channel} onChange={v => set("channel", v as CorporateData["channel"])} options={["Branch", "Online", "RM Onboarded", "Agent"]} />
            </Field>
            <Field label="Corporate Documents" full>
              <FileDrop label="Upload Certificate of Incorporation, M&AA, register of members" icon={FileText} value={d.corpDocName} onFile={f => set("corpDocName", f.name)} />
            </Field>
          </Grid>
        )}
        {step === 3 && (
          <div className="space-y-3 text-sm">
            <h3 className="font-semibold mb-2 flex items-center gap-2"><Building2 className="size-4" /> Confirm submission</h3>
            <Row k="Company" v={d.companyName || "—"} />
            <Row k="Registration" v={`${d.registrationNumber || "—"} • ${d.incorporationCountry}`} />
            <Row k="Industry" v={d.industry} />
            <Row k="Channel" v={d.channel} />
            <div className="py-1.5 border-b border-border/60">
              <div className="text-muted-foreground mb-1">UBOs ({d.ubos.length})</div>
              <ul className="space-y-1">
                {d.ubos.map((u, i) => <li key={i} className="font-medium">{u.name || "(unnamed)"} — {u.ownership}% — {u.nationality}</li>)}
              </ul>
            </div>
            <Row k="Documents" v={d.corpDocName || "—"} />
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

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between gap-4 py-1.5 border-b border-border/60"><span className="text-muted-foreground">{k}</span><span className="font-medium text-right truncate">{v}</span></div>;
}
