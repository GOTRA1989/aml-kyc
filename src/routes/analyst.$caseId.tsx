import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { addAudit, getCase, upsertCase, type KycCase, type Decision } from "@/lib/kyc-store";
import { RiskBadge } from "@/components/RiskBadge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { exportAuditPdf } from "@/lib/pdf-export";
import { ArrowLeft, FileDown, ShieldAlert, Newspaper, Gauge, AlertTriangle, CheckCircle2, XCircle, ArrowUpRight, ScanLine, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/analyst/$caseId")({
  head: () => ({ meta: [{ title: "Case Review — Veridian KYC" }, { name: "description", content: "Compliance officer case review." }] }),
  component: Page,
});

function Page() {
  const { caseId } = Route.useParams();
  const navigate = useNavigate();
  const [c, setC] = useState<KycCase | undefined>();

  useEffect(() => { setC(getCase(caseId)); }, [caseId]);

  if (!c) {
    return (
      <AppShell>
        <div className="card-elevated p-10 text-center">
          <h2 className="text-lg font-semibold">Case not found</h2>
          <p className="text-sm text-muted-foreground mt-2">It may have been cleared from local storage.</p>
          <Button className="mt-4" onClick={() => navigate({ to: "/analyst" })}>Back to queue</Button>
        </div>
      </AppShell>
    );
  }

  const update = (patch: Partial<KycCase["action"]>) => {
    const next = { ...c, action: { ...c.action, ...patch } };
    setC(next); upsertCase(next);
  };

  const decide = (decision: Decision) => {
    const next = { ...c, action: { ...c.action, decision, decidedAt: new Date().toISOString(), analyst: c.action.analyst || "J. Carter (MLRO Team)" } };
    setC(next); upsertCase(next);
    addAudit(c.id, { action: `Decision: ${decision.toUpperCase()}`, detail: `By ${next.action.analyst}` });
    toast.success(`Case ${decision}`);
    setC(getCase(c.id));
  };

  return (
    <AppShell>
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link to="/analyst" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"><ArrowLeft className="size-3" /> Back to queue</Link>
          <h1 className="text-2xl font-bold mt-1">{c.subjectName}</h1>
          <div className="text-xs text-muted-foreground font-mono mt-1">{c.id} · {c.type.toUpperCase()} · Opened {new Date(c.createdAt).toLocaleString()}</div>
        </div>
        <div className="flex items-center gap-3">
          {c.edd && <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-warning/15 text-warning border border-warning/30 inline-flex items-center gap-1.5"><AlertTriangle className="size-3.5" /> EDD REQUIRED</span>}
          <RiskBadge level={c.risk.level} />
          <Button variant="outline" onClick={() => { exportAuditPdf(c); addAudit(c.id, { action: "Audit PDF Exported" }); }}>
            <FileDown className="size-4" /> Export Audit Report
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title="OCR / Extracted Data" icon={ScanLine}>
            <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              {Object.entries(c.ocr).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 py-1 border-b border-border/60">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="font-medium text-right truncate">{v}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card title="Sanctions & PEP Screening" icon={ShieldAlert}>
            <div className="grid sm:grid-cols-3 gap-3">
              {c.sanctions.map(m => (
                <div key={m.list} className={`rounded-md border p-3 ${m.hit ? "border-destructive/40 bg-destructive/5" : "border-success/30 bg-success/5"}`}>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-sm">{m.list}</div>
                    <span className={`text-[10px] uppercase tracking-wider font-bold ${m.hit ? "text-destructive" : "text-success"}`}>{m.hit ? "Match" : "Clear"}</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">Fuzzy score</div>
                  <div className="flex items-end gap-2">
                    <div className="text-2xl font-bold">{m.score}%</div>
                  </div>
                  <div className="h-1.5 mt-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${m.hit ? "bg-destructive" : "bg-success"}`} style={{ width: `${m.score}%` }} />
                  </div>
                  {m.name && <div className="text-[11px] text-muted-foreground mt-2 italic">Closest: "{m.name}"</div>}
                </div>
              ))}
            </div>
            <div className={`mt-3 rounded-md border p-3 text-sm ${c.pepHit ? "border-warning/40 bg-warning/10" : "border-border bg-muted/30"}`}>
              <div className="flex items-center justify-between">
                <div><strong>PEP Status:</strong> {c.pepHit ? "Politically Exposed Person — match" : "No PEP match"}</div>
                <div className="text-xs">Score <strong>{c.pepScore}%</strong></div>
              </div>
            </div>
          </Card>

          <Card title="Adverse Media" icon={Newspaper}>
            <ul className="space-y-2">
              {c.adverseMedia.map((a, i) => (
                <li key={i} className={`rounded-md border p-3 text-sm ${a.severity === "high" ? "border-destructive/40 bg-destructive/5" : a.severity === "low" ? "border-warning/30 bg-warning/5" : "border-success/30 bg-success/5"}`}>
                  <div className="flex items-center justify-between gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${a.severity === "high" ? "text-destructive" : a.severity === "low" ? "text-warning" : "text-success"}`}>
                      {a.severity === "none" ? "Clear" : a.severity === "high" ? "High Alert" : "Low"}
                    </span>
                    <span className="text-xs text-muted-foreground">{a.source} · {a.date}</span>
                  </div>
                  <div className="mt-1 font-medium">{a.headline}</div>
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Customer Risk Rating (CRR)" icon={Gauge}>
            <div className="flex items-center gap-6 flex-wrap mb-4">
              <div>
                <div className="text-xs text-muted-foreground">Final Rating</div>
                <div className="mt-1"><RiskBadge level={c.risk.level} /></div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Score</div>
                <div className="text-3xl font-bold tabular-nums">{c.risk.total}<span className="text-base text-muted-foreground"> / 160</span></div>
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full ${c.risk.level === "HIGH" ? "bg-destructive" : c.risk.level === "MEDIUM" ? "bg-warning" : "bg-success"}`} style={{ width: `${Math.min(100, (c.risk.total / 160) * 100)}%` }} />
                </div>
                <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  <span>Low</span><span>Medium</span><span>High</span>
                </div>
              </div>
            </div>
            <div className="grid sm:grid-cols-3 gap-2 text-sm">
              <RiskFactor label="Geography" v={c.risk.geography} />
              <RiskFactor label="Industry / Occupation" v={c.risk.industry} />
              <RiskFactor label="Channel" v={c.risk.channel} />
              <RiskFactor label="PEP" v={c.risk.pep} />
              <RiskFactor label="Sanctions" v={c.risk.sanctions} />
              <RiskFactor label="Adverse Media" v={c.risk.adverseMedia} />
            </div>
          </Card>

          {c.edd && (
            <Card title="Enhanced Due Diligence" icon={AlertTriangle} tone="warning">
              <p className="text-sm text-muted-foreground mb-3">Triggered automatically due to HIGH risk rating. Source of Funds and Wealth must be verified before approval.</p>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source of Funds (SoF)</label>
                  <Textarea rows={4} placeholder="e.g. Salary from Acme Corp, supported by 3 months payslips and bank statements." value={c.action.sourceOfFunds || ""} onChange={e => update({ sourceOfFunds: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source of Wealth (SoW)</label>
                  <Textarea rows={4} placeholder="e.g. Inheritance 2018 (probate ref XYZ), property sale 2021." value={c.action.sourceOfWealth || ""} onChange={e => update({ sourceOfWealth: e.target.value })} />
                </div>
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card title="Analyst Action" icon={CheckCircle2}>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Analyst</label>
                <Input value={c.action.analyst} onChange={e => update({ analyst: e.target.value })} placeholder="Name (e.g. J. Carter, MLRO)" />
              </div>
              <div className="rounded-md border border-border p-3 space-y-2">
                <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Compliance Notes — IRAC</div>
                <IRACField label="Issue" value={c.action.notesIssue} onChange={v => update({ notesIssue: v })} placeholder="What compliance question is being decided?" />
                <IRACField label="Rule" value={c.action.notesRule} onChange={v => update({ notesRule: v })} placeholder="Applicable regulation (e.g. JMLSG 5.3, FATF R.10)." />
                <IRACField label="Analysis" value={c.action.notesAnalysis} onChange={v => update({ notesAnalysis: v })} placeholder="Application of rule to facts of this case." />
                <IRACField label="Conclusion" value={c.action.notesConclusion} onChange={v => update({ notesConclusion: v })} placeholder="Decision and rationale." />
              </div>
              <div className="grid gap-2">
                <Button onClick={() => decide("approved")} className="bg-success text-success-foreground hover:bg-success/90"><CheckCircle2 className="size-4" /> Approve Customer</Button>
                <Button onClick={() => decide("rejected")} variant="destructive"><XCircle className="size-4" /> Reject / Block</Button>
                <Button onClick={() => decide("escalated")} className="bg-warning text-warning-foreground hover:bg-warning/90"><ArrowUpRight className="size-4" /> Escalate to MLRO</Button>
              </div>
              {c.action.decidedAt && (
                <div className="text-xs text-muted-foreground border-t border-border pt-2">
                  Last decision: <strong className="capitalize">{c.action.decision}</strong> · {new Date(c.action.decidedAt).toLocaleString()}
                </div>
              )}
            </div>
          </Card>

          <Card title="Audit Trail" icon={Clock}>
            <ol className="space-y-2 text-sm">
              {[...c.audit].reverse().map((a, i) => (
                <li key={i} className="flex gap-3">
                  <div className="size-2 mt-2 rounded-full bg-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium">{a.action}</div>
                    {a.detail && <div className="text-xs text-muted-foreground">{a.detail}</div>}
                    <div className="text-[10px] text-muted-foreground font-mono">{new Date(a.timestamp).toLocaleString()}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function Card({ title, icon: Icon, tone, children }: { title: string; icon: any; tone?: "warning"; children: React.ReactNode }) {
  return (
    <section className={`card-elevated p-5 ${tone === "warning" ? "border-warning/40" : ""}`}>
      <h2 className="font-semibold flex items-center gap-2 mb-4">
        <Icon className={`size-4 ${tone === "warning" ? "text-warning" : "text-muted-foreground"}`} />
        {title}
      </h2>
      {children}
    </section>
  );
}

function RiskFactor({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-md border border-border p-2.5 bg-muted/30">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">+{v}</div>
    </div>
  );
}

function IRACField({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold text-primary mb-0.5">{label}</div>
      <Textarea rows={2} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="text-sm" />
    </div>
  );
}
