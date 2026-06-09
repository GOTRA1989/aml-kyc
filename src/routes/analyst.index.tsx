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
        <table className="data-table">
          <thead>
            <tr>
              <th className="data-table-th">Case ID</th>
              <th className="data-table-th">Subject</th>
              <th className="data-table-th hidden md:table-cell">Type</th>
              <th className="data-table-th hidden lg:table-cell">Opened</th>
              <th className="data-table-th">Risk</th>
              <th className="data-table-th">Status</th>
              <th className="data-table-th text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td className="data-table-td text-center text-muted-foreground py-10" colSpan={7}>No cases match.</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="row-hover">
                <td className="data-table-td font-mono text-[11px] text-muted-foreground">{c.id}</td>
                <td className="data-table-td font-medium">
                  {c.subjectName}
                  {c.edd && <span className="ml-2 status-pill status-escalated">EDD</span>}
                </td>
                <td className="data-table-td capitalize hidden md:table-cell text-muted-foreground">{c.type}</td>
                <td className="data-table-td text-muted-foreground font-mono text-[11px] hidden lg:table-cell">{new Date(c.createdAt).toLocaleString()}</td>
                <td className="data-table-td"><RiskBadge level={c.risk.level} /></td>
                <td className="data-table-td"><StatusBadge status={statusFromCase(c)} /></td>
                <td className="data-table-td text-right">
                  <Link to="/analyst/$caseId" params={{ caseId: c.id }} className="text-xs text-primary hover:underline font-medium">Open →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
