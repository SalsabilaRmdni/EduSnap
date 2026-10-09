"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SesiDetail {
  id: string;
  kode_unik: string;
  judul_kuis: string;
  mata_pelajaran: string;
  tingkat_kelas: string;
  status: string;
  totalSoal: number;
  createdAt: string;
}

interface PesertaItem {
  _id: string;
  nama_siswa: string;
  skor: number;
  jumlah_benar: number;
  total_soal: number;
  level?: number;
  percobaan_ke?: number;
  lulus?: boolean;
  createdAt: string;
}

interface RekapSiswaItem {
  nama_siswa: string;
  siswa_id?: string;
  skor_tertinggi: number;
  level_terakhir: number;
  total_percobaan: number;
  lulus_terakhir: boolean;
  terakhir_mengerjakan: string;
  riwayat: PesertaItem[];
}

interface StatsInfo {
  totalPeserta: number;
  totalSubmit?: number;
  rataRataSkor: number;
}

export default function DetailSesiPage() {
  const { sesiId } = useParams<{ sesiId: string }>();

  const [sesi, setSesi] = useState<SesiDetail | null>(null);
  const [stats, setStats] = useState<StatsInfo>({ totalPeserta: 0, rataRataSkor: 0 });
  const [rekapSiswa, setRekapSiswa] = useState<RekapSiswaItem[]>([]);
  const [pesertaList, setPesertaList] = useState<PesertaItem[]>([]);
  const [activeTab, setActiveTab] = useState<"rekap" | "riwayat">("rekap");
  const [expandedSiswa, setExpandedSiswa] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = useCallback(async () => {
    if (!sesiId) return;
    try {
      const res = await fetch(`/api/sesi/${sesiId}/peserta`);
      const data = await res.json();
      if (res.ok && data.status === "ok") {
        setSesi(data.sesi);
        setStats(data.stats);
        setRekapSiswa(data.rekapSiswa || []);
        setPesertaList(data.pesertaList || []);
      } else {
        setErrorMsg(data.message || data.error || "Gagal memuat rekap sesi kuis.");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan saat memuat data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sesiId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleCopyLink = () => {
    if (!sesi) return;
    const url = `${window.location.origin}/join?kode=${sesi.kode_unik}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-xs font-semibold animate-pulse">Memuat rekap nilai sesi...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
          >
            ← Kembali ke Dashboard
          </Link>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-1.5 text-xs font-bold text-slate-700 transition"
          >
            🔄 {refreshing ? "Memperbarui..." : "Perbarui Data"}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        {errorMsg && (
          <div className="rounded-2xl bg-red-50 p-4 text-xs font-semibold text-red-700 border border-red-200">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Header Sesi Kuis */}
        {sesi && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                  {sesi.tingkat_kelas}
                </span>
                <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">
                  {sesi.mata_pelajaran}
                </span>
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                  Status: {sesi.status}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {sesi.judul_kuis}
              </h1>
              <p className="text-xs text-slate-400">
                Total: {sesi.totalSoal} butir pilihan ganda • Dibuat: {new Date(sesi.createdAt).toLocaleDateString("id-ID")}
              </p>
            </div>

            {/* Kotak Kode Kuis */}
            <div className="rounded-2xl bg-indigo-50/80 border-2 border-indigo-200 p-5 text-center shrink-0 w-full sm:w-auto">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-700 block">
                KODE KUIS SISWA
              </span>
              <span className="text-3xl font-black font-mono tracking-widest text-indigo-900 mt-1 block">
                {sesi.kode_unik}
              </span>
              <button
                onClick={handleCopyLink}
                className="mt-3 w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-4 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                {copiedLink ? "✅ Link Tersalin!" : "📋 Salin Link Kuis"}
              </button>
            </div>
          </div>
        )}

        {/* Statistik Ringkas Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Siswa Terdata
            </span>
            <p className="text-3xl font-black text-indigo-700">{stats.totalPeserta} Siswa</p>
            <p className="text-[11px] text-slate-400">Total {pesertaList.length} kali pengerjaan</p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Rata-Rata Nilai
            </span>
            <p className="text-3xl font-black text-emerald-600">
              {stats.rataRataSkor} <span className="text-sm font-normal text-slate-400">/ 100</span>
            </p>
            <p className="text-[11px] text-slate-400">Skor terbaik tiap siswa</p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Nilai Tertinggi
            </span>
            <p className="text-3xl font-black text-amber-500">
              {rekapSiswa.length > 0
                ? Math.max(...rekapSiswa.map((s) => s.skor_tertinggi || 0))
                : pesertaList.length > 0
                ? Math.max(...pesertaList.map((p) => p.skor || 0))
                : 0}{" "}
              🌟
            </p>
            <p className="text-[11px] text-slate-400">Pencapaian terbaik siswa</p>
          </div>
        </div>

        {/* Tabel Rekap Nilai Siswa */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Hasil & Progres Siswa</h2>
              <p className="text-xs text-slate-400">
                Sistem adaptif 3 level: Level 1 (Mudah), Level 2 (Sedang), Level 3 (Sulit)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("rekap")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "rekap"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Rekap Per Siswa ({rekapSiswa.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("riwayat")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                  activeTab === "riwayat"
                    ? "bg-indigo-600 text-white shadow-xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Semua Percobaan ({pesertaList.length})
              </button>
            </div>
          </div>

          {activeTab === "rekap" ? (
            rekapSiswa.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[11px]">
                      <th className="py-3 px-3">No.</th>
                      <th className="py-3 px-3">Nama Siswa</th>
                      <th className="py-3 px-3 text-center">Level Capaian</th>
                      <th className="py-3 px-3 text-center">Percobaan</th>
                      <th className="py-3 px-3 text-center">Skor Tertinggi</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Terakhir Mengerjakan</th>
                      <th className="py-3 px-3 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rekapSiswa.map((s, idx) => {
                      const isComplete = s.level_terakhir === 3 && s.lulus_terakhir;
                      const isExpanded = expandedSiswa === s.nama_siswa;
                      const dateStr = s.terakhir_mengerjakan
                        ? new Date(s.terakhir_mengerjakan).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "-";

                      return (
                        <tr key={s.nama_siswa} className="group">
                          <td colSpan={8} className="p-0">
                            <div className="flex items-center hover:bg-slate-50/70 transition px-3 py-3.5 border-b border-slate-100">
                              <span className="w-8 text-slate-400 font-bold">{idx + 1}</span>
                              <span className="flex-1 font-bold text-slate-900">{s.nama_siswa}</span>
                              <span className="w-28 text-center">
                                {isComplete ? (
                                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
                                    Tuntas Level 3 🎉
                                  </span>
                                ) : (
                                  <span
                                    className={`inline-block px-2.5 py-1 rounded-full text-xs font-black ${
                                      s.level_terakhir === 3
                                        ? "bg-rose-100 text-rose-800"
                                        : s.level_terakhir === 2
                                        ? "bg-amber-100 text-amber-800"
                                        : "bg-sky-100 text-sky-800"
                                    }`}
                                  >
                                    Level {s.level_terakhir}
                                  </span>
                                )}
                              </span>
                              <span className="w-24 text-center font-bold text-slate-700">
                                {s.total_percobaan}x coba
                              </span>
                              <span className="w-24 text-center">
                                <span
                                  className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                                    s.skor_tertinggi >= 80
                                      ? "bg-emerald-100 text-emerald-800"
                                      : s.skor_tertinggi >= 60
                                      ? "bg-amber-100 text-amber-800"
                                      : "bg-rose-100 text-rose-800"
                                  }`}
                                >
                                  {s.skor_tertinggi}
                                </span>
                              </span>
                              <span className="w-32 text-center">
                                {isComplete ? (
                                  <span className="text-xs font-black text-emerald-600">Selesai Materi</span>
                                ) : s.lulus_terakhir ? (
                                  <span className="text-xs font-bold text-blue-600">Lulus Level {s.level_terakhir}</span>
                                ) : (
                                  <span className="text-xs font-bold text-amber-600">Mengulang Level {s.level_terakhir}</span>
                                )}
                              </span>
                              <span className="w-36 text-right text-xs text-slate-400 font-mono">
                                {dateStr}
                              </span>
                              <span className="w-16 text-center">
                                <button
                                  type="button"
                                  onClick={() => setExpandedSiswa(isExpanded ? null : s.nama_siswa)}
                                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 underline"
                                >
                                  {isExpanded ? "Tutup" : "Detail"}
                                </button>
                              </span>
                            </div>

                            {/* Detail Percobaan Accordion */}
                            {isExpanded && s.riwayat && s.riwayat.length > 0 && (
                              <div className="bg-slate-50 p-4 border-b border-slate-200/80 space-y-2">
                                <p className="text-xs font-bold text-slate-600">
                                  Riwayat Percobaan {s.nama_siswa}:
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                                  {s.riwayat.map((r, rIdx) => (
                                    <div
                                      key={r._id || rIdx}
                                      className="rounded-xl border border-slate-200 bg-white p-3 text-xs space-y-1 shadow-xs"
                                    >
                                      <div className="flex items-center justify-between font-bold">
                                        <span className="text-slate-800">
                                          Percobaan ke-{r.percobaan_ke || (s.riwayat.length - rIdx)}
                                        </span>
                                        <span
                                          className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                            (r.skor || 0) >= 70
                                              ? "bg-emerald-100 text-emerald-800"
                                              : "bg-amber-100 text-amber-800"
                                          }`}
                                        >
                                          {(r.skor || 0) >= 70 ? "Lulus" : "Mengulang"}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between text-slate-500 font-medium">
                                        <span>Level {r.level || 1}</span>
                                        <span className="font-black text-slate-900">Skor: {r.skor}</span>
                                      </div>
                                      <p className="text-[10px] text-slate-400">
                                        {r.jumlah_benar}/{r.total_soal} Benar ·{" "}
                                        {new Date(r.createdAt).toLocaleTimeString("id-ID", {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center space-y-2">
                <span className="text-4xl">👥</span>
                <p className="text-sm font-bold text-slate-700">
                  Belum ada siswa yang mengerjakan kuis ini
                </p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Bagikan kode kuis atau link ke siswa. Begitu siswa submit jawaban, rekap progres adaptif mereka akan langsung muncul di sini.
                </p>
              </div>
            )
          ) : (
            /* Tab: Semua Percobaan */
            pesertaList.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[11px]">
                      <th className="py-3 px-3">No.</th>
                      <th className="py-3 px-3">Nama Siswa</th>
                      <th className="py-3 px-3 text-center">Level</th>
                      <th className="py-3 px-3 text-center">Percobaan</th>
                      <th className="py-3 px-3 text-center">Benar / Total</th>
                      <th className="py-3 px-3 text-center">Skor</th>
                      <th className="py-3 px-3 text-center">Status</th>
                      <th className="py-3 px-3 text-right">Waktu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pesertaList.map((p, idx) => {
                      const isLulus = (p.skor || 0) >= 70;
                      const dateStr = new Date(p.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "numeric",
                        month: "short",
                      });

                      return (
                        <tr key={p._id} className="hover:bg-slate-50/70 transition">
                          <td className="py-3.5 px-3 text-slate-400 font-bold">{idx + 1}</td>
                          <td className="py-3.5 px-3 font-bold text-slate-900">
                            {p.nama_siswa}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-bold bg-slate-100 text-slate-700">
                              Level {p.level || 1}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center text-slate-700 font-bold">
                            ke-{p.percobaan_ke || 1}
                          </td>
                          <td className="py-3.5 px-3 text-center text-slate-700 font-medium">
                            {p.jumlah_benar} / {p.total_soal}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-black ${
                                isLulus
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {p.skor}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span className={`text-xs font-bold ${isLulus ? "text-emerald-700" : "text-amber-700"}`}>
                              {isLulus ? "Lulus" : "Mengulang"}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right text-xs text-slate-400 font-mono">
                            {dateStr}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center space-y-2">
                <span className="text-4xl">👥</span>
                <p className="text-sm font-bold text-slate-700">
                  Belum ada log percobaan
                </p>
              </div>
            )
          )}
        </div>
      </main>
    </div>
  );
}
