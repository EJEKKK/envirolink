import type { Campaign, Like } from "@/types";
import type {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  WithFieldValue,
} from "firebase-admin/firestore";

export const adminCampaignConverter: FirestoreDataConverter<Campaign> = {
  toFirestore: (campaign: WithFieldValue<Campaign>) => campaign,
  fromFirestore: (snapshot: QueryDocumentSnapshot) => {
    const data = snapshot.data();

    return data as Campaign;
  },
};

export const adminLikeConverter: FirestoreDataConverter<Like> = {
  toFirestore: (like: WithFieldValue<Like>) => like,
  fromFirestore: (snapshot: QueryDocumentSnapshot) => {
    const data = snapshot.data();

    return data as Like;
  },
};
