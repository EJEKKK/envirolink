import { z } from "zod";

export const rankDescriptionFormSchema = z.object({
  silver: z.coerce
    .number()
    .min(0, { message: "Silver rank must be a positive number" }),
  gold: z.coerce
    .number()
    .min(0, { message: "Gold rank must be a positive number" }),
  platinum: z.coerce
    .number()
    .min(0, { message: "Platinum rank must be a positive number" }),
  diamond: z.coerce
    .number()
    .min(0, { message: "Diamond rank must be a positive number" }),
});

export type RankDescriptionFormSchema = z.infer<
  typeof rankDescriptionFormSchema
>;
