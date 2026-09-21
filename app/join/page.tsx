"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [kodeKuis, setKodeKuis] = useState(
    () => searchParams.get("kode")?.toUpperCase() || ""
  );
  const [namaSiswa, setNamaSiswa] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    const cleanKode = kodeKuis.trim().toUpperCase();
    const cleanNama = namaSiswa.trim();

    if (!cleanKode) {
      setErrorMsg("Masukkan kode kuis terlebih dahulu.");
      return;
    }

    if (!cleanNama) {
      setErrorMsg("Masukkan nama lengkap kamu.");
      return;
    }

    setLoading(true);

    try {
      // Verifikasi apakah kode sesi valid
      const res = await fetch(`/api/sesi/${cleanKode}`);
      const data = await res.json();

      if (data.status !== "ok") {
        setErrorMsg(data.message || "Kode kuis tidak ditemukan. Tanyakan kode ke gurumu.");
        setLoading(false);
        return;
      }

      // Simpan nama siswa ke localStorage agar tidak hilang saat reload
      if (typeof window !== "undefined") {
        localStorage.setItem(`kuis_nama_${cleanKode}`, cleanNama);
      }

      // Arahkan ke halaman kuis
      router.push(`/kuis/${cleanKode}?nama=${encodeURIComponent(cleanNama)}`);
    } catch {
      setErrorMsg("Gagal menghubungi server. Periksa koneksi internet.");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-indigo-100 bg-white p-8 shadow-xl text-center space-y-6">
      <div className="space-y-2">
        <span className="text-4xl">🎒</span>
        <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">
          Masuk Kuis Siswa
        </h1>
        <p className="text-sm text-gray-500">
          Masukkan kode kuis dari gurumu dan namamu untuk mulai belajar!
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600 border border-red-100 font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleJoin} className="space-y-4 text-left">
        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Kode Kuis <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            maxLength={10}
            value={kodeKuis}
            onChange={(e) => setKodeKuis(e.target.value.toUpperCase())}
            placeholder="Contoh: SD4IPA"
            className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-center text-xl font-extrabold tracking-widest text-indigo-700 uppercase focus:border-indigo-600 focus:outline-none focus:ring-0 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-gray-700">
            Nama Lengkap Siswa <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            required
            value={namaSiswa}
            onChange={(e) => setNamaSiswa(e.target.value)}
            placeholder="Contoh: Budi Santoso"
            className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base text-gray-900 focus:border-indigo-600 focus:outline-none focus:ring-1 focus:ring-indigo-600 transition"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-indigo-600 py-3.5 text-base font-bold text-white shadow-md hover:bg-indigo-700 active:scale-98 transition disabled:opacity-50"
        >
          {loading ? "Memeriksa Kode..." : "Mulai Kerjakan Kuis 🚀"}
        </button>
      </form>

      <div className="border-t border-gray-100 pt-4 text-xs text-gray-400">
        Kamu seorang guru?{" "}
        <Link href="/login" className="font-semibold text-indigo-600 hover:underline">
          Login Guru di sini
        </Link>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4 bg-gradient-to-b from-indigo-50/60 via-white to-gray-50">
      <Suspense fallback={<div className="text-sm text-gray-400">Memuat form join...</div>}>
        <JoinForm />
      </Suspense>
    </main>
  );
}
