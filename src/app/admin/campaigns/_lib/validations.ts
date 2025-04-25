import { z } from "zod";

export const scoreFormSchema = z.object({ score: z.coerce.number() });

export type ScoreFormSchema = z.infer<typeof scoreFormSchema>;
