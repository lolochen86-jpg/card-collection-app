"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getCard, deleteCard, getPriceHistory } from "@/lib/firestore";
import type { Card, PriceRecord } from "@/types";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import {
  ChevronLeft,
  Edit3,
  Trash2,
  CreditCard,
  Calendar,
  MapPin,
  Tag,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";
import {
  formatCurrency,
  formatDate,
  ACQUISITION_TYPE_LABELS,
  STORAGE_TYPE_LABELS,
  CARD_GRADE_LABELS,
} from "@/lib/utils";

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const [card, setCard] = useState<Card | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageIdx, setImageIdx] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([getCard(id), getPriceHistory(id)]).then(([c, ph]) => {
      setCard(c);
      setPriceHistory(ph);
      setLoading(false);
    });
  }, [id]);

  async function handleDelete() {
    if (!card || !user || card.userId !== user.uid) return;
    setDeleting(true);
    try {
      await deleteCard(card.id);
      toast.success("已刪除卡片");
      router.replace("/collection");
    } catch {
      toast.error("刪除失敗");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!card) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6">
        <CreditCard size={48} className="text-gray-200" />
        <p className="text-gray-400">找不到卡片</p>
        <Button onClick={() => router.back()} variant="secondary">
          返回
        </Button>
      </div>
    );
  }

  const pnl = (card.marketValueAtAcquisition || 0) - (card.acquisitionCost || 0);
  const isOwner = user?.uid === card.userId;

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Image carousel */}
      <div className="relative bg-gray-900">
        <div className="aspect-[4/3] relative overflow-hidden">
          {card.images?.[imageIdx] ? (
            <Image
              src={card.images[imageIdx].url}
              alt={card.title}
              fill
              className="object-contain"
              sizes="100vw"
              priority
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <CreditCard size={64} className="text-gray-600" />
            </div>
          )}
        </div>
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 pt-12">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
            <ChevronLeft size={20} className="text-white" />
          </button>
          {isOwner && (
            <div className="flex gap-2">
              <Link
                href={`/cards/${card.id}/edit`}
                className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <Edit3 size={16} className="text-white" />
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-9 h-9 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <Trash2 size={16} className="text-red-400" />
              </button>
            </div>
          )}
        </div>
        {/* Image dots */}
        {card.images.length > 1 && (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {card.images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImageIdx(i)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === imageIdx ? "bg-white" : "bg-white/40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Title + badges */}
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900">{card.player}</h1>
            <div className="flex gap-1 shrink-0">
              {card.condition !== "raw" && (
                <span className="bg-yellow-100 text-yellow-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {card.condition} {card.grade}
                </span>
              )}
              {card.isForTrade && (
                <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  換卡
                </span>
              )}
            </div>
          </div>
          <p className="text-gray-500 text-sm">
            {card.year} · {card.brand}
            {card.series && ` · ${card.series}`}
            {card.cardNumber && ` #${card.cardNumber}`}
          </p>
          {card.parallel && (
            <p className="text-blue-600 text-xs mt-0.5 font-medium">{card.parallel}</p>
          )}
          {card.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {card.tags.map((tag) => (
                <span key={tag} className="bg-gray-100 text-gray-500 text-xs px-2 py-0.5 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Financial card */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <ArrowUpDown size={14} /> 財務概覽
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xs text-gray-400">購入成本</p>
              <p className="font-bold text-gray-800">{formatCurrency(card.acquisitionCost || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">當時市價</p>
              <p className="font-bold text-gray-800">{formatCurrency(card.marketValueAtAcquisition || 0)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400">損益</p>
              <div className="flex items-center gap-0.5">
                {pnl >= 0 ? (
                  <TrendingUp size={12} className="text-green-500" />
                ) : (
                  <TrendingDown size={12} className="text-red-500" />
                )}
                <p className={`font-bold text-sm ${pnl >= 0 ? "text-green-600" : "text-red-500"}`}>
                  {formatCurrency(Math.abs(pnl))}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Acquisition */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Calendar size={14} /> 取得資訊
          </h2>
          <div className="space-y-2 text-sm">
            <Row label="取得日期" value={formatDate(card.acquisitionDate)} />
            <Row label="取得方式" value={ACQUISITION_TYPE_LABELS[card.acquisitionType] ?? card.acquisitionType} />
            {card.acquisitionNotes && <Row label="備註" value={card.acquisitionNotes} />}
          </div>
        </div>

        {/* Storage */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <MapPin size={14} /> 實體存放
          </h2>
          <div className="space-y-2 text-sm">
            <Row label="收藏方式" value={STORAGE_TYPE_LABELS[card.storageType] ?? card.storageType} />
            {card.storageLocation && <Row label="存放位置" value={card.storageLocation} />}
          </div>
        </div>

        {/* Story */}
        {card.story && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
              <BookOpen size={14} /> 收藏故事
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed">{card.story}</p>
          </div>
        )}

        {/* Price history */}
        {priceHistory.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <TrendingUp size={14} /> 價格紀錄
            </h2>
            <div className="space-y-2">
              {priceHistory.slice(0, 5).map((p) => (
                <div key={p.id} className="flex justify-between text-sm">
                  <span className="text-gray-400 text-xs">{formatDate(p.recordedAt)}</span>
                  <span className="font-medium text-gray-800">{formatCurrency(p.price)}</span>
                </div>
              ))}
            </div>
            <Link
              href={`/prices?cardId=${card.id}`}
              className="text-blue-600 text-xs mt-2 inline-block"
            >
              查看完整價格歷史 →
            </Link>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-3xl p-6 pb-safe">
            <h3 className="font-bold text-gray-900 mb-2">確定要刪除這張卡片？</h3>
            <p className="text-sm text-gray-500 mb-5">此操作無法復原，所有資料將永久刪除。</p>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                variant="danger"
                size="lg"
                loading={deleting}
                onClick={handleDelete}
                className="flex-1"
              >
                刪除
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-800 text-right">{value}</span>
    </div>
  );
}
