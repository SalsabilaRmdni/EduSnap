"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import SchoolIllustration from "@/components/SchoolIllustration";

const PILIHAN_KELAS_DEFAULT = [
  "Kelas 4A",
  "Kelas 4B",
  "Kelas 5A",
  "Kelas 1 SD",
  "Kelas 2 SD",
  "Kelas 3 SD",
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

  const [namaKelasAktif, setNamaKelasAktif] = useState(PILIHAN_KELAS_DEFAULT[0]);
  const [kelasAktif, setKelasAktif] = useState<Kelas | null>(null);
  const [daftarSiswa, setDaftarSiswa] = useState<Siswa[]>([]);
  const [namaSiswaBaru, setNamaSiswaBaru] = useState("");
  const [loadingSiswa, setLoadingSiswa] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  const requestIdRef = useRef(0);

  const pilihKelas = useCallback(async (namaKelas: string) => {
    if (!guruId) return;

    const myRequestId = ++requestIdRef.current;
    setErrorMsg(null);
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
          setErrorMsg("Gagal mengambil data guru. Coba login ulang.");
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
        {/* Header: ← Kelas 4A (Mengikuti Gambar Referensi) */}
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="h-10 w-10 rounded-2xl bg-white border-2 border-sky-100 flex items-center justify-center text-slate-700 font-bold hover:bg-slate-50 transition shadow-xs"
          >
            ←
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {kelasAktif?.nama_kelas || "Kelas 4A"}
          </h1>
        </div>

        {errorMsg && (
          <div className="rounded-2xl bg-red-50 p-3 text-xs text-red-600 border border-red-200 font-bold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Card Informasi Kelas (Mengikuti Gambar Referensi) */}
        <div className="rounded-[32px] border-2 border-sky-100 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-4">
            {/* School Graphic */}
            <div className="h-14 w-14 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-center text-3xl shrink-0 shadow-xs">
              🏫
            </div>

            <div className="space-y-0.5 flex-1">
              <h2 className="text-lg font-black text-slate-900">
                {kelasAktif?.nama_kelas || "Kelas 4A"}
              </h2>
              <p className="text-xs font-bold text-slate-400">
                {daftarSiswa.length} Siswa
              </p>
              <p className="text-[11px] font-extrabold text-slate-400">
                Kode Kelas
              </p>
            </div>
          </div>

          {/* Kode Kelas & Tombol Salin */}
          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
            <span className="text-2xl font-black font-mono tracking-widest text-slate-900">
              {kelasAktif?.kode_kelas || "4A-X7K9"}
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

        {/* Section: Daftar Siswa */}
        <div className="space-y-3 pt-2">
          <h2 className="text-base font-black text-slate-900">
            Daftar Siswa
          </h2>

          {loadingSiswa ? (
            <div className="p-8 text-center text-xs text-slate-400">Memuat siswa...</div>
          ) : daftarSiswa.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-sky-100 bg-white p-8 text-center space-y-1">
              <p className="text-sm font-bold text-slate-700">Belum ada siswa di kelas ini</p>
              <p className="text-xs text-slate-400">Klik tombol di bawah untuk menambahkan siswa.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {daftarSiswa.map((siswa, idx) => {
                const avatarIcon = idx % 2 === 0 ? "👦" : "👧";
                return (
                  <div
                    key={siswa._id}
                    className="rounded-2xl border-2 border-sky-100 bg-white p-3.5 flex items-center justify-between shadow-xs hover:border-sky-300 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-amber-100 flex items-center justify-center text-lg">
                        {avatarIcon}
                      </div>
                      <span className="text-sm font-bold text-slate-900">
                        {siswa.nama}
                      </span>
                    </div>

                    <span className="text-slate-300 font-bold text-lg">
                      ›
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Button: + Tambah Siswa (Mengikuti Gambar Referensi) */}
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

        {/* Modal Tambah Siswa */}
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
