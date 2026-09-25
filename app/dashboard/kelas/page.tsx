"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// Daftar preset nama kelas — hanya untuk UI pilihan, TIDAK otomatis dibuat ke DB
const PILIHAN_KELAS_PRESET = [
  "Kelas 1A", "Kelas 1B",
  "Kelas 2A", "Kelas 2B",
  "Kelas 3A", "Kelas 3B",
  "Kelas 4A", "Kelas 4B",
  "Kelas 5A", "Kelas 5B",
  "Kelas 6A", "Kelas 6B",
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

  // Daftar kelas yang sudah ada di MongoDB
  const [kelasList, setKelasList] = useState<Kelas[]>([]);
  // Kelas yang sedang ditampilkan
  const [kelasAktif, setKelasAktif] = useState<Kelas | null>(null);
  const [daftarSiswa, setDaftarSiswa] = useState<Siswa[]>([]);
  const [loadingSiswa, setLoadingSiswa] = useState(false);

  const [namaSiswaBaru, setNamaSiswaBaru] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  // State form pembuatan kelas baru — hanya aktif atas inisiatif guru
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [namaKelasBaru, setNamaKelasBaru] = useState("");
  const [loadingCreate, setLoadingCreate] = useState(false);

  // ──────────────────────────────────────────────
  // Helper: ambil siswa untuk kelas tertentu (READ-ONLY)
  // ──────────────────────────────────────────────
  const loadSiswa = useCallback(async (kelasId: string) => {
    setLoadingSiswa(true);
    setDaftarSiswa([]);
    try {
      const res = await fetch(`/api/kelas/${kelasId}/siswa`);
      const data = await res.json();
      setDaftarSiswa(data.siswa ?? []);
    } catch {
      setErrorMsg("Gagal memuat data siswa.");
    } finally {
      setLoadingSiswa(false);
    }
  }, []);

  // ──────────────────────────────────────────────
  // 1. Ambil guruId dari session
  // ──────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok" && data.guru?.guruId) {
          setGuruId(data.guru.guruId);
        } else {
          setErrorMsg("Gagal mengambil data guru. Coba login ulang.");
        }
      })
      .catch(() => setErrorMsg("Gagal terhubung ke server."))
      .finally(() => setLoading(false));
  }, []);

  // ──────────────────────────────────────────────
  // 2. Setelah guruId tersedia: GET kelas (READ-ONLY, tidak membuat record baru)
  // ──────────────────────────────────────────────
  useEffect(() => {
    if (!guruId) return;

    fetch("/api/kelas")
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.kelas)) {
          setKelasList(data.kelas);
          if (data.kelas.length > 0) {
            // Tampilkan kelas pertama yang ada di DB
            setKelasAktif(data.kelas[0]);
            loadSiswa(data.kelas[0]._id);
          }
          // Jika data.kelas kosong → guru belum punya kelas → tampilkan empty state
          // Tidak ada POST di sini
        }
      })
      .catch(() => setErrorMsg("Gagal memuat data kelas."));
  }, [guruId, loadSiswa]);

  // ──────────────────────────────────────────────
  // Pilih kelas dari daftar yang sudah ada (switch tab)
  // ──────────────────────────────────────────────
  const pilihKelas = (kelas: Kelas) => {
    setKelasAktif(kelas);
    setShowCreateForm(false);
    loadSiswa(kelas._id);
  };

  // ──────────────────────────────────────────────
  // Buat kelas baru — hanya dipanggil saat guru klik tombol "Buat Kelas"
  // ──────────────────────────────────────────────
  const buatKelas = async () => {
    const nama = namaKelasBaru.trim();
    if (!nama || !guruId) return;

    setLoadingCreate(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/kelas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guruId, namaKelas: nama }),
      });

      if (!res.ok) {
        const errData = await res.json();
        setErrorMsg(errData.error || "Gagal membuat kelas.");
        return;
      }

      const data = await res.json();
      const kelasBaruData: Kelas = data.kelas;

      setKelasList((prev) => [...prev, kelasBaruData]);
      setKelasAktif(kelasBaruData);
      setDaftarSiswa([]);
      setNamaKelasBaru("");
      setShowCreateForm(false);
    } catch {
      setErrorMsg("Gagal terhubung ke server.");
    } finally {
      setLoadingCreate(false);
    }
  };

  // ──────────────────────────────────────────────
  // Tambah siswa ke kelas aktif
  // ──────────────────────────────────────────────
  const tambahSiswa = async () => {
    if (!namaSiswaBaru.trim() || !kelasAktif) return;
    setErrorMsg(null);

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
      setNamaSiswaBaru("");
      setShowAddModal(false);
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

  // ──────────────────────────────────────────────
  // Loading state
  // ──────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-sky-50">
        <p className="text-slate-400 text-xs font-bold animate-pulse">Memuat data kelas...</p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans p-4 sm:p-6 pb-12">
      <div className="w-full max-w-md mx-auto space-y-4">

        {/* ── Header ── */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="h-10 w-10 rounded-2xl bg-white border-2 border-sky-100 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-50 transition shadow-xs"
          >
            ←
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {showCreateForm
              ? "Buat Kelas Baru"
              : kelasAktif?.nama_kelas || "Kelola Kelas"}
          </h1>
        </div>

        {/* ── Pesan error ── */}
        {errorMsg && (
          <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-600 border border-red-200 font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ── Tab pilih kelas (jika guru punya lebih dari 1 kelas) ── */}
        {kelasList.length > 1 && !showCreateForm && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {kelasList.map((k) => (
              <button
                key={k._id}
                onClick={() => pilihKelas(k)}
                className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black transition ${
                  kelasAktif?._id === k._id
                    ? "bg-purple-600 text-white shadow-md"
                    : "bg-white border-2 border-sky-100 text-slate-600 hover:border-sky-300"
                }`}
              >
                {k.nama_kelas}
              </button>
            ))}
          </div>
        )}

        {/* ══════════════════════════════════════════
            EMPTY STATE: Guru belum punya kelas
            Tampil hanya jika kelasList kosong dan
            form buat kelas belum dibuka
        ══════════════════════════════════════════ */}
        {kelasList.length === 0 && !showCreateForm && (
          <div className="rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50/50 p-8 flex flex-col items-center text-center gap-4">
            <span className="text-5xl">🏫</span>
            <div className="space-y-1">
              <p className="font-black text-slate-700 text-base">Belum ada kelas</p>
              <p className="text-xs text-slate-400 font-semibold">
                Buat kelas pertama Anda untuk mulai mengelola siswa.
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-98 py-2.5 px-5 text-sm font-black text-white shadow-md shadow-purple-300/50 flex items-center justify-center gap-2 transition"
            >
              <span>+</span>
              <span>Buat Kelas Pertama</span>
            </button>
          </div>
        )}

        {/* ══════════════════════════════════════════
            FORM BUAT KELAS BARU
            Tampil hanya setelah guru klik tombol
            "+ Buat Kelas Pertama" atau "+ Tambah Kelas Lain"
        ══════════════════════════════════════════ */}
        {showCreateForm && (
          <div className="rounded-3xl border-2 border-sky-100 bg-white p-5 shadow-sm space-y-4">
            <p className="text-xs font-bold text-slate-500">Pilih dari daftar:</p>

            {/* Tombol preset nama kelas */}
            <div className="flex flex-wrap gap-2">
              {PILIHAN_KELAS_PRESET.map((nama) => (
                <button
                  key={nama}
                  type="button"
                  onClick={() => setNamaKelasBaru(nama)}
                  className={`rounded-2xl px-3 py-1.5 text-xs font-bold transition ${
                    namaKelasBaru === nama
                      ? "bg-purple-600 text-white shadow-sm"
                      : "bg-sky-50 border border-sky-200 text-slate-600 hover:bg-sky-100"
                  }`}
                >
                  {nama}
                </button>
              ))}
            </div>

            {/* Input nama kelas bebas */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-500">Atau ketik nama kelas:</p>
              <input
                type="text"
                autoFocus
                value={namaKelasBaru}
                onChange={(e) => setNamaKelasBaru(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && buatKelas()}
                placeholder="Contoh: Kelas 4A, Kelas Cerdas, dll."
                className="w-full rounded-2xl border-2 border-sky-100 p-3.5 text-sm font-bold focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition"
              />
            </div>

            {/* Tombol Batal & Buat */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowCreateForm(false); setNamaKelasBaru(""); setErrorMsg(null); }}
                className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={buatKelas}
                disabled={!namaKelasBaru.trim() || loadingCreate}
                className="flex-1 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-98 py-3 text-xs font-black text-white shadow-md shadow-purple-300/50 transition disabled:opacity-50"
              >
                {loadingCreate ? "Membuat..." : "Buat Kelas"}
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════
            CARD KELAS AKTIF
            Tampil jika guru sudah punya kelas
            dan form buat kelas tidak sedang terbuka
        ══════════════════════════════════════════ */}
        {kelasAktif && !showCreateForm && (
          <>
            {/* Card Informasi Kelas */}
            <div className="rounded-[32px] border-2 border-sky-100 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-3xl shrink-0 shadow-xs">
                  🏫
                </div>
                <div className="space-y-0.5 flex-1">
                  <h2 className="text-lg font-black text-slate-900">
                    {kelasAktif.nama_kelas}
                  </h2>
                  <p className="text-xs font-bold text-slate-400">
                    {daftarSiswa.length} Siswa
                  </p>
                  <p className="text-[11px] font-extrabold text-slate-400">
                    Kode Kelas
                  </p>
                </div>
              </div>

              {/* Kode kelas & tombol salin */}
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-2xl font-black font-mono tracking-widest text-slate-900">
                  {kelasAktif.kode_kelas}
                </span>
                <button
                  onClick={handleCopyKode}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 px-3.5 py-1.5 text-xs font-black transition"
                >
                  <span>📋</span>
                  <span>{copiedCode ? "Tersalin!" : "Salin"}</span>
                </button>
              </div>
            </div>

            {/* Tombol tambah kelas lain */}
            <button
              type="button"
              onClick={() => { setShowCreateForm(true); setNamaKelasBaru(""); }}
              className="w-full rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 hover:bg-purple-50 py-2.5 px-4 text-xs font-black text-purple-600 flex items-center justify-center gap-2 transition"
            >
              <span>+</span>
              <span>Tambah Kelas Lain</span>
            </button>

            {/* ── Daftar Siswa ── */}
            <div className="space-y-3 pt-2">
              <h2 className="text-base font-black text-slate-900">Daftar Siswa</h2>

              {loadingSiswa ? (
                <div className="p-8 text-center text-xs text-slate-400">Memuat siswa...</div>
              ) : daftarSiswa.length === 0 ? (
                <div className="rounded-3xl border-2 border-dashed border-sky-100 bg-white p-8 text-center space-y-1">
                  <p className="text-sm font-bold text-slate-700">Belum ada siswa di kelas ini</p>
                  <p className="text-xs text-slate-400">
                    Klik tombol di bawah untuk menambahkan siswa.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {daftarSiswa.map((siswa, idx) => (
                    <div
                      key={siswa._id}
                      className="rounded-2xl border-2 border-sky-100 bg-white p-3.5 flex items-center justify-between shadow-xs hover:border-sky-300 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-lg">
                          {idx % 2 === 0 ? "👦" : "👧"}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{siswa.nama}</span>
                      </div>
                      <span className="text-slate-300 font-bold text-lg">›</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Tombol Tambah Siswa */}
              <div className="pt-2">
                <button
                  onClick={() => setShowAddModal(true)}
                  className="w-full rounded-2xl bg-sky-400 hover:bg-sky-500 active:scale-98 py-3.5 px-6 text-base font-black text-white shadow-md shadow-sky-300/40 flex items-center justify-center gap-2 transition"
                >
                  <span>+</span>
                  <span>Tambah Siswa</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* ── Modal Tambah Siswa ── */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
            <div className="w-full max-w-sm bg-white rounded-[32px] p-6 space-y-4 shadow-xl border-2 border-sky-100">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-black text-slate-900">Tambah Siswa</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Nama Lengkap Siswa</label>
                <input
                  type="text"
                  autoFocus
                  value={namaSiswaBaru}
                  onChange={(e) => setNamaSiswaBaru(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && tambahSiswa()}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full rounded-2xl border-2 border-sky-100 p-3.5 text-sm font-bold focus:border-sky-400 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  onClick={tambahSiswa}
                  className="flex-1 rounded-2xl bg-sky-400 hover:bg-sky-500 py-3 text-xs font-black text-white shadow-sm"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
