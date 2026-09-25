"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import EduSnapLogo from "@/components/EduSnapLogo";
import StudentIllustration from "@/components/StudentIllustration";
import BottomNavSiswa from "@/components/BottomNavSiswa";

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

// Preset gaya kartu pastel cerah untuk kuis yang benar-benar ada
const CARD_THEMES = [
  {
    bg: "bg-[#E0F2FE]",
    border: "border-sky-200",
    iconBg: "bg-sky-400",
    arrowBg: "bg-sky-400 hover:bg-sky-500",
    textColor: "text-sky-950",
    subtitleColor: "text-sky-700",
    icon: "📘",
  },
  {
    bg: "bg-[#FCE7F3]",
    border: "border-pink-200",
    iconBg: "bg-pink-400",
    arrowBg: "bg-pink-400 hover:bg-pink-500",
    textColor: "text-pink-950",
    subtitleColor: "text-pink-700",
    icon: "📖",
  },
  {
    bg: "bg-[#DCFCE7]",
    border: "border-emerald-200",
    iconBg: "bg-emerald-400",
    arrowBg: "bg-emerald-400 hover:bg-emerald-500",
    textColor: "text-emerald-950",
    subtitleColor: "text-emerald-700",
    icon: "🌱",
  },
  {
    bg: "bg-[#EDE9FE]",
    border: "border-purple-200",
    iconBg: "bg-purple-400",
    arrowBg: "bg-purple-400 hover:bg-purple-500",
    textColor: "text-purple-950",
    subtitleColor: "text-purple-700",
    icon: "🌍",
  },
];

function formatTanggal(iso: string | null) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
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
  const [showProfil, setShowProfil] = useState(false);

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
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [kodeKelas, namaSiswa, router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Pisahkan kuis yang belum dikerjakan (Materi Tersedia) dan yang sudah (Riwayat)
  const kuisBelumDikerjakan = kuisList.filter((k) => !k.sudah_mengerjakan);
  const kuisSudahDikerjakan = [...kuisList]
    .filter((k) => k.sudah_mengerjakan)
    .sort((a, b) => {
      const ta = a.dikerjakan_pada ? new Date(a.dikerjakan_pada).getTime() : 0;
      const tb = b.dikerjakan_pada ? new Date(b.dikerjakan_pada).getTime() : 0;
      return tb - ta; // terbaru dulu
    });

  // Hitung persentase progres belajar
  const totalKuis = kuisList.length;
  const selesaiCount = kuisSudahDikerjakan.length;
  const progressPercent = totalKuis > 0 ? Math.round((selesaiCount / totalKuis) * 100) : 0;

  // Rata-rata nilai dari kuis yang sudah dikerjakan
  const rataRataNilai =
    kuisSudahDikerjakan.length > 0
      ? Math.round(
          kuisSudahDikerjakan.reduce((sum, k) => sum + (k.nilai ?? 0), 0) /
            kuisSudahDikerjakan.length
        )
      : null;

  const handleLogout = () => {
    localStorage.removeItem("edusnap_kode_kelas");
    localStorage.removeItem("edusnap_siswa_nama");
    setShowProfil(false);
    router.push("/join");
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="text-center space-y-3">
          <span className="text-5xl inline-block animate-bounce">🎒</span>
          <p className="text-sm font-black text-slate-700">Memuat Halaman Belajar...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-sky-100 sticky top-0 z-30 px-4 sm:px-6 py-3">
        <div className="max-w-md sm:max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/siswa">
            <EduSnapLogo size="sm" />
          </Link>

          <div className="flex items-center gap-3">
            <span className="text-xl">⭐</span>
            <button
              type="button"
              onClick={() => setShowProfil(true)}
              className="rounded-full ring-2 ring-transparent hover:ring-sky-200 transition"
              aria-label="Lihat profil"
            >
              <StudentIllustration variant="avatar" className="w-10 h-10" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md sm:max-w-2xl w-full mx-auto p-4 space-y-5">
        {/* Greeting Card with Waving Boy */}
        <div className="rounded-[32px] border-2 border-sky-100 bg-white p-5 sm:p-6 shadow-sm flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Hai, {siswa?.nama || namaSiswa || "Andi"}! 👋
            </h1>
            <p className="text-sm font-bold text-slate-500">
              Yuk belajar hari ini!
            </p>
          </div>

          <div className="shrink-0 -mr-2 -my-2">
            <StudentIllustration variant="waving" className="w-24 h-24 sm:w-28 sm:h-28" />
          </div>
        </div>

        {/* Progress Belajar Card */}
        <div className="rounded-3xl border-2 border-sky-100 bg-white p-4 shadow-sm flex items-center gap-4">
          <div className="h-11 w-11 rounded-2xl bg-amber-100 flex items-center justify-center text-xl shrink-0">
            ⭐
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black text-slate-700">
              <span>Progress Belajar</span>
              <span className="text-slate-900">{progressPercent}%</span>
            </div>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Section Materi Tersedia (belum dikerjakan) */}
        <div className="space-y-3">
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            Materi Tersedia
          </h2>

          {kuisBelumDikerjakan.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {kuisBelumDikerjakan.map((kuis, idx) => {
                const theme = CARD_THEMES[idx % CARD_THEMES.length];
                return (
                  <div
                    key={kuis.id}
                    className={`rounded-3xl border-2 ${theme.border} ${theme.bg} p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition`}
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className={`h-12 w-12 rounded-2xl ${theme.iconBg} flex items-center justify-center text-2xl shadow-xs shrink-0`}>
                        {theme.icon}
                      </div>
                      <div className="truncate space-y-0.5">
                        <h3 className={`font-black text-sm sm:text-base ${theme.textColor} truncate`}>
                          {kuis.mata_pelajaran || kuis.judul_kuis}
                        </h3>
                        <p className={`text-xs font-bold ${theme.subtitleColor} truncate`}>
                          {kuis.judul_kuis}
                        </p>
                        <p className="text-[11px] font-extrabold text-slate-500">
                          {kuis.total_soal} Soal
                        </p>
                      </div>
                    </div>

                    <Link
                      href={`/kuis/${kuis.kode_unik}?nama=${encodeURIComponent(siswa?.nama || namaSiswa)}`}
                      className={`h-9 w-9 rounded-full ${theme.arrowBg} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm transition active:scale-95`}
                    >
                      →
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : totalKuis > 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 p-6 flex flex-col items-center text-center gap-2">
              <span className="text-3xl">🎉</span>
              <p className="font-black text-emerald-700 text-sm">
                Semua materi sudah dikerjakan!
              </p>
              <p className="text-xs text-emerald-600 font-semibold">
                Cek riwayat di bawah untuk lihat nilai kamu.
              </p>
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-sky-200 bg-white p-8 flex flex-col items-center text-center gap-3">
              <span className="text-4xl">📭</span>
              <div className="space-y-1">
                <p className="font-black text-slate-700 text-sm">
                  Belum ada materi dari guru
                </p>
                <p className="text-xs text-slate-400 font-semibold max-w-xs">
                  Guru kamu belum menambahkan kuis untuk kelas ini. Coba cek
                  lagi nanti, ya!
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section Riwayat & Nilai (sudah dikerjakan) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base sm:text-lg font-black text-slate-900">
              Riwayat & Nilai
            </h2>
            {rataRataNilai !== null && (
              <span className="text-xs font-black text-slate-500">
                Rata-rata: <span className="text-purple-600">{rataRataNilai}</span>
              </span>
            )}
          </div>

          {kuisSudahDikerjakan.length > 0 ? (
            <div className="space-y-2.5">
              {kuisSudahDikerjakan.map((kuis) => (
                <div
                  key={kuis.id}
                  className="rounded-2xl border-2 border-sky-100 bg-white p-4 flex items-center justify-between gap-3 shadow-xs"
                >
                  <div className="truncate space-y-0.5">
                    <h3 className="font-black text-sm text-slate-900 truncate">
                      {kuis.mata_pelajaran || kuis.judul_kuis}
                    </h3>
                    <p className="text-xs font-bold text-slate-500 truncate">
                      {kuis.judul_kuis}
                    </p>
                    <p className="text-[11px] font-extrabold text-slate-400">
                      Dikerjakan {formatTanggal(kuis.dikerjakan_pada)} ·{" "}
                      {kuis.jumlah_benar ?? 0}/{kuis.total_soal} Benar
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <div
                      className={`rounded-2xl px-3 py-2 text-lg font-black ${
                        (kuis.nilai ?? 0) >= 80
                          ? "bg-emerald-100 text-emerald-700"
                          : (kuis.nilai ?? 0) >= 60
                          ? "bg-amber-100 text-amber-700"
                          : "bg-rose-100 text-rose-700"
                      }`}
                    >
                      {kuis.nilai ?? 0}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-6 flex flex-col items-center text-center gap-2">
              <span className="text-3xl">📝</span>
              <p className="text-xs text-slate-400 font-semibold">
                Belum ada kuis yang kamu kerjakan.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* Modal Profil Siswa */}
      {showProfil && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-6 space-y-5 shadow-xl border-2 border-sky-100">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Profil Siswa</h3>
              <button
                onClick={() => setShowProfil(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col items-center gap-2 py-2">
              <StudentIllustration variant="avatar" className="w-20 h-20" />
              <p className="text-base font-black text-slate-900">
                {siswa?.nama || namaSiswa}
              </p>
              {kelas && (
                <span className="rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-black px-3 py-1">
                  {kelas.nama_kelas}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                <span className="text-xs font-bold text-slate-500">Kode Kelas</span>
                <span className="text-sm font-black text-slate-900 font-mono tracking-wide">
                  {kelas?.kode_kelas || kodeKelas}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                <span className="text-xs font-bold text-slate-500">Kuis Selesai</span>
                <span className="text-sm font-black text-slate-900">
                  {selesaiCount} / {totalKuis}
                </span>
              </div>
              {rataRataNilai !== null && (
                <div className="flex items-center justify-between rounded-2xl bg-slate-50 border border-slate-100 px-4 py-3">
                  <span className="text-xs font-bold text-slate-500">Rata-rata Nilai</span>
                  <span className="text-sm font-black text-purple-600">{rataRataNilai}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="w-full rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-98 py-3 text-sm font-black text-white shadow-md shadow-rose-300/40 transition flex items-center justify-center gap-2"
            >
              <span>🚪</span>
              <span>Keluar Akun</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNavSiswa />
    </div>
  );
}

export default function SiswaDashboardPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">Memuat...</div>}>
      <SiswaDashboardContent />
    </Suspense>
  );
}
