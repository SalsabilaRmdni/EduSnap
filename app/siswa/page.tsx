"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

interface KuisSiswaItem {
  id: string;
  kode_unik: string;
  judul_kuis: string;
  mata_pelajaran: string;
  tingkat_kelas: string;
  total_soal: number;
  status_kuis: string;
  sudah_mengerjakan: boolean;
  nilai: number | null;
  jumlah_benar: number | null;
  dikerjakan_pada: string | null;
}

interface SiswaData {
  id: string;
  nama: string;
}

interface KelasData {
  id: string;
  nama_kelas: string;
  kode_kelas: string;
}

function SiswaDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [kodeKelas, setKodeKelas] = useState<string>(() => {
    const fromQuery = searchParams.get("kode");
    if (fromQuery) return fromQuery.toUpperCase();
    if (typeof window !== "undefined") {
      return localStorage.getItem("edusnap_kode_kelas") || "";
    }
    return "";
  });

  const [namaSiswa, setNamaSiswa] = useState<string>(() => {
    const fromQuery = searchParams.get("nama");
    if (fromQuery) return fromQuery;
    if (typeof window !== "undefined") {
      return localStorage.getItem("edusnap_siswa_nama") || "";
    }
    return "";
  });

  const [siswa, setSiswa] = useState<SiswaData | null>(null);
  const [kelas, setKelas] = useState<KelasData | null>(null);
  const [kuisList, setKuisList] = useState<KuisSiswaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const loadDashboard = useCallback(async () => {
    if (!kodeKelas || !namaSiswa) {
      router.push("/join");
      return;
    }

    try {
      const res = await fetch(
        `/api/siswa/dashboard?kode=${encodeURIComponent(kodeKelas)}&nama=${encodeURIComponent(
          namaSiswa
        )}`
      );
      const data = await res.json();

      if (data.status === "ok") {
        setSiswa(data.siswa);
        setKelas(data.kelas);
        setKuisList(data.kuisList || []);
      } else {
        setErrorMsg(data.message || "Gagal memuat dashboard kelas.");
      }
    } catch {
      setErrorMsg("Terjadi gangguan koneksi internet.");
    } finally {
      setLoading(false);
    }
  }, [kodeKelas, namaSiswa, router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleKeluar = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("edusnap_siswa_nama");
      localStorage.removeItem("edusnap_kode_kelas");
    }
    router.push("/join");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 via-white to-amber-50">
        <div className="text-center space-y-3">
          <span className="text-5xl inline-block animate-bounce">🎒</span>
          <p className="text-sm font-extrabold text-slate-600">Memuat Kelas EduSnap Kamu...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white sticky top-0 z-20 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🎒</span>
            <span className="text-lg font-black tracking-tight text-slate-900">
              Edu<span className="text-indigo-600">Snap</span> Siswa
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
              {siswa?.nama} • {kelas?.nama_kelas}
            </span>
            <button
              onClick={handleKeluar}
              className="rounded-xl border border-slate-300 hover:bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition"
            >
              Ganti Siswa / Keluar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {errorMsg && (
          <div className="rounded-2xl bg-red-50 p-4 text-xs sm:text-sm text-red-700 font-bold border border-red-200">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Big Greeting Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 p-6 sm:p-8 text-white shadow-xl shadow-indigo-500/10 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full">
              {kelas?.nama_kelas} (Kode: {kelas?.kode_kelas})
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Halo, {siswa?.nama}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-sky-100 leading-relaxed max-w-md">
              Ayo kerjakan kuis-kuis seru dari gurumu di bawah ini. Jawab dengan teliti ya!
            </p>
          </div>
          <span className="text-5xl sm:text-6xl hidden sm:inline-block">🏆</span>
        </div>

        {/* Daftar Kuis Kelas */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-black text-slate-900">
              Daftar Kuis & Latihan Soal ({kuisList.length})
            </h2>
            <span className="text-xs font-bold text-slate-400">
              {kelas?.nama_kelas}
            </span>
          </div>

          {kuisList.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-10 text-center space-y-3">
              <span className="text-5xl">📖</span>
              <h3 className="text-base font-extrabold text-slate-800">
                Belum ada kuis untuk kelasmu
              </h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Gurumu belum membuka sesi kuis baru. Tanyakan kepada gurumu di kelas ya!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {kuisList.map((kuis) => (
                <div
                  key={kuis.id}
                  className={`rounded-3xl border-2 p-6 flex flex-col justify-between space-y-4 transition-all ${
                    kuis.sudah_mengerjakan
                      ? "border-slate-200 bg-white shadow-xs"
                      : "border-emerald-300 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 shadow-md shadow-emerald-500/5 hover:border-emerald-400"
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-md bg-indigo-50 px-2.5 py-0.5 text-[11px] font-extrabold text-indigo-700">
                        {kuis.mata_pelajaran}
                      </span>
                      {kuis.sudah_mengerjakan ? (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 font-black text-xs px-3 py-1">
                          Nilai: {kuis.nilai} 🌟
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 text-amber-800 font-extrabold text-[11px] px-2.5 py-0.5 animate-pulse">
                          Siap Dikerjakan
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 leading-snug">
                      {kuis.judul_kuis}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Jumlah Soal: <strong>{kuis.total_soal} Butir Pilihan Ganda</strong>
                    </p>
                  </div>

                  {kuis.sudah_mengerjakan ? (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 font-medium">
                        Benar {kuis.jumlah_benar} dari {kuis.total_soal} soal
                      </span>
                      <Link
                        href={`/kuis/${kuis.kode_unik}?nama=${encodeURIComponent(siswa?.nama || "")}`}
                        className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 transition"
                      >
                        Lihat Kuis 👀
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={`/kuis/${kuis.kode_unik}?nama=${encodeURIComponent(siswa?.nama || "")}`}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 py-3.5 text-sm font-black text-white shadow-md shadow-emerald-600/20 transition"
                    >
                      <span>Mulai Kerjakan Soal! 🚀</span>
                    </Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SiswaDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">Memuat dashboard...</div>}>
      <SiswaDashboardContent />
    </Suspense>
  );
}
