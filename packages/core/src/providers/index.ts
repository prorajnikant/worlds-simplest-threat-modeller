import { AnthropicProvider } from "./anthropic.provider.js";
import { OpenAIProvider } from "./openai.provider.js";
import { OllamaProvider } from "./ollama.provider.js";
import type { LLMProvider } from "../types.js";

export function createProvider(opts: {
  providerName: "anthropic" | "openai" | "ollama";
  apiKey?: string;
  model?: string;
}): LLMProvider {
  if (opts.providerName === "anthropic") {
    if (!opts.apiKey) throw new Error("apiKey required for Anthropic");
    return new AnthropicProvider(opts.apiKey, opts.model ?? process.env["ANTHROPIC_MODEL"] ?? "claude-sonnet-4-6");
  }
  if (opts.providerName === "ollama") {
    return new OllamaProvider(
      opts.model ?? process.env["OLLAMA_MODEL"] ?? "llama3.1",
      process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434/v1"
    );
  }
  if (!opts.apiKey) throw new Error("apiKey required for OpenAI");
  return new OpenAIProvider(opts.apiKey, opts.model ?? process.env["OPENAI_MODEL"] ?? "gpt-4o");
}

export { AnthropicProvider } from "./anthropic.provider.js";
export { OpenAIProvider } from "./openai.provider.js";
export { OllamaProvider } from "./ollama.provider.js";
