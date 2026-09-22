"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const PILIHAN_KELAS_DEFAULT = [
  "Kelas 1 SD",
  "Kelas 2 SD",
  "Kelas 3 SD",
  "Kelas 4 SD",
  "Kelas 5 SD",
  "Kelas 6 SD",
];

interface Kelas {
  _id: string;
  nama_kelas: string;
  kode_kelas: string;
}

interface Siswa {
  _id: string;
  nama: string;
}

export default function KelolaKelasPage() {
  const [guruId, setGuruId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [namaKelasAktif, setNamaKelasAktif] = useState(PILIHAN_KELAS_DEFAULT[0]);
  const [kelasAktif, setKelasAktif] = useState<Kelas | null>(null);
  const [daftarSiswa, setDaftarSiswa] = useState<Siswa[]>([]);
  const [namaSiswaBaru, setNamaSiswaBaru] = useState("");
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [tambahKelasBaru, setTambahKelasBaru] = useState(false);
  const [inputNamaKelasKustom, setInputNamaKelasKustom] = useState("");

  const requestIdRef = useRef(0);

  const pilihKelas = useCallback(async (namaKelas: string) => {
    if (!guruId) return;

    const myRequestId = ++requestIdRef.current;
    setErrorMsg(null);
    setSuccessMsg(null);
    setNamaKelasAktif(namaKelas);
    setLoadingSiswa(true);

    try {
      const res = await fetch("/api/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guruId, namaKelas }),
      });

      if (myRequestId !== requestIdRef.current) return;

      if (!res.ok) {
        const errData = await res.json();
        setErrorMsg(errData.error || "Gagal memuat kelas.");
        setLoadingSiswa(false);
        return;
      }

      const data = await res.json();
      setKelasAktif(data.kelas);

      const resSiswa = await fetch(`/api/kelas/${data.kelas._id}/siswa`);
      const dataSiswa = await resSiswa.json();

      if (myRequestId !== requestIdRef.current) return;

      setDaftarSiswa(dataSiswa.siswa ?? []);
    } catch {
      if (myRequestId === requestIdRef.current) {
        setErrorMsg("Gagal terhubung ke server.");
      }
    } finally {
      if (myRequestId === requestIdRef.current) {
        setLoadingSiswa(false);
      }
    }
  }, [guruId]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok" && data.guru?.guruId) {
          setGuruId(data.guru.guruId);
        } else {
          setErrorMsg("Gagal mengambil data guru yang login. Silakan login ulang.");
        }
      })
      .catch(() => setErrorMsg("Gagal terhubung ke server."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (guruId) {
      pilihKelas(namaKelasAktif);
    }
  }, [guruId, namaKelasAktif, pilihKelas]);

  const tambahSiswa = async () => {
    if (!namaSiswaBaru.trim() || !kelasAktif) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/kelas/${kelasAktif._id}/siswa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama: namaSiswaBaru }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setErrorMsg(errData.error || "Gagal menambah siswa.");
        return;
      }

      const data = await res.json();
      setDaftarSiswa((prev) =>
        [...prev, data.siswa].sort((a, b) => a.nama.localeCompare(b.nama))
      );
      setSuccessMsg(`Siswa "${namaSiswaBaru.trim()}" berhasil ditambahkan!`);
      setNamaSiswaBaru("");
    } catch {
      setErrorMsg("Gagal terhubung ke server.");
    }
  };

  const handleCopyKode = () => {
    if (!kelasAktif?.kode_kelas) return;
    navigator.clipboard.writeText(kelasAktif.kode_kelas);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleBuatKelasKustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputNamaKelasKustom.trim()) return;
    pilihKelas(inputNamaKelasKustom.trim());
    setInputNamaKelasKustom("");
    setTambahKelasBaru(false);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-400 text-xs font-semibold animate-pulse">Memuat data kelas & siswa...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-200/80 bg-white sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition"
            >
              ← Kembali ke Dashboard
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md">
              Kelola Kelas & Siswa
            </span>
          </div>

          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Dashboard Utama
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 md:p-8 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Kelola Kelas & Data Siswa SD
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Setiap kelas memiliki <strong>1 Kode Akses Kelas tetap</strong>. Semua siswa di kelas menggunakan kode yang sama dan login dibedakan oleh nama masing-masing.
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-xs sm:text-sm text-red-700 font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-xs sm:text-sm text-emerald-700 font-semibold flex items-center gap-2">
            <span>✅</span>
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Pemilihan Kelas */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Pilih Kelas:
          </label>
          <div className="flex flex-wrap gap-2">
            {PILIHAN_KELAS_DEFAULT.map((nama) => (
              <button
                key={nama}
                onClick={() => pilihKelas(nama)}
                className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                  namaKelasAktif === nama
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                {nama}
              </button>
            ))}

            <button
              onClick={() => setTambahKelasBaru((v) => !v)}
              className="rounded-xl px-4 py-2 text-xs font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 transition"
            >
              + Kelas Lainnya (Kustom)
            </button>
          </div>

          {tambahKelasBaru && (
            <form onSubmit={handleBuatKelasKustom} className="flex gap-2 max-w-sm pt-2">
              <input
                type="text"
                value={inputNamaKelasKustom}
                onChange={(e) => setInputNamaKelasKustom(e.target.value)}
                placeholder="Contoh: Kelas 4A, Kelas 5B..."
                className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs focus:border-indigo-600 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Buat
              </button>
            </form>
          )}
        </div>

        {/* Highlight Banner: Kode Akses Kelas */}
        {kelasAktif && (
          <div className="rounded-3xl border-2 border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-white to-indigo-50/40 p-6 sm:p-7 shadow-md shadow-indigo-100 flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-1.5">
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-wider text-indigo-800 bg-indigo-100 px-3 py-0.5 rounded-full">
                Kode Akses {kelasAktif.nama_kelas}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-3xl sm:text-4xl font-black font-mono tracking-widest text-indigo-900">
                  {kelasAktif.kode_kelas || "MEMUAT..."}
                </span>
                <span className="text-xs text-slate-500">
                  (Bagikan kode ini ke seluruh siswa {kelasAktif.nama_kelas})
                </span>
              </div>
            </div>

            <button
              onClick={handleCopyKode}
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition"
            >
              <span>{copiedCode ? "✅ Kode Tersalin!" : "📋 Salin Kode Kelas"}</span>
            </button>
          </div>
        )}

        {/* Section Tambah & Daftar Siswa */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Daftar Siswa {kelasAktif?.nama_kelas}
              </h2>
              <p className="text-xs text-slate-400">
                Total terdaftar: <strong className="text-slate-700">{daftarSiswa.length} Siswa</strong>
              </p>
            </div>

            <span className="text-xs text-slate-400">
              Siswa login dengan: <strong>Nama + Kode Kelas</strong>
            </span>
          </div>

          {/* Form Tambah Siswa */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Tambah Siswa Baru
            </label>
            <div className="flex flex-col sm:flex-row gap-2 max-w-lg">
              <input
                type="text"
                value={namaSiswaBaru}
                onChange={(e) => setNamaSiswaBaru(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && tambahSiswa()}
                placeholder="Ketik nama lengkap siswa..."
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 transition"
              />
              <button
                onClick={tambahSiswa}
                className="rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-95 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition"
              >
                + Tambah Siswa
              </button>
            </div>
          </div>

          {/* List Siswa */}
          {loadingSiswa ? (
            <div className="py-10 text-center text-xs text-slate-400 animate-pulse">
              Memuat data siswa...
            </div>
          ) : daftarSiswa.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-2xl space-y-2">
              <span className="text-3xl">👥</span>
              <p className="text-sm font-bold text-slate-700">Belum ada siswa di kelas ini</p>
              <p className="text-xs text-slate-400">Ketik nama siswa pada kolom di atas untuk mendaftarkannya.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {daftarSiswa.map((siswa, idx) => (
                <div
                  key={siswa._id}
                  className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between gap-2 hover:bg-white hover:border-indigo-300 transition"
                >
                  <div className="flex items-center gap-3 truncate">
                    <span className="h-8 w-8 rounded-xl bg-indigo-100 text-indigo-700 font-extrabold text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                      {siswa.nama}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                    Terdaftar
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
