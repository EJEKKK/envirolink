import { env } from "@/env";

import {
  type App,
  type ServiceAccount,
  cert,
  getApps,
  initializeApp,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const serviceAccount: string | ServiceAccount = {
  projectId: env.FIREBASE_PROJECT_ID,
  privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"), // Replace \n with actual newlines
  clientEmail: env.FIREBASE_CLIENT_EMAIL,
};

const app =
  getApps().length === 0
    ? initializeApp({ credential: cert(serviceAccount) })
    : getApps()[0];

const adminDb = getFirestore(app as App);

export { adminDb };
