export class LLMParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMParseError";
  }
}

/**
 * Extracts and parses JSON from an LLM response that may contain
 * markdown code fences, leading prose, or trailing commentary.
 * The LLM is instructed to output only JSON, but often wraps it anyway.
 */
export function parseLLMJson(text: string): unknown {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch ? fenceMatch[1].trim() : text.trim();

  // Find the outermost JSON object or array
  const jsonMatch = candidate.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (!jsonMatch) {
    throw new LLMParseError(
      `No JSON found in LLM response. First 200 chars: ${text.slice(0, 200)}`
    );
  }

  try {
    return JSON.parse(jsonMatch[1]);
  } catch (e) {
    throw new LLMParseError(
      `JSON parse failed: ${(e as Error).message}. First 200 chars of candidate: ${jsonMatch[1].slice(0, 200)}`
    );
  }
}
