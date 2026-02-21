import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, LLMCompletionParams, LLMCompletionResult } from "../types.js";
import { LLMProviderError } from "../types.js";

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic" as const;
  readonly model: string;
  private client: Anthropic;

  constructor(apiKey: string, model = "claude-sonnet-4-6") {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    try {
      const response = await this.client.messages.create(
        {
          model: this.model,
          max_tokens: params.maxTokens,
          temperature: params.temperature,
          system: params.systemPrompt,
          messages: [{ role: "user", content: params.userPrompt }],
        },
        { signal: params.signal }
      );
      const block = response.content[0];
      const text = block.type === "text" ? block.text : "";
      return {
        text,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
      };
    } catch (err) {
      if (err instanceof Anthropic.APIError) {
        if (err.status === 429)
          throw new LLMProviderError("RATE_LIMITED", "Anthropic rate limit exceeded", true, err);
        if (err.status === 401)
          throw new LLMProviderError("INVALID_API_KEY", "Invalid Anthropic API key", false, err);
        if (err.status !== undefined && err.status >= 500)
          throw new LLMProviderError("PROVIDER_ERROR", `Anthropic error: ${err.message}`, true, err);
      }
      if (err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError"))
        throw new LLMProviderError("TIMEOUT", "Request timed out", false, err);
      throw new LLMProviderError("PROVIDER_ERROR", String(err), false, err);
    }
  }
}
