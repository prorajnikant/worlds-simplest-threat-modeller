import { z } from "zod";

const DreadScoreSchema = z.object({
  damage: z.number().int().min(1).max(10),
  reproducibility: z.number().int().min(1).max(10),
  exploitability: z.number().int().min(1).max(10),
  affectedUsers: z.number().int().min(1).max(10),
  discoverability: z.number().int().min(1).max(10),
  total: z.number().min(1).max(10),
});

export const Pass2ThreatSchema = z.object({
  id: z.string(),
  title: z.string().min(5).max(80),
  strideCategory: z.enum([
    "Spoofing", "Tampering", "Repudiation",
    "Information Disclosure", "Denial of Service", "Elevation of Privilege",
  ]),
  affectedComponent: z.string().min(2),
  scenario: z.string().min(50),
  attackComplexity: z.enum(["Low", "Medium", "High"]),
  businessImpact: z.string().min(20),
  mitigations: z.array(z.string().min(10)).min(1).max(3),
  dread: DreadScoreSchema,
});

export const Pass2OutputSchema = z.object({
  threats: z.array(Pass2ThreatSchema).min(1).max(5),
});

export type Pass2Output = z.infer<typeof Pass2OutputSchema>;
