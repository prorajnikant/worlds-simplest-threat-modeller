"use client";

import { useState } from "react";
import type { Threat } from "@threat-modeller/core";
import { DreadScoreBadge } from "./DreadScoreBadge";

const STRIDE_COLORS: Record<string, string> = {
  "Spoofing": "bg-purple-100 text-purple-800",
  "Tampering": "bg-red-100 text-red-800",
  "Repudiation": "bg-gray-100 text-gray-800",
  "Information Disclosure": "bg-blue-100 text-blue-800",
  "Denial of Service": "bg-orange-100 text-orange-800",
  "Elevation of Privilege": "bg-yellow-100 text-yellow-800",
};

const COMPLEXITY_COLORS: Record<string, string> = {
  "Low": "bg-red-100 text-red-700",
  "Medium": "bg-yellow-100 text-yellow-700",
  "High": "bg-green-100 text-green-700",
};

interface ThreatRowProps {
  threat: Threat;
  rank: number;
}

export function ThreatRow({ threat, rank }: ThreatRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        className="w-full text-left p-4 hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <div className="flex items-start gap-3">
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-700 text-white text-sm font-bold flex items-center justify-center">
            {rank}
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="font-semibold text-gray-900 text-sm leading-tight">{threat.title}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STRIDE_COLORS[threat.strideCategory] ?? "bg-gray-100 text-gray-700"}`}>
                {threat.strideCategory}
              </span>
              <span className="text-xs text-gray-500">{threat.affectedComponent}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${COMPLEXITY_COLORS[threat.attackComplexity]}`}>
                {threat.attackComplexity} complexity
              </span>
            </div>
          </div>
          <div className="flex-shrink-0 flex items-center gap-2">
            <DreadScoreBadge score={threat.dread.total} />
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
          {/* DREAD breakdown */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">DREAD Scores</h4>
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: "Damage", value: threat.dread.damage },
                { label: "Reproduc.", value: threat.dread.reproducibility },
                { label: "Exploit.", value: threat.dread.exploitability },
                { label: "Affected", value: threat.dread.affectedUsers },
                { label: "Discover.", value: threat.dread.discoverability },
              ].map(({ label, value }) => (
                <div key={label} className="text-center">
                  <div className="text-lg font-bold text-gray-800">{value}</div>
                  <div className="text-xs text-gray-500">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scenario */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Attack Scenario</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{threat.scenario}</p>
          </div>

          {/* Business impact */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Business Impact</h4>
            <p className="text-sm text-gray-700 leading-relaxed">{threat.businessImpact}</p>
          </div>

          {/* Mitigations */}
          <div>
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Mitigations</h4>
            <ul className="space-y-1.5">
              {threat.mitigations.map((m, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-700">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
