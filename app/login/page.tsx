"use client";

import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) setError(err);
    }
  }, []);

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

            {/* Header Text: Netral tanpa nama sebelum login */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Selamat Datang, Guru!
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
            <form onSubmit={handleSubmit} className="space-y-3 pt-1 text-left">
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
              <div className="space-y-1.5">
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

                {/* Link Lupa Password */}
                <div className="flex justify-end pr-1">
                  <Link
                    href="/forgot-password"
                    className="text-xs font-bold text-purple-600 hover:text-purple-700 hover:underline"
                  >
                    Lupa Password?
                  </Link>
                </div>
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

              {/* Divider atau */}
              <div className="relative flex py-1.5 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-xs font-bold text-slate-400">atau</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* Button Masuk dengan Google */}
              <a
                href="/api/auth/google"
                className="w-full rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-98 py-3 px-4 text-sm font-black text-slate-700 shadow-xs flex items-center justify-center gap-3 transition"
              >
                {/* Official Google G Logo SVG */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Google</span>
              </a>
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
