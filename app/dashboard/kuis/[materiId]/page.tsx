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

  useEffect(() => {
    loadData();
  }, [loadData]);

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
        setErrorMsg(data.error || "Gagal membuat soal. Pastikan teks OCR sudah terisi.");
      }
    } catch {
      setErrorMsg("Gagal menghubungi layanan AI.");
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
        }),
      });
      const data = await res.json();
      if (data.status === "ok" && data.sesi) {
        setKodeSesiBaru(data.sesi.kode_unik);
      } else {
        setErrorMsg(data.message || "Gagal membuat sesi kuis.");
      }
    } catch {
      setErrorMsg("Terjadi kesalahan saat membuat sesi kuis.");
    } finally {
      setCreatingSesi(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 bg-gray-50">
        <div className="text-center space-y-2">
          <span className="inline-block animate-spin text-2xl">⏳</span>
          <p className="text-gray-500 text-sm">Memuat data kuis...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigasi atas */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
          >
            ← Kembali ke Dashboard
          </Link>
          <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-full">
            Mode Guru
          </span>
        </div>

        {/* Informasi Materi & Konteks Buku SD */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-indigo-100 px-2.5 py-1 text-xs font-semibold text-indigo-700">
              {materi?.tingkat_kelas || materi?.kelas || "SD"}
            </span>
            <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
              {materi?.mataPelajaran || "Tematik"}
            </span>
            {materi?.halaman && (
              <span className="rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
                {materi.halaman}
              </span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-gray-900">
            {materi?.namaMateri || "Materi Pelajaran"}
          </h1>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={handleGenerateSoal}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50 shadow-sm"
            >
              {generating ? "✨ AI Sedang Membuat Soal..." : "✨ Generate Soal dengan AI"}
            </button>

            {soalList.length > 0 && (
              <button
                onClick={handleBuatSesi}
                disabled={creatingSesi}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 shadow-sm"
              >
                {creatingSesi ? "Membuat Sesi..." : "🚀 Buka Sesi Kuis untuk Siswa"}
              </button>
            )}
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Modal / Banner Sesi Kuis Aktif */}
        {kodeSesiBaru && (
          <div className="rounded-xl border-2 border-emerald-500 bg-emerald-50 p-6 shadow-md text-center space-y-3">
            <span className="text-3xl">🎉</span>
            <h2 className="text-lg font-bold text-emerald-900">Sesi Kuis Siswa Siap Digunakan!</h2>
            <p className="text-sm text-emerald-700 max-w-md mx-auto">
              Bagikan kode kuis di bawah ini kepada siswa. Siswa dapat langsung bergabung melalui link join tanpa perlu registrasi akun.
            </p>

            <div className="inline-block rounded-xl bg-white px-8 py-3 border-2 border-dashed border-emerald-400">
              <span className="text-xs uppercase tracking-wider font-semibold text-gray-500 block">
                Kode Kuis
              </span>
              <span className="text-4xl font-extrabold tracking-widest text-emerald-700">
                {kodeSesiBaru}
              </span>
            </div>

            <div className="flex flex-wrap justify-center items-center gap-3 pt-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `${window.location.origin}/join?kode=${kodeSesiBaru}`
                  );
                  alert("Tautan kuis berhasil disalin ke clipboard!");
                }}
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 transition"
              >
                📋 Salin Link Kuis Siswa
              </button>

              <button
                onClick={() => router.push(`/dashboard/sesi/${kodeSesiBaru}`)}
                className="rounded-lg border border-emerald-700 bg-white px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-100 transition"
              >
                📊 Pantau Nilai Siswa
              </button>
            </div>
          </div>
        )}

        {/* Daftar Soal */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">
              Daftar Soal & Kunci Jawaban ({soalList.length} Butir Soal)
            </h2>
          </div>

          {soalList.map((s, i) => (
            <div
              key={s._id || i}
              className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm space-y-3"
            >
              <p className="font-semibold text-gray-900 text-base">
                <span className="text-indigo-600 mr-1.5">{i + 1}.</span> {s.pertanyaan}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {s.pilihan.map((opsi, idx) => {
                  const isBenar = idx === s.jawabanBenar;
                  const labelHuruf = ["A", "B", "C", "D"][idx] || String(idx + 1);
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2.5 rounded-lg px-3.5 py-2.5 text-sm border transition ${
                        isBenar
                          ? "bg-green-50 border-green-300 text-green-800 font-semibold"
                          : "bg-gray-50 border-gray-200 text-gray-700"
                      }`}
                    >
                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          isBenar
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {labelHuruf}
                      </span>
                      <span className="flex-1">{opsi}</span>
                      {isBenar && <span className="text-xs font-bold text-green-600">KUNCI</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {soalList.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center space-y-3">
              <span className="text-3xl">📝</span>
              <p className="text-gray-600 font-medium">Belum ada soal untuk materi ini.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Klik tombol &quot;Generate Soal dengan AI&quot; di atas untuk membuat butir soal otomatis dari hasil teks materi buku.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}