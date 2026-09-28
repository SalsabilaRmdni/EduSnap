"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import EduSnapLogo from "@/components/EduSnapLogo";
import UploadMateriSection from "./UploadMateriSection";

interface GuruSession {
  guruId: string;
  nama: string;
  email: string;
}

function formatNamaGuru(nama: string) {
  if (!nama) return "";
  return nama
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

interface KelasItem {
  _id: string;
  nama_kelas: string;
  kode_kelas: string;
}

interface SesiItem {
  _id: string;
  kode_unik: string;
  judul_kuis: string;
  mata_pelajaran: string;
  tingkat_kelas: string;
  kelas_id?: string;
  soal: unknown[];
  createdAt: string;
}

interface MateriItem {
  _id: string;
  namaMateri: string;
  mataPelajaran: string;
  kelas: string;
  kelas_id?: string;
  halaman?: string;
  teksHasilOCR?: string;
  createdAt: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [guru, setGuru] = useState<GuruSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<"dashboard" | "materi" | "hasil">("dashboard");
  const [kelasList, setKelasList] = useState<KelasItem[]>([]);
  const [selectedKelasId, setSelectedKelasId] = useState<string | null>(null);
  const [siswaPerKelas, setSiswaPerKelas] = useState<Record<string, number>>({});
  const [materiList, setMateriList] = useState<MateriItem[]>([]);
  const [loadingMateri, setLoadingMateri] = useState(false);
  const [sesiList, setSesiList] = useState<SesiItem[]>([]);

  // State Edit Kelas
  const [showEditModal, setShowEditModal] = useState(false);
  const [kelasTargetEdit, setKelasTargetEdit] = useState<KelasItem | null>(null);
  const [namaKelasEdit, setNamaKelasEdit] = useState("");
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // State Hapus Kelas
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [kelasTargetHapus, setKelasTargetHapus] = useState<KelasItem | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [deleteCounts, setDeleteCounts] = useState<{ siswa: number; materi: number; sesi: number } | null>(null);
  const [loadingCounts, setLoadingCounts] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Ambil data materi khusus untuk kelas yang sedang dipilih
  const loadMateriKelas = useCallback(async (kelasId: string) => {
    setLoadingMateri(true);
    try {
      const res = await fetch(`/api/kelas/${kelasId}/materi`);
      const data = await res.json();
      if (data.success && Array.isArray(data.materi)) {
        setMateriList(data.materi);
      } else {
        setMateriList([]);
      }
    } catch {
      setMateriList([]);
    } finally {
      setLoadingMateri(false);
    }
  }, []);

  // Ambil jumlah siswa untuk kelas tertentu
  const loadSiswaCount = useCallback(async (kelasId: string) => {
    try {
      const sRes = await fetch(`/api/kelas/${kelasId}/siswa`);
      const sData = await sRes.json();
      if (sData.success && Array.isArray(sData.siswa)) {
        setSiswaPerKelas((prev) => ({
          ...prev,
          [kelasId]: sData.siswa.length,
        }));
      }
    } catch {
      // Abaikan jika gagal
    }
  }, []);

  // Ambil sesi kuis
  const loadSesiList = useCallback(async (kelasId?: string | null) => {
    try {
      const url = kelasId ? `/api/sesi?kelasId=${kelasId}` : "/api/sesi";
      const r = await fetch(url);
      const sData = await r.json();
      if (sData.status === "ok") {
        setSesiList(sData.sesiList || []);
      }
    } catch {
      // Abaikan
    }
  }, []);

  // Inisialisasi data guru dan kelas
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.status !== "ok") {
          router.push("/login");
          return;
        }
        setGuru(data.guru);

        // Fetch Kelas Guru
        fetch("/api/kelas")
          .then((r) => r.json())
          .then((kData) => {
            if (kData.success && Array.isArray(kData.kelas)) {
              setKelasList(kData.kelas);
              if (kData.kelas.length > 0) {
                const firstKelasId = kData.kelas[0]._id;
                setSelectedKelasId((prev) => prev || firstKelasId);

                // Load data untuk setiap kelas
                for (const k of kData.kelas) {
                  loadSiswaCount(k._id);
                }

                loadMateriKelas(firstKelasId);
                loadSesiList(firstKelasId);
              }
            }
          });
      })
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router, loadSiswaCount, loadMateriKelas, loadSesiList]);

  // Ketika guru memilih kelas lain di dashboard
  const handlePilihKelas = (kelasId: string) => {
    setSelectedKelasId(kelasId);
    loadMateriKelas(kelasId);
    loadSesiList(kelasId);
  };

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const bukaModalEdit = (k: KelasItem) => {
    console.log("bukaModalEdit untuk kelas:", k);
    setKelasTargetEdit(k);
    setNamaKelasEdit(k.nama_kelas);
    setEditError(null);
    setShowEditModal(true);
  };

  const simpanEditKelas = async () => {
    if (!kelasTargetEdit || !namaKelasEdit.trim()) return;
    const target = kelasTargetEdit;
    setLoadingEdit(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/kelas/${target._id}`, {
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
      setKelasList((prev) =>
        prev.map((k) => (k._id === updated._id ? { ...k, nama_kelas: updated.nama_kelas } : k))
      );
      setShowEditModal(false);
      setKelasTargetEdit(null);
      setSuccessNotice(`Nama kelas berhasil diubah menjadi "${updated.nama_kelas}"`);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch {
      setEditError("Gagal terhubung ke server.");
    } finally {
      setLoadingEdit(false);
    }
  };

  const bukaModalHapus = async (k: KelasItem) => {
    console.log("bukaModalHapus untuk kelas:", k._id, k.nama_kelas);
    setKelasTargetHapus(k);
    setShowDeleteModal(true);
    setLoadingCounts(true);
    setDeleteCounts(null);
    try {
      const res = await fetch(`/api/kelas/${k._id}`);
      const data = await res.json();
      console.log("Counts data dari server:", data);
      if (data.success && data.counts) {
        setDeleteCounts(data.counts);
      } else {
        setDeleteCounts({ siswa: siswaPerKelas[k._id] ?? 0, materi: 0, sesi: 0 });
      }
    } catch (err) {
      console.error("Gagal load count kelas:", err);
      setDeleteCounts({ siswa: siswaPerKelas[k._id] ?? 0, materi: 0, sesi: 0 });
    } finally {
      setLoadingCounts(false);
    }
  };

  const batalHapus = () => {
    console.log("Batal hapus kelas");
    setShowDeleteModal(false);
    setKelasTargetHapus(null);
    setDeleteCounts(null);
  };

  const konfirmasiHapusKelas = async () => {
    if (!kelasTargetHapus) {
      console.warn("konfirmasiHapusKelas dibatalkan: kelasTargetHapus bernilai null");
      return;
    }
    const target = kelasTargetHapus;
    console.log("Mengirim request DELETE /api/kelas/" + target._id);
    setLoadingDelete(true);
    try {
      const res = await fetch(`/api/kelas/${target._id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      console.log("Response DELETE:", res.status, data);

      if (!res.ok) {
        alert(data.error || "Gagal menghapus kelas");
        setShowDeleteModal(false);
        setKelasTargetHapus(null);
        return;
      }

      const deletedId = target._id;
      const sisa = kelasList.filter((k) => k._id !== deletedId);
      setKelasList(sisa);

      // Tangani perpindahan kelas aktif jika yang dihapus adalah kelas aktif
      if (selectedKelasId === deletedId || !selectedKelasId) {
        if (sisa.length > 0) {
          const nextId = sisa[0]._id;
          setSelectedKelasId(nextId);
          loadMateriKelas(nextId);
          loadSesiList(nextId);
          loadSiswaCount(nextId);
        } else {
          setSelectedKelasId(null);
          setMateriList([]);
          setSesiList([]);
        }
      }

      setShowDeleteModal(false);
      setKelasTargetHapus(null);
      setSuccessNotice(`Kelas "${target.nama_kelas}" berhasil dihapus.`);
      setTimeout(() => setSuccessNotice(null), 3500);
    } catch (err) {
      console.error("Gagal request DELETE:", err);
      alert("Gagal menghapus kelas dari server.");
      setShowDeleteModal(false);
      setKelasTargetHapus(null);
    } finally {
      setLoadingDelete(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-sky-50">
        <div className="text-center space-y-3">
          <span className="text-5xl inline-block animate-bounce">📚</span>
          <p className="text-sm font-black text-slate-700">Memuat Dashboard Guru...</p>
        </div>
      </main>
    );
  }

  if (!guru) return null;

  const activeKelas = kelasList.find((k) => k._id === selectedKelasId) || kelasList[0] || null;
  const siswaCount = activeKelas ? siswaPerKelas[activeKelas._id] ?? 0 : 0;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* ======================================= */}
      {/* SIDEBAR GURU */}
      {/* ======================================= */}
      <aside className="w-full md:w-56 shrink-0 bg-white border-r border-sky-100 p-4 sm:p-5 flex flex-col justify-between space-y-6">
        <div className="space-y-6">
          {/* Logo / Brand */}
          <div className="flex items-center justify-between md:justify-start gap-3">
            <Link href="/dashboard">
              <EduSnapLogo size="sm" />
            </Link>

            {/* Logout on mobile */}
            <button
              onClick={handleLogout}
              className="md:hidden text-xs font-bold text-red-500 hover:underline"
            >
              Keluar
            </button>
          </div>

          {/* Teacher Avatar Pill */}
          <div className="flex items-center gap-3 p-2 rounded-2xl bg-purple-50 border border-purple-100">
            <div className="h-10 w-10 rounded-full bg-purple-600 text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0">
              👩‍🏫
            </div>
            <div className="truncate">
              <p className="text-xs font-black text-slate-900 truncate">Guru {formatNamaGuru(guru.nama)}</p>
              <p className="text-[10px] font-bold text-purple-700">
                {kelasList.length > 0 ? `${kelasList.length} Kelas Aktif` : "Guru SD"}
              </p>
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5 flex flex-row md:flex-col overflow-x-auto md:overflow-visible pb-2 md:pb-0 gap-1.5 md:gap-0">
            {/* Dashboard */}
            <button
              onClick={() => setActiveMenu("dashboard")}
              className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-black transition shrink-0 ${
                activeMenu === "dashboard"
                  ? "bg-purple-100 text-purple-800 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>🏠</span>
              <span>Dashboard</span>
            </button>

            {/* Kelas */}
            <Link
              href="/dashboard/kelas"
              className="flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition shrink-0"
            >
              <span>🏫</span>
              <span>Kelas & Siswa</span>
            </Link>

            {/* Materi */}
            <button
              onClick={() => setActiveMenu("materi")}
              className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold transition shrink-0 ${
                activeMenu === "materi"
                  ? "bg-purple-100 text-purple-800 font-black shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>📖</span>
              <span>Tambah Materi</span>
            </button>

            {/* Hasil */}
            <button
              onClick={() => setActiveMenu("hasil")}
              className={`flex items-center gap-3 rounded-2xl px-4 py-2.5 text-xs font-bold transition shrink-0 ${
                activeMenu === "hasil"
                  ? "bg-purple-100 text-purple-800 font-black shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>📊</span>
              <span>Rekap Nilai</span>
            </button>
          </nav>
        </div>

        {/* Desktop Logout Button */}
        <div className="hidden md:block pt-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full rounded-2xl border border-red-200 bg-red-50 hover:bg-red-100 py-2.5 px-3 text-xs font-black text-red-600 transition"
          >
            Keluar (Logout)
          </button>
        </div>
      </aside>

      {/* ======================================= */}
      {/* MAIN CONTENT AREA */}
      {/* ======================================= */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 space-y-6 max-w-4xl relative overflow-hidden">
        {/* Welcome Greeting */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-purple-100 border-2 border-purple-300 flex items-center justify-center text-2xl shadow-xs">
            👩‍🏫
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900">
              Selamat Datang, Guru {formatNamaGuru(guru.nama)}! 👋
            </h1>
            <p className="text-xs font-bold text-slate-400">
              Kelola kelas, materi buku, dan kuis SD secara mandiri dan terisolasi.
            </p>
          </div>
        </div>

        {/* ── Pesan sukses aksi kelas ── */}
        {successNotice && (
          <div className="rounded-2xl bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200 font-bold flex items-center gap-2 animate-fade-in">
            <span>✅</span>
            <span>{successNotice}</span>
          </div>
        )}

        {activeMenu === "dashboard" && (
          <div className="space-y-6">
            {/* Section: Kelas Saya */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-black text-slate-900">
                  Kelas Saya ({kelasList.length})
                </h2>
                <Link
                  href="/dashboard/kelas"
                  className="text-xs font-bold text-purple-600 hover:underline flex items-center gap-1"
                >
                  <span>+ Kelola / Tambah Kelas</span>
                </Link>
              </div>

              {kelasList.length === 0 ? (
                /* ── Empty State: Guru belum punya kelas ── */
                <div className="rounded-3xl border-2 border-dashed border-sky-200 bg-sky-50/50 p-8 flex flex-col items-center justify-center text-center gap-3">
                  <span className="text-5xl">🏫</span>
                  <div className="space-y-1">
                    <p className="font-black text-slate-700 text-sm">Belum ada kelas</p>
                    <p className="text-xs text-slate-400 font-semibold">
                      Buat kelas pertama Anda untuk mulai mengelola siswa dan materi.
                    </p>
                  </div>
                  <Link
                    href="/dashboard/kelas"
                    className="rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-98 py-2.5 px-5 text-sm font-black text-white shadow-md shadow-purple-300/50 flex items-center justify-center gap-2 transition"
                  >
                    <span>+</span>
                    <span>Buat Kelas Pertama</span>
                  </Link>
                </div>
              ) : (
                /* ── Multi-Kelas Tabs & Card Aktif ── */
                <div className="space-y-3">
                  {/* Selector Tab Kelas Jika Guru Memiliki Lebih dari 1 Kelas */}
                  {kelasList.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {kelasList.map((k) => {
                        const count = siswaPerKelas[k._id] ?? 0;
                        const isSelected = activeKelas?._id === k._id;
                        return (
                          <button
                            key={k._id}
                            onClick={() => handlePilihKelas(k._id)}
                            className={`shrink-0 rounded-2xl px-4 py-2 text-xs font-black transition flex items-center gap-2 ${
                              isSelected
                                ? "bg-purple-600 text-white shadow-md"
                                : "bg-white border-2 border-sky-100 text-slate-600 hover:border-sky-300"
                            }`}
                          >
                            <span>🏫 {k.nama_kelas}</span>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full ${
                                isSelected ? "bg-purple-700 text-purple-100" : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {count} Siswa
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Card Detail Kelas Aktif */}
                  {activeKelas && (
                    <div className="rounded-3xl border-2 border-sky-100 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-14 w-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-3xl shrink-0 shadow-xs">
                            🏫
                          </div>
                          <div className="space-y-1">
                            <h3 className="text-lg font-black text-slate-900">
                              {activeKelas.nama_kelas}
                            </h3>
                            <p className="text-xs font-bold text-slate-400">
                              {siswaCount} Siswa Terdaftar
                            </p>
                            <p className="text-xs font-extrabold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-md inline-block">
                              Kode Kelas: {activeKelas.kode_kelas}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              console.log("Tombol Edit diklik untuk:", activeKelas);
                              if (activeKelas) bukaModalEdit(activeKelas);
                            }}
                            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-800 text-xs font-black transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                            title="Edit Nama Kelas"
                          >
                            <span>✏️</span>
                            <span className="hidden sm:inline">Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              console.log("Tombol Hapus diklik untuk:", activeKelas);
                              if (activeKelas) bukaModalHapus(activeKelas);
                            }}
                            className="p-2 sm:px-3 sm:py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-black transition flex items-center gap-1 shadow-2xs cursor-pointer active:scale-95"
                            title="Hapus Kelas"
                          >
                            <span>🗑️</span>
                            <span className="hidden sm:inline">Hapus</span>
                          </button>
                          <Link
                            href="/dashboard/kelas"
                            className="rounded-xl border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-black px-3.5 py-2 transition"
                          >
                            Kelola Siswa →
                          </Link>
                        </div>
                      </div>

                      {/* Tombol Cepat Tambah Materi untuk Kelas Ini */}
                      <button
                        onClick={() => setActiveMenu("materi")}
                        className="w-full rounded-2xl bg-amber-400 hover:bg-amber-500 active:scale-98 py-3.5 px-6 text-sm font-black text-slate-900 shadow-md shadow-amber-300/40 flex items-center justify-center gap-2 transition"
                      >
                        <span>+</span>
                        <span>Tambah Materi untuk {activeKelas.nama_kelas}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Section: Materi Pembelajaran Kelas Aktif */}
            {activeKelas && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-black text-slate-900">
                    Materi {activeKelas.nama_kelas}
                  </h2>
                  <span className="text-xs font-bold text-slate-400">
                    {materiList.length} Materi
                  </span>
                </div>

                {loadingMateri ? (
                  <div className="rounded-3xl border border-slate-100 bg-white p-6 text-center text-xs font-bold text-slate-400 animate-pulse">
                    Memuat materi {activeKelas.nama_kelas}...
                  </div>
                ) : materiList.length === 0 ? (
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-white p-6 text-center space-y-2">
                    <span className="text-3xl block">📖</span>
                    <p className="text-xs font-bold text-slate-600">
                      Belum ada materi untuk {activeKelas.nama_kelas}.
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Foto buku materi pelajaran untuk membuat soal kuis secara otomatis.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {materiList.map((m) => (
                      <div
                        key={m._id}
                        className="rounded-3xl border-2 border-sky-100 bg-white p-4 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-1">
                          <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
                            {m.mataPelajaran}
                          </span>
                          <h4 className="font-black text-sm text-slate-900 line-clamp-2">
                            {m.namaMateri}
                          </h4>
                          {m.halaman && (
                            <p className="text-[11px] text-slate-400">{m.halaman}</p>
                          )}
                        </div>

                        <Link
                          href={`/dashboard/kuis/${m._id}`}
                          className="w-full text-center rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs py-2 transition"
                        >
                          Kelola Soal & Buka Kuis →
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Bottom Graphic: Books & Kid */}
            <div className="pt-6 flex items-end justify-between border-t border-slate-100">
              <div className="flex items-center gap-3">
                <div className="text-4xl">📚</div>
                <div className="text-xs font-bold text-slate-500">
                  <p className="text-slate-800 font-black">Data Materi & Siswa Terisolasi</p>
                  <p>Materi dan soal terhubung langsung ke kelas yang dipilih.</p>
                </div>
              </div>

              <div className="shrink-0 -mb-2">
                <span className="text-6xl inline-block">👧</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Upload/Foto Materi */}
        {activeMenu === "materi" && (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveMenu("dashboard")}
                className="h-10 w-10 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 font-black shadow-sm transition active:scale-95"
              >
                ←
              </button>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
                Tambah Materi
              </h1>
            </div>
            <UploadMateriSection
              guruEmail={guru.email}
              kelasList={kelasList}
              defaultKelasId={selectedKelasId}
              onMateriUploaded={(newId) => {
                if (selectedKelasId) {
                  loadMateriKelas(selectedKelasId);
                }
              }}
            />
          </div>
        )}

        {/* Tab Riwayat / Hasil */}
        {activeMenu === "hasil" && (
          <div className="space-y-4">
            <button
              onClick={() => setActiveMenu("dashboard")}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1.5"
            >
              ← Kembali ke Dashboard
            </button>

            <div className="rounded-3xl border-2 border-sky-100 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h2 className="text-lg font-black text-slate-900">
                  Hasil & Rekap Nilai Siswa
                </h2>
                {activeKelas && (
                  <span className="text-xs font-bold text-purple-700 bg-purple-50 px-2.5 py-1 rounded-md">
                    Filter: {activeKelas.nama_kelas}
                  </span>
                )}
              </div>

              <div className="divide-y divide-slate-100">
                {sesiList.length === 0 ? (
                  <p className="text-xs text-slate-400 py-4">
                    Belum ada sesi kuis yang dibuat untuk kelas ini.
                  </p>
                ) : (
                  sesiList.map((s) => (
                    <div key={s._id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-bold text-sm text-slate-900">{s.judul_kuis}</p>
                        <p className="text-xs text-slate-400">Kode Sesi: {s.kode_unik}</p>
                      </div>
                      <Link
                        href={`/dashboard/sesi/${s.kode_unik}`}
                        className="rounded-xl bg-purple-600 text-white font-bold text-xs px-3.5 py-2 hover:bg-purple-700 transition"
                      >
                        Lihat Rekap Nilai →
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* ── Modal Edit Nama Kelas (Root Level, Z-Index 9999) ── */}
      {showEditModal && kelasTargetEdit && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-[32px] p-6 space-y-4 shadow-2xl border-2 border-sky-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <h3 className="text-lg font-black text-slate-900">Edit Nama Kelas</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setKelasTargetEdit(null);
                }}
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
                Kode kelas ({kelasTargetEdit.kode_kelas}), materi, dan siswa tidak akan berubah.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setKelasTargetEdit(null);
                }}
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

      {/* ── Modal Konfirmasi Hapus Kelas (Root Level, Z-Index 9999) ── */}
      {showDeleteModal && kelasTargetHapus && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md bg-white rounded-[32px] p-6 space-y-4 shadow-2xl border-2 border-red-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-lg font-bold">
                  🗑️
                </div>
                <h3 className="text-lg font-black text-slate-900">Hapus Kelas</h3>
              </div>
              <button
                type="button"
                onClick={batalHapus}
                className="text-slate-400 hover:text-slate-600 font-bold p-1 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 space-y-2">
              <p className="text-xs font-bold text-amber-900">
                Apakah Anda yakin ingin menghapus kelas <span className="font-black underline">{kelasTargetHapus.nama_kelas}</span>?
              </p>
              {loadingCounts ? (
                <p className="text-[11px] text-amber-700 animate-pulse font-medium">
                  Memeriksa data terkait kelas ini...
                </p>
              ) : (
                <div className="space-y-1 text-xs text-amber-800">
                  <p className="font-bold">Data terkait di kelas ini:</p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    <li><span className="font-bold">{deleteCounts?.siswa ?? (siswaPerKelas[kelasTargetHapus._id] ?? 0)}</span> Siswa terdaftar</li>
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
                Kelas akan dinonaktifkan dari dashboard dan siswa tidak akan bisa bergabung lagi. Riwayat nilai siswa tetap disimpan secara aman.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={batalHapus}
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
  );
}
