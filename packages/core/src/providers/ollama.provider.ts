import OpenAI from "openai";
import type { LLMProvider, LLMCompletionParams, LLMCompletionResult } from "../types.js";
import { LLMProviderError } from "../types.js";

/**
 * Ollama provider using the OpenAI-compatible API exposed at /v1.
 * Run Ollama locally or via docker-compose; no API key required.
 */
export class OllamaProvider implements LLMProvider {
  readonly name = "ollama" as const;
  readonly model: string;
  private client: OpenAI;

  constructor(
    model = "llama3.1",
    baseURL = "http://localhost:11434/v1"
  ) {
    this.client = new OpenAI({
      apiKey: "ollama", // required by SDK but not validated by Ollama
      baseURL,
    });
    this.model = model;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    try {
      const response = await this.client.chat.completions.create(
        {
          model: this.model,
          temperature: params.temperature,
          max_tokens: params.maxTokens,
          messages: [
            { role: "system", content: params.systemPrompt },
            { role: "user", content: params.userPrompt },
          ],
          // Note: not all Ollama models support response_format json_object
        },
        { signal: params.signal }
      );
      const text = response.choices[0]?.message?.content ?? "";
      return {
        text,
        usage: {
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          totalTokens: response.usage?.total_tokens ?? 0,
        },
      };
    } catch (err) {
      if (err instanceof OpenAI.APIError) {
        if (err.status === 404)
          throw new LLMProviderError(
            "PROVIDER_ERROR",
            `Ollama model "${this.model}" not found. Run: ollama pull ${this.model}`,
            false,
            err
          );
        if (err.status !== undefined && err.status >= 500)
          throw new LLMProviderError("PROVIDER_ERROR", `Ollama error: ${err.message}`, true, err);
      }
      if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError"))
        throw new LLMProviderError("TIMEOUT", "Request timed out", false, err);
      if (err instanceof Error && (err.message.includes("ECONNREFUSED") || err.message.includes("fetch failed")))
        throw new LLMProviderError(
          "NETWORK_ERROR",
          "Cannot reach Ollama. Is it running? Start with: ollama serve",
          false,
          err
        );
      throw new LLMProviderError("PROVIDER_ERROR", String(err), false, err);
    }
  }
}
