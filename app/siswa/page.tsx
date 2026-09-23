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

// Preset gaya kartu pastel cerah seperti pada referensi
const CARD_THEMES = [
  {
    bg: "bg-[#E0F2FE]", // Light blue
    border: "border-sky-200",
    iconBg: "bg-sky-400",
    arrowBg: "bg-sky-400 hover:bg-sky-500",
    textColor: "text-sky-950",
    subtitleColor: "text-sky-700",
    icon: "📘",
    defaultMapel: "Matematika",
    desc: "Belajar Pecahan & Berhitung",
  },
  {
    bg: "bg-[#FCE7F3]", // Light pink
    border: "border-pink-200",
    iconBg: "bg-pink-400",
    arrowBg: "bg-pink-400 hover:bg-pink-500",
    textColor: "text-pink-950",
    subtitleColor: "text-pink-700",
    icon: "📖",
    defaultMapel: "Bahasa Indonesia",
    desc: "Membaca Cerita & Menulis",
  },
  {
    bg: "bg-[#DCFCE7]", // Light mint green
    border: "border-emerald-200",
    iconBg: "bg-emerald-400",
    arrowBg: "bg-emerald-400 hover:bg-emerald-500",
    textColor: "text-emerald-950",
    subtitleColor: "text-emerald-700",
    icon: "🌱",
    defaultMapel: "IPA",
    desc: "Tumbuhan & Alam Sekitar",
  },
  {
    bg: "bg-[#EDE9FE]", // Light purple
    border: "border-purple-200",
    iconBg: "bg-purple-400",
    arrowBg: "bg-purple-400 hover:bg-purple-500",
    textColor: "text-purple-950",
    subtitleColor: "text-purple-700",
    icon: "🌍",
    defaultMapel: "IPS",
    desc: "Lingkungan & Masyarakat",
  },
];

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

  // Hitung persentase progres belajar
  const totalKuis = kuisList.length;
  const selesaiCount = kuisList.filter((k) => k.sudah_mengerjakan).length;
  const progressPercent = totalKuis > 0 ? Math.round((selesaiCount / totalKuis) * 100) : 80;

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
            <StudentIllustration variant="avatar" className="w-10 h-10" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md sm:max-w-2xl w-full mx-auto p-4 space-y-4">
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
          {/* Star Icon */}
          <div className="h-11 w-11 rounded-2xl bg-amber-100 flex items-center justify-center text-xl shrink-0">
            ⭐
          </div>

          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs font-black text-slate-700">
              <span>Progress Belajar</span>
              <span className="text-slate-900">{progressPercent}%</span>
            </div>
            {/* Green Progress Bar */}
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
              <div
                className="bg-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Section Materi Tersedia */}
        <div className="space-y-3 pt-1">
          <h2 className="text-base sm:text-lg font-black text-slate-900">
            Materi Tersedia
          </h2>

          {/* Grid Cards (2x2) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {kuisList.length > 0 ? (
              kuisList.map((kuis, idx) => {
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
              })
            ) : (
              // Default 4 subjects if no quizzes are created yet (matching reference mockup)
              CARD_THEMES.map((theme, idx) => (
                <div
                  key={idx}
                  className={`rounded-3xl border-2 ${theme.border} ${theme.bg} p-4 sm:p-5 flex items-center justify-between gap-3 shadow-xs`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className={`h-12 w-12 rounded-2xl ${theme.iconBg} flex items-center justify-center text-2xl shadow-xs shrink-0`}>
                      {theme.icon}
                    </div>
                    <div className="truncate space-y-0.5">
                      <h3 className={`font-black text-sm sm:text-base ${theme.textColor} truncate`}>
                        {theme.defaultMapel}
                      </h3>
                      <p className={`text-xs font-bold ${theme.subtitleColor} truncate`}>
                        {theme.desc}
                      </p>
                      <p className="text-[11px] font-extrabold text-slate-500">
                        10 Soal
                      </p>
                    </div>
                  </div>

                  <Link
                    href="/join"
                    className={`h-9 w-9 rounded-full ${theme.arrowBg} text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm transition active:scale-95`}
                  >
                    →
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

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
