"use client";

import type { ThreatReport as ThreatReportType } from "@threat-modeller/core";
import { ThreatTable } from "./ThreatTable";
import { ExportBar } from "./ExportBar";
import { useExport } from "@/hooks/useExport";

interface ThreatReportProps {
  report: ThreatReportType;
  onReset: () => void;
}

export function ThreatReport({ report, onReset }: ThreatReportProps) {
  const { exportPdf, exportMarkdown, pdfLoading } = useExport(report);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Threat Analysis Results</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {report.threats.length} threat{report.threats.length !== 1 ? "s" : ""} identified •{" "}
            {(report.metadata.totalDurationMs / 1000).toFixed(1)}s •{" "}
            {report.metadata.model}
          </p>
        </div>
        <button
          onClick={onReset}
          className="flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 transition-colors"
        >
          New Analysis
        </button>
      </div>

      {/* Architecture summary */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-blue-900 mb-1">Architecture Summary</h3>
        <p className="text-sm text-blue-800">{report.architectureSummary}</p>
        {report.assumptionsMade.length > 0 && (
          <details className="mt-2">
            <summary className="text-xs font-medium text-blue-700 cursor-pointer hover:text-blue-900">
              {report.assumptionsMade.length} assumption{report.assumptionsMade.length !== 1 ? "s" : ""} made
            </summary>
            <ul className="mt-1.5 space-y-0.5">
              {report.assumptionsMade.map((a, i) => (
                <li key={i} className="text-xs text-blue-700 pl-3 border-l-2 border-blue-300">{a}</li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* Threat table */}
      <ThreatTable threats={report.threats} />

      {/* Export */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
        <ExportBar onExportPdf={exportPdf} onExportMarkdown={exportMarkdown} pdfLoading={pdfLoading} />
        <p className="text-xs text-gray-400">
          Sorted by DREAD score (highest risk first)
        </p>
      </div>
    </div>
  );
}
