import { useState } from "react";
import type { ThreatReport } from "@threat-modeller/core";

export function useExport(report: ThreatReport | null) {
  const [pdfLoading, setPdfLoading] = useState(false);

  const exportPdf = async () => {
    if (!report) return;
    setPdfLoading(true);
    try {
      const { downloadPdf } = await import("@/lib/export/pdf");
      await downloadPdf(report);
    } finally {
      setPdfLoading(false);
    }
  };

  const exportMarkdown = () => {
    if (!report) return;
    import("@/lib/export/markdown").then(({ downloadMarkdown }) => {
      downloadMarkdown(report);
    });
  };

  return { exportPdf, exportMarkdown, pdfLoading };
}
