import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { loadCases, type KycCase } from "@/lib/kyc-store";
import { RiskBadge } from "@/components/RiskBadge";
import { StatusBadge, statusFromCase } from "@/components/StatusBadge";
import { Input } from "@/components/ui/input";
import { Search, ShieldAlert } from "lucide-react";

export const Route = createFileRoute("/analyst/")({
  head: () => ({ meta: [{ title: "Analyst Review — Veridian KYC" }, { name: "description", content: "Compliance officer case queue." }] }),
  component: Page,
});

function Page() {
  const [cases, setCases] = useState<KycCase[]>([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "high" | "edd">("all");

  useEffect(() => setCases(loadCases()), []);

  const filtered = useMemo(() => cases.filter(c => {
    if (filter === "pending" && c.action.decision !== "pending") return false;
    if (filter === "high" && c.risk.level !== "HIGH") return false;
    if (filter === "edd" && !c.edd) return false;
    if (q && !(`${c.id} ${c.subjectName}`.toLowerCase().includes(q.toLowerCase()))) return false;
    return true;
  }), [cases, q, filter]);

  return (
    <AppShell>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <ShieldAlert className="size-3.5" /> Internal — Compliance Officers Only
          </div>
          <h1 className="text-2xl font-bold mt-1">Analyst Review Queue</h1>
          <p className="text-sm text-muted-foreground mt-1">Sanctions, PEP, adverse media and risk rated cases awaiting decision.</p>
        </div>
        <div className="relative w-72">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search case or subject…" className="pl-9" />
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {([["all", "All"], ["pending", "Pending"], ["high", "High Risk"], ["edd", "EDD Required"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)} className={`px-3 py-1.5 text-xs rounded-full border transition ${filter === k ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-accent"}`}>
            {l} <span className="opacity-60 ml-1">{k === "all" ? cases.length : k === "pending" ? cases.filter(c => c.action.decision === "pending").length : k === "high" ? cases.filter(c => c.risk.level === "HIGH").length : cases.filter(c => c.edd).length}</span>
          </button>
        ))}
      </div>

      <div className="card-elevated overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
            <tr>
              <th className="text-left px-4 py-3">Case ID</th>
              <th className="text-left px-4 py-3">Subject</th>
              <th className="text-left px-4 py-3 hidden md:table-cell">Type</th>
              <th className="text-left px-4 py-3 hidden lg:table-cell">Created</th>
              <th className="text-left px-4 py-3">Risk</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No cases match.</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-3 font-medium">
                  {c.subjectName}
                  {c.edd && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">EDD</span>}
                </td>
                <td className="px-4 py-3 capitalize hidden md:table-cell">{c.type}</td>
                <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{new Date(c.createdAt).toLocaleString()}</td>
                <td className="px-4 py-3"><RiskBadge level={c.risk.level} /></td>
                <td className="px-4 py-3"><DecisionBadge d={c.action.decision} /></td>
                <td className="px-4 py-3 text-right">
                  <Link to="/analyst/$caseId" params={{ caseId: c.id }} className="text-xs text-primary hover:underline">Open →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}

function DecisionBadge({ d }: { d: string }) {
  const map: Record<string, string> = {
    pending: "bg-info/15 text-info border-info/30",
    approved: "bg-success/15 text-success border-success/30",
    rejected: "bg-destructive/15 text-destructive border-destructive/30",
    escalated: "bg-warning/15 text-warning border-warning/30",
  };
  return <span className={`text-xs px-2 py-0.5 rounded-full border capitalize ${map[d]}`}>{d}</span>;
}
