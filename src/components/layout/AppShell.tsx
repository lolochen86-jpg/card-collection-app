"use client";

import BottomNav from "./BottomNav";
import { useAuthStore } from "@/store/authStore";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

const PUBLIC_PATHS = ["/login", "/register"];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && !PUBLIC_PATHS.includes(pathname)) {
      router.replace("/login");
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-500">載入中…</p>
        </div>
      </div>
    );
  }

  const isPublic = PUBLIC_PATHS.includes(pathname);

  return (
    <div className="min-h-screen max-w-lg mx-auto bg-white shadow-sm">
      <main className={isPublic ? "" : "pb-20"}>
        {children}
      </main>
      {!isPublic && user && <BottomNav />}
    </div>
  );
}
