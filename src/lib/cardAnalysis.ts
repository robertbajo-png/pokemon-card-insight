import { z } from "zod";

export const cardAnalysisSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().max(50).default("Colorless"),
  rarity: z.string().max(100).default("Unknown"),
  set: z.string().max(200).default("Unknown"),
  setCode: z.string().max(50).optional(),
  number: z.union([z.string(), z.number()]).transform(String),
  hp: z.union([z.string(), z.number()]).transform(String).optional(),
  condition: z.string().max(200).optional(),
  description: z.string().max(5000).optional(),
  estimatedValue: z.string().max(300).optional(),
  priceByGrade: z.record(z.string().max(300)).optional(),
  attacks: z.array(z.object({
    name: z.string(), damage: z.string().optional(),
    cost: z.array(z.string()).default([]), text: z.string().optional(),
  })).default([]),
  weaknesses: z.array(z.object({ type: z.string(), value: z.string() })).default([]),
  resistances: z.array(z.object({ type: z.string(), value: z.string() })).default([]),
  retreatCost: z.number().int().min(0).max(20).optional(),
});
export type CardAnalysis = z.infer<typeof cardAnalysisSchema>;
export const scannedCardSchema = cardAnalysisSchema.extend({
  id: z.string().min(1), scannedAt: z.string().datetime(), image: z.string().optional(),
});
export type ScannedCard = z.infer<typeof scannedCardSchema>;
export type NewScannedCard = Omit<z.input<typeof scannedCardSchema>, "id" | "scannedAt">;
export function cardToScan(analysis: CardAnalysis, image: string): NewScannedCard {
  return { ...analysis, type: analysis.type.toLowerCase(), image,
    estimatedValue: analysis.priceByGrade?.ungraded ?? analysis.estimatedValue };
}
