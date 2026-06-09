import type { UBO } from "@/lib/kyc-store";
import { ShieldCheck } from "lucide-react";

export function UboTable({ ubos, dense = false }: { ubos: UBO[]; dense?: boolean }) {
  const total = ubos.reduce((s, u) => s + (Number(u.ownership) || 0), 0);
  return (
    <div className="card-elevated overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th className="data-table-th w-10">#</th>
            <th className="data-table-th">Beneficial Owner</th>
            <th className="data-table-th">Nationality</th>
            <th className="data-table-th text-right">Ownership</th>
            <th className="data-table-th">Control</th>
          </tr>
        </thead>
        <tbody>
          {ubos.map((u, i) => {
            const pct = Number(u.ownership) || 0;
            const control = pct >= 25 ? "Significant" : pct >= 10 ? "Material" : "Minority";
            return (
              <tr key={i} className="row-hover">
                <td className={`data-table-td font-mono text-xs text-muted-foreground ${dense ? "py-2" : ""}`}>
                  {String(i + 1).padStart(2, "0")}
                </td>
                <td className="data-table-td font-medium">{u.name || <span className="text-muted-foreground italic">Unnamed</span>}</td>
                <td className="data-table-td text-muted-foreground">{u.nationality}</td>
                <td className="data-table-td text-right font-mono tabular-nums">{pct.toFixed(2)}%</td>
                <td className="data-table-td">
                  <span className={`status-pill ${pct >= 25 ? "status-escalated" : pct >= 10 ? "status-review" : "status-pending"}`}>
                    <ShieldCheck className="size-3" /> {control}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr>
            <td className="data-table-td" colSpan={3}>
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Aggregate declared ownership</span>
            </td>
            <td className="data-table-td text-right font-mono tabular-nums font-semibold">{total.toFixed(2)}%</td>
            <td className="data-table-td">
              {total > 100 && <span className="status-pill status-rejected">Over 100%</span>}
              {total < 100 && total > 0 && <span className="status-pill status-pending">Gap {(100 - total).toFixed(2)}%</span>}
              {total === 100 && <span className="status-pill status-verified">Balanced</span>}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
