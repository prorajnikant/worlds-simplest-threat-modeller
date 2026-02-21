import { useState } from "react";
import type { ThreatReport, AnalyzeErrorResponse, ArchitectureInput } from "@threat-modeller/core";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; report: ThreatReport }
  | { status: "error"; err: AnalyzeErrorResponse["error"] };

export function useAnalyze() {
  const [state, setState] = useState<State>({ status: "idle" });

  const analyze = async (input: ArchitectureInput, apiKey?: string, provider: "anthropic" | "openai" | "ollama" = "anthropic") => {
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, apiKey: apiKey || undefined, provider }),
      });
      const data = await res.json();
      if (data.success) setState({ status: "success", report: data.report });
      else setState({ status: "error", err: data.error });
    } catch {
      setState({ status: "error", err: { code: "NETWORK_ERROR", message: "Could not reach server." } });
    }
  };

  return { state, analyze, reset: () => setState({ status: "idle" }) };
}
