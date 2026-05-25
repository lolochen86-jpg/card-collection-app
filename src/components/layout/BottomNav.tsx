"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, BookOpen, PlusCircle, TrendingUp, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/", icon: Home, label: "首頁" },
  { href: "/collection", icon: BookOpen, label: "我的卡冊" },
  { href: "/cards/new", icon: PlusCircle, label: "新增", primary: true },
  { href: "/prices", icon: TrendingUp, label: "卡價" },
  { href: "/community", icon: Users, label: "社群" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label, primary }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 gap-0.5 py-1 rounded-xl transition-colors",
                primary
                  ? "text-blue-600"
                  : active
                  ? "text-blue-600"
                  : "text-gray-400"
              )}
            >
              <Icon
                size={primary ? 28 : 22}
                className={cn(primary && "drop-shadow-[0_0_6px_rgba(37,99,235,0.5)]")}
                strokeWidth={primary ? 2.5 : active ? 2.2 : 1.8}
              />
              <span className={cn("text-[10px] font-medium", primary && "text-blue-600")}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
