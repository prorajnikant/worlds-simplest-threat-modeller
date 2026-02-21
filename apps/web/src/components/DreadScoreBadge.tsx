"use client";

interface DreadScoreBadgeProps {
  score: number;
  size?: "sm" | "lg";
}

function getScoreColor(score: number): string {
  if (score >= 7.5) return "bg-red-600 text-white";
  if (score >= 5.0) return "bg-orange-500 text-white";
  if (score >= 2.5) return "bg-yellow-500 text-white";
  return "bg-green-500 text-white";
}

function getScoreLabel(score: number): string {
  if (score >= 7.5) return "Critical";
  if (score >= 5.0) return "High";
  if (score >= 2.5) return "Medium";
  return "Low";
}

export function DreadScoreBadge({ score, size = "sm" }: DreadScoreBadgeProps) {
  const colorClass = getScoreColor(score);
  const label = getScoreLabel(score);

  if (size === "lg") {
    return (
      <div className={`inline-flex flex-col items-center rounded-lg px-4 py-2 ${colorClass}`}>
        <span className="text-2xl font-bold">{score.toFixed(1)}</span>
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
    );
  }

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${colorClass}`}>
      {score.toFixed(1)}
      <span className="font-normal opacity-80">{label}</span>
    </span>
  );
}
