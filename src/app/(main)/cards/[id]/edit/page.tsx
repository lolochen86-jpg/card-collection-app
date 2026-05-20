"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { getCard, updateCard } from "@/lib/firestore";
import type { Card, AcquisitionType, StorageType, CardGrade } from "@/types";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { ChevronLeft } from "lucide-react";
import { ACQUISITION_TYPE_LABELS, STORAGE_TYPE_LABELS, CARD_GRADE_LABELS } from "@/lib/utils";

type FormData = Omit<Card, "id" | "userId" | "images" | "createdAt" | "updatedAt"> & { tags: string };

export default function EditCardPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuthStore();
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormData>();

  useEffect(() => {
    getCard(id).then((card) => {
      if (!card) return;
      reset({ ...card, tags: card.tags?.join(", ") ?? "" } as unknown as FormData);
      setLoading(false);
    });
  }, [id, reset]);

  async function onSubmit(data: FormData) {
    const tags = data.tags
      ? data.tags.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean)
      : [];
    try {
      await updateCard(id, {
        ...data,
        year: Number(data.year),
        acquisitionCost: Number(data.acquisitionCost),
        marketValueAtAcquisition: Number(data.marketValueAtAcquisition),
        grade: data.grade ? Number(data.grade) : undefined,
        tags,
      });
      toast.success("卡片已更新");
      router.replace(`/cards/${id}`);
    } catch {
      toast.error("更新失敗");
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center">
          <ChevronLeft size={22} className="text-gray-600" />
        </button>
        <h1 className="text-lg font-bold text-gray-900">編輯卡片</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
        <div className="flex-1 p-4 space-y-3">
          <Input label="球員名稱 *" {...register("player", { required: true })} />
          <Input label="標題 / 卡名" {...register("title")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="球隊" {...register("team")} />
            <Input label="年份" type="number" {...register("year")} />
          </div>
          <Input label="品牌" {...register("brand")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="系列" {...register("series")} />
            <Input label="卡號" {...register("cardNumber")} />
          </div>
          <Input label="平行版本" {...register("parallel")} />
          <Select label="評級狀態" options={Object.entries(CARD_GRADE_LABELS).map(([v, l]) => ({ value: v, label: l }))} {...register("condition")} />
          <Input label="評分" type="number" step="0.5" {...register("grade")} />
          <Input label="取得日期" type="date" {...register("acquisitionDate")} />
          <Select label="取得方式" options={Object.entries(ACQUISITION_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} {...register("acquisitionType")} />
          <Input label="購入成本 (TWD)" type="number" prefix="$" {...register("acquisitionCost")} />
          <Input label="當時市價 (TWD)" type="number" prefix="$" {...register("marketValueAtAcquisition")} />
          <Textarea label="取得備註" {...register("acquisitionNotes")} />
          <Textarea label="收藏故事" rows={4} {...register("story")} />
          <Select label="收藏方式" options={Object.entries(STORAGE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} {...register("storageType")} />
          <Input label="存放位置" {...register("storageLocation")} />
          <Input label="標籤（逗號分隔）" {...register("tags")} />
          <label className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-200">
            <input type="checkbox" {...register("isForTrade")} className="w-5 h-5 accent-blue-600" />
            <span className="text-sm font-medium text-gray-800">開放換卡</span>
          </label>
        </div>

        <div className="px-4 pb-6 pt-3 bg-white border-t border-gray-100">
          <Button type="submit" size="lg" loading={isSubmitting} className="w-full">
            儲存變更
          </Button>
        </div>
      </form>
    </div>
  );
}
