import { AnthropicProvider } from "./providers/anthropic.provider.js";
import { LLMThreatPipeline } from "./pipeline/llm-pipeline.js";

const apiKey = process.env["ANTHROPIC_API_KEY"];
if (!apiKey) {
  console.error("Set ANTHROPIC_API_KEY environment variable");
  process.exit(1);
}

const fullPipeline = process.argv.includes("--full-pipeline");

async function main() {
  const provider = new AnthropicProvider(apiKey!);

  if (!fullPipeline) {
    // Simple smoke test
    console.log("Running simple smoke test...");
    const result = await provider.complete({
      systemPrompt: "You are a helpful assistant. Output only valid JSON.",
      userPrompt: 'Say hello in JSON: {"greeting": "..."}',
      temperature: 0.1,
      maxTokens: 100,
    });
    console.log("Response:", result.text);
    return;
  }

  // Full pipeline smoke test
  console.log("Running full pipeline smoke test...");
  const pipeline = new LLMThreatPipeline(provider);
  const report = await pipeline.analyze({
    description: `A multi-tenant SaaS application. Each tenant has isolated PostgreSQL schemas
on a shared database cluster. A Node.js API handles authentication with JWTs.
Users upload documents which are processed by a Python Lambda function and
stored in S3. An admin panel is served from the same domain. The API
communicates with a third-party payment processor.`,
  });
  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
