"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (data.status !== "ok") {
        setError(data.message || "Email atau kata sandi tidak sesuai.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi internet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-gradient-to-b from-indigo-50/60 via-white to-slate-100">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="h-12 w-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-md shadow-indigo-200">
              📚
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Login Portal Guru
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Masuk untuk mengelola kelas, materi, dan kuis buku SD
          </p>
        </div>

        {/* Card Form */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xl shadow-indigo-500/5 space-y-5">
          {error && (
            <div className="rounded-xl bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 border border-red-200 font-medium flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Email Guru <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition"
                placeholder="nama.guru@sekolah.id"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Kata Sandi <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition"
                placeholder="Masukkan kata sandi..."
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin">⏳</span>
                  <span>Memeriksa Akun...</span>
                </span>
              ) : (
                "Masuk ke Dashboard Guru →"
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 text-center text-xs text-slate-500">
            <p>
              Belum memiliki akun guru?{" "}
              <Link href="/register" className="font-bold text-indigo-600 hover:underline">
                Daftar Akun Baru
              </Link>
            </p>
            <p>
              Kamu seorang siswa SD?{" "}
              <Link href="/join" className="font-bold text-amber-600 hover:underline">
                Masuk Kuis Siswa di sini
              </Link>
            </p>
          </div>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition">
            ← Kembali ke Halaman Utama
          </Link>
        </div>
      </div>
    </main>
  );
}
