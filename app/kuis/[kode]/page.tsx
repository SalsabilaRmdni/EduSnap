"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import MascotBook from "@/components/MascotBook";
import StudentIllustration from "@/components/StudentIllustration";
import DecorativeSkyHills from "@/components/DecorativeSkyHills";

interface SoalSiswa {
  index: number;
  id: string;
  pertanyaan: string;
  pilihan: string[];
}

interface SesiSiswa {
  id: string;
  kode_unik: string;
  judul_kuis: string;
  mata_pelajaran: string;
  tingkat_kelas: string;
  status: string;
  total_soal: number;
  soal: SoalSiswa[];
}

interface HasilEvaluasi {
  nomor: number;
  pertanyaan: string;
  pilihan: string[];
  jawabanSiswa: number;
  kunciJawaban: number;
  isBenar: boolean;
}

interface ProgresInfo {
  level: number;
  statusMateri: string;
  percobaanKe: number;
  skorTertinggi: number;
  riwayatPercobaan: unknown[];
}

interface HasilKuis {
  pesertaId?: string;
  namaSiswa: string;
  judulKuis: string;
  mataPelajaran: string;
  tingkatKelas: string;
  skor: number;
  jumlahBenar: number;
  totalSoal: number;
  lulus: boolean;
  levelSaatIni: number;
  levelBaru: number;
  statusMateri: string; // "sedang_belajar" | "selesai"
  percobaanKe: number;
  detail: HasilEvaluasi[];
}

// 4 Warna Pastel untuk Pilihan Jawaban A, B, C, D (Sesuai Referensi Gambar)
const OPTION_STYLES = [
  {
    bg: "bg-[#E0F2FE]", // Pastel Blue
    border: "border-sky-300",
    text: "text-sky-950",
    label: "A",
  },
  {
    bg: "bg-[#FEF08A]", // Pastel Yellow
    border: "border-amber-300",
    text: "text-amber-950",
    label: "B",
  },
  {
    bg: "bg-[#FCE7F3]", // Pastel Pink
    border: "border-pink-300",
    text: "text-pink-950",
    label: "C",
  },
  {
    bg: "bg-[#EDE9FE]", // Pastel Purple
    border: "border-purple-300",
    text: "text-purple-950",
    label: "D",
  },
];

function KuisSiswaContent() {
  const params = useParams<{ kode: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const kode = (params.kode || "").toUpperCase();

  const [sesi, setSesi] = useState<SesiSiswa | null>(null);
  const [progres, setProgres] = useState<ProgresInfo | null>(null);
  const [namaSiswa, setNamaSiswa] = useState<string>(() => {
    const fromQuery = searchParams.get("nama");
    if (fromQuery) return fromQuery;
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem(`kuis_nama_${kode}`) ||
        localStorage.getItem("edusnap_siswa_nama") ||
        ""
      );
    }
    return "";
  });

  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasil, setHasil] = useState<HasilKuis | null>(null);

  const fetchSesi = useCallback(async () => {
    if (!kode) return;
    try {
      const url = namaSiswa.trim()
        ? `/api/sesi/${kode}?nama=${encodeURIComponent(namaSiswa.trim())}`
        : `/api/sesi/${kode}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === "ok") {
        setSesi(data.sesi);
        if (data.progres) {
          setProgres(data.progres);
        }
      } else {
        setErrorMsg(data.message || "Kuis tidak ditemukan.");
      }
    } catch {
      setErrorMsg("Terjadi gangguan koneksi.");
    } finally {
      setLoading(false);
    }
  }, [kode, namaSiswa]);

  useEffect(() => {
    fetchSesi();
  }, [fetchSesi]);

  const handlePilihOpsi = (soalIdx: number, opsiIdx: number) => {
    setJawaban((prev) => ({
      ...prev,
      [soalIdx]: opsiIdx,
    }));
  };

  const handleNext = () => {
    if (!sesi) return;
    if (currentIdx < sesi.soal.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!sesi) return;

    if (!namaSiswa.trim()) {
      alert("Silakan isi nama kamu terlebih dahulu.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    const jawabanArray = sesi.soal.map((_, idx) =>
      jawaban[idx] !== undefined ? jawaban[idx] : -1
    );

    try {
      const res = await fetch(`/api/sesi/${kode}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaSiswa: namaSiswa.trim(),
          jawaban: jawabanArray,
        }),
      });

      const data = await res.json();
      if (data.status === "ok" && data.hasil) {
        setHasil(data.hasil);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMsg(data.message || "Gagal mengirim jawaban.");
      }
    } catch {
      setErrorMsg("Koneksi terputus. Silakan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-sky-50">
        <div className="text-center space-y-3">
          <span className="text-5xl inline-block animate-bounce">🎒</span>
          <p className="text-sm font-black text-slate-700">Sedang memuat soal kuis...</p>
        </div>
      </main>
    );
  }

  if (errorMsg && !sesi) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-sky-50 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl shadow-sm border-2 border-sky-100 space-y-4">
          <span className="text-4xl block">⚠️</span>
          <h2 className="text-2xl font-black text-slate-900">Oops!</h2>
          <p className="text-xs sm:text-sm text-slate-600">{errorMsg}</p>
          <button
            onClick={() => router.push("/join")}
            className="rounded-2xl bg-amber-400 font-black px-6 py-3 text-sm text-slate-900 hover:bg-amber-500 transition"
          >
            Kembali ke Halaman Masuk
          </button>
        </div>
      </main>
    );
  }

  const handleCobaLagiAtauLanjut = () => {
    setHasil(null);
    setJawaban({});
    setCurrentIdx(0);
    setLoading(true);
    fetchSesi();
  };

  // ==========================================
  // SCREEN 4: HASIL SOAL ADAPTIF (3 KONDISI)
  // ==========================================
  if (hasil) {
    const totalSoal = hasil.totalSoal;
    const salahCount = totalSoal - hasil.jumlahBenar;
    const isMateriSelesai = hasil.lulus && hasil.statusMateri === "selesai";
    const isLulusLevel = hasil.lulus && !isMateriSelesai;
    const isGagal = !hasil.lulus;

    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 p-4 sm:p-6 flex flex-col justify-between items-center relative overflow-hidden">
        {/* Floating Confetti & Stars */}
        <div className="absolute top-10 left-8 text-amber-400 text-3xl animate-bounce">⭐</div>
        <div className="absolute top-16 right-10 text-amber-400 text-4xl animate-bounce">⭐</div>
        <div className="absolute top-28 left-16 text-pink-400 text-2xl">✨</div>
        <div className="absolute top-24 right-20 text-sky-400 text-2xl">✨</div>

        <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto z-10 pt-4 space-y-4 text-center">
          {/* Mascot */}
          <div className="flex justify-center -mb-2">
            <MascotBook className="w-32 h-32 sm:w-40 sm:h-40" />
          </div>

          {/* Heading Dinamis Sesuai Hasil */}
          <div className="space-y-1">
            {isMateriSelesai ? (
              <>
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full mb-1">
                  🏆 MATERI TUNTAS 100%
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Luar Biasa, {hasil.namaSiswa}! 🎉
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500">
                  Kamu telah menyelesaikan seluruh level materi ini dengan gemilang!
                </p>
              </>
            ) : isLulusLevel ? (
              <>
                <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-black rounded-full mb-1">
                  ✓ LULUS LEVEL {hasil.levelSaatIni}
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Hebat, {hasil.namaSiswa}! 🚀
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500">
                  Nilaimu memenuhi KKM 70. Kamu berhak naik ke Level {hasil.levelBaru}!
                </p>
              </>
            ) : (
              <>
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-xs font-black rounded-full mb-1">
                  BELUM LULUS KKM 70
                </span>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  Ayo Semangat, {hasil.namaSiswa}! 💪
                </h1>
                <p className="text-xs sm:text-sm font-bold text-slate-500">
                  Minimal 4 soal benar (nilai 80) untuk lulus. Jangan menyerah, yuk coba lagi dengan soal baru!
                </p>
              </>
            )}
          </div>

          {/* Score Card */}
          <div className={`rounded-[28px] border-2 p-5 shadow-sm flex items-center justify-center gap-5 ${
            isGagal ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"
          }`}>
            <span className="text-5xl">{isGagal ? "📚" : "⭐"}</span>
            <div className="text-left">
              <span className="text-[11px] font-extrabold text-slate-600 uppercase tracking-wider block">
                Nilai Kamu (Percobaan ke-{hasil.percobaanKe})
              </span>
              <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight">
                {hasil.skor}
              </span>
            </div>
          </div>

          {/* Jawaban Benar & Salah Badges */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border-2 border-emerald-200 bg-white p-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center">
                  ✓
                </span>
                <span className="text-xs font-extrabold text-slate-700">Benar</span>
              </div>
              <span className="text-lg font-black text-emerald-600">{hasil.jumlahBenar} / {totalSoal}</span>
            </div>

            <div className="rounded-2xl border-2 border-red-200 bg-white p-3 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-red-500 text-white font-black text-xs flex items-center justify-center">
                  ✕
                </span>
                <span className="text-xs font-extrabold text-slate-700">Salah</span>
              </div>
              <span className="text-lg font-black text-red-500">{salahCount}</span>
            </div>
          </div>

          {/* Action Buttons Dinamis */}
          <div className="pt-2 space-y-2">
            {isGagal && (
              <button
                onClick={handleCobaLagiAtauLanjut}
                className="w-full rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-98 py-3.5 px-6 text-sm sm:text-base font-black text-slate-900 shadow-md shadow-amber-300/40 flex items-center justify-center gap-2 transition"
              >
                <span>🔄</span>
                <span>Ulangi Level {hasil.levelSaatIni} (Soal Baru)</span>
              </button>
            )}

            {isLulusLevel && (
              <button
                onClick={handleCobaLagiAtauLanjut}
                className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 py-3.5 px-6 text-sm sm:text-base font-black text-white shadow-md shadow-emerald-300/40 flex items-center justify-center gap-2 transition"
              >
                <span>🚀</span>
                <span>Lanjut ke Level {hasil.levelBaru}</span>
              </button>
            )}

            <button
              onClick={() => router.push("/siswa")}
              className="w-full rounded-2xl bg-white border-2 border-slate-200 hover:bg-slate-50 active:scale-98 py-3 px-6 text-xs sm:text-sm font-black text-slate-700 transition flex items-center justify-center gap-2"
            >
              <span>🏠</span>
              <span>Kembali ke Beranda Belajar</span>
            </button>
          </div>
        </div>

        {/* Decorative Green Grass Hills */}
        <div className="w-full absolute bottom-0 inset-x-0 z-0 pointer-events-none">
          <DecorativeSkyHills />
        </div>
      </main>
    );
  }

  // ==========================================
  // SCREEN 3: HALAMAN SOAL (Mengikuti Gambar Referensi)
  // ==========================================
  const totalSoal = sesi?.soal.length || 0;
  const currentSoal = sesi?.soal[currentIdx];
  const progressPercent = totalSoal > 0 ? Math.round(((currentIdx + 1) / totalSoal) * 100) : 0;
  const selectedOpsi = currentSoal ? jawaban[currentIdx] : undefined;

  const levelAktif = progres?.level || 1;
  const levelLabels = { 1: "Level 1 (Mudah)", 2: "Level 2 (Sedang)", 3: "Level 3 (Sulit)" } as const;

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between items-center p-4 sm:p-6 pb-12 relative overflow-hidden">
      <div className="w-full max-w-md mx-auto z-10 space-y-4">
        {/* Top Header Bar */}
        <div className="space-y-2">
          {/* Badge Level & Target KKM */}
          <div className="flex items-center justify-between text-xs font-black">
            <span className={`px-2.5 py-1 rounded-xl border ${
              levelAktif === 1 ? "bg-sky-50 text-sky-700 border-sky-200" :
              levelAktif === 2 ? "bg-amber-50 text-amber-700 border-amber-200" :
              "bg-purple-50 text-purple-700 border-purple-200"
            }`}>
              {levelLabels[levelAktif as 1 | 2 | 3] || `Level ${levelAktif}`}
            </span>

            <span className="text-slate-500 font-bold">
              Percobaan ke-{progres?.percobaanKe || 1} • KKM: 70
            </span>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/siswa")}
              className="h-10 w-10 rounded-2xl bg-white border-2 border-sky-100 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-50 transition"
            >
              ←
            </button>

            <span className="text-xs sm:text-sm font-black text-slate-700">
              Soal {currentIdx + 1} dari {totalSoal}
            </span>

            <div className="w-10" />
          </div>

          {/* Green Progress Bar */}
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Question Card Container */}
        <div className="rounded-[36px] border-2 border-sky-100 bg-white p-5 sm:p-6 shadow-sm space-y-5 text-center">
          {/* Illustration Area: Boy with Blackboard */}
          <div className="flex justify-center -my-1">
            <StudentIllustration variant="blackboard" className="w-52 h-28 sm:w-60 sm:h-32" />
          </div>

          {/* Question Text */}
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
            {currentSoal?.pertanyaan || "Berapa hasil dari 5 + 3?"}
          </h2>

          {/* 4 Pastel Answer Cards / Buttons */}
          <div className="space-y-3 pt-1">
            {currentSoal?.pilihan.map((opsi, oIdx) => {
              const theme = OPTION_STYLES[oIdx % OPTION_STYLES.length];
              const isSelected = selectedOpsi === oIdx;

              return (
                <button
                  key={oIdx}
                  type="button"
                  onClick={() => handlePilihOpsi(currentIdx, oIdx)}
                  className={`w-full rounded-2xl border-2 ${
                    isSelected ? "border-emerald-500 shadow-md ring-2 ring-emerald-200" : theme.border
                  } ${theme.bg} p-3.5 sm:p-4 text-left flex items-center justify-between transition-all active:scale-[0.99]`}
                >
                  <span className={`text-base sm:text-lg font-black ${theme.text}`}>
                    {theme.label}. {opsi}
                  </span>

                  {isSelected && (
                    <span className="h-6 w-6 rounded-full bg-emerald-500 text-white text-xs font-black flex items-center justify-center shrink-0">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bottom Button: Berikutnya / Kirim */}
          <div className="pt-2">
            <button
              onClick={handleNext}
              disabled={submitting}
              className="w-full rounded-2xl bg-sky-400 hover:bg-sky-500 active:scale-98 py-3.5 px-6 text-base font-black text-white shadow-md shadow-sky-300/40 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {submitting ? (
                <span>Menghitung Nilai...</span>
              ) : currentIdx < totalSoal - 1 ? (
                <>
                  <span>Berikutnya</span>
                  <span>→</span>
                </>
              ) : (
                <>
                  <span>Kirim Jawaban</span>
                  <span>🚀</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Decorative Green Grass Hills at the bottom */}
      <div className="w-full absolute bottom-0 inset-x-0 z-0 pointer-events-none">
        <DecorativeSkyHills />
      </div>
    </main>
  );
}

export default function KuisSiswaPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs font-bold text-slate-400">Memuat kuis...</div>}>
      <KuisSiswaContent />
    </Suspense>
  );
}
