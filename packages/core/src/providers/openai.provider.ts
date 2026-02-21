import OpenAI from "openai";
import type { LLMProvider, LLMCompletionParams, LLMCompletionResult } from "../types.js";
import { LLMProviderError } from "../types.js";

export class OpenAIProvider implements LLMProvider {
  readonly name = "openai" as const;
  readonly model: string;
  private client: OpenAI;

  constructor(apiKey: string, model = "gpt-4o") {
    this.client = new OpenAI({ apiKey });
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
          response_format: { type: "json_object" },
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
        if (err.status === 429)
          throw new LLMProviderError("RATE_LIMITED", "OpenAI rate limit exceeded", true, err);
        if (err.status === 401)
          throw new LLMProviderError("INVALID_API_KEY", "Invalid OpenAI API key", false, err);
        if (err.status >= 500)
          throw new LLMProviderError("PROVIDER_ERROR", `OpenAI error: ${err.message}`, true, err);
      }
      if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError"))
        throw new LLMProviderError("TIMEOUT", "Request timed out", false, err);
      throw new LLMProviderError("PROVIDER_ERROR", String(err), false, err);
    }
  }
}
