import { AnthropicProvider } from "./anthropic.provider.js";
import { OpenAIProvider } from "./openai.provider.js";
import type { LLMProvider } from "../types.js";

export function createProvider(opts: {
  providerName: "anthropic" | "openai";
  apiKey: string;
  model?: string;
}): LLMProvider {
  if (opts.providerName === "anthropic") {
    return new AnthropicProvider(opts.apiKey, opts.model ?? process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-4-6");
  }
  return new OpenAIProvider(opts.apiKey, opts.model ?? process.env["OPENAI_MODEL"] ?? "gpt-4o");
}

export { AnthropicProvider } from "./anthropic.provider.js";
export { OpenAIProvider } from "./openai.provider.js";
