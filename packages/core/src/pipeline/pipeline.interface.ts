import type { ArchitectureInput, ThreatAnalysisOptions, ThreatReport } from "../types.js";

export interface ThreatAnalysisPipeline {
  analyze(input: ArchitectureInput, options?: ThreatAnalysisOptions): Promise<ThreatReport>;
}
