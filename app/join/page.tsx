"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import EduSnapLogo from "@/components/EduSnapLogo";
import MascotBook from "@/components/MascotBook";
import SchoolIllustration from "@/components/SchoolIllustration";
import DecorativeSkyHills from "@/components/DecorativeSkyHills";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [kodeInput, setKodeInput] = useState(
    () => searchParams.get("kode")?.toUpperCase() || ""
  );
  const [namaSiswa, setNamaSiswa] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanKode = kodeInput.trim().toUpperCase();
    const cleanNama = namaSiswa.trim();

    if (!cleanNama) {
      setErrorMsg("Ketik nama kamu terlebih dahulu ya!");
      return;
    }

    if (!cleanKode) {
      setErrorMsg("Ketik kode kelas dari gurumu.");
      return;
    }

    setLoading(true);

    try {
      // 1. Coba login sebagai siswa kelas (Nama + Kode Kelas)
      const resLogin = await fetch("/api/siswa/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: cleanNama, kodeKelas: cleanKode }),
      });
      const dataLogin = await resLogin.json();

      if (dataLogin.status === "ok") {
        if (typeof window !== "undefined") {
          localStorage.setItem("edusnap_siswa_nama", dataLogin.siswa.nama);
          localStorage.setItem("edusnap_siswa_id", dataLogin.siswa.id);
          localStorage.setItem("edusnap_kode_kelas", dataLogin.kelas.kode_kelas);
          localStorage.setItem("edusnap_nama_kelas", dataLogin.kelas.nama_kelas);
        }

        router.push(
          `/siswa?kode=${encodeURIComponent(dataLogin.kelas.kode_kelas)}&nama=${encodeURIComponent(
            dataLogin.siswa.nama
          )}`
        );
        return;
      }

      // 2. Jika bukan kode kelas, cek apakah kode tersebut kode sesi langsung
      const resSesi = await fetch(`/api/sesi/${cleanKode}`);
      const dataSesi = await resSesi.json();

      if (dataSesi.status === "ok") {
        if (typeof window !== "undefined") {
          localStorage.setItem(`kuis_nama_${cleanKode}`, cleanNama);
        }
        router.push(`/kuis/${cleanKode}?nama=${encodeURIComponent(cleanNama)}`);
        return;
      }

      setErrorMsg(
        dataLogin.message || "Kode kelas atau kuis tidak ditemukan. Tanyakan kode ke gurumu ya!"
      );
      setLoading(false);
    } catch {
      setErrorMsg("Gagal terhubung ke server. Periksa koneksi internet.");
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full max-w-sm sm:max-w-md mx-auto z-10">
      {/* Cloud Card Container */}
      <div className="rounded-[36px] border-2 border-sky-100/80 bg-white/95 backdrop-blur-xs p-6 sm:p-8 shadow-xl shadow-sky-200/40 text-center space-y-4">
        {/* Logo */}
        <div className="pt-1">
          <EduSnapLogo size="lg" />
        </div>

        {/* Mascot */}
        <div className="flex justify-center -my-1">
          <MascotBook className="w-36 h-36 sm:w-40 sm:h-40" />
        </div>

        {/* Header Text */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Yuk Belajar!
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-slate-500">
            Masuk dengan nama dan kode kelasmu.
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-600 border border-red-200 font-bold text-left flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleJoin} className="space-y-3 pt-1">
          {/* Input Nama Siswa */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <input
              type="text"
              required
              value={namaSiswa}
              onChange={(e) => setNamaSiswa(e.target.value)}
              placeholder="Nama Siswa"
              className="w-full rounded-2xl border-2 border-sky-100 bg-white py-3.5 pl-11 pr-4 text-sm sm:text-base font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-semibold focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100 transition shadow-xs"
            />
          </div>

          {/* Input Kode Kelas */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <input
              type="text"
              required
              maxLength={12}
              value={kodeInput}
              onChange={(e) => setKodeInput(e.target.value.toUpperCase())}
              placeholder="Kode Kelas"
              className="w-full rounded-2xl border-2 border-sky-100 bg-white py-3.5 pl-11 pr-4 text-sm sm:text-base font-black font-mono tracking-widest text-slate-800 placeholder:text-slate-400 placeholder:font-semibold uppercase focus:border-sky-400 focus:outline-none focus:ring-4 focus:ring-sky-100 transition shadow-xs"
            />
          </div>

          {/* Yellow/Amber Rocket Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 active:scale-98 py-3.5 px-6 text-base font-black text-slate-900 shadow-md shadow-amber-300/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="inline-block animate-spin text-lg">⏳</span>
                <span>Memeriksa Kelas...</span>
              </span>
            ) : (
              <>
                <span>🚀</span>
                <span>Mulai Belajar</span>
              </>
            )}
          </button>
        </form>

        {/* Link Guru */}
        <div className="pt-2 text-xs font-semibold text-slate-400">
          Kamu seorang guru?{" "}
          <Link href="/login" className="font-bold text-blue-600 hover:underline">
            Login Guru di sini
          </Link>
        </div>
      </div>

      {/* School Illustration at the bottom */}
      <div className="flex justify-center -mt-6 sm:-mt-8 z-0">
        <SchoolIllustration className="w-56 h-36 sm:w-64 sm:h-40" />
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 flex flex-col justify-between items-center p-4 relative overflow-hidden">
      {/* Fluffy Decorative Clouds */}
      <div className="absolute top-6 left-6 text-white/90 text-6xl select-none pointer-events-none drop-shadow-xs">
        ☁️
      </div>
      <div className="absolute top-12 right-8 text-white/90 text-7xl select-none pointer-events-none drop-shadow-xs">
        ☁️
      </div>
      <div className="absolute top-28 left-1/4 text-white/70 text-4xl select-none pointer-events-none">
        ☁️
      </div>

      <div className="w-full pt-4 pb-2 flex-1 flex items-center justify-center">
        <Suspense fallback={<div className="text-xs text-sky-600 font-bold">Memuat...</div>}>
          <JoinForm />
        </Suspense>
      </div>

      {/* Decorative Hills at bottom */}
      <div className="w-full absolute bottom-0 inset-x-0 z-0 pointer-events-none">
        <DecorativeSkyHills />
      </div>
    </main>
  );
}
