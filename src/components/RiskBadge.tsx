import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/kyc-store";

export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const cls = level === "LOW" ? "risk-low" : level === "MEDIUM" ? "risk-medium" : "risk-high";
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide", cls, className)}>
      <span className="size-1.5 rounded-full bg-current" />
      {level} RISK
    </span>
  );
}
