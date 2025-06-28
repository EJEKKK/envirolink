import { adminDb } from "@/config/firebase-admin";
import type { Campaign } from "@/types";
import CampaignSection from "./_components/campaign-section";

import {
	adminCampaignConverter,
	adminLikeConverter,
} from "@/lib/admin-firebase-converters";
import type { Metadata, ResolvedMetadata } from "next";

interface CampaignPageProps {
	params: Promise<{ campaign_id: string }>;
}

export async function generateMetadata(
	{ params }: CampaignPageProps,
	parent: Promise<ResolvedMetadata>,
): Promise<Metadata> {
	const campaignId = (await params).campaign_id;
	const campaignRef = adminDb
		.doc(`campaigns/${campaignId}`)
		.withConverter(adminCampaignConverter);
	const campaign = await campaignRef
		.get()
		.then((doc) => ({ ...doc.data(), id: doc.id }));

	return {
		title: campaign.title,
		description: campaign.description?.what,
		openGraph: {
			title: campaign.title,
			description: campaign.description?.what,
			url: `https://envirolink.vercel.app/campaign/${campaignId}?v=${Date.now()}`,
			images: [
				{
					url: campaign.photoURLs?.[0] ?? "",
					width: 1200,
					height: 630,
					alt: campaign.title,
				},
			],
		},
	};
}

export default async function CampaignPage({ params }: CampaignPageProps) {
	const campaignId = (await params).campaign_id;

	const campaignRef = adminDb
		.doc(`campaigns/${campaignId}`)
		.withConverter(adminCampaignConverter);
	const likesRef = adminDb
		.collection(`campaigns/${campaignId}/likes`)
		.withConverter(adminLikeConverter);
	const likes = (await likesRef.get()).docs.map((doc) => ({
		...doc.data(),
		id: doc.id,
	}));

	const campaign = (await campaignRef.get()).data() as Campaign;

	return (
		<CampaignSection
			campaign={{
				...campaign,
				id: campaignRef.id,
				createdAt: campaign.createdAt.toDate(),
				description: {
					...campaign.description,
					when: campaign.description.when.toDate(),
				},
				likes,
			}}
		/>
	);
}
