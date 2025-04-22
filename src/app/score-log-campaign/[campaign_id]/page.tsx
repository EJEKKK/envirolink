import { adminDb } from "@/config/firebase-admin";
import {
  adminCampaignConverter,
  adminLikeConverter,
} from "@/lib/admin-firebase-converters";
import type { Campaign } from "@/types";
import CampaignSection from "./_components/campaign-section";

interface CampaignPageProps {
  params: Promise<{ campaign_id: string }>;
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
