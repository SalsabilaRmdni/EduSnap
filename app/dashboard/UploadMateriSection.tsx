"use client";

import { useState, useRef } from "react";

const MAPEL_OPTIONS = [
  "IPAS (Ilmu Pengetahuan Alam & Sosial)",
  "Bahasa Indonesia",
  "Matematika",
  "Pendidikan Pancasila / PKn",
  "Bahasa Inggris",
  "Pendidikan Agama",
  "Seni Budaya & Prakarya (SBdP)",
  "PJOK",
  "Lainnya",
];

const KELAS_OPTIONS = [
  "Kelas 1 SD",
  "Kelas 2 SD",
  "Kelas 3 SD",
  "Kelas 4 SD",
  "Kelas 5 SD",
  "Kelas 6 SD",
];

export default function UploadMateriSection({ guruEmail }: { guruEmail: string }) {
  const [namaMateri, setNamaMateri] = useState("");
  const [mataPelajaran, setMataPelajaran] = useState(MAPEL_OPTIONS[0]);
  const [kelas, setKelas] = useState("Kelas 4 SD");
  const [halaman, setHalaman] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [materiId, setMateriId] = useState<string | null>(null);

  const [ocrStatus, setOcrStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [teksHasilOCR, setTeksHasilOCR] = useState("");

  // dua input file tersembunyi: satu buka kamera langsung, satu buka galeri
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    if (selectedFile) {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleRemovePhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (!file || !namaMateri.trim()) return;
    setStatus("loading");

    const formData = new FormData();
    formData.append("gambar", file);
    formData.append("namaMateri", namaMateri.trim());
    formData.append("mataPelajaran", mataPelajaran);
    formData.append("kelas", kelas);
    formData.append("halaman", halaman.trim());
    formData.append("guruEmail", guruEmail);

    try {
      const res = await fetch("/api/materi/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        setMateriId(data.id);
        setStatus("success");
      } else {
        setStatus("error");
      }
    } catch {
      setStatus("error");
    }
  };

  const handleOCR = async () => {
    if (!materiId) return;
    setOcrStatus("loading");

    try {
      const res = await fetch("/api/materi/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materiId }),
      });

      if (res.ok) {
        const data = await res.json();
        setTeksHasilOCR(data.teks || "");
        setOcrStatus("done");
      } else {
        setOcrStatus("error");
      }
    } catch {
      setOcrStatus("error");
    }
  };

  return (
    <div className="w-full max-w-xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-left space-y-5">
      <div className="border-b border-gray-100 pb-3">
        <h2 className="text-lg font-bold text-gray-900">📖 Upload Materi Buku Pelajaran SD</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Foto halaman materi buku SD, sistem akan mengekstrak teks (OCR) dan AI membuatkan soal sesuai konteks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Judul / Bab Materi <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={namaMateri}
            onChange={(e) => setNamaMateri(e.target.value)}
            placeholder="Contoh: Fotosintesis pada Tumbuhan"
            disabled={status === "success"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Mata Pelajaran <span className="text-red-500">*</span>
          </label>
          <select
            value={mataPelajaran}
            onChange={(e) => setMataPelajaran(e.target.value)}
            disabled={status === "success"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
          >
            {MAPEL_OPTIONS.map((mapel) => (
              <option key={mapel} value={mapel}>
                {mapel}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Tingkat Kelas SD <span className="text-red-500">*</span>
          </label>
          <select
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            disabled={status === "success"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
          >
            {KELAS_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Halaman Buku (Opsional)
          </label>
          <input
            type="text"
            value={halaman}
            onChange={(e) => setHalaman(e.target.value)}
            placeholder="Contoh: Hal. 24 - 26"
            disabled={status === "success"}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:bg-gray-50"
          />
        </div>

        <div className="space-y-1.5 md:col-span-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Foto Materi Buku <span className="text-red-500">*</span>
          </label>

          {/* input tersembunyi: kamera langsung */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          {/* input tersembunyi: pilih dari galeri/dokumen */}
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!previewUrl ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={status === "success"}
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition disabled:opacity-50"
              >
                📷 Ambil Foto
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={status === "success"}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
              >
                🖼️ Pilih dari Galeri
              </button>
            </div>
          ) : (
            <div className="mt-2 flex items-start gap-3">
              <div className="relative w-32 h-32 rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview Materi" className="w-full h-full object-cover" />
              </div>
              {status !== "success" && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Hapus foto, ambil ulang
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {status !== "success" ? (
        <div>
          <button
            onClick={handleUpload}
            disabled={status === "loading" || !file || !namaMateri.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {status === "loading" ? "Mengunggah materi..." : "📤 Unggah Foto Materi"}
          </button>

          {status === "error" && (
            <p className="mt-2 text-sm text-red-600">Gagal mengupload materi. Pastikan file valid dan coba lagi.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4 border-t border-gray-100 pt-4">
          <div className="flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg text-sm font-medium">
            <span>✅</span>
            <span>Foto materi berhasil diunggah! Langkah berikutnya: ekstrak teks (OCR).</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleOCR}
              disabled={ocrStatus === "loading" || ocrStatus === "done"}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition disabled:opacity-50"
            >
              {ocrStatus === "loading" ? (
                <>
                  <span className="inline-block animate-spin">⏳</span>
                  <span>Membaca teks dari foto (OCR)...</span>
                </>
              ) : ocrStatus === "done" ? (
                "✅ Teks Berhasil Diekstrak"
              ) : (
                "🔍 Ekstrak Teks (OCR)"
              )}
            </button>

            {ocrStatus === "done" && (
              <a
                href={`/dashboard/kuis/${materiId}`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition shadow-sm"
              >
                <span>Lihat & Buat Soal Kuis</span>
                <span>→</span>
              </a>
            )}
          </div>

          {ocrStatus === "error" && (
            <p className="text-sm text-red-600">Gagal mengekstrak teks dari foto. Silakan klik ekstrak kembali.</p>
          )}

          {ocrStatus === "done" && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Hasil Ekstraksi Teks (OCR):
              </label>
              <div className="rounded-lg bg-gray-50 p-3.5 text-xs text-gray-700 max-h-48 overflow-y-auto whitespace-pre-wrap font-mono border border-gray-200">
                {teksHasilOCR || "(Tidak ada teks yang terdeteksi dari foto)"}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
