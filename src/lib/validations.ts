import z from "zod";

export const profileSchema = z.object({
	displayName: z.string().min(1, { message: "required" }),
	bio: z.string(),
	profilePic: z.string(),
});

export type ProfileSchema = z.infer<typeof profileSchema>;

export const createCampaignSchema = z.object({
	title: z.string().min(1, { message: "required" }),
	description: z.object({
		when: z.date({ invalid_type_error: "invalid date" }),
		where: z.string().min(1, { message: "required" }),
		what: z.string().min(1, { message: "required" }),
	}),
	photoURLs: z.array(z.instanceof(File)),
});

export type CreateCampaignSchema = z.infer<typeof createCampaignSchema>;

export const editCampaignSchema = z.object({
	id: z.string().min(1, { message: "required" }),
	title: z.string().min(1, { message: "required" }),
	description: z.object({
		when: z.date({ invalid_type_error: "invalid date" }),
		where: z.string().min(1, { message: "required" }),
		what: z.string().min(1, { message: "required" }),
	}),
	photoURLs: z.array(z.string()),
});

export type EditCampaignSchema = z.infer<typeof editCampaignSchema>;
