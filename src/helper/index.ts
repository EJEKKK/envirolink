import { db } from "@/config/firebase";
import { rankDescriptionConverter } from "@/lib/utils";
import type {
  FrameTier,
  InteractionType,
  RankDescription,
  User,
} from "@/types";

import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";

export async function addScoreLog(
  type: InteractionType,
  score: number,
  user: User,
  campaignId: string,
) {
  const scoreLogRef = collection(db, "scoreLog");
  const rankRef = collection(db, "rankDescription").withConverter(
    rankDescriptionConverter,
  );
  const q = query(rankRef, orderBy("createdAt", "desc"));
  const ranks = (await getDocs(q)).docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  }));

  let rankImage = "";
  for (const rank of ranks) {
    if (user.points >= rank.points) {
      rankImage += rank.image;
      break;
    }
  }

  await addDoc(scoreLogRef, {
    displayName: user.displayName,
    email: user.email,
    uid: user.uid,
    profilepictureURL: user.profilepictureURL,
    frameTier: user.frameTier,
    rankImage,
    score,
    type,
    createdAt: serverTimestamp(),
    campaignid: campaignId,
  });
}
