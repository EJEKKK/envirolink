import { type ClassValue, clsx } from "clsx";
import type {
	FirestoreDataConverter,
	QueryDocumentSnapshot,
	SnapshotOptions,
	WithFieldValue,
} from "firebase/firestore";
import { twMerge } from "tailwind-merge";

import type {
	Campaign,
	Comment,
	Like,
	Participation,
	Points,
	RankDescription,
	ScoreHistoryLog,
	User,
} from "@/types";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

// Converters
export const userConverter: FirestoreDataConverter<User, User> = {
	toFirestore: (user: WithFieldValue<User>) => user,
	fromFirestore: (
		snapshot: QueryDocumentSnapshot,
		options: SnapshotOptions,
	): User => {
		const data = snapshot.data(options);

		return data as User;
	},
};

export const campaignConverter: FirestoreDataConverter<Campaign> = {
	toFirestore: (campaign: WithFieldValue<Campaign>) => campaign,
	fromFirestore: (
		snapshot: QueryDocumentSnapshot,
		options: SnapshotOptions,
	) => {
		const data = snapshot.data(options);

		return data as Campaign;
	},
};

export const pointsConverter: FirestoreDataConverter<Points> = {
	toFirestore: (points: WithFieldValue<Points>) => points,
	fromFirestore: (
		snapshot: QueryDocumentSnapshot,
		options: SnapshotOptions,
	) => {
		const data = snapshot.data(options);

		return data as Points;
	},
};

export const commentConverter: FirestoreDataConverter<Comment> = {
	toFirestore: (comment: WithFieldValue<Comment>) => comment,
	fromFirestore: (
		snapshot: QueryDocumentSnapshot,
		options: SnapshotOptions,
	) => {
		const data = snapshot.data(options);

		return data as Comment;
	},
};

export const participationConverter: FirestoreDataConverter<Participation> = {
	toFirestore: (participation: WithFieldValue<Participation>) => participation,
	fromFirestore: (
		snapshot: QueryDocumentSnapshot,
		options: SnapshotOptions,
	) => {
		const data = snapshot.data(options);

		return data as Participation;
	},
};

export const likeConverter: FirestoreDataConverter<Like> = {
	toFirestore: (like: WithFieldValue<Like>) => like,
	fromFirestore: (
		snapshot: QueryDocumentSnapshot,
		options: SnapshotOptions,
	) => {
		const data = snapshot.data(options);

		return data as Like;
	},
};

export const scoreHistoryLogConverter: FirestoreDataConverter<ScoreHistoryLog> =
	{
		toFirestore: (scoreHistoryLog: WithFieldValue<ScoreHistoryLog>) =>
			scoreHistoryLog,
		fromFirestore: (
			snapshot: QueryDocumentSnapshot,
			options: SnapshotOptions,
		) => {
			const data = snapshot.data(options);

			return data as ScoreHistoryLog;
		},
	};

export const rankDescriptionConverter: FirestoreDataConverter<RankDescription> =
	{
		toFirestore: (rankDescription: WithFieldValue<RankDescription>) =>
			rankDescription,
		fromFirestore: (
			snapshot: QueryDocumentSnapshot,
			options: SnapshotOptions,
		) => {
			const data = snapshot.data(options);

			return data as RankDescription;
		},
	};

// Function to format numbers into a compact string representation (e.g., 1.2K, 3M)
export function formatCompactNumber(number: number): string {
	return new Intl.NumberFormat("en-US", { notation: "compact" }).format(number);
}
