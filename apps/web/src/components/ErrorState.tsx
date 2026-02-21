"use client";

import type { AnalyzeErrorResponse } from "@threat-modeller/core";

interface ErrorStateProps {
  err: AnalyzeErrorResponse["error"];
  onRetry: () => void;
}

export function ErrorState({ err, onRetry }: ErrorStateProps) {
  const isRateLimited = err.code === "RATE_LIMITED";
  const isInvalidKey = err.code === "INVALID_API_KEY";

  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-6 space-y-3">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div>
          <h3 className="text-sm font-semibold text-red-800">
            {isRateLimited ? "Rate limit reached" : isInvalidKey ? "Invalid API key" : "Analysis failed"}
          </h3>
          <p className="text-sm text-red-700 mt-0.5">{err.message}</p>
        </div>
      </div>

      {isRateLimited && err.byokRequired && (
        <div className="bg-white border border-red-200 rounded-md p-3 text-sm text-gray-700">
          <strong>Add your own API key</strong> to bypass the rate limit. You can get a free Anthropic key at{" "}
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-800"
          >
            console.anthropic.com
          </a>
          , then paste it in the "API Key" field above.
          {err.retryAfterSeconds !== undefined && (
            <span className="block mt-1 text-gray-500">
              Or wait {Math.ceil(err.retryAfterSeconds / 3600)} hour{Math.ceil(err.retryAfterSeconds / 3600) !== 1 ? "s" : ""} for the limit to reset.
            </span>
          )}
        </div>
      )}

      <button
        onClick={onRetry}
        className="text-sm font-medium text-red-700 underline hover:text-red-900"
      >
        Try again
      </button>
    </div>
  );
}
