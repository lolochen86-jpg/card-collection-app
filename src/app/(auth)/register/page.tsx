"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { CreditCard } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("密碼至少需要 6 個字元");
      return;
    }
    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email,
        displayName: name,
        photoURL: "",
        bio: "",
        createdAt: new Date().toISOString(),
      });
      toast.success("註冊成功！");
      router.replace("/");
    } catch (err: unknown) {
      const msg = (err as { code?: string }).code === "auth/email-already-in-use"
        ? "此電子郵件已被使用"
        : "註冊失敗，請稍後再試";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-gradient-to-b from-blue-600 to-blue-800">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-lg mb-3">
            <CreditCard size={32} className="text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-white">CardVault</h1>
          <p className="text-blue-200 text-sm mt-1">建立你的個人卡冊</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-xl">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">建立帳號</h2>
          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            <Input
              label="暱稱"
              type="text"
              placeholder="收藏家名稱"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="電子郵件"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="密碼"
              type="password"
              placeholder="至少 6 個字元"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" size="lg" loading={loading} className="w-full mt-1">
              建立帳號
            </Button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-5">
            已有帳號？{" "}
            <Link href="/login" className="text-blue-600 font-medium">
              立即登入
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
