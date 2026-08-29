import { z } from "zod";

export const lineSchema = z.object({
  productId: z.number().int().positive().nullable().optional(),
  name: z.string().min(1, "Item name is required"),
  description: z.string().nullable().optional(),
  quantity: z.number().min(0).default(1),
  unitPriceCents: z.number().int().min(0).default(0),
  discountBp: z.number().int().min(0).max(10000).default(0),
  taxRateBp: z.number().int().min(0).max(10000).default(0),
});

export type LinePayload = z.infer<typeof lineSchema>;
