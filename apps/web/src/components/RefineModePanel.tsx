"use client";

import { useState } from "react";

export interface Refinements {
  dataSensitivity: string;
  authModel: string;
  deploymentEnvironment: string;
  businessContext: string;
  existingControls: string;
}

interface RefineModeProps {
  refinements: Refinements;
  onChange: (refinements: Refinements) => void;
}

export function RefineModePanel({ refinements, onChange }: RefineModeProps) {
  const [open, setOpen] = useState(false);

  const update = (key: keyof Refinements, value: string) =>
    onChange({ ...refinements, [key]: value });

  const fields: { key: keyof Refinements; label: string; placeholder: string }[] = [
    { key: "dataSensitivity", label: "Data Sensitivity", placeholder: "e.g., PII, PHI, financial records, public data" },
    { key: "authModel", label: "Auth Model", placeholder: "e.g., JWT, OAuth2, session cookies, API keys" },
    { key: "deploymentEnvironment", label: "Deployment", placeholder: "e.g., AWS us-east-1, on-prem, hybrid cloud" },
    { key: "businessContext", label: "Business Context", placeholder: "e.g., B2B SaaS, healthcare, fintech startup" },
    { key: "existingControls", label: "Existing Controls", placeholder: "e.g., WAF, MFA enabled, SOC2 audit in progress" },
  ];

  const filledCount = Object.values(refinements).filter(Boolean).length;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-medium text-gray-700">
          Refine Mode
          {filledCount > 0 && (
            <span className="ml-2 text-xs font-normal bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
              {filledCount} field{filledCount !== 1 ? "s" : ""} filled
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          {open ? "Hide" : "Add context for better results"}
          <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {open && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {fields.map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
              <input
                type="text"
                value={refinements[key]}
                onChange={(e) => update(key, e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
