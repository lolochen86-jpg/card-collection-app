"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store/authStore";
import { getUserCards, getPriceHistory, addPriceRecord } from "@/lib/firestore";
import type { Card, PriceRecord } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import Button from "@/components/ui/Button";
import { TrendingUp, RefreshCw, Search, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";

export default function PricesPage() {
  const { user } = useAuthStore();
  const [cards, setCards] = useState<Card[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [history, setHistory] = useState<PriceRecord[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<{ price: number; source: string; url?: string } | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getUserCards(user.uid).then(setCards);
  }, [user]);

  useEffect(() => {
    if (!selectedCard) return;
    getPriceHistory(selectedCard.id).then(setHistory);
  }, [selectedCard]);

  async function handleSearch() {
    if (!selectedCard) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch("/api/prices/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: selectedCard.player,
          year: selectedCard.year,
          brand: selectedCard.brand,
          cardNumber: selectedCard.cardNumber,
          parallel: selectedCard.parallel,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSearchResult(data);
    } catch {
      toast.error("查詢失敗，請確認 API 設定");
    } finally {
      setSearching(false);
    }
  }

  async function savePrice() {
    if (!selectedCard || !searchResult) return;
    await addPriceRecord(selectedCard.id, {
      price: searchResult.price,
      currency: "TWD",
      source: searchResult.source,
      sourceUrl: searchResult.url,
      recordedAt: new Date().toISOString(),
    });
    toast.success("價格已記錄");
    const updated = await getPriceHistory(selectedCard.id);
    setHistory(updated);
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">卡價追蹤</h1>
        <p className="text-xs text-gray-400">搜尋市場成交價格</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Card selector */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <p className="text-sm font-medium text-gray-700 mb-2">選擇卡片</p>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {cards.map((card) => (
              <button
                key={card.id}
                onClick={() => {
                  setSelectedCard(card);
                  setSearchResult(null);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-colors ${
                  selectedCard?.id === card.id
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                }`}
              >
                {card.player} · {card.year} {card.brand}
                {card.parallel && ` · ${card.parallel}`}
              </button>
            ))}
            {cards.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-3">還沒有收藏卡片</p>
            )}
          </div>
        </div>

        {selectedCard && (
          <>
            <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
              <p className="text-xs text-blue-400 mb-1">已選擇</p>
              <p className="font-semibold text-blue-800">{selectedCard.player}</p>
              <p className="text-xs text-blue-600">
                {selectedCard.year} · {selectedCard.brand}
                {selectedCard.parallel && ` · ${selectedCard.parallel}`}
              </p>
            </div>

            <Button
              onClick={handleSearch}
              loading={searching}
              size="lg"
              className="w-full"
            >
              <Search size={16} />
              搜尋目前市價
            </Button>

            {searchResult && (
              <div className="bg-white rounded-2xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-gray-700">搜尋結果</p>
                  <span className="text-xs text-gray-400">{searchResult.source}</span>
                </div>
                <p className="text-2xl font-bold text-green-600 mb-3">
                  {formatCurrency(searchResult.price)}
                </p>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setSearchResult(null)} className="flex-1">
                    取消
                  </Button>
                  <Button size="sm" onClick={savePrice} className="flex-1">
                    記錄此價格
                  </Button>
                </div>
              </div>
            )}

            {/* Price history */}
            {history.length > 0 && (
              <div className="bg-white rounded-2xl p-4 border border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
                  <TrendingUp size={14} /> 價格紀錄
                </h2>
                <div className="space-y-2">
                  {history.map((p) => (
                    <div key={p.id} className="flex justify-between items-center text-sm py-1 border-b border-gray-50">
                      <div>
                        <p className="text-xs text-gray-400">{formatDate(p.recordedAt)}</p>
                        <p className="text-xs text-gray-500">{p.source}</p>
                      </div>
                      <p className="font-semibold text-gray-800">{formatCurrency(p.price)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
