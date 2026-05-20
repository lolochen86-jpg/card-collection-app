"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getPosts, createPost, addComment, getComments, toggleLike, isPostLiked } from "@/lib/firestore";
import { uploadPostImage } from "@/lib/storage";
import type { Post, Comment } from "@/types";
import Image from "next/image";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import { timeAgo } from "@/lib/utils";
import { Heart, MessageCircle, Camera, Send, X, Plus, Users } from "lucide-react";

export default function CommunityPage() {
  const { user } = useAuthStore();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [content, setContent] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentText, setCommentText] = useState("");

  useEffect(() => {
    loadPosts();
  }, [user]);

  async function loadPosts() {
    const data = await getPosts(20);
    setPosts(data);
    setLoading(false);
    if (user) {
      const liked = await Promise.all(data.map((p) => isPostLiked(p.id, user.uid)));
      const likedSet = new Set(data.filter((_, i) => liked[i]).map((p) => p.id));
      setLikedPosts(likedSet);
    }
  }

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handlePost() {
    if (!user || !content.trim()) return;
    setPosting(true);
    try {
      let imageUrl: string | undefined;
      if (imageFile) {
        imageUrl = await uploadPostImage(user.uid, imageFile);
      }
      await createPost({
        userId: user.uid,
        userName: user.displayName ?? "匿名",
        userPhotoURL: user.photoURL ?? "",
        content: content.trim(),
        images: imageUrl ? [imageUrl] : [],
      });
      setContent("");
      setImageFile(null);
      setImagePreview(null);
      setShowCompose(false);
      toast.success("已發佈！");
      loadPosts();
    } catch {
      toast.error("發佈失敗");
    } finally {
      setPosting(false);
    }
  }

  async function handleLike(postId: string) {
    if (!user) return;
    const nowLiked = await toggleLike(postId, user.uid);
    setLikedPosts((prev) => {
      const next = new Set(prev);
      nowLiked ? next.add(postId) : next.delete(postId);
      return next;
    });
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likesCount: p.likesCount + (nowLiked ? 1 : -1) }
          : p
      )
    );
  }

  async function handleExpandComments(postId: string) {
    if (expandedPost === postId) {
      setExpandedPost(null);
      return;
    }
    setExpandedPost(postId);
    if (!comments[postId]) {
      const data = await getComments(postId);
      setComments((prev) => ({ ...prev, [postId]: data }));
    }
  }

  async function handleAddComment(postId: string) {
    if (!user || !commentText.trim()) return;
    await addComment({
      postId,
      userId: user.uid,
      userName: user.displayName ?? "匿名",
      userPhotoURL: user.photoURL ?? "",
      content: commentText.trim(),
    });
    setCommentText("");
    const updated = await getComments(postId);
    setComments((prev) => ({ ...prev, [postId]: updated }));
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, commentsCount: p.commentsCount + 1 } : p
      )
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">社群交流</h1>
          <p className="text-xs text-gray-400">分享你的收藏故事</p>
        </div>
        <button
          onClick={() => setShowCompose(true)}
          className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center"
        >
          <Plus size={20} className="text-white" />
        </button>
      </div>

      {/* Posts */}
      <div className="flex-1 divide-y divide-gray-100">
        {loading ? (
          <div className="p-4 space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Users size={48} className="text-gray-200" />
            <p className="text-gray-400 text-sm">還沒有任何貼文</p>
            <Button onClick={() => setShowCompose(true)} size="sm">
              發佈第一篇
            </Button>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              liked={likedPosts.has(post.id)}
              onLike={() => handleLike(post.id)}
              onComment={() => handleExpandComments(post.id)}
              expanded={expandedPost === post.id}
              comments={comments[post.id] ?? []}
              commentText={commentText}
              onCommentChange={setCommentText}
              onSubmitComment={() => handleAddComment(post.id)}
            />
          ))
        )}
      </div>

      {/* Compose sheet */}
      {showCompose && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-5 pb-safe max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-gray-900">發佈分享</h3>
              <button onClick={() => setShowCompose(false)}>
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            <Textarea
              placeholder="分享你的收藏故事、心得或交換需求…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
            />
            {imagePreview && (
              <div className="relative mt-3 w-32 h-32">
                <Image src={imagePreview} alt="" fill className="object-cover rounded-xl" sizes="128px" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                >
                  <X size={10} className="text-white" />
                </button>
              </div>
            )}
            <div className="flex items-center gap-3 mt-4">
              <label className="flex items-center gap-1.5 text-sm text-gray-500 cursor-pointer">
                <Camera size={18} />
                <span>圖片</span>
                <input type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
              </label>
              <Button
                onClick={handlePost}
                loading={posting}
                disabled={!content.trim()}
                size="md"
                className="ml-auto"
              >
                <Send size={14} /> 發佈
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PostCard({
  post,
  liked,
  onLike,
  onComment,
  expanded,
  comments,
  commentText,
  onCommentChange,
  onSubmitComment,
}: {
  post: Post;
  liked: boolean;
  onLike: () => void;
  onComment: () => void;
  expanded: boolean;
  comments: Comment[];
  commentText: string;
  onCommentChange: (v: string) => void;
  onSubmitComment: () => void;
}) {
  return (
    <div className="bg-white p-4">
      {/* Author */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
          {post.userPhotoURL ? (
            <Image src={post.userPhotoURL} alt="" width={32} height={32} className="object-cover" />
          ) : (
            <span className="text-blue-600 font-bold text-sm">
              {post.userName?.[0]?.toUpperCase()}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-800">{post.userName}</p>
          <p className="text-xs text-gray-400">{timeAgo(post.createdAt)}</p>
        </div>
      </div>

      <p className="text-sm text-gray-700 leading-relaxed mb-3">{post.content}</p>

      {post.images?.[0] && (
        <div className="relative aspect-video rounded-xl overflow-hidden mb-3">
          <Image src={post.images[0]} alt="" fill className="object-cover" sizes="100vw" />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${
            liked ? "text-red-500" : "text-gray-400"
          }`}
        >
          <Heart size={18} fill={liked ? "currentColor" : "none"} />
          {post.likesCount}
        </button>
        <button
          onClick={onComment}
          className="flex items-center gap-1.5 text-sm text-gray-400"
        >
          <MessageCircle size={18} />
          {post.commentsCount}
        </button>
      </div>

      {/* Comments */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-2 mb-2">
              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-gray-500">
                  {c.userName?.[0]?.toUpperCase()}
                </span>
              </div>
              <div className="bg-gray-50 rounded-xl px-3 py-1.5 flex-1">
                <p className="text-xs font-semibold text-gray-700">{c.userName}</p>
                <p className="text-xs text-gray-600">{c.content}</p>
              </div>
            </div>
          ))}
          <div className="flex gap-2 mt-2">
            <input
              value={commentText}
              onChange={(e) => onCommentChange(e.target.value)}
              placeholder="留言…"
              className="flex-1 bg-gray-100 rounded-xl px-3 py-1.5 text-sm outline-none"
              onKeyDown={(e) => e.key === "Enter" && onSubmitComment()}
            />
            <button
              onClick={onSubmitComment}
              className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center"
            >
              <Send size={14} className="text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
