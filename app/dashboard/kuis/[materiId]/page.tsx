"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type Soal = {
  _id: string;
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number;
  level?: number;
  konsep?: string;
  difficulty?: string;
  penjelasan?: string;
  tips?: string;
};

type MateriInfo = {
  id: string;
  namaMateri: string;
  mataPelajaran: string;
  kelas: string;
  kelas_id?: string;
  tingkat_kelas?: string;
  halaman?: string;
  teksHasilOCR?: string;
};

type KelasOption = {
  _id: string;
  nama_kelas: string;
  kode_kelas: string;
};

type QuestionBankSummary = {
  totalBaru: number;
  totalSemua: number;
  level1: number;
  level2: number;
  level3: number;
  duplikatDilewati: number;
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
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<number | "all">("all");
  const [summaryBank, setSummaryBank] = useState<QuestionBankSummary | null>(null);

  // State Edit Soal Modal
  const [editingSoal, setEditingSoal] = useState<Soal | null>(null);
  const [editPertanyaan, setEditPertanyaan] = useState("");
  const [editPilihan, setEditPilihan] = useState<string[]>(["", "", "", ""]);
  const [editJawabanBenar, setEditJawabanBenar] = useState(0);
  const [editLevel, setEditLevel] = useState(1);
  const [editKonsep, setEditKonsep] = useState("");
  const [editDifficulty, setEditDifficulty] = useState("normal");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editModalError, setEditModalError] = useState("");

  const loadData = useCallback(async () => {
    if (!materiId) return;
    try {
      const res = await fetch(`/api/materi/${materiId}/soal`);
      const data = await res.json();
      if (data.status === "ok") {
        setMateri(data.materi);
        setSoalList(data.soal || []);
        if (data.materi?.kelas_id) {
          setKelasTerpilih(data.materi.kelas_id);
        }
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
      const res = await fetch("/api/kelas");
      const data = await res.json();
      if (data.success && Array.isArray(data.kelas)) {
        setDaftarKelas(data.kelas);
        if (data.kelas.length > 0) {
          setKelasTerpilih((prev) => prev || data.kelas[0]._id);
        }
      }
    } catch {
      // Diamkan jika belum ada kelas
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
    setSummaryBank(null);
    try {
      const res = await fetch("/api/materi/generate-soal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materiId }),
      });
      const data = await res.json();
      if (data.success && data.soal) {
        setSoalList((prev) => [...prev, ...data.soal]);
        if (data.summary) {
          setSummaryBank(data.summary);
        }
      } else {
        setErrorMsg(data.error || "Gagal membuat soal. Pastikan teks OCR sudah diekstrak.");
      }
    } catch {
      setErrorMsg("Gagal menghubungi AI. Coba beberapa saat lagi.");
    } finally {
      setGenerating(false);
    }
  };

  const handleUbahKunci = async (soalId: string, indexKunciBaru: number) => {
    try {
      const res = await fetch(`/api/materi/${materiId}/soal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soalId, jawabanBenar: indexKunciBaru }),
      });
      if (res.ok) {
        setSoalList((prev) =>
          prev.map((s) => (s._id === soalId ? { ...s, jawabanBenar: indexKunciBaru } : s))
        );
      }
    } catch {
      setErrorMsg("Gagal memperbarui kunci jawaban");
    }
  };

  const handleUbahLevel = async (soalId: string, levelBaru: number) => {
    try {
      const res = await fetch(`/api/materi/${materiId}/soal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soalId, level: levelBaru }),
      });
      if (res.ok) {
        setSoalList((prev) =>
          prev.map((s) => (s._id === soalId ? { ...s, level: levelBaru } : s))
        );
      }
    } catch {
      setErrorMsg("Gagal memperbarui level butir soal");
    }
  };

  const handleHapusSoal = async (soalId: string) => {
    if (!confirm("Hapus butir soal ini?")) return;
    try {
      const res = await fetch(`/api/materi/${materiId}/soal?soalId=${soalId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setSoalList((prev) => prev.filter((s) => s._id !== soalId));
      } else {
        const err = await res.json();
        setErrorMsg(err.message || "Gagal menghapus butir soal");
      }
    } catch {
      setErrorMsg("Gagal terhubung ke server");
    }
  };

  const handleOpenEdit = (soal: Soal) => {
    setEditingSoal(soal);
    setEditPertanyaan(soal.pertanyaan || "");
    const initialPilihan =
      Array.isArray(soal.pilihan) && soal.pilihan.length === 4
        ? [...soal.pilihan]
        : [
            soal.pilihan?.[0] || "",
            soal.pilihan?.[1] || "",
            soal.pilihan?.[2] || "",
            soal.pilihan?.[3] || "",
          ];
    setEditPilihan(initialPilihan);
    setEditJawabanBenar(Number(soal.jawabanBenar) || 0);
    setEditLevel(Number(soal.level) || 1);
    setEditKonsep(soal.konsep || "");
    setEditDifficulty(soal.difficulty || "normal");
    setEditModalError("");
  };

  const handleSaveEdit = async () => {
    if (!editingSoal) return;
    if (!editPertanyaan.trim()) {
      setEditModalError("Pertanyaan tidak boleh kosong.");
      return;
    }
    if (editPilihan.some((p) => !p.trim())) {
      setEditModalError("Semua opsi jawaban (A, B, C, D) harus diisi.");
      return;
    }

    setSavingEdit(true);
    setEditModalError("");
    try {
      const res = await fetch(`/api/materi/${materiId}/soal`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          soalId: editingSoal._id,
          pertanyaan: editPertanyaan.trim(),
          pilihan: editPilihan.map((p) => p.trim()),
          jawabanBenar: editJawabanBenar,
          level: editLevel,
          konsep: editKonsep.trim() || "umum",
          difficulty: editDifficulty,
        }),
      });
      const data = await res.json();
      if (res.ok && data.soal) {
        setSoalList((prev) =>
          prev.map((s) => (s._id === editingSoal._id ? { ...s, ...data.soal } : s))
        );
        setEditingSoal(null);
      } else {
        setEditModalError(data.message || "Gagal menyimpan perubahan butir soal.");
      }
    } catch {
      setEditModalError("Gagal terhubung ke server saat menyimpan soal.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleBuatSesi = async () => {
    if (soalList.length === 0) return;

    if (!kelasTerpilih) {
      setErrorMsg("Pilih kelas tujuan terlebih dahulu untuk kuis ini.");
      return;
    }

    setCreatingSesi(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/sesi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materiId,
          judulKuis: materi?.namaMateri || "Kuis Interaktif",
          kelasId: kelasTerpilih,
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
  const countL1 = soalList.filter((s) => (s.level || 1) === 1).length;
  const countL2 = soalList.filter((s) => (s.level || 1) === 2).length;
  const countL3 = soalList.filter((s) => (s.level || 1) === 3).length;

  const filteredSoalList =
    selectedLevelFilter === "all"
      ? soalList
      : soalList.filter((s) => (s.level || 1) === selectedLevelFilter);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
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
              Review butir soal yang dibuat oleh AI. Anda dapat mengubah kunci jawaban dengan mengklik opsi yang benar, atau menghapus butir soal sebelum membuka kuis.
            </p>
          </div>

          {/* Target Kelas Selector */}
          {!kodeSesiBaru && (
            <div className="space-y-1.5 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Target Kelas Pembelajaran: <span className="text-red-500">*</span>
              </label>
              <select
                value={kelasTerpilih}
                onChange={(e) => setKelasTerpilih(e.target.value)}
                disabled={loadingKelas || Boolean(materi?.kelas_id)}
                className="w-full sm:w-80 rounded-xl border border-slate-300 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none transition disabled:bg-slate-50"
              >
                {daftarKelas.map((k) => (
                  <option key={k._id} value={k._id}>
                    {k.nama_kelas} (Kode: {k.kode_kelas})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">
                Hanya siswa yang terdaftar di kelas ini yang dapat mengerjakan dan melihat kuis ini.
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
                disabled={creatingSesi || !kelasTerpilih}
                className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {creatingSesi ? (
                  <span>Membuka Sesi...</span>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>Buka Sesi Kuis untuk Kelas</span>
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

        {/* Banner Sukses Question Bank */}
        {summaryBank && (
          <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-sky-50/80 to-purple-50/70 p-6 sm:p-7 shadow-sm space-y-4 animate-in fade-in duration-300">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="text-3xl">🎉</span>
                <div>
                  <h3 className="font-black text-slate-900 text-base sm:text-lg">
                    Berhasil membuat Question Bank!
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Question Bank siap digunakan untuk Adaptive & Mastery Learning siswa.
                  </p>
                </div>
              </div>
              <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-indigo-600 text-white shadow-xs">
                +{summaryBank.totalBaru} Soal Baru
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div className="rounded-2xl bg-white border border-emerald-200 p-3.5 text-center shadow-2xs">
                <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider block">
                  Level 1 — Mudah
                </span>
                <span className="text-2xl font-black text-emerald-950 mt-0.5 block">
                  {summaryBank.level1} soal
                </span>
              </div>
              <div className="rounded-2xl bg-white border border-amber-200 p-3.5 text-center shadow-2xs">
                <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider block">
                  Level 2 — Sedang
                </span>
                <span className="text-2xl font-black text-amber-950 mt-0.5 block">
                  {summaryBank.level2} soal
                </span>
              </div>
              <div className="rounded-2xl bg-white border border-purple-200 p-3.5 text-center shadow-2xs">
                <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider block">
                  Level 3 — Sulit
                </span>
                <span className="text-2xl font-black text-purple-950 mt-0.5 block">
                  {summaryBank.level3} soal
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between text-xs font-semibold text-slate-600 pt-1 border-t border-indigo-100/60">
              <span>
                Total Bank Soal Materi: <strong className="font-black text-slate-900">{summaryBank.totalSemua} soal</strong>
              </span>
              {summaryBank.duplikatDilewati > 0 && (
                <span className="text-amber-700 font-medium">
                  {summaryBank.duplikatDilewati} butir soal lama yang serupa dilewati (anti-duplikasi aktif)
                </span>
              )}
            </div>
          </div>
        )}

        {/* Modal / Banner Sesi Kuis Siap */}
        {kodeSesiBaru && (
          <div className="rounded-3xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/50 p-6 sm:p-8 shadow-lg shadow-emerald-500/10 text-center space-y-4">
            <span className="text-4xl block">🎉</span>
            <div className="space-y-1 max-w-md mx-auto">
              <h2 className="text-xl font-black text-slate-900">Sesi Kuis Siswa Siap Digunakan!</h2>
              <p className="text-xs text-slate-500">
                Bagikan kode kuis di bawah ini kepada siswa di kelas tersebut. Siswa masuk dengan nama yang sudah terdaftar.
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

        {/* Bank Soal Adaptif Header & Ringkasan */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Bank Soal Adaptif ({soalList.length} Butir Soal)
              </h3>
              <p className="text-xs text-slate-400">
                Setiap level membutuhkan bank soal untuk diacak (5 soal per sesi percobaan siswa).
              </p>
            </div>
            <span className="text-xs text-slate-400">💡 Klik opsi jawaban untuk ubah kunci</span>
          </div>

          {/* Statistik Level */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-emerald-50/70 border border-emerald-200 p-3 text-center space-y-0.5">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                Level 1: Mudah
              </span>
              <span className="text-xl font-black text-emerald-900">{countL1} Butir</span>
              <span className="text-[10px] text-emerald-600 block">
                {countL1 >= 10 ? "✅ Bank Ideal" : countL1 >= 5 ? "⚡ Cukup" : "⚠️ Butuh Min. 5"}
              </span>
            </div>

            <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-3 text-center space-y-0.5">
              <span className="text-[10px] font-extrabold text-amber-700 uppercase tracking-wider block">
                Level 2: Sedang
              </span>
              <span className="text-xl font-black text-amber-900">{countL2} Butir</span>
              <span className="text-[10px] text-amber-600 block">
                {countL2 >= 10 ? "✅ Bank Ideal" : countL2 >= 5 ? "⚡ Cukup" : "⚠️ Butuh Min. 5"}
              </span>
            </div>

            <div className="rounded-2xl bg-rose-50/70 border border-rose-200 p-3 text-center space-y-0.5">
              <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider block">
                Level 3: Sulit
              </span>
              <span className="text-xl font-black text-rose-900">{countL3} Butir</span>
              <span className="text-[10px] text-rose-600 block">
                {countL3 >= 10 ? "✅ Bank Ideal" : countL3 >= 5 ? "⚡ Cukup" : "⚠️ Butuh Min. 5"}
              </span>
            </div>
          </div>

          {/* Filter Level Tabs */}
          {soalList.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setSelectedLevelFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedLevelFilter === "all"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua Level ({soalList.length})
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevelFilter(1)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedLevelFilter === 1
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                }`}
              >
                Level 1: Mudah ({countL1})
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevelFilter(2)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedLevelFilter === 2
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                }`}
              >
                Level 2: Sedang ({countL2})
              </button>
              <button
                type="button"
                onClick={() => setSelectedLevelFilter(3)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  selectedLevelFilter === 3
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-rose-50 text-rose-800 hover:bg-rose-100"
                }`}
              >
                Level 3: Sulit ({countL3})
              </button>
            </div>
          )}
        </div>

        {/* Daftar Soal */}
        <div className="space-y-4">
          {filteredSoalList.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center space-y-2">
              <span className="text-4xl">📝</span>
              <p className="text-sm font-bold text-slate-700">
                {soalList.length === 0
                  ? "Belum ada soal untuk materi ini"
                  : `Tidak ada soal pada Level ${selectedLevelFilter}`}
              </p>
              <p className="text-xs text-slate-400">
                {soalList.length === 0
                  ? "Klik tombol \"Generate Soal dengan AI\" di atas untuk menyusun Question Bank 18 butir otomatis."
                  : "Ubah filter di atas atau generate butir soal baru."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredSoalList.map((soal, idx) => {
                const currentLevel = soal.level || 1;
                return (
                  <div
                    key={soal._id || idx}
                    className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-4 relative group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <span className="h-7 w-7 rounded-lg bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="space-y-1.5">
                          {/* Badges Level, Konsep, & Kesulitan/Difficulty */}
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                currentLevel === 1
                                  ? "bg-emerald-100 text-emerald-800"
                                  : currentLevel === 2
                                  ? "bg-amber-100 text-amber-800"
                                  : "bg-purple-100 text-purple-800"
                              }`}
                            >
                              LEVEL {currentLevel} ({currentLevel === 1 ? "MUDAH" : currentLevel === 2 ? "SEDANG" : "SULIT"})
                            </span>

                            <select
                              value={currentLevel}
                              onChange={(e) => handleUbahLevel(soal._id, Number(e.target.value))}
                              className="text-[10px] font-bold border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 bg-white hover:border-indigo-400 cursor-pointer"
                              title="Pindah level kesulitan butir soal ini"
                            >
                              <option value={1}>Set L1 (Mudah)</option>
                              <option value={2}>Set L2 (Sedang)</option>
                              <option value={3}>Set L3 (Sulit)</option>
                            </select>

                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-100 text-slate-700">
                              Konsep: {soal.konsep || "Umum"}
                            </span>

                            {soal.difficulty && (
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  soal.difficulty === "remedial"
                                    ? "bg-rose-100 text-rose-800"
                                    : "bg-blue-100 text-blue-800"
                                }`}
                              >
                                Kesulitan: {soal.difficulty}
                              </span>
                            )}
                          </div>

                          <p className="font-bold text-slate-900 text-sm sm:text-base leading-relaxed">
                            {soal.pertanyaan}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(soal)}
                          className="text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 border border-slate-200"
                          title="Edit butir soal ini"
                        >
                          <span>✏️</span>
                          <span className="hidden sm:inline">Edit Soal</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleHapusSoal(soal._id)}
                          className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg text-xs font-bold transition border border-slate-200"
                          title="Hapus butir soal ini"
                        >
                          <span>🗑️</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-10">
                      {soal.pilihan.map((opsi, oIdx) => {
                        const isCorrect = Number(soal.jawabanBenar) === oIdx;
                        const label = String.fromCharCode(65 + oIdx);
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleUbahKunci(soal._id, oIdx)}
                            className={`rounded-2xl border p-3 flex items-center gap-3 text-xs sm:text-sm font-medium transition text-left cursor-pointer hover:border-emerald-300 ${
                              isCorrect
                                ? "border-emerald-400 bg-emerald-50/70 text-emerald-900 font-bold ring-2 ring-emerald-200"
                                : "border-slate-200 bg-slate-50/50 text-slate-700 hover:bg-slate-100"
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
                            <span className="truncate flex-1">{opsi}</span>
                            {isCorrect && (
                              <span className="ml-auto text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                                ← Kunci ✓
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal Edit Soal Guru */}
      {editingSoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <h3 className="text-base sm:text-lg font-black text-slate-900">
                  Edit Butir Soal
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingSoal(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {editModalError && (
              <div className="rounded-xl bg-red-50 p-3 text-xs text-red-700 font-semibold border border-red-200">
                ⚠️ {editModalError}
              </div>
            )}

            <div className="space-y-4">
              {/* Pertanyaan */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Pertanyaan: <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={editPertanyaan}
                  onChange={(e) => setEditPertanyaan(e.target.value)}
                  placeholder="Tuliskan pertanyaan soal..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs sm:text-sm font-medium text-slate-900 focus:border-indigo-600 focus:outline-none transition resize-none"
                />
              </div>

              {/* Opsi Jawaban A, B, C, D */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 block">
                  Pilihan Jawaban & Kunci: <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2">
                  {editPilihan.map((pilihan, pIdx) => {
                    const label = String.fromCharCode(65 + pIdx);
                    const isKey = editJawabanBenar === pIdx;
                    return (
                      <div
                        key={pIdx}
                        className={`flex items-center gap-2 rounded-xl border p-2 transition ${
                          isKey
                            ? "border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-300"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => setEditJawabanBenar(pIdx)}
                          title="Jadikan ini Kunci Jawaban"
                          className={`h-7 w-7 rounded-lg text-xs font-extrabold flex items-center justify-center shrink-0 cursor-pointer transition ${
                            isKey
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                          }`}
                        >
                          {label}
                        </button>
                        <input
                          type="text"
                          value={pilihan}
                          onChange={(e) => {
                            const newPilihan = [...editPilihan];
                            newPilihan[pIdx] = e.target.value;
                            setEditPilihan(newPilihan);
                          }}
                          placeholder={`Pilihan ${label}`}
                          className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setEditJawabanBenar(pIdx)}
                          className={`text-[10px] font-bold px-2 py-1 rounded transition cursor-pointer shrink-0 ${
                            isKey
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-100 text-slate-600 hover:bg-emerald-100 hover:text-emerald-700"
                          }`}
                        >
                          {isKey ? "✓ Kunci Jawaban" : "Pilih Kunci"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Grid Pengaturan: Level, Konsep, Difficulty */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* Level */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Level Kognitif:
                  </label>
                  <select
                    value={editLevel}
                    onChange={(e) => setEditLevel(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value={1}>Level 1 (Mudah)</option>
                    <option value={2}>Level 2 (Sedang)</option>
                    <option value={3}>Level 3 (Sulit)</option>
                  </select>
                </div>

                {/* Konsep */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Konsep Soal:
                  </label>
                  <input
                    type="text"
                    value={editKonsep}
                    onChange={(e) => setEditKonsep(e.target.value)}
                    placeholder="Contoh: perkalian"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  />
                </div>

                {/* Kesulitan */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 block">
                    Tipe / Kesulitan:
                  </label>
                  <select
                    value={editDifficulty}
                    onChange={(e) => setEditDifficulty(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-900 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="remedial">Remedial</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSoal(null)}
                disabled={savingEdit}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
              >
                {savingEdit ? "Menyimpan..." : "Simpan Perubahan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
