"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getUserCards } from "@/lib/firestore";
import type { Card } from "@/types";
import Link from "next/link";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { Search, SlidersHorizontal, Plus, CreditCard, ChevronRight } from "lucide-react";

type SortKey = "createdAt" | "acquisitionCost" | "player" | "year";

export default function CollectionPage() {
  const { user } = useAuthStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [filtered, setFiltered] = useState<Card[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("createdAt");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    getUserCards(user.uid).then((data) => {
      setCards(data);
      setFiltered(data);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    let result = cards;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.player?.toLowerCase().includes(q) ||
          c.title?.toLowerCase().includes(q) ||
          c.team?.toLowerCase().includes(q) ||
          c.brand?.toLowerCase().includes(q) ||
          c.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    result = [...result].sort((a, b) => {
      if (sortBy === "acquisitionCost") return (b.acquisitionCost || 0) - (a.acquisitionCost || 0);
      if (sortBy === "player") return a.player?.localeCompare(b.player ?? "") ?? 0;
      if (sortBy === "year") return (b.year || 0) - (a.year || 0);
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    setFiltered(result);
  }, [search, sortBy, cards]);

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">我的卡冊</h1>
            <p className="text-xs text-gray-400">{cards.length} 張收藏</p>
          </div>
          <Link
            href="/cards/new"
            className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm"
          >
            <Plus size={20} className="text-white" />
          </Link>
        </div>
        {/* Search bar */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="搜尋球員、品牌、標籤…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        {/* Sort */}
        <div className="flex gap-2 mt-3 overflow-x-auto scrollbar-hide">
          {(
            [
              { key: "createdAt", label: "最新" },
              { key: "acquisitionCost", label: "成本" },
              { key: "player", label: "球員" },
              { key: "year", label: "年份" },
            ] as { key: SortKey; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                sortBy === key
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 p-4">
        {loading ? (
          <div className="grid grid-cols-2 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-52 animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <CreditCard size={48} className="text-gray-200" />
            <p className="text-gray-400 text-sm">
              {search ? "找不到符合的卡片" : "卡冊是空的"}
            </p>
            {!search && (
              <Link href="/cards/new" className="text-blue-600 text-sm font-medium">
                新增第一張卡片
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filtered.map((card) => (
              <CollectionCard key={card.id} card={card} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CollectionCard({ card }: { card: Card }) {
  return (
    <Link
      href={`/cards/${card.id}`}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 active:scale-95 transition-transform"
    >
      <div className="aspect-[3/4] bg-gradient-to-br from-gray-100 to-gray-200 relative">
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
        {card.condition !== "raw" && (
          <div className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            {card.condition} {card.grade}
          </div>
        )}
        {card.isForTrade && (
          <div className="absolute top-2 left-2 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            換卡
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="font-semibold text-sm text-gray-800 truncate">{card.player}</p>
        <p className="text-xs text-gray-400 truncate">
          {card.year} · {card.brand}
        </p>
        <div className="flex items-center justify-between mt-1.5">
          <p className="text-xs font-semibold text-blue-600">
            {formatCurrency(card.acquisitionCost || 0)}
          </p>
          <ChevronRight size={12} className="text-gray-300" />
        </div>
      </div>
    </Link>
  );
}
