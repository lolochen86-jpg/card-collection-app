import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Card, Post, Comment, PriceRecord, UserProfile } from "@/types";

// ── Cards ──────────────────────────────────────────────────────────────────

export async function createCard(
  userId: string,
  data: Omit<Card, "id" | "userId" | "createdAt" | "updatedAt">
) {
  const ref = await addDoc(collection(db, "cards"), {
    ...data,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function updateCard(cardId: string, data: Partial<Card>) {
  await updateDoc(doc(db, "cards", cardId), {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteCard(cardId: string) {
  await deleteDoc(doc(db, "cards", cardId));
}

export async function getCard(cardId: string): Promise<Card | null> {
  const snap = await getDoc(doc(db, "cards", cardId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Card;
}

export async function getUserCards(userId: string): Promise<Card[]> {
  const q = query(
    collection(db, "cards"),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Card);
}

// ── Price History ──────────────────────────────────────────────────────────

export async function addPriceRecord(cardId: string, data: Omit<PriceRecord, "id" | "cardId">) {
  await addDoc(collection(db, "cards", cardId, "priceHistory"), {
    ...data,
    cardId,
  });
}

export async function getPriceHistory(cardId: string): Promise<PriceRecord[]> {
  const q = query(
    collection(db, "cards", cardId, "priceHistory"),
    orderBy("recordedAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PriceRecord);
}

// ── Posts ──────────────────────────────────────────────────────────────────

export async function createPost(data: Omit<Post, "id" | "likesCount" | "commentsCount" | "createdAt">) {
  const ref = await addDoc(collection(db, "posts"), {
    ...data,
    likesCount: 0,
    commentsCount: 0,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function getPosts(limitCount = 20): Promise<Post[]> {
  const q = query(
    collection(db, "posts"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Post);
}

export async function getComments(postId: string): Promise<Comment[]> {
  const q = query(
    collection(db, "comments"),
    where("postId", "==", postId),
    orderBy("createdAt", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Comment);
}

export async function addComment(data: Omit<Comment, "id" | "createdAt">) {
  const batch = writeBatch(db);
  const commentRef = doc(collection(db, "comments"));
  batch.set(commentRef, { ...data, createdAt: new Date().toISOString() });
  const postRef = doc(db, "posts", data.postId);
  batch.update(postRef, { commentsCount: (await getDoc(postRef)).data()?.commentsCount + 1 ?? 1 });
  await batch.commit();
}

export async function toggleLike(postId: string, userId: string) {
  const likeId = `${postId}_${userId}`;
  const likeRef = doc(db, "likes", likeId);
  const likeSnap = await getDoc(likeRef);
  const postRef = doc(db, "posts", postId);
  const batch = writeBatch(db);
  if (likeSnap.exists()) {
    batch.delete(likeRef);
    batch.update(postRef, { likesCount: Math.max(0, (await getDoc(postRef)).data()?.likesCount - 1 ?? 0) });
  } else {
    batch.set(likeRef, { postId, userId, createdAt: new Date().toISOString() });
    batch.update(postRef, { likesCount: ((await getDoc(postRef)).data()?.likesCount ?? 0) + 1 });
  }
  await batch.commit();
  return !likeSnap.exists();
}

export async function isPostLiked(postId: string, userId: string): Promise<boolean> {
  const likeId = `${postId}_${userId}`;
  const snap = await getDoc(doc(db, "likes", likeId));
  return snap.exists();
}

// ── User Profile ───────────────────────────────────────────────────────────

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as UserProfile;
}

export async function upsertUserProfile(uid: string, data: Partial<UserProfile>) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    await updateDoc(ref, data);
  } else {
    await updateDoc(ref, { ...data, createdAt: new Date().toISOString() }).catch(() =>
      addDoc(collection(db, "users"), { uid, ...data, createdAt: new Date().toISOString() })
    );
  }
}
