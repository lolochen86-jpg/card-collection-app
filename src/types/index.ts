export type AcquisitionType = "pack" | "purchase" | "trade" | "gift";

export type StorageType =
  | "toploader"
  | "magnetic"
  | "psa_case"
  | "bgs_case"
  | "binder"
  | "storage_box"
  | "other";

export type CardGrade = "raw" | "PSA" | "BGS" | "SGC" | "CGC";

export interface CardImage {
  url: string;
  storagePath: string;
}

export interface Card {
  id: string;
  userId: string;
  // Basic Info
  title: string;
  player: string;
  team: string;
  year: number;
  brand: string;
  series: string;
  cardNumber: string;
  parallel: string;
  // Condition
  condition: CardGrade;
  grade?: number;
  // Images
  images: CardImage[];
  // Acquisition
  acquisitionDate: string; // ISO date string
  acquisitionType: AcquisitionType;
  acquisitionCost: number;
  acquisitionNotes: string;
  marketValueAtAcquisition: number;
  // Storage
  storageType: StorageType;
  storageLocation: string;
  // Story & Tags
  story: string;
  tags: string[];
  // Trade settings
  isForTrade: boolean;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface PriceRecord {
  id: string;
  cardId: string;
  price: number;
  currency: string;
  source: string;
  sourceUrl?: string;
  recordedAt: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  content: string;
  images: string[];
  cardId?: string;
  cardTitle?: string;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
  likedByCurrentUser?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userName: string;
  userPhotoURL: string;
  content: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bio: string;
  createdAt: string;
}

export interface CollectionStats {
  totalCards: number;
  totalCost: number;
  totalMarketValue: number;
  profitLoss: number;
  byAcquisitionType: Record<AcquisitionType, number>;
  byStorageType: Record<StorageType, number>;
}
