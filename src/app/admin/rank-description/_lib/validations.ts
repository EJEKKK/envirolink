import { z } from "zod";

export const rankDescriptionFormSchema = z.object({
  name: z.string().min(1, { message: "Name is required" }),
  points: z.coerce
    .number()
    .positive({ message: "Points must be a positive number" }),
  image: z
    .array(z.instanceof(File, { message: "Image file is required" }))
    .max(1, { message: "Only one image file is allowed" }),
});

export type RankDescriptionFormSchema = z.infer<
  typeof rankDescriptionFormSchema
>;

export const editRankDescriptionFormSchema = z
  .object({
    image: z.string(),
    file: z
      .array(z.instanceof(File, { message: "Image file is required" }))
      .max(1, { message: "Only one image file is allowed" }),
    id: z.string(),
  })
  .merge(rankDescriptionFormSchema.omit({ image: true }));

export type EditRankDescriptionFormSchema = z.infer<
  typeof editRankDescriptionFormSchema
>;
