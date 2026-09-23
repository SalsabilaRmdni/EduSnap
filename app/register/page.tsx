"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EduSnapLogo from "@/components/EduSnapLogo";
import TeacherIllustration from "@/components/TeacherIllustration";
import DecorativeSkyHills from "@/components/DecorativeSkyHills";

export default function RegisterPage() {
  const router = useRouter();
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama, email, password }),
      });
      const data = await res.json();

      if (data.status !== "ok") {
        setError(data.message || "Gagal registrasi.");
        return;
      }

      if (nama.trim()) {
        localStorage.setItem("edusnap_guru_nama", nama.trim());
      }

      router.push("/login?registered=1");
    } catch {
      setError("Gagal menghubungi server. Periksa koneksi internet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 flex flex-col justify-between items-center p-4 relative overflow-hidden">
      <div className="w-full pt-4 pb-2 flex-1 flex items-center justify-center z-10">
        <div className="w-full max-w-sm sm:max-w-md mx-auto">
          <div className="rounded-[36px] border-2 border-sky-100/80 bg-white/95 backdrop-blur-xs p-6 sm:p-8 shadow-xl shadow-sky-200/40 text-center space-y-4">
            <div className="pt-1">
              <EduSnapLogo size="lg" />
            </div>

            <div className="flex justify-center -my-1">
              <TeacherIllustration className="w-28 h-28" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Daftar Akun Guru
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500">
                Mulai buat kuis interaktif dari foto buku SD.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-600 border border-red-200 font-bold text-left flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 pt-1 text-left">
              <div>
                <label className="text-xs font-bold text-slate-700 ml-1">Nama Lengkap & Gelar</label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Bu Siti, S.Pd."
                  className="w-full rounded-2xl border-2 border-sky-100 bg-white py-3 px-4 text-sm font-bold text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition shadow-xs mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 ml-1">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@sekolah.id"
                  className="w-full rounded-2xl border-2 border-sky-100 bg-white py-3 px-4 text-sm font-bold text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition shadow-xs mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 ml-1">Password</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-2xl border-2 border-sky-100 bg-white py-3 px-4 text-sm font-bold text-slate-800 focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition shadow-xs mt-1"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-98 py-3.5 px-6 text-base font-black text-white shadow-md shadow-purple-300/50 flex items-center justify-center gap-2 transition disabled:opacity-50 mt-2"
              >
                {loading ? "Mendaftarkan..." : "Daftar Akun Guru"}
              </button>
            </form>

            <div className="pt-2 text-xs font-semibold text-slate-400">
              Sudah punya akun?{" "}
              <Link href="/login" className="font-bold text-purple-600 hover:underline">
                Masuk di sini
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full absolute bottom-0 inset-x-0 z-0 pointer-events-none">
        <DecorativeSkyHills />
      </div>
    </main>
  );
}
