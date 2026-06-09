import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Users, Building2, ShieldCheck, Activity, ArrowRight, Lock, ScanLine, FileSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { loadCases, type KycCase } from "@/lib/kyc-store";
import { RiskBadge } from "@/components/RiskBadge";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Veridian KYC — Overview" },
      { name: "description", content: "Enterprise KYC/AML platform for tier-1 banks: onboarding, sanctions screening, EDD and analyst review." },
    ],
  }),
  component: Page,
});

function Page() {
  const [cases, setCases] = useState<KycCase[]>([]);
  useEffect(() => setCases(loadCases()), []);

  const total = cases.length;
  const high = cases.filter(c => c.risk.level === "HIGH").length;
  const pending = cases.filter(c => c.action.decision === "pending").length;
  const edd = cases.filter(c => c.edd).length;

  return (
    <AppShell>
      <section className="mb-8">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground mb-3">
          <span className="size-1.5 rounded-full bg-primary" />
          Compliance Operations
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
          End-to-end <span className="text-primary">KYC / AML orchestration</span> for global banks.
        </h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          Onboard individuals and corporate entities, run sanctions, PEP and adverse media screening, and route high-risk cases to analyst review — with a full audit trail ready for the regulator.
        </p>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat label="Cases" value={total} icon={Activity} />
        <Stat label="High Risk" value={high} icon={ShieldCheck} tone="destructive" />
        <Stat label="EDD Required" value={edd} icon={ScanLine} tone="warning" />
        <Stat label="Pending Review" value={pending} icon={FileSearch} tone="info" />
      </div>

      <div className="grid md:grid-cols-2 gap-4 mb-8">
        <OnboardCard
          to="/onboarding/individual"
          icon={Users}
          eyebrow="Retail"
          title="Individual Onboarding"
          body="Identity verification with passport/ID OCR, liveness selfie and proof-of-address review."
        />
        <OnboardCard
          to="/onboarding/corporate"
          icon={Building2}
          eyebrow="Entity"
          title="Corporate Onboarding"
          body="Company registry validation, UBO mapping and corporate documents review."
        />
      </div>

      <div className="card-elevated p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold flex items-center gap-2"><Lock className="size-4 text-muted-foreground" /> Recent Cases</h2>
          <Link to="/analyst" className="text-xs text-primary hover:underline flex items-center gap-1">Open Analyst Review <ArrowRight className="size-3" /></Link>
        </div>
        {cases.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No cases yet. Submit an onboarding to populate.</p>
        ) : (
          <ul className="divide-y divide-border">
            {cases.slice(0, 6).map(c => (
              <li key={c.id} className="py-3 flex items-center gap-3 text-sm">
                <span className="font-mono text-xs text-muted-foreground w-44 truncate">{c.id}</span>
                <span className="flex-1 truncate">{c.subjectName}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline w-24 capitalize">{c.type}</span>
                <RiskBadge level={c.risk.level} />
                <Link to="/analyst/$caseId" params={{ caseId: c.id }} className="text-xs text-primary hover:underline">Review</Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, icon: Icon, tone = "primary" }: { label: string; value: number; icon: any; tone?: "primary" | "destructive" | "warning" | "info" }) {
  const toneCls: Record<string, string> = {
    primary: "text-primary bg-primary/10 border-primary/20",
    destructive: "text-destructive bg-destructive/10 border-destructive/20",
    warning: "text-warning bg-warning/10 border-warning/30",
    info: "text-info bg-info/10 border-info/30",
  };
  return (
    <div className="card-elevated p-4 flex items-center gap-3">
      <div className={`size-10 rounded-md grid place-items-center border ${toneCls[tone]}`}>
        <Icon className="size-5" />
      </div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

function OnboardCard({ to, icon: Icon, eyebrow, title, body }: any) {
  return (
    <Link to={to} className="card-elevated p-6 group hover:border-primary/50 transition-colors block">
      <div className="flex items-start justify-between mb-4">
        <div className="size-11 rounded-md bg-primary/10 text-primary border border-primary/20 grid place-items-center">
          <Icon className="size-5" />
        </div>
        <ArrowRight className="size-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition" />
      </div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{eyebrow}</div>
      <div className="font-semibold text-lg mt-1">{title}</div>
      <p className="text-sm text-muted-foreground mt-2">{body}</p>
    </Link>
  );
}
