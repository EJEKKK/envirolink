import { z } from "zod";

export const pointFormSchema = z.object({
  points: z.object({
    like: z.coerce.number(),
    comment: z.coerce.number(),
    share: z.coerce.number(),
    campaignManager: z.coerce.number(),
  }),
});

export type PointFormSchema = z.infer<typeof pointFormSchema>;

export const editPointFormSchema = z.object({
  points: pointFormSchema.shape.points.omit({
    campaignManager: true,
  }),
});

export type EditPointFormSchema = z.infer<typeof editPointFormSchema>;
