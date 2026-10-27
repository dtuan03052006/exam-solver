"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authAPI } from "@/lib/api";
import { UserPlus, BookOpen } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ username: "", email: "", password: "", full_name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const update = (k: string, v: string) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.username || !form.email || !form.password) {
      setError("Vui lòng nhập đầy đủ thông tin bắt buộc");
      return;
    }
    if (form.password.length < 6) { setError("Mật khẩu tối thiểu 6 ký tự"); return; }
    setLoading(true);
    try {
      await authAPI.register(form);
      router.push("/login");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Đăng ký thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-2xl mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Tạo tài khoản</h1>
          <p className="text-muted-foreground mt-1">Đăng ký để bắt đầu sử dụng</p>
        </div>
        <form onSubmit={handleSubmit} className="bg-card border rounded-2xl p-8 shadow-sm space-y-4">
          {error && <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">{error}</div>}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tên đăng nhập *</label>
            <input value={form.username} onChange={(e) => update("username", e.target.value)} className="w-full h-11 px-4 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="username" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Email *</label>
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="w-full h-11 px-4 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="you@example.com" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Họ tên</label>
            <input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="w-full h-11 px-4 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Mật khẩu *</label>
            <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} className="w-full h-11 px-4 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" placeholder="Tối thiểu 6 ký tự" />
          </div>
          <button type="submit" disabled={loading} className="w-full h-11 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" /> : <><UserPlus className="w-4 h-4" /> Đăng ký</>}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Đã có tài khoản? <Link href="/login" className="text-primary font-medium hover:underline">Đăng nhập</Link>
          </p>
        </form>
      </div>
    </div>
  );
}