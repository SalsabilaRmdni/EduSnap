"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import MascotBook from "@/components/MascotBook";
import StudentIllustration from "@/components/StudentIllustration";
import DecorativeSkyHills from "@/components/DecorativeSkyHills";

interface SoalItem {
  index: number;
  id: string;
  pertanyaan: string;
  pilihan: string[];
  level: number;
  konsep: string;
  difficulty: "normal" | "remedial";
}

interface EvaluasiFeedback {
  soalId: string;
  nomor: number;
  pertanyaan: string;
  pilihan: string[];
  isCorrect: boolean;
  jawabanSiswa?: number;
  jawabanBenar?: number;
  penjelasan?: string;
  tips?: string;
  konsep: string;
  level: number;
  difficulty: string;
}

interface SubmitResult {
  skor: number;
  jumlahBenar: number;
  totalSoal: number;
  threshold: number;
  lulusLevel: boolean;
  levelSebelumnya: number;
  levelBaru: number;
  statusBaru: string;
  konsepPerluRemedial: string[];
  feedback: EvaluasiFeedback[];
}

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

function getLevelLabel(lvl: number) {
  if (lvl === 1) return "LEVEL 1";
  if (lvl === 2) return "LEVEL 2";
  if (lvl === 3) return "LEVEL 3";
  return `LEVEL ${lvl}`;
}

function getLevelBadge(lvl: number) {
  if (lvl === 1) return { dot: "🟢", label: "Mudah", color: "text-emerald-800 bg-emerald-100 border-emerald-300" };
  if (lvl === 2) return { dot: "🟡", label: "Sedang", color: "text-amber-900 bg-amber-100 border-amber-300" };
  if (lvl === 3) return { dot: "🔴", label: "Sulit", color: "text-rose-900 bg-rose-100 border-rose-300" };
  return { dot: "⚪", label: `Level ${lvl}`, color: "text-slate-800 bg-slate-100 border-slate-300" };
}

function getLevelMotivation(lvl: number) {
  if (lvl === 1) return "Yuk pahami dasar-dasarnya!";
  if (lvl === 2) return "Hebat! Sekarang coba terapkan!";
  if (lvl === 3) return "Kamu sudah siap untuk tantangan!";
  return "Semangat belajar!";
}

function AdaptiveQuizContent() {
  const params = useParams<{ materiId: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const materiId = params.materiId;

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

  const [soalList, setSoalList] = useState<SoalItem[]>([]);
  const [infoQuiz, setInfoQuiz] = useState<{
    level: number;
    status: string;
    isRemedial: boolean;
    konsepTarget: string[];
    totalSoal: number;
    stokKurang?: boolean;
    pesanInfo?: string;
  } | null>(null);
  const [materiInfo, setMateriInfo] = useState<{
    namaMateri: string;
    mataPelajaran: string;
  } | null>(null);

  const [currentIdx, setCurrentIdx] = useState(0);
  const [jawaban, setJawaban] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasil, setHasil] = useState<SubmitResult | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [sudahTamat, setSudahTamat] = useState(false);

  const fetchAdaptiveQuiz = useCallback(async () => {
    if (!materiId || !kodeKelas || !namaSiswa) return;
    setLoading(true);
    setErrorMsg("");
    setHasil(null);
    setCurrentIdx(0);
    setJawaban({});
    setSudahTamat(false);

    try {
      const res = await fetch(
        `/api/siswa/adaptive-quiz?materiId=${encodeURIComponent(
          materiId
        )}&kodeKelas=${encodeURIComponent(kodeKelas)}&namaSiswa=${encodeURIComponent(
          namaSiswa
        )}`
      );
      const data = await res.json();

      if (data.status === "ok") {
        if (data.selesai) {
          setSudahTamat(true);
          setInfoQuiz({
            level: 3,
            status: "menguasai",
            isRemedial: false,
            konsepTarget: [],
            totalSoal: 0,
          });
        } else {
          setSoalList(data.soal || []);
          setInfoQuiz(data.infoQuiz);
          setMateriInfo(data.materi);
        }
      } else {
        setErrorMsg(data.message || "Gagal memuat kuis adaptive.");
      }
    } catch {
      setErrorMsg("Koneksi terganggu. Silakan periksa jaringanmu.");
    } finally {
      setLoading(false);
    }
  }, [materiId, kodeKelas, namaSiswa]);

  useEffect(() => {
    if (!kodeKelas || !namaSiswa) {
      router.push("/join");
      return;
    }
    fetchAdaptiveQuiz();
  }, [fetchAdaptiveQuiz, kodeKelas, namaSiswa, router]);

  const handlePilihOpsi = (soalIdx: number, opsiIdx: number) => {
    setJawaban((prev) => ({
      ...prev,
      [soalIdx]: opsiIdx,
    }));
  };

  const handleNext = () => {
    if (currentIdx < soalList.length - 1) {
      setCurrentIdx((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (soalList.length === 0) return;

    setSubmitting(true);
    setErrorMsg("");

    const soalIds = soalList.map((s) => s.id);
    const jawabanPayload: Record<string, number> = {};
    soalList.forEach((s, idx) => {
      jawabanPayload[s.id] = jawaban[idx] !== undefined ? jawaban[idx] : -1;
    });

    try {
      const res = await fetch("/api/siswa/adaptive-quiz/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiId,
          kodeKelas,
          namaSiswa,
          soalIds,
          jawaban: jawabanPayload,
        }),
      });

      const data = await res.json();
      if (data.status === "ok" && data.hasil) {
        setHasil(data.hasil);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrorMsg(data.message || "Gagal memproses hasil kuis.");
      }
    } catch {
      setErrorMsg("Gagal mengirim jawaban. Periksa koneksi internetmu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8 bg-sky-50">
        <div className="text-center space-y-3">
          <span className="text-5xl inline-block animate-bounce">🎒</span>
          <p className="text-sm font-black text-slate-700">
            Sedang menyiapkan soal yang pas buat kamu...
          </p>
        </div>
      </main>
    );
  }

  if (sudahTamat || infoQuiz?.status === "menguasai") {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-b from-amber-50 to-sky-50 text-center">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border-2 border-amber-300 space-y-4">
          <span className="text-5xl block animate-bounce">🏆</span>
          <h2 className="text-2xl font-black text-slate-900">Materi Telah Dikuasai!</h2>
          <p className="text-sm font-bold text-slate-600">
            Luar biasa, {namaSiswa}! Kamu sudah menyelesaikan seluruh tantangan di Level 1, Level 2, dan Level 3 pada materi ini.
          </p>
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs font-black text-amber-900">
            ⭐ Status: Menguasai (Tuntas)
          </div>
          <button
            onClick={() => router.push("/siswa")}
            className="w-full rounded-2xl bg-amber-400 hover:bg-amber-500 font-black px-6 py-3.5 text-sm text-slate-900 transition shadow-sm"
          >
            Kembali ke Beranda Siswa
          </button>
        </div>
      </main>
    );
  }

  if (errorMsg && soalList.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-sky-50 text-center">
        <div className="max-w-md bg-white p-8 rounded-3xl shadow-sm border-2 border-sky-100 space-y-4">
          <span className="text-4xl block">✨</span>
          <h2 className="text-2xl font-black text-slate-900">Info Materi</h2>
          <p className="text-sm text-slate-600">{errorMsg}</p>
          <button
            onClick={() => router.push("/siswa")}
            className="rounded-2xl bg-amber-400 font-black px-6 py-3 text-sm text-slate-900 hover:bg-amber-500 transition"
          >
            Kembali ke Halaman Siswa
          </button>
        </div>
      </main>
    );
  }

  // ==========================================
  // SCREEN HASIL MASTERY LEARNING
  // ==========================================
  if (hasil) {
    const isLulus = hasil.lulusLevel;
    const isTamat = hasil.statusBaru === "menguasai";
    const totalSoal = hasil.totalSoal;
    const salahCount = totalSoal - hasil.jumlahBenar;

    return (
      <main className="min-h-screen bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 p-4 sm:p-6 flex flex-col justify-between items-center relative overflow-hidden">
        {/* Dekorasi Bintang */}
        <div className="absolute top-10 left-8 text-amber-400 text-3xl animate-bounce">⭐</div>
        <div className="absolute top-16 right-10 text-amber-400 text-4xl animate-bounce">⭐</div>

        <div className="w-full max-w-sm sm:max-w-md mx-auto my-auto z-10 pt-4 space-y-5 text-center">
          <div className="flex justify-center -mb-2">
            <MascotBook className="w-32 h-32 sm:w-40 sm:h-40" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-black bg-sky-200 text-sky-900">
              {materiInfo?.mataPelajaran} · LEVEL {hasil.levelSebelumnya || 1} • {getLevelBadge(hasil.levelSebelumnya || 1).label.toUpperCase()}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {isLulus
                ? isTamat
                  ? `Luar Biasa, ${namaSiswa}! 🏆`
                  : `Hebat Sekali, ${namaSiswa}! 🎉`
                : `Semangat Terus, ${namaSiswa}! 😊`}
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-600">
              {isLulus
                ? isTamat
                  ? "Kamu telah berhasil menguasai seluruh level materi ini!"
                  : `Kamu berhasil lulus Level ${hasil.levelSebelumnya || 1}! Selamat!`
                : "Belum mencapai target nilai 80%. Jangan menyerah, kita coba lagi!"}
            </p>
          </div>

          {/* Banner Transisi Level / Status Pembelajaran */}
          <div className={`rounded-2xl border-2 p-4 text-left shadow-sm ${
            isLulus
              ? isTamat
                ? "bg-gradient-to-r from-amber-50 to-emerald-50 border-amber-300"
                : "bg-gradient-to-r from-sky-50 to-emerald-50 border-emerald-300"
              : "bg-rose-50 border-rose-200"
          }`}>
            {isLulus ? (
              isTamat ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🏆</span>
                    <span className="text-xs font-black uppercase tracking-wider text-amber-800">Mastery Selesai!</span>
                  </div>
                  <p className="text-sm font-black text-slate-900">
                    Kamu telah menyelesaikan semua level (Level 1, 2, dan 3)!
                  </p>
                  <p className="text-xs font-bold text-slate-600">
                    Pemahamanmu pada materi ini sudah sangat kuat dan tuntas.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🎉</span>
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                      Naik ke Tingkat Berikutnya!
                    </span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/85 border border-emerald-200 px-3 py-1.5 rounded-xl">
                    <span className="text-base">{getLevelBadge(hasil.levelBaru).dot}</span>
                    <span className="text-xs font-black text-slate-900">
                      LEVEL {hasil.levelBaru} • {getLevelBadge(hasil.levelBaru).label.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-700">
                    {hasil.levelBaru === 2 && "Di level ini soal akan sedikit lebih menantang dan menerapkan konsep dalam situasi nyata."}
                    {hasil.levelBaru === 3 && "Tantangan lebih seru! Yuk pecahkan masalah bertingkat dan analisis soal secara mendalam!"}
                  </p>
                </div>
              )
            ) : (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🌱</span>
                  <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                    Sesi Remedial Level {hasil.levelSebelumnya || 1}
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-white/85 border border-rose-200 px-3 py-1.5 rounded-xl">
                  <span className="text-base">{getLevelBadge(hasil.levelSebelumnya || 1).dot}</span>
                  <span className="text-xs font-black text-slate-900">
                    LEVEL {hasil.levelSebelumnya || 1} • {getLevelBadge(hasil.levelSebelumnya || 1).label.toUpperCase()} (Remedial)
                  </span>
                </div>
                <p className="text-xs font-bold text-slate-600">
                  Belum mencapai target 80%. Jangan khawatir! Sistem menyiapkan soal baru yang berbeda untuk membantumu memahami materi ini.
                </p>
              </div>
            )}
          </div>

          {/* Kartu Skor */}
          <div className={`rounded-[32px] border-2 p-5 shadow-sm flex items-center justify-center gap-6 ${
            isLulus ? "border-amber-300 bg-[#FEF9C3]" : "border-rose-200 bg-rose-50"
          }`}>
            <span className="text-4xl">{isLulus ? "⭐" : "🌱"}</span>
            <div className="text-left">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">
                Nilai Kamu (Target: {hasil.threshold})
              </span>
              <span className="text-5xl font-black text-slate-900 tracking-tight">
                {hasil.skor}
              </span>
            </div>
          </div>

          {/* Rincian Benar / Salah */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl border-2 border-emerald-200 bg-white p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-emerald-500 text-white font-black text-xs flex items-center justify-center">
                  ✓
                </span>
                <span className="text-xs font-extrabold text-slate-700">Benar</span>
              </div>
              <span className="text-lg font-black text-emerald-600">{hasil.jumlahBenar}</span>
            </div>

            <div className="rounded-2xl border-2 border-rose-200 bg-white p-3.5 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-rose-500 text-white font-black text-xs flex items-center justify-center">
                  ✕
                </span>
                <span className="text-xs font-extrabold text-slate-700">Salah</span>
              </div>
              <span className="text-lg font-black text-rose-500">{salahCount}</span>
            </div>
          </div>

          {/* Tombol Lihat Pembahasan */}
          <button
            type="button"
            onClick={() => setShowReviewModal(true)}
            className="w-full rounded-2xl bg-white border-2 border-sky-200 hover:bg-sky-50 py-3 px-4 text-xs font-black text-sky-800 flex items-center justify-center gap-2 transition"
          >
            <span>💡</span>
            <span>Lihat Pembahasan & Penjelasan Soal</span>
          </button>

          {/* Tombol Aksi */}
          <div className="space-y-2 pt-1">
            {!isLulus && (
              <button
                type="button"
                onClick={fetchAdaptiveQuiz}
                className="w-full rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-98 py-3.5 px-6 text-sm font-black text-slate-900 shadow-md shadow-amber-300/40 flex items-center justify-center gap-2 transition"
              >
                <span>🔄</span>
                <span>Coba Lagi (Mulai Remedial)</span>
              </button>
            )}

            {isLulus && !isTamat && (
              <button
                type="button"
                onClick={fetchAdaptiveQuiz}
                className="w-full rounded-2xl bg-emerald-500 hover:bg-emerald-600 active:scale-98 py-3.5 px-6 text-sm font-black text-white shadow-md shadow-emerald-400/30 flex items-center justify-center gap-2 transition"
              >
                <span>🚀</span>
                <span>Lanjut ke Level {hasil.levelBaru}</span>
              </button>
            )}

            <Link
              href="/siswa"
              className="w-full rounded-2xl bg-slate-100 hover:bg-slate-200 py-3.5 px-6 text-xs font-black text-slate-700 flex items-center justify-center gap-2 transition"
            >
              <span>🏠</span>
              <span>Kembali ke Beranda Siswa</span>
            </Link>
          </div>
        </div>

        {/* Modal Review / Feedback Penjelasan */}
        {showReviewModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full max-h-[85vh] flex flex-col shadow-xl border-2 border-sky-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-sm flex items-center gap-2">
                  <span>📖</span> Pembahasan Soal
                </h3>
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="h-8 w-8 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-200"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 overflow-y-auto space-y-4 text-left">
                {hasil.feedback.map((item, idx) => (
                  <div
                    key={item.soalId || idx}
                    className={`rounded-2xl border-2 p-4 space-y-3 text-xs ${
                      item.isCorrect
                        ? "border-emerald-200 bg-emerald-50/50"
                        : "border-rose-200 bg-rose-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between font-black">
                      <span className="text-slate-800">
                        Soal #{idx + 1} · Konsep: {item.konsep}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-black text-[11px] ${
                          item.isCorrect
                            ? "bg-emerald-500 text-white"
                            : "bg-rose-500 text-white"
                        }`}
                      >
                        {item.isCorrect ? "✓ Benar" : "✕ Salah"}
                      </span>
                    </div>

                    <p className="font-extrabold text-slate-900 text-sm">{item.pertanyaan}</p>

                    {!item.isCorrect ? (
                      <div className="space-y-2 pt-1 font-semibold">
                        <div className="space-y-1">
                          <p className="text-rose-700">
                            ❌ <span className="font-bold">Jawabanmu:</span>{" "}
                            <span className="font-extrabold">
                              {item.jawabanSiswa !== undefined && item.jawabanSiswa >= 0
                                ? `${String.fromCharCode(65 + item.jawabanSiswa)}. ${item.pilihan[item.jawabanSiswa]}`
                                : "Tidak dijawab"}
                            </span>
                          </p>
                          <p className="text-emerald-700">
                            ✅ <span className="font-bold">Jawaban yang benar:</span>{" "}
                            <span className="font-extrabold">
                              {item.jawabanBenar !== undefined
                                ? `${String.fromCharCode(65 + item.jawabanBenar)}. ${item.pilihan[item.jawabanBenar]}`
                                : "-"}
                            </span>
                          </p>
                        </div>

                        {/* Box Penjelasan Ramah Anak */}
                        <div className="p-3 rounded-2xl bg-white border border-amber-200 text-slate-700 shadow-2xs space-y-1">
                          <span className="font-black flex items-center gap-1.5 text-amber-900 text-[12px]">
                            <span>💡</span> Yuk, pahami!
                          </span>
                          <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
                            {item.penjelasan || "Perhatikan pertanyaan dan kata kunci pada materi ini ya!"}
                          </p>
                        </div>

                        {/* Box Tips Ramah Anak */}
                        {item.tips && (
                          <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 text-slate-700 shadow-2xs space-y-1">
                            <span className="font-black flex items-center gap-1.5 text-sky-900 text-[12px]">
                              <span>🌟</span> Tips:
                            </span>
                            <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
                              {item.tips}
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2 pt-1 font-semibold">
                        <p className="text-emerald-700">
                          ✅ <span className="font-bold">Jawabanmu:</span>{" "}
                          <span className="font-extrabold">
                            {item.jawabanBenar !== undefined
                              ? item.pilihan[item.jawabanBenar]
                              : "-"}
                          </span>{" "}
                          (Tepat Sekali!)
                        </p>

                        <div className="p-3 rounded-2xl bg-white border border-emerald-200 text-slate-700 shadow-2xs space-y-1">
                          <span className="font-black flex items-center gap-1.5 text-emerald-800 text-[12px]">
                            <span>💡</span> Yuk, pahami!
                          </span>
                          <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
                            {item.penjelasan || "Hebat! Kamu telah memahami konsep materi ini dengan tepat."}
                          </p>
                        </div>

                        {item.tips && (
                          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-slate-700 shadow-2xs space-y-1">
                            <span className="font-black flex items-center gap-1.5 text-emerald-900 text-[12px]">
                              <span>🌟</span> Tips:
                            </span>
                            <p className="text-[11px] leading-relaxed text-slate-700 font-medium">
                              {item.tips}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-3 border-t border-slate-100 text-center bg-slate-50">
                <button
                  onClick={() => setShowReviewModal(false)}
                  className="rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-black text-xs px-6 py-2.5"
                >
                  Tutup Pembahasan
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="w-full absolute bottom-0 inset-x-0 z-0 pointer-events-none">
          <DecorativeSkyHills />
        </div>
      </main>
    );
  }

  // ==========================================
  // SCREEN HALAMAN SOAL ADAPTIVE
  // ==========================================
  const totalSoal = soalList.length;
  const currentSoal = soalList[currentIdx];
  const progressPercent =
    totalSoal > 0 ? Math.round(((currentIdx + 1) / totalSoal) * 100) : 0;
  const selectedOpsi = jawaban[currentIdx];

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-between items-center p-4 sm:p-6 pb-12 relative overflow-hidden">
      <div className="w-full max-w-md mx-auto z-10 space-y-4">
        {/* Top Header Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/siswa")}
              className="h-10 w-10 rounded-2xl bg-white border-2 border-sky-100 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-50 transition"
              aria-label="Kembali"
            >
              ←
            </button>

            <div className="text-center space-y-1">
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border shadow-xs"
                style={{
                  backgroundColor: infoQuiz?.level === 1 ? "#ecfdf5" : infoQuiz?.level === 2 ? "#fffbeb" : "#fff1f2",
                  borderColor: infoQuiz?.level === 1 ? "#a7f3d0" : infoQuiz?.level === 2 ? "#fde68a" : "#fecdd3",
                  color: infoQuiz?.level === 1 ? "#065f46" : infoQuiz?.level === 2 ? "#92400e" : "#9f1239",
                }}
              >
                <span>{getLevelBadge(infoQuiz?.level || 1).dot}</span>
                <span>LEVEL {infoQuiz?.level || 1} • {getLevelBadge(infoQuiz?.level || 1).label.toUpperCase()}</span>
                {infoQuiz?.isRemedial && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-black">
                    Remedial ✨
                  </span>
                )}
              </div>
              <p className="text-xs font-bold text-amber-800">
                &ldquo;{getLevelMotivation(infoQuiz?.level || 1)}&rdquo;
              </p>
              <p className="text-xs font-black text-slate-700">
                Soal {currentIdx + 1} dari {totalSoal}
              </p>
            </div>

            <div className="w-10 text-right">
              <span className="text-xs font-black text-slate-400">
                {progressPercent}%
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                infoQuiz?.isRemedial ? "bg-amber-400" : "bg-emerald-400"
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Banner Info Ketersediaan Soal Baru */}
          {infoQuiz?.stokKurang && infoQuiz?.pesanInfo && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-left flex items-start gap-2.5 text-xs text-amber-900 shadow-2xs animate-in fade-in duration-300">
              <span className="text-base shrink-0">💡</span>
              <span className="font-bold leading-relaxed">{infoQuiz.pesanInfo}</span>
            </div>
          )}
        </div>

        {/* Question Card Container */}
        <div className="rounded-[36px] border-2 border-sky-100 bg-white p-5 sm:p-6 shadow-sm space-y-5 text-center">
          {/* Illustration Area */}
          <div className="flex justify-center -my-1">
            <StudentIllustration
              variant="blackboard"
              className="w-52 h-28 sm:w-60 sm:h-32"
            />
          </div>

          {/* Label Topik / Konsep */}
          <div className="inline-block px-3 py-1 rounded-xl bg-slate-100 text-[11px] font-extrabold text-slate-600">
            Topik: {currentSoal?.konsep || "Umum"}
          </div>

          {/* Pertanyaan */}
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug">
            {currentSoal?.pertanyaan}
          </h2>

          {/* 4 Opsi Jawaban */}
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
                    theme.border
                  } ${
                    theme.bg
                  } p-4 flex items-center justify-between text-left transition-all active:scale-98 ${
                    isSelected
                      ? "ring-4 ring-sky-400 ring-offset-2 shadow-md"
                      : "opacity-90 hover:opacity-100 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`h-8 w-8 rounded-xl bg-white/80 font-black text-sm flex items-center justify-center shadow-2xs ${theme.text}`}
                    >
                      {theme.label}
                    </span>
                    <span
                      className={`font-black text-sm sm:text-base ${theme.text}`}
                    >
                      {opsi}
                    </span>
                  </div>

                  <div
                    className={`h-6 w-6 rounded-full border-2 border-slate-400 flex items-center justify-center ${
                      isSelected ? "bg-sky-500 border-sky-500" : "bg-white"
                    }`}
                  >
                    {isSelected && (
                      <span className="text-white text-xs font-black">✓</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Button Bar */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleNext}
            disabled={selectedOpsi === undefined || submitting}
            className={`w-full rounded-2xl py-4 text-base font-black text-slate-900 shadow-md transition active:scale-98 flex items-center justify-center gap-2 ${
              selectedOpsi === undefined || submitting
                ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none"
                : "bg-amber-400 hover:bg-amber-500 shadow-amber-300/40"
            }`}
          >
            {submitting ? (
              <span>Memeriksa Jawaban... ⏳</span>
            ) : currentIdx < totalSoal - 1 ? (
              <>
                <span>Lanjut Soal Berikutnya</span>
                <span>→</span>
              </>
            ) : (
              <>
                <span>Selesai & Kumpulkan</span>
                <span>✨</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="w-full absolute bottom-0 inset-x-0 z-0 pointer-events-none">
        <DecorativeSkyHills />
      </div>
    </main>
  );
}

export default function AdaptiveQuizPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center p-8 bg-sky-50">
          <div className="text-center space-y-3">
            <span className="text-5xl inline-block animate-bounce">🎒</span>
            <p className="text-sm font-black text-slate-700">Menyiapkan halaman...</p>
          </div>
        </main>
      }
    >
      <AdaptiveQuizContent />
    </Suspense>
  );
}
