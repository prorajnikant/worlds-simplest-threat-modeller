import { z } from "zod";

export const Pass1ThreatSchema = z.object({
  id: z.string().regex(/^T\d+$/),
  title: z.string().min(5).max(120),
  strideCategory: z.enum([
    "Spoofing", "Tampering", "Repudiation",
    "Information Disclosure", "Denial of Service", "Elevation of Privilege",
  ]),
  affectedComponent: z.string().min(2),
  scenario: z.string().min(50),
  attackComplexity: z.enum(["Low", "Medium", "High"]),
});

export const Pass1OutputSchema = z.object({
  architectureSummary: z.string().min(20),
  assumptionsMade: z.array(z.string()),
  threats: z.array(Pass1ThreatSchema).min(1).max(10),
});

export type Pass1Output = z.infer<typeof Pass1OutputSchema>;
