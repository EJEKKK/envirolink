import type { DocumentReference, Timestamp } from "firebase/firestore";

export type Role = "user" | "volunteer" | "campaignManager" | "admin";

export type FrameTier = "bronze" | "silver" | "gold" | "platinum" | "diamond";

export type Status = "pending" | "approved" | "rejected";

export type User = {
  uid: string;
  createdAt: Timestamp;
  displayName: string;
  email: string;
  facebookID: string;
  frameTier: FrameTier;
  points: number;
  profilepictureURL: string;
  role: Role;
  bio?: string;
  blocked: boolean;
  status: Status;
};

export type Points = {
  id: string;
  like: number;
  comment: number;
  share: number;
  join: number;
};

export type Like = {
  id: string;
  uid: string;
  type: "like" | "dislike";
};

export type Campaign = {
  id: string;
  title: string;
  description: {
    when: Timestamp;
    where: string;
    what: string;
  };
  photoURLs: string[];
  createdAt: Timestamp;
  managerUid: string;
  managerDisplayName: string;
  managerPhotoURL: string;
  frameTier: FrameTier;
  status: Status;
  reactions: { like: number };
  likes: Like[];
  points: Points;
  isDone: boolean;
  isScoreApplied: boolean;
};

export type ServerCampaign = {
  id: string;
  title: string;
  description: {
    when: Date;
    where: string;
    what: string;
  };
  photoURLs: string[];
  createdAt: Date;
  managerUid: string;
  managerDisplayName: string;
  managerPhotoURL: string;
  frameTier: FrameTier;
  status: Status;
  reactions: { like: number };
  likes: Like[];
  points: Points;
  isDone: boolean;
};

export type Comment = {
  id: string;
  comment: string;
  displayName: string;
  email: string;
  frameTier: FrameTier;
  timestamp: Timestamp;
  uid: string;
  campaignRef: DocumentReference;
  userPhotoURL: string;
};

export type Participation = {
  id: string;
  campaignid: string;
  displayName: string;
  joindate: Timestamp;
  status: "joined";
  isPresent: boolean;
  frameTier: FrameTier;
  profilepictureURL: string;
  uid: string;
};

export type InteractionType = "like" | "comment" | "share" | "join";

export type ScoreHistoryLog = {
  id: string;
  displayName: string;
  email: string;
  uid: string;
  profilepictureURL: string;
  frameTier: FrameTier;
  score: number;
  type: InteractionType;
  createdAt: Timestamp;
};
