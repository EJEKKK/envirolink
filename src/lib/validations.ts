import z from "zod";

export const profileSchema = z.object({
  displayName: z.string().min(1, { message: "required" }),
  bio: z.string(),
  profilePic: z.string(),
});

export type ProfileSchema = z.infer<typeof profileSchema>;

export const campaignSchema = z.object({
  title: z.string().min(1, { message: "required" }),
  description: z.object({
    when: z.date({ invalid_type_error: "invalid date" }),
    where: z.string().min(1, { message: "required" }),
    what: z.string().min(1, { message: "required" }),
  }),
  photoURLs: z.array(z.instanceof(File)),
});

export type CampaignSchema = z.infer<typeof campaignSchema>;
