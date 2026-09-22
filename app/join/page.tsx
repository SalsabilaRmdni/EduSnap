"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
      setErrorMsg("Ketik nama lengkap kamu terlebih dahulu ya!");
      return;
    }

    if (!cleanKode) {
      setErrorMsg("Ketik kode kelas atau kode kuis dari gurumu.");
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
        // Berhasil login kelas! Simpan di localStorage & arahkan ke Dashboard Siswa
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

      // 2. Jika bukan kode kelas, cek apakah kode tersebut adalah kode sesi kuis langsung
      const resSesi = await fetch(`/api/sesi/${cleanKode}`);
      const dataSesi = await resSesi.json();

      if (dataSesi.status === "ok") {
        if (typeof window !== "undefined") {
          localStorage.setItem(`kuis_nama_${cleanKode}`, cleanNama);
        }
        router.push(`/kuis/${cleanKode}?nama=${encodeURIComponent(cleanNama)}`);
        return;
      }

      // Jika keduanya tidak cocok
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
    <div className="w-full max-w-md rounded-3xl border-2 border-amber-300 bg-gradient-to-b from-amber-50/60 via-white to-sky-50/40 p-6 sm:p-8 shadow-2xl shadow-amber-500/10 text-center space-y-6">
      {/* Friendly Kid Mascot Icon */}
      <div className="space-y-2">
        <span className="text-5xl sm:text-6xl inline-block animate-bounce">🎒</span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Masuk Kuis Siswa
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
          Ketik namamu dan kode kelas dari gurumu untuk mulai belajar & kuis!
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-2xl bg-red-50 p-3.5 text-xs sm:text-sm text-red-700 border border-red-200 font-bold text-left flex items-start gap-2">
          <span className="text-base shrink-0">⚠️</span>
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleJoin} className="space-y-4 text-left">
        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700">
            Nama Lengkap Kamu <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            required
            value={namaSiswa}
            onChange={(e) => setNamaSiswa(e.target.value)}
            placeholder="Contoh: Andi Pratama"
            className="w-full rounded-2xl border-2 border-slate-200 px-4 py-3.5 text-base font-bold text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-100 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black uppercase tracking-wider text-slate-700">
            Kode Kelas dari Guru <span className="text-amber-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={12}
            value={kodeInput}
            onChange={(e) => setKodeInput(e.target.value.toUpperCase())}
            placeholder="Contoh: 4A-X7K9"
            className="w-full rounded-2xl border-2 border-amber-300 bg-amber-50/40 px-4 py-3.5 text-center text-xl sm:text-2xl font-black font-mono tracking-widest text-amber-900 uppercase placeholder:text-amber-300 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-100 transition"
          />
          <p className="text-[11px] text-slate-400 text-center font-medium">
            (Semua teman di satu kelasmu menggunakan kode yang sama)
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 py-4 text-base font-black text-white shadow-lg shadow-amber-500/25 transition disabled:opacity-50"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="inline-block animate-spin text-lg">⏳</span>
              <span>Memeriksa Kelas...</span>
            </span>
          ) : (
            "Ayo Mulai Belajar! 🚀"
          )}
        </button>
      </form>

      <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
        Kamu seorang guru?{" "}
        <Link href="/login" className="font-bold text-indigo-600 hover:underline">
          Login Guru di sini
        </Link>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-amber-50/50 via-white to-indigo-50/40">
      <Suspense fallback={<div className="text-xs text-slate-400 font-bold">Memuat halaman kuis...</div>}>
        <JoinForm />
      </Suspense>
    </main>
  );
}
