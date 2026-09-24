"use client";

import { useState } from "react";
import Link from "next/link";
import EduSnapLogo from "@/components/EduSnapLogo";
import TeacherIllustration from "@/components/TeacherIllustration";
import DecorativeSkyHills from "@/components/DecorativeSkyHills";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [simulated, setSimulated] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();

      if (data.status === "ok") {
        setSuccessMsg(data.message);
        setSimulated(data.simulated || false);
      } else {
        setErrorMsg(data.message || "Gagal memproses permintaan reset password.");
      }
    } catch {
      setErrorMsg("Gagal menghubungi server. Periksa koneksi internet Anda.");
    } finally {
      setLoading(false);
    }
  };

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
              <TeacherIllustration className="w-28 h-28 sm:w-32 sm:h-32" />
            </div>

            {/* Header Text */}
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                Lupa Password Guru
              </h1>
              <p className="text-xs sm:text-sm font-semibold text-slate-500">
                Masukkan email yang Anda gunakan saat mendaftar akun.
              </p>
            </div>

            {/* Error Alert */}
            {errorMsg && (
              <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-600 border border-red-200 font-bold text-left flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Alert */}
            {successMsg ? (
              <div className="space-y-4 pt-2">
                <div className="rounded-2xl bg-emerald-50 p-4 text-xs sm:text-sm text-emerald-800 border border-emerald-200 font-bold text-left space-y-2">
                  <div className="flex items-center gap-2 text-base">
                    <span>✉️</span>
                    <span>Email Terkirim!</span>
                  </div>
                  <p className="font-medium text-emerald-700 leading-relaxed">
                    {successMsg}
                  </p>
                  {simulated && (
                    <p className="text-[11px] text-amber-700 bg-amber-100 p-2 rounded-xl mt-1">
                      ℹ️ <em>Mode Pengembangan: Karena SMTP belum diset, tautan reset telah dicatat di terminal/console server.</em>
                    </p>
                  )}
                </div>

                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-98 py-3.5 px-6 text-sm font-black text-white shadow-md shadow-purple-300/50 transition"
                >
                  ← Kembali ke Halaman Login
                </Link>
              </div>
            ) : (
              /* Form */
              <form onSubmit={handleSubmit} className="space-y-4 pt-1">
                {/* Email Input */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Masukkan Email Terdaftar"
                    className="w-full rounded-2xl border-2 border-sky-100 bg-white py-3.5 pl-11 pr-4 text-sm sm:text-base font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-semibold focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition shadow-xs"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-98 py-3.5 px-6 text-base font-black text-white shadow-md shadow-purple-300/50 flex items-center justify-center gap-2 transition disabled:opacity-50"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="inline-block animate-spin text-lg">⏳</span>
                      <span>Mengirim Tautan...</span>
                    </span>
                  ) : (
                    "Kirim Link Reset Password"
                  )}
                </button>

                <div className="pt-2">
                  <Link
                    href="/login"
                    className="text-xs font-bold text-slate-500 hover:text-slate-800 hover:underline inline-flex items-center gap-1"
                  >
                    <span>← Kembali ke Halaman Login</span>
                  </Link>
                </div>
              </form>
            )}
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
