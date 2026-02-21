"use client";

import { useState } from "react";
import { useAnalyze } from "@/hooks/useAnalyze";
import { ArchitectureInput } from "@/components/ArchitectureInput";
import { RefineModePanel, type Refinements } from "@/components/RefineModePanel";
import { ApiKeyInput } from "@/components/ApiKeyInput";
import { ThreatReport } from "@/components/ThreatReport";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";

const EMPTY_REFINEMENTS: Refinements = {
  dataSensitivity: "",
  authModel: "",
  deploymentEnvironment: "",
  businessContext: "",
  existingControls: "",
};

export default function HomePage() {
  const [description, setDescription] = useState("");
  const [refinements, setRefinements] = useState<Refinements>(EMPTY_REFINEMENTS);
  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<"anthropic" | "openai" | "ollama">("anthropic");

  const { state, analyze, reset } = useAnalyze();

  const handleSubmit = () => {
    const hasRefinements = Object.values(refinements).some(Boolean);
    analyze(
      {
        description,
        refinements: hasRefinements
          ? {
              dataSensitivity: refinements.dataSensitivity || undefined,
              authModel: refinements.authModel || undefined,
              deploymentEnvironment: refinements.deploymentEnvironment || undefined,
              businessContext: refinements.businessContext || undefined,
              existingControls: refinements.existingControls || undefined,
            }
          : undefined,
      },
      apiKey || undefined,
      provider
    );
  };

  const handleReset = () => {
    reset();
    setDescription("");
    setRefinements(EMPTY_REFINEMENTS);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              <span className="text-blue-700">Threat</span>Lens
            </h1>
            <p className="text-xs text-gray-500">World's Simplest Threat Modeller</p>
          </div>
          <div className="text-xs text-gray-400 text-right hidden sm:block">
            Powered by STRIDE + DREAD<br />
            No account required
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Hero */}
        {state.status === "idle" && (
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              What are the 5 biggest security risks<br className="hidden sm:block" /> in your architecture?
            </h2>
            <p className="text-gray-500 text-base max-w-xl mx-auto">
              Paste your architecture description and get a ranked list of specific, actionable threats in under 60 seconds. No signup, no diagrams.
            </p>
          </div>
        )}

        {/* Input form — always visible unless loading or success */}
        {(state.status === "idle" || state.status === "error") && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 shadow-sm">
            <ArchitectureInput
              value={description}
              onChange={setDescription}
              onSubmit={handleSubmit}
              disabled={false}
            />
            <RefineModePanel refinements={refinements} onChange={setRefinements} />
            <ApiKeyInput
              apiKey={apiKey}
              provider={provider}
              onChange={(key, prov) => { setApiKey(key); setProvider(prov); }}
            />
          </div>
        )}

        {/* States */}
        {state.status === "loading" && <LoadingState />}

        {state.status === "error" && (
          <ErrorState err={state.err} onRetry={() => reset()} />
        )}

        {state.status === "success" && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <ThreatReport report={state.report} onReset={handleReset} />
          </div>
        )}

        {/* How it works */}
        {state.status === "idle" && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            {[
              {
                step: "1",
                title: "Describe",
                body: "Paste a plain-text description of your architecture. No diagrams, no special format.",
              },
              {
                step: "2",
                title: "Analyze",
                body: "Two AI passes: STRIDE threat identification, then DREAD risk scoring and quality filtering.",
              },
              {
                step: "3",
                title: "Act",
                body: "Get up to 5 ranked threats with attack scenarios, business impact, and specific mitigations.",
              },
            ].map(({ step, title, body }) => (
              <div key={step} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center mb-2">
                  {step}
                </div>
                <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{body}</p>
              </div>
            ))}
          </div>
        )}
      </main>

      <footer className="mt-16 border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        ThreatLens — Free, open-source, no account required.{" "}
        <a
          href="https://github.com/harshit/worlds-simplest-threat-modeller"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-gray-600"
        >
          View on GitHub
        </a>
      </footer>
    </div>
  );
}
