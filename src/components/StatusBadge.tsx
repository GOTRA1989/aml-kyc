import { cn } from "@/lib/utils";
import type { Decision, KycCase } from "@/lib/kyc-store";

export type CaseStatus = "Pending" | "Under Review" | "Verified" | "Escalated" | "Rejected";

export function statusFromCase(c: Pick<KycCase, "action">): CaseStatus {
  const d: Decision = c.action.decision;
  if (d === "approved") return "Verified";
  if (d === "rejected") return "Rejected";
  if (d === "escalated") return "Escalated";
  const touched =
    !!c.action.notesIssue ||
    !!c.action.notesRule ||
    !!c.action.notesAnalysis ||
    !!c.action.notesConclusion ||
    (c.action.analyst && c.action.analyst !== "Unassigned");
  return touched ? "Under Review" : "Pending";
}

const map: Record<CaseStatus, string> = {
  Pending: "status-pending",
  "Under Review": "status-review",
  Verified: "status-verified",
  Escalated: "status-escalated",
  Rejected: "status-rejected",
};

export function StatusBadge({ status, className }: { status: CaseStatus; className?: string }) {
  return (
    <span className={cn("status-pill", map[status], className)}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {status}
    </span>
  );
}
