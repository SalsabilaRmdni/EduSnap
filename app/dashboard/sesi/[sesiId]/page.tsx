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
  createdAt: string;
}

interface StatsInfo {
  totalPeserta: number;
  rataRataSkor: number;
}

export default function DetailSesiPage() {
  const { sesiId } = useParams<{ sesiId: string }>();

  const [sesi, setSesi] = useState<SesiDetail | null>(null);
  const [stats, setStats] = useState<StatsInfo>({ totalPeserta: 0, rataRataSkor: 0 });
  const [pesertaList, setPesertaList] = useState<PesertaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);

  const loadData = useCallback(async () => {
    if (!sesiId) return;
    try {
      const res = await fetch(`/api/sesi/${sesiId}/peserta`);
      const data = await res.json();
      if (data.status === "ok") {
        setSesi(data.sesi);
        setStats(data.stats);
        setPesertaList(data.pesertaList || []);
      } else {
        setErrorMsg(data.message || "Gagal memuat rekap sesi kuis.");
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
              Siswa Mengerjakan
            </span>
            <p className="text-3xl font-black text-indigo-700">{stats.totalPeserta} Anak</p>
            <p className="text-[11px] text-slate-400">Jawaban tersimpan otomatis</p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Rata-Rata Nilai
            </span>
            <p className="text-3xl font-black text-emerald-600">
              {stats.rataRataSkor} <span className="text-sm font-normal text-slate-400">/ 100</span>
            </p>
            <p className="text-[11px] text-slate-400">Skor seluruh peserta</p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-1 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Nilai Tertinggi
            </span>
            <p className="text-3xl font-black text-amber-500">
              {pesertaList.length > 0 ? Math.max(...pesertaList.map((p) => p.skor || 0)) : 0} 🌟
            </p>
            <p className="text-[11px] text-slate-400">Pencapaian terbaik siswa</p>
          </div>
        </div>

        {/* Tabel Rekap Nilai Siswa */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Rekap Perolehan Nilai Siswa</h2>
              <p className="text-xs text-slate-400">Diurutkan dari peserta terbaru</p>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {pesertaList.length} Siswa Selesai
            </span>
          </div>

          {pesertaList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase text-[11px]">
                    <th className="py-3 px-3">No.</th>
                    <th className="py-3 px-3">Nama Siswa</th>
                    <th className="py-3 px-3 text-center">Benar / Total</th>
                    <th className="py-3 px-3 text-center">Skor Akhir</th>
                    <th className="py-3 px-3 text-right">Waktu Pengerjaan</th>
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
                Belum ada siswa yang mengerjakan kuis ini
              </p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Bagikan kode kuis atau link ke siswa. Begitu siswa submit jawaban, skor mereka akan langsung muncul di sini.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
