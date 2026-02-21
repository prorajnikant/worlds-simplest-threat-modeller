"use client";

import type { Threat } from "@threat-modeller/core";
import { ThreatRow } from "./ThreatRow";

interface ThreatTableProps {
  threats: Threat[];
}

export function ThreatTable({ threats }: ThreatTableProps) {
  return (
    <div className="space-y-3">
      {threats.map((threat, i) => (
        <ThreatRow key={threat.id} threat={threat} rank={i + 1} />
      ))}
    </div>
  );
}
