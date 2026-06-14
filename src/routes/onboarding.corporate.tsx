import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  COUNTRIES, INDUSTRIES, CORP_VOLUME_BUCKETS,
  createCorporateCase, type CorporateData, type UBO,
} from "@/lib/kyc-store";
import { FileText, Trash2, Plus, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Stepper, Grid, Field, Select, FileDrop } from "./onboarding.individual";

export const Route = createFileRoute("/onboarding/corporate")({
  head: () => ({
    meta: [
      { title: "Corporate Onboarding — Veridian KYC" },
      { name: "description", content: "Corporate KYC: entity, structure, UBO mapping & financial scale." },
    ],
  }),
  component: Page,
});

function Page() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<CorporateData>({
    companyName: "", tradingName: "",
    legalEntityType: "LLC / PT",
    registrationNumber: "", incorporationDate: "",
    incorporationCountry: "United Kingdom",
    corpTin: "",
    parentCompany: "", parentCountry: "None",
    industry: "Technology", hqAddress: "",
    sourceOfFunds: "Operating Revenue",
    monthlyVolume: "$50k-$250k",
    ubos: [{ name: "", ownership: 100, nationality: "United Kingdom", idType: "Passport", idNumber: "", designation: "Director" }],
    corpDocName: undefined, channel: "RM Onboarded",
  });
  const set = <K extends keyof CorporateData>(k: K, v: CorporateData[K]) => setD(prev => ({ ...prev, [k]: v }));
  const setUBO = (i: number, p: Partial<UBO>) => set("ubos", d.ubos.map((u, idx) => idx === i ? { ...u, ...p } : u));
  const addUBO = () => set("ubos", [...d.ubos, { name: "", ownership: 0, nationality: "United Kingdom", idType: "Passport", idNumber: "", designation: "" }]);
  const delUBO = (i: number) => set("ubos", d.ubos.filter((_, idx) => idx !== i));

  const steps = ["Entity Identity", "Corporate Structure & UBO", "Operations & Financial", "Documents", "Submit"];

  const submit = () => {
    if (!d.companyName || !d.registrationNumber || !d.incorporationDate || !d.corpTin || !d.hqAddress
        || d.ubos.some(u => !u.name || !u.idNumber)) {
      toast.error("Complete all required fields before running screening");
      return;
    }
    const c = createCorporateCase(d);
    toast.success(`Case ${c.id} submitted — running compliance screening…`);
    navigate({ to: "/analyst/$caseId", params: { caseId: c.id } });
  };

  return (
    <AppShell>
      <div className="mb-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Entity Onboarding</div>
        <h1 className="text-2xl font-bold mt-1">Corporate KYC</h1>
        <p className="text-sm text-muted-foreground mt-1">Citi/HSBC-grade institutional intake. UBO data feeds the AML risk engine.</p>
      </div>
      <Stepper steps={steps} current={step} />

      <div className="card-elevated p-6 mt-6">
        {step === 0 && (
          <Grid>
            <Field label="Registered Company Name *">
              <Input value={d.companyName} onChange={e => set("companyName", e.target.value)} placeholder="As registered" />
            </Field>
            <Field label="Trading Name">
              <Input value={d.tradingName} onChange={e => set("tradingName", e.target.value)} placeholder="DBA / brand name" />
            </Field>
            <Field label="Legal Entity Type">
              <Select value={d.legalEntityType} onChange={v => set("legalEntityType", v as CorporateData["legalEntityType"])}
                options={["LLC / PT", "Limited Partnership", "Trust", "Foundation", "Shell Corporation"]} />
            </Field>
            <Field label="Registration No. / Business ID (NIB) *">
              <Input value={d.registrationNumber} onChange={e => set("registrationNumber", e.target.value.toUpperCase())} placeholder="e.g. 09876543" />
            </Field>
            <Field label="Date of Incorporation *">
              <Input type="date" value={d.incorporationDate} onChange={e => set("incorporationDate", e.target.value)} />
            </Field>
            <Field label="Country of Incorporation (Yurisdiksi)">
              <Select value={d.incorporationCountry} onChange={v => set("incorporationCountry", v)} options={COUNTRIES} />
            </Field>
            <Field label="Corporate TIN / NPWP Perusahaan *" full>
              <Input value={d.corpTin} onChange={e => set("corpTin", e.target.value)} placeholder="Tax identification number" />
            </Field>
          </Grid>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <Grid>
              <Field label="Parent Company / Holding Entity">
                <Input value={d.parentCompany} onChange={e => set("parentCompany", e.target.value)} placeholder="Immediate parent or holding entity" />
              </Field>
              <Field label="Country of Parent Incorporation">
                <Select value={d.parentCountry} onChange={v => set("parentCountry", v)} options={["None", ...COUNTRIES]} />
              </Field>
            </Grid>

            <div>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-semibold">Ultimate Beneficial Owners (UBO)</h3>
                  <p className="text-xs text-muted-foreground">Declare every natural person owning ≥ 25% shares/voting rights or exercising control.</p>
                </div>
                <Button variant="outline" size="sm" onClick={addUBO}><Plus className="size-4" /> Add UBO</Button>
              </div>
              <div className="space-y-3">
                {d.ubos.map((u, i) => (
                  <div key={i} className="p-3 border border-border rounded-md bg-muted/30 space-y-2">
                    <div className="grid md:grid-cols-12 gap-2">
                      <div className="md:col-span-5">
                        <Input value={u.name} onChange={e => setUBO(i, { name: e.target.value })} placeholder="Full legal name *" />
                      </div>
                      <div className="md:col-span-2">
                        <Input type="number" min={0} max={100} value={u.ownership}
                          onChange={e => setUBO(i, { ownership: Number(e.target.value) })} placeholder="%" />
                      </div>
                      <div className="md:col-span-4">
                        <Select value={u.nationality} onChange={v => setUBO(i, { nationality: v })} options={COUNTRIES} />
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        {d.ubos.length > 1 && (
                          <Button variant="ghost" size="icon" onClick={() => delUBO(i)}>
                            <Trash2 className="size-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="grid md:grid-cols-12 gap-2">
                      <div className="md:col-span-3">
                        <Select value={u.idType || "Passport"} onChange={v => setUBO(i, { idType: v as UBO["idType"] })} options={["Passport", "National ID"]} />
                      </div>
                      <div className="md:col-span-5">
                        <Input value={u.idNumber || ""} onChange={e => setUBO(i, { idNumber: e.target.value.toUpperCase() })} placeholder="UBO ID Number *" />
                      </div>
                      <div className="md:col-span-4">
                        <Input value={u.designation || ""} onChange={e => setUBO(i, { designation: e.target.value })} placeholder="Designation (e.g. CEO, Settlor)" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <Grid>
            <Field label="Industry Sector">
              <Select value={d.industry} onChange={v => set("industry", v)} options={INDUSTRIES} />
            </Field>
            <Field label="Expected Monthly Transaction Volume">
              <Select value={d.monthlyVolume} onChange={v => set("monthlyVolume", v as CorporateData["monthlyVolume"])} options={CORP_VOLUME_BUCKETS} />
            </Field>
            <Field label="Principal Place of Business / HQ Address *" full>
              <Input value={d.hqAddress} onChange={e => set("hqAddress", e.target.value)} placeholder="Street, City, Postal Code, Country" />
            </Field>
            <Field label="Source of Corporate Capital / Funds" full>
              <Input value={d.sourceOfFunds} onChange={e => set("sourceOfFunds", e.target.value)}
                placeholder="e.g. Equity issuance, retained earnings, bank financing" />
            </Field>
            <Field label="Onboarding Channel">
              <Select value={d.channel} onChange={v => set("channel", v as CorporateData["channel"])}
                options={["Branch", "Online", "RM Onboarded", "Agent"]} />
            </Field>
          </Grid>
        )}

        {step === 3 && (
          <Grid>
            <Field label="Corporate Documents" full>
              <FileDrop label="Upload Certificate of Incorporation, M&AA, register of members"
                icon={FileText} value={d.corpDocName} onFile={f => set("corpDocName", f.name)} />
            </Field>
          </Grid>
        )}

        {step === 4 && (
          <div className="text-center py-8 max-w-lg mx-auto">
            <div className="size-16 mx-auto rounded-full bg-primary/10 grid place-items-center mb-4">
              <ShieldCheck className="size-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Ready to run compliance screening</h3>
            <p className="text-sm text-muted-foreground mt-2">
              Entity, parent and UBO data are held in the secure compliance state. The full case file is only
              rendered inside the audit-trail review after screening completes.
            </p>
            <p className="text-xs text-muted-foreground mt-3 border-t border-border pt-3">
              Submitting screens the company, parent and all UBOs against OFAC / UN / EU lists, PEP database
              and the adverse media engine, then computes the Customer Risk Rating.
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
