"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EduSnapLogo from "@/components/EduSnapLogo";
import TeacherIllustration from "@/components/TeacherIllustration";
import DecorativeSkyHills from "@/components/DecorativeSkyHills";

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
        setError(data.message || "Email atau kata sandi tidak cocok.");
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
    <main className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 flex flex-col justify-between items-center p-4 relative overflow-hidden">
      {/* Decorative Clouds */}
      <div className="absolute top-6 left-8 text-white/90 text-6xl select-none pointer-events-none drop-shadow-xs">
        ☁️
      </div>
      <div className="absolute top-10 right-10 text-white/90 text-7xl select-none pointer-events-none drop-shadow-xs">
        ☁️
      </div>

      <div className="w-full pt-4 pb-2 flex-1 flex items-center justify-center z-10">
        <div className="w-full max-w-sm sm:max-w-md mx-auto">
          {/* Card Container */}
          <div className="rounded-[36px] border-2 border-sky-100/80 bg-white/95 backdrop-blur-xs p-6 sm:p-8 shadow-xl shadow-sky-200/40 text-center space-y-4">
            {/* Logo */}
            <div className="pt-1">
              <EduSnapLogo size="lg" />
            </div>

            {/* Teacher Illustration */}
            <div className="flex justify-center -my-1">
              <TeacherIllustration className="w-32 h-32 sm:w-36 sm:h-36" />
            </div>

            {/* Header Text */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Selamat Datang, Bu Guru!
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500">
                Masuk untuk melanjutkan.
              </p>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-600 border border-red-200 font-bold text-left flex items-center gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              {/* Email / Username Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email atau Username"
                  className="w-full rounded-2xl border-2 border-sky-100 bg-white py-3.5 pl-11 pr-4 text-sm sm:text-base font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-semibold focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition shadow-xs"
                />
              </div>

              {/* Password Input */}
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full rounded-2xl border-2 border-sky-100 bg-white py-3.5 pl-11 pr-4 text-sm sm:text-base font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-semibold focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition shadow-xs"
                />
              </div>

              {/* Purple Button "Masuk" */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-98 py-3.5 px-6 text-base font-black text-white shadow-md shadow-purple-300/50 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="inline-block animate-spin text-lg">⏳</span>
                    <span>Memeriksa Akun...</span>
                  </span>
                ) : (
                  "Masuk"
                )}
              </button>
            </form>

            <div className="pt-2 text-xs font-semibold text-slate-400 space-y-1">
              <p>
                Belum punya akun guru?{" "}
                <Link href="/register" className="font-bold text-purple-600 hover:underline">
                  Daftar di sini
                </Link>
              </p>
              <p>
                Siswa SD masuk kuis?{" "}
                <Link href="/join" className="font-bold text-amber-500 hover:underline">
                  Masuk Kuis Siswa
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Decorative Hills at the bottom */}
      <div className="w-full absolute bottom-0 inset-x-0 z-0 pointer-events-none">
        <DecorativeSkyHills />
      </div>
    </main>
  );
}
