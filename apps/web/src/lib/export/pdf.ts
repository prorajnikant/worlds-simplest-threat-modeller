import type { ThreatReport } from "@threat-modeller/core";

export async function downloadPdf(report: ThreatReport): Promise<void> {
  // Dynamic import to avoid SSR issues
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  // Title
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("ThreatLens Security Analysis", margin, 20);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Generated: ${new Date(report.generatedAt).toLocaleString()}`, margin, 28);
  doc.text(`Model: ${report.metadata.provider} / ${report.metadata.model}`, margin, 34);
  doc.setTextColor(0);

  // Architecture summary
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Architecture Summary", margin, 44);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const summaryLines = doc.splitTextToSize(report.architectureSummary, contentWidth);
  doc.text(summaryLines, margin, 51);

  let yPos = 51 + summaryLines.length * 5 + 6;

  // Assumptions
  if (report.assumptionsMade.length > 0) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Assumptions Made", margin, yPos);
    yPos += 7;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    for (const assumption of report.assumptionsMade) {
      const lines = doc.splitTextToSize(`• ${assumption}`, contentWidth);
      doc.text(lines, margin, yPos);
      yPos += lines.length * 4.5;
    }
    yPos += 4;
  }

  // Summary table
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Threat Summary", margin, yPos);
  yPos += 5;

  autoTable(doc, {
    startY: yPos,
    margin: { left: margin, right: margin },
    head: [["#", "Title", "STRIDE", "Component", "DREAD"]],
    body: report.threats.map((t, i) => [
      i + 1,
      t.title,
      t.strideCategory,
      t.affectedComponent,
      t.dread.total.toFixed(1),
    ]),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255, fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 8 },
      4: { cellWidth: 15, halign: "center" },
    },
  });

  // Individual threat details
  for (const [i, threat] of report.threats.entries()) {
    doc.addPage();

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 64, 175);
    const titleLines = doc.splitTextToSize(`${i + 1}. ${threat.title}`, contentWidth);
    doc.text(titleLines, margin, 20);
    doc.setTextColor(0);

    let y = 20 + titleLines.length * 6 + 2;

    // Meta row
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setFillColor(240, 244, 255);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.text(`STRIDE: ${threat.strideCategory}   |   Component: ${threat.affectedComponent}   |   Complexity: ${threat.attackComplexity}`, margin + 2, y + 5.5);
    y += 12;

    // DREAD scores table
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Damage", "Reproducibility", "Exploitability", "Affected Users", "Discoverability", "Total"]],
      body: [[
        threat.dread.damage,
        threat.dread.reproducibility,
        threat.dread.exploitability,
        threat.dread.affectedUsers,
        threat.dread.discoverability,
        threat.dread.total.toFixed(1),
      ]],
      styles: { fontSize: 9, halign: "center" },
      headStyles: { fillColor: [75, 85, 99], textColor: 255, fontStyle: "bold" },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

    const sections = [
      { label: "Attack Scenario", text: threat.scenario },
      { label: "Business Impact", text: threat.businessImpact },
    ];

    for (const section of sections) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text(section.label, margin, y);
      y += 5;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const lines = doc.splitTextToSize(section.text, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4.5 + 4;
    }

    // Mitigations
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Mitigations", margin, y);
    y += 5;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    for (const mitigation of threat.mitigations) {
      const lines = doc.splitTextToSize(`• ${mitigation}`, contentWidth);
      doc.text(lines, margin, y);
      y += lines.length * 4.5 + 2;
    }
  }

  doc.save(`threat-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
