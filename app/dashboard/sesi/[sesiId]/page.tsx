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

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 bg-gray-50">
        <div className="text-center space-y-2">
          <span className="inline-block animate-spin text-2xl">⏳</span>
          <p className="text-gray-500 text-sm">Memuat rekap nilai sesi...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigasi atas */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            ← Kembali ke Dashboard
          </Link>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 transition"
          >
            🔄 {refreshing ? "Memperbarui..." : "Perbarui Data"}
          </button>
        </div>

        {errorMsg && (
          <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 border border-red-200">
            {errorMsg}
          </div>
        )}

        {/* Header Sesi Kuis */}
        {sesi && (
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                  {sesi.tingkat_kelas}
                </span>
                <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                  {sesi.mata_pelajaran}
                </span>
                <span className="rounded-md bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                  Status: {sesi.status}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{sesi.judul_kuis}</h1>
              <p className="text-xs text-gray-400">
                Total Soal: {sesi.totalSoal} butir pilihan ganda
              </p>
            </div>

            {/* Kotak Kode Kuis */}
            <div className="flex flex-col items-center justify-center rounded-2xl bg-indigo-50 border-2 border-indigo-200 px-6 py-4 text-center shrink-0">
              <span className="text-xs font-bold uppercase tracking-widest text-indigo-700">
                KODE KUIS SISWA
              </span>
              <span className="text-3xl font-black tracking-widest text-indigo-900 mt-0.5">
                {sesi.kode_unik}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/join?kode=${sesi.kode_unik}`
                  );
                  alert("Link kuis berhasil disalin! Bagikan link ini ke siswa.");
                }}
                className="mt-2 rounded-lg bg-indigo-600 px-3 py-1 text-xs font-semibold text-white hover:bg-indigo-700 transition"
              >
                📋 Salin Link Kuis
              </button>
            </div>
          </div>
        )}

        {/* Statistik Ringkas */}
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Siswa Mengerjakan
            </span>
            <p className="text-3xl font-extrabold text-indigo-600">{stats.totalPeserta} Anak</p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-1">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Rata-Rata Nilai
            </span>
            <p className="text-3xl font-extrabold text-emerald-600">
              {stats.rataRataSkor} <span className="text-sm font-normal text-gray-400">/ 100</span>
            </p>
          </div>
        </div>

        {/* Tabel Rekap Nilai Siswa */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden space-y-3 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900">Rekap Nilai Siswa</h2>
            <span className="text-xs text-gray-400">
              Diurutkan dari yang terbaru mengerjakan
            </span>
          </div>

          {pesertaList.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-xs font-bold uppercase tracking-wider text-gray-600">
                    <th className="py-3 px-4">No.</th>
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4 text-center">Jawaban Benar</th>
                    <th className="py-3 px-4 text-center">Skor Akhir</th>
                    <th className="py-3 px-4 text-right">Waktu Submit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pesertaList.map((p, idx) => {
                    const isLulus = (p.skor || 0) >= 70;
                    const dateStr = new Date(p.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "numeric",
                      month: "short",
                    });

                    return (
                      <tr key={p._id} className="hover:bg-gray-50/80 transition">
                        <td className="py-3 px-4 text-gray-500">{idx + 1}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{p.nama_siswa}</td>
                        <td className="py-3 px-4 text-center text-gray-700">
                          {p.jumlah_benar} / {p.total_soal}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-extrabold ${
                              isLulus
                                ? "bg-green-100 text-green-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {p.skor}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-xs text-gray-400 font-mono">
                          {dateStr}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center space-y-2">
              <span className="text-3xl">👥</span>
              <p className="text-sm font-semibold text-gray-700">
                Belum ada siswa yang mengirimkan jawaban.
              </p>
              <p className="text-xs text-gray-400">
                Bagikan kode kuis kepada siswa agar mereka dapat mulai mengerjakan. Nilai akan otomatis masuk ke sini!
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
