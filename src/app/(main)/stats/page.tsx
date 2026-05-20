"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { getUserCards } from "@/lib/firestore";
import type { Card } from "@/types";
import { formatCurrency } from "@/lib/utils";
import { ACQUISITION_TYPE_LABELS, STORAGE_TYPE_LABELS } from "@/lib/utils";
import { TrendingUp, TrendingDown, BarChart3, PieChart, Package } from "lucide-react";

export default function StatsPage() {
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

  const totalCards = cards.length;
  const totalCost = cards.reduce((s, c) => s + (c.acquisitionCost || 0), 0);
  const totalValue = cards.reduce((s, c) => s + (c.marketValueAtAcquisition || 0), 0);
  const pnl = totalValue - totalCost;
  const roi = totalCost > 0 ? ((pnl / totalCost) * 100).toFixed(1) : "0";

  const byAcquisitionType = cards.reduce<Record<string, { count: number; cost: number }>>(
    (acc, c) => {
      const t = c.acquisitionType ?? "purchase";
      acc[t] = acc[t] ?? { count: 0, cost: 0 };
      acc[t].count++;
      acc[t].cost += c.acquisitionCost || 0;
      return acc;
    },
    {}
  );

  const byStorageType = cards.reduce<Record<string, number>>(
    (acc, c) => {
      const t = c.storageType ?? "other";
      acc[t] = (acc[t] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const topByValue = [...cards]
    .sort((a, b) => (b.acquisitionCost || 0) - (a.acquisitionCost || 0))
    .slice(0, 5);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100">
        <h1 className="text-lg font-bold text-gray-900">成本統計</h1>
        <p className="text-xs text-gray-400">收藏財務概覽</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Overview */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-5 text-white">
          <p className="text-blue-200 text-sm mb-1">總收藏價值</p>
          <p className="text-3xl font-bold mb-4">{formatCurrency(totalValue)}</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-blue-200 text-xs">卡片總數</p>
              <p className="text-xl font-bold">{totalCards}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">投入成本</p>
              <p className="text-xl font-bold">{formatCurrency(totalCost)}</p>
            </div>
            <div>
              <p className="text-blue-200 text-xs">投資報酬</p>
              <div className="flex items-center gap-1">
                {pnl >= 0 ? (
                  <TrendingUp size={14} className="text-green-300" />
                ) : (
                  <TrendingDown size={14} className="text-red-300" />
                )}
                <p className={`text-lg font-bold ${pnl >= 0 ? "text-green-300" : "text-red-300"}`}>
                  {roi}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* P&L Card */}
        <div className={`rounded-2xl p-4 border ${pnl >= 0 ? "bg-green-50 border-green-100" : "bg-red-50 border-red-100"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">總損益</p>
              <p className={`text-2xl font-bold ${pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                {pnl >= 0 ? "+" : ""}{formatCurrency(pnl)}
              </p>
            </div>
            {pnl >= 0 ? (
              <TrendingUp size={36} className="text-green-300" />
            ) : (
              <TrendingDown size={36} className="text-red-300" />
            )}
          </div>
        </div>

        {/* By acquisition type */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <BarChart3 size={14} /> 取得方式分析
          </h2>
          <div className="space-y-3">
            {Object.entries(byAcquisitionType).map(([type, { count, cost }]) => (
              <div key={type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{ACQUISITION_TYPE_LABELS[type] ?? type}</span>
                  <span className="font-medium">
                    {count} 張 · {formatCurrency(cost)}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{ width: `${totalCost > 0 ? (cost / totalCost) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* By storage type */}
        <div className="bg-white rounded-2xl p-4 border border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
            <Package size={14} /> 收藏方式分佈
          </h2>
          <div className="space-y-2">
            {Object.entries(byStorageType).map(([type, count]) => (
              <div key={type} className="flex justify-between text-sm">
                <span className="text-gray-600">{STORAGE_TYPE_LABELS[type] ?? type}</span>
                <span className="font-medium text-gray-800">{count} 張</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 by cost */}
        {topByValue.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <PieChart size={14} /> 最高價值卡片 TOP 5
            </h2>
            <div className="space-y-2.5">
              {topByValue.map((card, i) => (
                <div key={card.id} className="flex items-center gap-3">
                  <span className="w-5 h-5 bg-blue-100 text-blue-600 text-xs font-bold rounded-full flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{card.player}</p>
                    <p className="text-xs text-gray-400">{card.year} {card.brand}</p>
                  </div>
                  <span className="text-sm font-bold text-blue-600 shrink-0">
                    {formatCurrency(card.acquisitionCost || 0)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
