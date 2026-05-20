import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { zhTW } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency = "TWD") {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateStr: string) {
  return format(new Date(dateStr), "yyyy/MM/dd", { locale: zhTW });
}

export function timeAgo(dateStr: string) {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: zhTW });
}

export const ACQUISITION_TYPE_LABELS: Record<string, string> = {
  pack: "抽卡",
  purchase: "現金購買",
  trade: "換卡",
  gift: "贈送",
};

export const STORAGE_TYPE_LABELS: Record<string, string> = {
  toploader: "卡磚 (Toploader)",
  magnetic: "磁吸殼",
  psa_case: "PSA 盒",
  bgs_case: "BGS 盒",
  binder: "收藏冊",
  storage_box: "收納箱",
  other: "其他",
};

export const CARD_GRADE_LABELS: Record<string, string> = {
  raw: "未評級 (Raw)",
  PSA: "PSA",
  BGS: "BGS",
  SGC: "SGC",
  CGC: "CGC",
};
