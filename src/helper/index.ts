import { db } from "@/config/firebase";
import type { FrameTier, InteractionType, User } from "@/types";

import { addDoc, collection, serverTimestamp } from "firebase/firestore";

/**
 * Returns the badge image path based on the user's frame tier
 * @param frameTier - The user's frame tier level (bronze, silver, gold, platinum, or diamond)
 * @returns The path to the corresponding badge image
 */
export function getFrame(frameTier: FrameTier) {
  switch (frameTier) {
    case "bronze":
      return "/badges/BRONZE.png";
    case "silver":
      return "/badges/SILVER.png";
    case "gold":
      return "/badges/GOLD.png";
    case "platinum":
      return "/badges/PLATINUM.png";
    case "diamond":
      return "/badges/DIAMOND.png";
    default:
      return "/badges/BRONZE.png";
  }
}

export async function addScoreLog(
  type: InteractionType,
  score: number,
  user: User,
) {
  const scoreLogRef = collection(db, "scoreLog");

  await addDoc(scoreLogRef, {
    displayName: user.displayName,
    email: user.email,
    uid: user.uid,
    profilepictureURL: user.profilepictureURL,
    frameTier: user.frameTier,
    score,
    type,
    createdAt: serverTimestamp(),
  });
}
