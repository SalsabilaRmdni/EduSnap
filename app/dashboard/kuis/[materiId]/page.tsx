"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Soal = {
  _id: string;
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number;
};

type MateriInfo = {
  id: string;
  namaMateri: string;
  mataPelajaran: string;
  kelas: string;
  tingkat_kelas?: string;
  halaman?: string;
  teksHasilOCR?: string;
};

type KelasOption = {
  _id: string;
  nama_kelas: string;
  kode_kelas: string;
};

export default function KuisPage() {
  const { materiId } = useParams<{ materiId: string }>();
  const router = useRouter();

  const [materi, setMateri] = useState<MateriInfo | null>(null);
  const [soalList, setSoalList] = useState<Soal[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [creatingSesi, setCreatingSesi] = useState(false);
  const [kodeSesiBaru, setKodeSesiBaru] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const [daftarKelas, setDaftarKelas] = useState<KelasOption[]>([]);
  const [kelasTerpilih, setKelasTerpilih] = useState<string>("");
  const [loadingKelas, setLoadingKelas] = useState(true);

  const loadData = useCallback(async () => {
    if (!materiId) return;
    try {
      const res = await fetch(`/api/materi/${materiId}/soal`);
      const data = await res.json();
      if (data.status === "ok") {
        setMateri(data.materi);
        setSoalList(data.soal || []);
      } else {
        setErrorMsg(data.message || "Gagal memuat materi");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
    }
  }, [materiId]);

  const loadKelas = useCallback(async () => {
    setLoadingKelas(true);
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      const guruId = meData?.guru?.guruId;
      if (!guruId) return;

      const res = await fetch(`/api/kelas?guruId=${guruId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.kelas)) {
        setDaftarKelas(data.kelas);
        if (data.kelas.length > 0) {
          setKelasTerpilih(data.kelas[0]._id);
        }
      }
    } catch {
      // Diamkan saja jika kelas belum ada
    } finally {
      setLoadingKelas(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    loadKelas();
  }, [loadData, loadKelas]);

  const handleGenerateSoal = async () => {
    setGenerating(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/materi/generate-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materiId }),
      });
      const data = await res.json();
      if (data.success && data.soal) {
        setSoalList((prev) => [...prev, ...data.soal]);
      } else {
        setErrorMsg(data.error || "Gagal membuat soal. Pastikan teks OCR sudah diekstrak.");
      }
    } catch {
      setErrorMsg("Gagal menghubungi AI. Coba beberapa saat lagi.");
    } finally {
      setGenerating(false);
    }
  };

  const handleBuatSesi = async () => {
    if (soalList.length === 0) return;
    setCreatingSesi(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/sesi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiId,
          judulKuis: materi?.namaMateri || "Kuis Interaktif",
          kelasId: kelasTerpilih || undefined,
        }),
      });
      const data = await res.json();
      if (data.status === "ok" && data.sesi) {
        setKodeSesiBaru(data.sesi.kode_unik);
      } else {
        setErrorMsg(data.message || "Gagal membuat sesi kuis.");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan saat membuka sesi kuis.");
    } finally {
      setCreatingSesi(false);
    }
  };

  const handleCopy = () => {
    if (!kodeSesiBaru) return;
    const url = `${window.location.origin}/join?kode=${kodeSesiBaru}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-xs font-semibold animate-pulse">Memuat data butir soal kuis...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            ← Kembali ke Dashboard
          </Link>

          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
            Penyusun Kuis Guru
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {/* Info Materi Card */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
              {materi?.tingkat_kelas || materi?.kelas || "SD"}
            </span>
            <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
              {materi?.mataPelajaran || "Tematik SD"}
            </span>
            {materi?.halaman && (
              <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {materi.halaman}
              </span>
            )}
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              {materi?.namaMateri || "Materi Buku SD"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Review butir soal yang dibuat oleh AI. Anda dapat menambahkan soal lagi atau langsung membuka sesi kuis untuk siswa.
            </p>
          </div>

          {/* Target Kelas Selector */}
          {!kodeSesiBaru && (
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Pilih Kelas Tujuan:
              </label>
              <select
                value={kelasTerpilih}
                onChange={(e) => setKelasTerpilih(e.target.value)}
                disabled={loadingKelas}
                className="w-full sm:w-80 rounded-xl border border-slate-300 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none transition"
              >
                <option value="">-- Buka untuk semua siswa --</option>
                {daftarKelas.map((k) => (
                  <option key={k._id} value={k._id}>
                    {k.nama_kelas} (Kode: {k.kode_kelas})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Jika kelas dipilih, hanya siswa yang terdaftar di kelas tersebut yang dapat mengerjakan kuis ini.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={handleGenerateSoal}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
            >
              {generating ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  <span>AI Sedang Menyusun Soal...</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>{soalList.length === 0 ? "Generate Soal dengan AI" : "+ Tambah Butir Soal AI"}</span>
                </>
              )}
            </button>

            {soalList.length > 0 && !kodeSesiBaru && (
              <button
                onClick={handleBuatSesi}
                disabled={creatingSesi}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {creatingSesi ? (
                  <span>Membuka Sesi...</span>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Buka Sesi Kuis untuk Siswa</span>
                  </>
                )}
              </button>
            )}
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 font-semibold border border-red-200">
              ⚠️ {errorMsg}
            </div>
          )}
        </div>

        {/* Modal / Banner Sesi Kuis Siap */}
        {kodeSesiBaru && (
          <div className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 p-6 sm:p-8 shadow-lg shadow-emerald-500/10 text-center space-y-4">
            <span className="text-4xl block">🎉</span>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-xl font-black text-slate-900">Sesi Kuis Siswa Siap Digunakan!</h2>
              <p className="text-xs text-slate-500">
                Bagikan kode kuis di bawah ini kepada siswa Anda. Siswa dapat langsung mengerjakan kuis tanpa registrasi akun.
              </p>
            </div>

            <div className="inline-block rounded-2xl bg-white px-8 py-3.5 border-2 border-dashed border-emerald-400 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Kode Kuis
              </span>
              <span className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-emerald-700">
                {kodeSesiBaru}
              </span>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
              <button
                onClick={handleCopy}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition"
              >
                {copiedLink ? "✅ Link Kuis Tersalin!" : "📋 Salin Link Kuis Siswa"}
              </button>

              <button
                onClick={() => router.push(`/dashboard/sesi/${kodeSesiBaru}`)}
                className="rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 transition"
              >
                📊 Pantau Nilai Siswa →
              </button>
            </div>
          </div>
        )}

        {/* Daftar Soal */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Daftar Butir Soal ({soalList.length} Soal)
            </h3>
            <span className="text-xs text-slate-400">Pilihan ganda A, B, C, D</span>
          </div>

          {soalList.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
              <span className="text-4xl">📝</span>
              <p className="text-sm font-bold text-slate-700">Belum ada soal untuk materi ini</p>
              <p className="text-xs text-slate-400">Klik tombol &ldquo;Generate Soal dengan AI&rdquo; di atas untuk menyusun butir soal otomatis.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {soalList.map((soal, idx) => (
                <div
                  key={soal._id || idx}
                  className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4"
                >
                  <div className="flex items-start gap-3">
                    <span className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <p className="font-bold text-slate-900 text-sm sm:text-base leading-relaxed">
                      {soal.pertanyaan}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-10">
                    {soal.pilihan.map((opsi, oIdx) => {
                      const isCorrect = Number(soal.jawabanBenar) === oIdx;
                      const label = String.fromCharCode(65 + oIdx);
                      return (
                        <div
                          key={oIdx}
                          className={`rounded-2xl border p-3 flex items-center gap-3 text-xs sm:text-sm font-medium transition ${
                            isCorrect
                              ? "border-emerald-400 bg-emerald-50/70 text-emerald-900 font-bold"
                              : "border-slate-200 bg-slate-50/50 text-slate-700"
                          }`}
                        >
                          <span
                            className={`h-6 w-6 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 ${
                              isCorrect
                                ? "bg-emerald-600 text-white"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {label}
                          </span>
                          <span className="truncate">{opsi}</span>
                          {isCorrect && (
                            <span className="ml-auto text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                              Kunci
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
