"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getUserCards } from "@/lib/firestore";
import type { Card } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency, formatDate, timeAgo } from "@/lib/utils";
import { TrendingUp, TrendingDown, Plus, ChevronRight, CreditCard } from "lucide-react";

export default function HomePage() {
  const { user } = useAuthStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserCards(user.uid).then((data) => {
      setCards(data);
      setLoading(false);
    });
  }, [user]);

  const totalCost = cards.reduce((s, c) => s + (c.acquisitionCost || 0), 0);
  const totalValue = cards.reduce((s, c) => s + (c.marketValueAtAcquisition || 0), 0);
  const pnl = totalValue - totalCost;
  const recentCards = cards.slice(0, 6);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 px-5 pt-12 pb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-blue-200 text-sm">歡迎回來</p>
            <h1 className="text-white text-xl font-bold">
              {user?.displayName ?? "收藏家"}
            </h1>
          </div>
          <Link href="/collection" className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <CreditCard size={20} className="text-white" />
          </Link>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-blue-100 text-xs mb-0.5">卡片總數</p>
            <p className="text-white text-2xl font-bold">{cards.length}</p>
          </div>
          <div className="bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-blue-100 text-xs mb-0.5">投入成本</p>
            <p className="text-white text-lg font-bold">
              {formatCurrency(totalCost)}
            </p>
          </div>
          <div className="bg-white/15 rounded-2xl p-3 text-center">
            <p className="text-blue-100 text-xs mb-0.5">損益</p>
            <div className="flex items-center justify-center gap-1">
              {pnl >= 0 ? (
                <TrendingUp size={14} className="text-green-300" />
              ) : (
                <TrendingDown size={14} className="text-red-300" />
              )}
              <p className={`text-lg font-bold ${pnl >= 0 ? "text-green-300" : "text-red-300"}`}>
                {formatCurrency(Math.abs(pnl))}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-5 flex flex-col gap-5">
        {/* Quick actions */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/cards/new"
            className="bg-blue-600 text-white rounded-2xl p-4 flex items-center gap-3 shadow-sm"
          >
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus size={20} />
            </div>
            <div>
              <p className="font-semibold text-sm">新增卡片</p>
              <p className="text-blue-200 text-xs">建立收藏紀錄</p>
            </div>
          </Link>
          <Link
            href="/stats"
            className="bg-white rounded-2xl p-4 flex items-center gap-3 shadow-sm border border-gray-100"
          >
            <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-800">成本統計</p>
              <p className="text-gray-400 text-xs">查看損益分析</p>
            </div>
          </Link>
        </div>

        {/* Recent cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">最近收藏</h2>
            <Link href="/collection" className="text-blue-600 text-sm flex items-center gap-0.5">
              全部 <ChevronRight size={14} />
            </Link>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl h-44 animate-pulse" />
              ))}
            </div>
          ) : recentCards.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-200">
              <CreditCard size={32} className="text-gray-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">還沒有收藏卡片</p>
              <Link href="/cards/new" className="text-blue-600 text-sm font-medium mt-1 inline-block">
                立即新增第一張卡片
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {recentCards.map((card) => (
                <CardThumbnail key={card.id} card={card} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CardThumbnail({ card }: { card: Card }) {
  return (
    <Link
      href={`/cards/${card.id}`}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform"
    >
      <div className="aspect-[3/4] bg-gray-100 relative">
        {card.images?.[0] ? (
          <Image
            src={card.images[0].url}
            alt={card.title}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <CreditCard size={32} className="text-gray-300" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="font-semibold text-xs text-gray-800 truncate">{card.player}</p>
        <p className="text-xs text-gray-400 truncate">{card.year} {card.brand}</p>
        <p className="text-xs font-medium text-blue-600 mt-1">
          {formatCurrency(card.acquisitionCost || 0)}
        </p>
      </div>
    </Link>
  );
}
