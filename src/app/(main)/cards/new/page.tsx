"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { createCard } from "@/lib/firestore";
import { uploadCardImage, compressImage } from "@/lib/storage";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import Image from "next/image";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { Camera, X, ChevronLeft, Plus } from "lucide-react";
import type { AcquisitionType, StorageType, CardGrade, CardImage } from "@/types";
import { ACQUISITION_TYPE_LABELS, STORAGE_TYPE_LABELS, CARD_GRADE_LABELS } from "@/lib/utils";

interface FormData {
  title: string;
  player: string;
  team: string;
  year: number;
  brand: string;
  series: string;
  cardNumber: string;
  parallel: string;
  condition: CardGrade;
  grade: number;
  acquisitionDate: string;
  acquisitionType: AcquisitionType;
  acquisitionCost: number;
  acquisitionNotes: string;
  marketValueAtAcquisition: number;
  storageType: StorageType;
  storageLocation: string;
  story: string;
  tags: string;
  isForTrade: boolean;
}

export default function NewCardPage() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0); // 0=photos, 1=basic, 2=acquisition, 3=storage

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: {
      acquisitionType: "purchase",
      condition: "raw",
      storageType: "toploader",
      acquisitionDate: new Date().toISOString().split("T")[0],
      isForTrade: false,
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (images.length + files.length > 5) {
      toast.error("最多上傳 5 張圖片");
      return;
    }
    files.forEach((file) => {
      const url = URL.createObjectURL(file);
      setImages((prev) => [...prev, file]);
      setPreviews((prev) => [...prev, url]);
    });
  }

  function removeImage(idx: number) {
    URL.revokeObjectURL(previews[idx]);
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function onSubmit(data: FormData) {
    if (!user) return;
    setUploading(true);
    try {
      const tempId = Date.now().toString();
      const uploadedImages: CardImage[] = [];
      for (let i = 0; i < images.length; i++) {
        const compressed = await compressImage(images[i]);
        const img = await uploadCardImage(user.uid, tempId, compressed, i);
        uploadedImages.push(img);
      }

      const tags = data.tags
        ? data.tags.split(/[,，\s]+/).map((t) => t.trim()).filter(Boolean)
        : [];

      const cardId = await createCard(user.uid, {
        ...data,
        year: Number(data.year),
        acquisitionCost: Number(data.acquisitionCost),
        marketValueAtAcquisition: Number(data.marketValueAtAcquisition),
        grade: data.grade ? Number(data.grade) : undefined,
        images: uploadedImages,
        tags,
      });

      toast.success("卡片新增成功！");
      router.replace(`/cards/${cardId}`);
    } catch (err) {
      console.error(err);
      toast.error("儲存失敗，請稍後再試");
    } finally {
      setUploading(false);
    }
  }

  const STEPS = ["照片", "基本資料", "取得方式", "收藏資訊"];

  return (
    <div className="flex flex-col min-h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 border-b border-gray-100 sticky top-0 z-10">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => router.back()} className="w-9 h-9 flex items-center justify-center">
            <ChevronLeft size={22} className="text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">新增卡片</h1>
        </div>
        {/* Step indicator */}
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`flex-1 py-1 rounded-full text-xs font-medium transition-colors ${
                i === step
                  ? "bg-blue-600 text-white"
                  : i < step
                  ? "bg-blue-100 text-blue-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex-1 flex flex-col">
        <div className="flex-1 p-4 space-y-4">

          {/* Step 0: Photos */}
          {step === 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-3">拍攝或上傳卡片照片（最多 5 張）</p>
              <div className="grid grid-cols-3 gap-2">
                {previews.map((src, i) => (
                  <div key={i} className="aspect-[3/4] relative rounded-xl overflow-hidden">
                    <Image src={src} alt="" fill className="object-cover" sizes="33vw" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center"
                    >
                      <X size={12} className="text-white" />
                    </button>
                    {i === 0 && (
                      <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-[9px] px-1 rounded">
                        封面
                      </div>
                    )}
                  </div>
                ))}
                {previews.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="aspect-[3/4] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center gap-1 text-gray-400 bg-gray-50"
                  >
                    <Camera size={24} />
                    <span className="text-xs">新增照片</span>
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          )}

          {/* Step 1: Basic info */}
          {step === 1 && (
            <div className="space-y-3">
              <Input
                label="球員名稱 *"
                placeholder="例：Shohei Ohtani"
                {...register("player", { required: "請輸入球員名稱" })}
                error={errors.player?.message}
              />
              <Input label="標題 / 卡名" placeholder="例：2021 Topps Chrome Rookie" {...register("title")} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="球隊" placeholder="例：LAA" {...register("team")} />
                <Input label="年份 *" type="number" placeholder="2021" {...register("year", { required: true })} />
              </div>
              <Input label="品牌" placeholder="例：Topps、Panini" {...register("brand")} />
              <div className="grid grid-cols-2 gap-3">
                <Input label="系列" placeholder="例：Chrome" {...register("series")} />
                <Input label="卡號" placeholder="例：#150" {...register("cardNumber")} />
              </div>
              <Input label="平行版本" placeholder="例：Refractor /99" {...register("parallel")} />
              <Select
                label="評級狀態"
                options={Object.entries(CARD_GRADE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                {...register("condition")}
              />
              <Input label="評分 (如有)" type="number" step="0.5" min="1" max="10" placeholder="例：9.5" {...register("grade")} />
              <Input label="標籤（逗號分隔）" placeholder="例：RC, 短印, 限量" {...register("tags")} />
            </div>
          )}

          {/* Step 2: Acquisition */}
          {step === 2 && (
            <div className="space-y-3">
              <Input
                label="取得日期 *"
                type="date"
                {...register("acquisitionDate", { required: true })}
              />
              <Select
                label="取得方式 *"
                options={Object.entries(ACQUISITION_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                {...register("acquisitionType")}
              />
              <Input
                label="購入成本 (TWD)"
                type="number"
                min="0"
                placeholder="0"
                prefix="$"
                {...register("acquisitionCost")}
              />
              <Input
                label="當時市價 (TWD)"
                type="number"
                min="0"
                placeholder="0"
                prefix="$"
                {...register("marketValueAtAcquisition")}
              />
              <Textarea
                label="取得經過 / 備註"
                placeholder="描述如何取得這張卡片…"
                rows={3}
                {...register("acquisitionNotes")}
              />
              <Textarea
                label="收藏故事"
                placeholder="分享這張卡片對你的意義…"
                rows={4}
                {...register("story")}
              />
            </div>
          )}

          {/* Step 3: Storage */}
          {step === 3 && (
            <div className="space-y-3">
              <Select
                label="實體收藏方式"
                options={Object.entries(STORAGE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))}
                {...register("storageType")}
              />
              <Input
                label="存放位置詳細說明"
                placeholder="例：書桌第二抽屜、收納箱 A3 格"
                {...register("storageLocation")}
              />
              <label className="flex items-center gap-3 bg-white rounded-xl p-4 border border-gray-200">
                <input
                  type="checkbox"
                  {...register("isForTrade")}
                  className="w-5 h-5 accent-blue-600"
                />
                <div>
                  <p className="text-sm font-medium text-gray-800">開放換卡</p>
                  <p className="text-xs text-gray-400">讓其他收藏家知道你願意交換</p>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer nav */}
        <div className="px-4 pb-6 pt-3 bg-white border-t border-gray-100 flex gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="secondary"
              size="lg"
              onClick={() => setStep((s) => s - 1)}
              className="flex-1"
            >
              上一步
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              size="lg"
              onClick={() => setStep((s) => s + 1)}
              className="flex-1"
            >
              下一步
            </Button>
          ) : (
            <Button
              type="submit"
              size="lg"
              loading={isSubmitting || uploading}
              className="flex-1"
            >
              儲存卡片
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
