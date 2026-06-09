import jsPDF from "jspdf";
import type { KycCase } from "./kyc-store";

export function exportAuditPdf(c: KycCase) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  let y = 0;

  // Header band
  doc.setFillColor(20, 35, 70);
  doc.rect(0, 0, W, 70, "F");
  doc.setTextColor(255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("COMPLIANCE AUDIT TRAIL", 40, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Confidential — Regulated KYC/AML Record", 40, 50);
  doc.text(`Generated: ${new Date().toLocaleString()}`, W - 40, 50, { align: "right" });
  y = 95;

  doc.setTextColor(20, 35, 70);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`Case ${c.id}`, 40, y);
  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  y += 16;
  doc.text(`Subject: ${c.subjectName}  •  Type: ${c.type.toUpperCase()}  •  Created: ${new Date(c.createdAt).toLocaleString()}`, 40, y);
  y += 22;

  const section = (title: string) => {
    if (y > H - 80) { doc.addPage(); y = 50; }
    doc.setFillColor(238, 242, 250);
    doc.rect(40, y - 12, W - 80, 20, "F");
    doc.setTextColor(20, 35, 70);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, 48, y + 2);
    doc.setTextColor(40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    y += 22;
  };
  const line = (txt: string, indent = 48) => {
    const lines = doc.splitTextToSize(txt, W - 80 - (indent - 40));
    for (const ln of lines) {
      if (y > H - 60) { doc.addPage(); y = 50; }
      doc.text(ln, indent, y);
      y += 13;
    }
  };

  section("1. OCR / Extracted Identity Data");
  Object.entries(c.ocr).forEach(([k, v]) => line(`• ${k}: ${v}`));
  y += 6;

  section("2. Sanctions Screening (OFAC / UN / EU)");
  c.sanctions.forEach(m => line(`• ${m.list}: ${m.hit ? "MATCH" : "Clear"} — Fuzzy ${m.score}%${m.name ? " (" + m.name + ")" : ""}`));
  line(`• PEP: ${c.pepHit ? "MATCH" : "Clear"} — Score ${c.pepScore}%`);
  y += 6;

  section("3. Adverse Media Scan");
  c.adverseMedia.forEach(a => line(`• [${a.severity.toUpperCase()}] ${a.headline} — ${a.source}, ${a.date}`));
  y += 6;

  section("4. Customer Risk Rating");
  line(`Final Rating: ${c.risk.level} (${c.risk.total} pts)`);
  line(`Geography ${c.risk.geography} • Industry ${c.risk.industry} • Channel ${c.risk.channel} • PEP ${c.risk.pep} • Sanctions ${c.risk.sanctions} • Adverse Media ${c.risk.adverseMedia}`);
  if (c.edd) line(`EDD REQUIRED — Source of Funds & Wealth verification mandated.`);
  y += 6;

  if (c.edd) {
    section("5. Enhanced Due Diligence");
    line(`Source of Funds: ${c.action.sourceOfFunds || "(not provided)"}`);
    line(`Source of Wealth: ${c.action.sourceOfWealth || "(not provided)"}`);
    y += 6;
  }

  section("6. Analyst Notes (IRAC)");
  line(`Issue: ${c.action.notesIssue || "—"}`);
  line(`Rule: ${c.action.notesRule || "—"}`);
  line(`Analysis: ${c.action.notesAnalysis || "—"}`);
  line(`Conclusion: ${c.action.notesConclusion || "—"}`);
  y += 6;

  section("7. Audit Trail (Chronological)");
  c.audit.forEach(a => line(`${new Date(a.timestamp).toLocaleString()}  —  ${a.action}${a.detail ? ": " + a.detail : ""}`));
  y += 10;

  section("8. Final Sign-Off");
  line(`Decision: ${c.action.decision.toUpperCase()}`);
  line(`Analyst: ${c.action.analyst}`);
  if (c.action.decidedAt) line(`Decided At: ${new Date(c.action.decidedAt).toLocaleString()}`);
  y += 24;
  if (y > H - 80) { doc.addPage(); y = 50; }
  doc.setDrawColor(180);
  doc.line(48, y, 260, y);
  doc.setFontSize(9); doc.setTextColor(120);
  doc.text("Authorized Signature", 48, y + 12);

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(150);
    doc.text(`Page ${i} of ${pages}  •  ${c.id}  •  CONFIDENTIAL`, W / 2, H - 20, { align: "center" });
  }

  doc.save(`Audit_${c.id}.pdf`);
}
