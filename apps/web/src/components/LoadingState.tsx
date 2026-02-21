"use client";

export function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="relative">
        <div className="w-16 h-16 rounded-full border-4 border-blue-100 border-t-blue-600 animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-gray-800">Analyzing threats…</p>
        <p className="text-sm text-gray-500 mt-1">Running STRIDE identification and DREAD scoring</p>
        <p className="text-xs text-gray-400 mt-0.5">This typically takes 15–30 seconds</p>
      </div>
      <div className="flex gap-6 text-center text-xs text-gray-400 mt-2">
        <div>
          <div className="font-semibold text-gray-600 text-sm">Pass 1</div>
          STRIDE Analysis
        </div>
        <div className="text-gray-300 self-center">→</div>
        <div>
          <div className="font-semibold text-gray-600 text-sm">Pass 2</div>
          DREAD Scoring
        </div>
        <div className="text-gray-300 self-center">→</div>
        <div>
          <div className="font-semibold text-gray-600 text-sm">Output</div>
          Top 5 Threats
        </div>
      </div>
    </div>
  );
}
