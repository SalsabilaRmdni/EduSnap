"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

// Daftar tingkat kelas SD untuk dropdown pemilihan
const TINGKAT_KELAS_OPTIONS = [
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

  // State dropdown tingkat kelas SD
  const [tingkatKelas, setTingkatKelas] = useState(TINGKAT_KELAS_OPTIONS[3]);
  const [showTingkatDropdown, setShowTingkatDropdown] = useState(false);

  // State Edit Kelas
  const [showEditModal, setShowEditModal] = useState(false);
  const [namaKelasEdit, setNamaKelasEdit] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // State Hapus Kelas
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [deleteCounts, setDeleteCounts] = useState<{ siswa: number; materi: number; sesi: number } | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

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
  // Handler Buka & Simpan Edit Kelas
  // ──────────────────────────────────────────────
  const bukaModalEdit = () => {
    if (!kelasAktif) return;
    setNamaKelasEdit(kelasAktif.nama_kelas);
    setEditError(null);
    setShowEditModal(true);
  };

  const simpanEditKelas = async () => {
    if (!kelasAktif || !namaKelasEdit.trim()) return;
    setLoadingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/kelas/${kelasAktif._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namaKelas: namaKelasEdit.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || "Gagal memperbarui nama kelas");
        return;
      }
      const updated = data.kelas;
      setKelasAktif((prev) => (prev ? { ...prev, nama_kelas: updated.nama_kelas } : null));
      setKelasList((prev) =>
        prev.map((k) => (k._id === updated._id ? { ...k, nama_kelas: updated.nama_kelas } : k))
      );
      setShowEditModal(false);
      setSuccessNotice(`Nama kelas berhasil diubah menjadi "${updated.nama_kelas}"`);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch {
      setEditError("Gagal terhubung ke server.");
    } finally {
      setLoadingEdit(false);
    }
  };

  // ──────────────────────────────────────────────
  // Handler Buka & Konfirmasi Hapus Kelas
  // ──────────────────────────────────────────────
  const bukaModalHapus = async () => {
    if (!kelasAktif) return;
    setShowDeleteModal(true);
    setLoadingCounts(true);
    setDeleteCounts(null);
    try {
      const res = await fetch(`/api/kelas/${kelasAktif._id}`);
      const data = await res.json();
      if (data.success && data.counts) {
        setDeleteCounts(data.counts);
      } else {
        setDeleteCounts({ siswa: daftarSiswa.length, materi: 0, sesi: 0 });
      }
    } catch {
      setDeleteCounts({ siswa: daftarSiswa.length, materi: 0, sesi: 0 });
    } finally {
      setLoadingCounts(false);
    }
  };

  const konfirmasiHapusKelas = async () => {
    if (!kelasAktif) return;
    const target = kelasAktif;
    console.log("Konfirmasi hapus kelas di KelolaKelasPage:", target._id, target.nama_kelas);
    setLoadingDelete(true);
    try {
      const res = await fetch(`/api/kelas/${target._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      console.log("Response delete di KelolaKelasPage:", res.status, data);

      if (!res.ok) {
        setErrorMsg(data.error || "Gagal menghapus kelas");
        setShowDeleteModal(false);
        return;
      }

      const deletedId = target._id;
      const sisaKelas = kelasList.filter((k) => k._id !== deletedId);
      setKelasList(sisaKelas);

      if (sisaKelas.length > 0) {
        setKelasAktif(sisaKelas[0]);
        loadSiswa(sisaKelas[0]._id);
      } else {
        setKelasAktif(null);
        setDaftarSiswa([]);
      }

      setShowDeleteModal(false);
      setSuccessNotice(`Kelas "${target.nama_kelas}" berhasil dihapus.`);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err) {
      console.error("Error menghapus kelas di KelolaKelasPage:", err);
      setErrorMsg("Gagal menghapus kelas dari server.");
      setShowDeleteModal(false);
    } finally {
      setLoadingDelete(false);
    }
  };

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
  // Pilih tingkat kelas dari dropdown, dan sarankan nama kelas otomatis
  // ──────────────────────────────────────────────
  const pilihTingkatKelas = (tingkat: string) => {
    setTingkatKelas(tingkat);
    setShowTingkatDropdown(false);
    // Sarankan nama kelas berdasar tingkat, guru masih bisa mengedit (mis. tambah "A"/"B")
    setNamaKelasBaru(tingkat);
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

  const hapusSiswa = async (siswaId: string, namaSiswa: string) => {
    if (!kelasAktif) return;
    if (!confirm(`Hapus siswa "${namaSiswa}" dari kelas ini?`)) return;

    try {
      const res = await fetch(`/api/kelas/${kelasAktif._id}/siswa?siswaId=${siswaId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDaftarSiswa((prev) => prev.filter((s) => s._id !== siswaId));
      } else {
        const err = await res.json();
        setErrorMsg(err.error || "Gagal menghapus siswa");
      }
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

        {/* ── Pesan sukses ── */}
        {successNotice && (
          <div className="rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200 font-bold flex items-center gap-2 animate-fade-in">
            <span>✅</span>
            <span>{successNotice}</span>
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

            {/* Dropdown Tingkat Kelas SD */}
            <div className="space-y-1.5 relative">
              <label className="text-xs font-bold text-slate-500">
                Tingkat Kelas SD <span className="text-pink-500">*</span>
              </label>

              <button
                type="button"
                onClick={() => setShowTingkatDropdown((prev) => !prev)}
                className={`w-full flex items-center justify-between rounded-2xl border-2 p-3.5 text-sm font-bold text-slate-900 transition ${
                  showTingkatDropdown
                    ? "border-purple-400 ring-4 ring-purple-100"
                    : "border-sky-100"
                }`}
              >
                <span>{tingkatKelas}</span>
                <span
                  className={`text-slate-400 transition-transform ${
                    showTingkatDropdown ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </button>

              {showTingkatDropdown && (
                <div className="absolute z-20 mt-1 w-full rounded-2xl border-2 border-sky-100 bg-white shadow-lg overflow-hidden">
                  {TINGKAT_KELAS_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => pilihTingkatKelas(opt)}
                      className={`w-full text-left px-4 py-2.5 text-sm font-bold transition ${
                        tingkatKelas === opt
                          ? "bg-purple-600 text-white"
                          : "text-slate-700 hover:bg-purple-50"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Input nama kelas (otomatis terisi dari tingkat, bisa diedit) */}
            <div className="space-y-1.5">
              <p className="text-xs font-bold text-slate-500">Nama Kelas:</p>
              <input
                type="text"
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
                onClick={() => {
                  setShowCreateForm(false);
                  setNamaKelasBaru("");
                  setErrorMsg(null);
                  setShowTingkatDropdown(false);
                }}
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
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div className="h-13 w-13 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-3xl shrink-0 shadow-xs">
                    🏫
                  </div>
                  <div className="space-y-0.5 truncate">
                    <h2 className="text-lg font-black text-slate-900 truncate">
                      {kelasAktif.nama_kelas}
                    </h2>
                    <p className="text-xs font-bold text-slate-400">
                      {daftarSiswa.length} Siswa Terdaftar
                    </p>
                  </div>
                </div>

                {/* Tombol Edit & Hapus Kelas */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={bukaModalEdit}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-black transition flex items-center gap-1 shadow-2xs"
                    title="Edit Nama Kelas"
                  >
                    <span>✏️</span>
                    <span className="hidden sm:inline">Edit</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      console.log("Tombol Hapus diklik di KelolaKelasPage untuk kelasAktif:", kelasAktif);
                      bukaModalHapus();
                    }}
                    className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                    title="Hapus Kelas Ini"
                  >
                    <span>🗑️</span>
                    <span className="hidden sm:inline">Hapus</span>
                  </button>
                </div>
              </div>

              {/* Kode kelas & tombol salin */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div>
                  <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                    Kode Kelas
                  </p>
                  <span className="text-2xl font-black font-mono tracking-widest text-slate-900">
                    {kelasAktif.kode_kelas}
                  </span>
                </div>
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
              onClick={() => {
                setShowCreateForm(true);
                setNamaKelasBaru(tingkatKelas);
              }}
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
                      <button
                        onClick={() => hapusSiswa(siswa._id, siswa.nama)}
                        className="text-slate-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition text-xs font-bold"
                        title="Hapus siswa ini"
                      >
                        🗑️
                      </button>
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

        {/* ── Modal Edit Nama Kelas ── */}
        {showEditModal && kelasAktif && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-sm bg-white rounded-[32px] p-6 space-y-4 shadow-2xl border-2 border-sky-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✏️</span>
                  <h3 className="text-lg font-black text-slate-900">Edit Nama Kelas</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
                >
                  ✕
                </button>
              </div>

              {editError && (
                <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-600 border border-red-200 font-bold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>{editError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600">Nama Kelas Baru</label>
                <input
                  type="text"
                  autoFocus
                  value={namaKelasEdit}
                  onChange={(e) => setNamaKelasEdit(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && simpanEditKelas()}
                  placeholder="Contoh: Kelas 4B"
                  className="w-full rounded-2xl border-2 border-sky-100 p-3.5 text-sm font-bold focus:border-purple-400 focus:outline-none focus:ring-4 focus:ring-purple-100 transition"
                />
                <p className="text-[11px] text-slate-400">
                  Kode kelas ({kelasAktif.kode_kelas}) dan data siswa tidak akan berubah.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  disabled={loadingEdit}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={simpanEditKelas}
                  disabled={!namaKelasEdit.trim() || loadingEdit}
                  className="flex-1 rounded-2xl bg-purple-600 hover:bg-purple-700 py-3 text-xs font-black text-white shadow-md shadow-purple-300/40 transition disabled:opacity-50"
                >
                  {loadingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Modal Konfirmasi Hapus Kelas ── */}
        {showDeleteModal && kelasAktif && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-md bg-white rounded-[32px] p-6 space-y-4 shadow-xl border-2 border-red-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-lg font-bold">
                    🗑️
                  </div>
                  <h3 className="text-lg font-black text-slate-900">Hapus Kelas</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 space-y-2">
                <p className="text-xs font-bold text-amber-900">
                  Apakah Anda yakin ingin menghapus kelas <span className="font-black underline">{kelasAktif.nama_kelas}</span>?
                </p>
                {loadingCounts ? (
                  <p className="text-[11px] text-amber-700 animate-pulse font-medium">
                    Memeriksa data terkait kelas ini...
                  </p>
                ) : (
                  <div className="space-y-1 text-xs text-amber-800">
                    <p className="font-bold">Data terkait di kelas ini:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      <li><span className="font-bold">{deleteCounts?.siswa ?? daftarSiswa.length}</span> Siswa terdaftar</li>
                      <li><span className="font-bold">{deleteCounts?.materi ?? 0}</span> Materi pelajaran</li>
                      <li><span className="font-bold">{deleteCounts?.sesi ?? 0}</span> Sesi kuis aktif / riwayat</li>
                    </ul>
                  </div>
                )}
              </div>

              <div className="rounded-2xl bg-red-50/70 border border-red-100 p-3 text-[11px] font-semibold text-red-700 space-y-1">
                <p className="font-black text-red-800 flex items-center gap-1">
                  <span>🛡️</span> Perlindungan Data Terisolasi
                </p>
                <p>
                  Kelas akan dinonaktifkan dari dashboard guru dan siswa tidak akan bisa bergabung lagi. Riwayat nilai siswa tetap disimpan secara aman.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={loadingDelete}
                  className="flex-1 rounded-2xl border border-slate-200 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={konfirmasiHapusKelas}
                  disabled={loadingDelete}
                  className="flex-1 rounded-2xl bg-red-600 hover:bg-red-700 py-3 text-xs font-black text-white shadow-md shadow-red-300/40 transition disabled:opacity-50"
                >
                  {loadingDelete ? "Menghapus..." : "Ya, Hapus Kelas"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
