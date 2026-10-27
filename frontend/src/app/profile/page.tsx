"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { docsAPI } from "@/lib/api";
import { User as UserIcon, BookOpen, ArrowLeft, Save, ShieldCheck } from "lucide-react";
import type { User, PaginatedResponse, Document } from "@/types";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (!u) {
      router.replace("/login");
      return;
    }
    const parsed = JSON.parse(u);
    setUser(parsed);
    setFullName(parsed.full_name || "");
  }, [router]);

  const { data: docsData } = useQuery<PaginatedResponse<Document>>({
    queryKey: ["documents", "count"],
    queryFn: () => docsAPI.list({ page: 1, page_size: 1 }).then((r) => r.data),
  });

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const updated = { ...user, full_name: fullName };
    setUser(updated);
    localStorage.setItem("user", JSON.stringify(updated));
    setMessage("Cập nhật thông tin thành công!");
    setTimeout(() => setMessage(""), 3000);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/20 p-6 md:p-10 flex justify-center">
      <div className="w-full max-w-2xl space-y-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại Dashboard
        </button>

        <div className="bg-card border rounded-2xl p-6 md:p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {user.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="text-xl font-bold">{user.full_name || user.username}</h1>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-muted/50 border space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BookOpen className="w-3.5 h-3.5" /> Tổng số tài liệu
              </div>
              <p className="text-2xl font-bold">{docsData?.total ?? 0}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/50 border space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="w-3.5 h-3.5" /> Vai trò tài khoản
              </div>
              <p className="text-2xl font-bold text-emerald-600">Thành viên</p>
            </div>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4 pt-4 border-t">
            {message && (
              <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 p-3 rounded-lg text-sm">
                {message}
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">Tên người dùng</label>
              <input
                value={user.username}
                disabled
                className="w-full h-10 px-3 rounded-lg border bg-muted text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Email</label>
              <input
                value={user.email}
                disabled
                className="w-full h-10 px-3 rounded-lg border bg-muted text-sm cursor-not-allowed"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Họ và tên</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              type="submit"
              className="h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> Lưu thay đổi
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

