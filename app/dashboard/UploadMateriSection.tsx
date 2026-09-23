"use client";

import { useState, useRef } from "react";
import CameraModal from "./CameraModal";

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

// Kompres foto sebelum diupload agar responsif dan OCR cepat
async function compressImage(file: File, maxWidth = 1400, quality = 0.75): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject(new Error("Gagal kompres gambar"));
          resolve(new File([blob], file.name, { type: "image/jpeg" }));
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = reject;
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadMateriSection({ guruEmail }: { guruEmail: string }) {
  const [namaMateri, setNamaMateri] = useState("");
  const [mataPelajaran, setMataPelajaran] = useState(MAPEL_OPTIONS[0]);
  const [kelas, setKelas] = useState("Kelas 4 SD");
  const [halaman, setHalaman] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [materiId, setMateriId] = useState<string | null>(null);
  const [compressing, setCompressing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const [ocrStatus, setOcrStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [teksHasilOCR, setTeksHasilOCR] = useState("");

  const galleryInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] ?? null;
    if (!selectedFile) return;

    setCompressing(true);
    try {
      const compressed = await compressImage(selectedFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    } finally {
      setCompressing(false);
    }
  };

  const handleCaptureCamera = async (capturedFile: File) => {
    setIsCameraOpen(false);
    setCompressing(true);
    try {
      const compressed = await compressImage(capturedFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(capturedFile);
      setPreviewUrl(URL.createObjectURL(capturedFile));
    } finally {
      setCompressing(false);
    }
  };

  const handleRemovePhoto = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
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
    <div className="w-full max-w-4xl space-y-6">
      {/* Hidden file input */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Screen 8: 2 Big Colorful Cards (Foto Materi & Upload Materi) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* Card 1: 📷 Foto Materi (Pastel Sky Blue) */}
        <button
          type="button"
          onClick={() => setIsCameraOpen(true)}
          disabled={status === "success" || compressing}
          className="group relative text-left rounded-3xl border-3 border-sky-200 bg-gradient-to-br from-sky-50 via-sky-100/50 to-white p-7 sm:p-8 shadow-md hover:shadow-xl hover:border-sky-400 hover:-translate-y-1 active:scale-[0.98] transition-all flex flex-col items-center sm:items-start text-center sm:text-left disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <div className="h-20 w-20 rounded-3xl bg-sky-500 text-white flex items-center justify-center text-4xl shadow-lg shadow-sky-300 group-hover:scale-105 transition-transform mb-5">
            <svg
              className="w-10 h-10 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M4 4h3l2-2h6l2 2h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm8 14a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-2a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
            </svg>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-sky-950 mb-1.5">
            Foto Materi
          </h3>
          <p className="text-xs sm:text-sm text-sky-800/80 font-semibold leading-relaxed">
            Ambil foto halaman buku menggunakan kamera HP atau laptop secara langsung.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-sky-600 bg-sky-200/70 px-3.5 py-1.5 rounded-full">
            <span>📷 Buka Kamera</span>
            <span>→</span>
          </span>
        </button>

        {/* Card 2: 🖼️ Upload Materi (Pastel Lavender/Purple) */}
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={status === "success" || compressing}
          className="group relative text-left rounded-3xl border-3 border-purple-200 bg-gradient-to-br from-purple-50 via-purple-100/50 to-white p-7 sm:p-8 shadow-md hover:shadow-xl hover:border-purple-400 hover:-translate-y-1 active:scale-[0.98] transition-all flex flex-col items-center sm:items-start text-center sm:text-left disabled:opacity-60 disabled:hover:translate-y-0"
        >
          <div className="h-20 w-20 rounded-3xl bg-purple-500 text-white flex items-center justify-center text-4xl shadow-lg shadow-purple-300 group-hover:scale-105 transition-transform mb-5">
            <svg
              className="w-10 h-10 fill-current"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M21 19V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-purple-950 mb-1.5">
            Upload Materi
          </h3>
          <p className="text-xs sm:text-sm text-purple-800/80 font-semibold leading-relaxed">
            Pilih dan unggah gambar materi buku dari galeri perangkat Anda.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-purple-600 bg-purple-200/70 px-3.5 py-1.5 rounded-full">
            <span>🖼️ Pilih dari Galeri</span>
            <span>→</span>
          </span>
        </button>
      </div>

      {/* Selected Photo Card & Details Form */}
      <div className="rounded-3xl border-2 border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6 relative overflow-hidden">
        {/* Decorative stationery stickers at corner */}
        <div className="absolute right-4 bottom-2 text-3xl opacity-20 pointer-events-none select-none">
          ✏️ 📐 📏
        </div>

        {/* Header & Stepper */}
        <div className="space-y-4 border-b border-slate-100 pb-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900">
                Informasi & Detail Materi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lengkapi informasi bab materi agar AI dapat menyusun soal kuis yang tepat.
              </p>
            </div>
            {compressing && (
              <span className="text-xs font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 animate-pulse">
                ⚡ Memproses gambar...
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
            <span
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
                status !== "success"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              <span>1</span>
              <span>Foto / Unggah</span>
              {status === "success" && <span>✓</span>}
            </span>
            <span className="text-slate-300">→</span>
            <span
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
                status === "success" && ocrStatus !== "done"
                  ? "bg-purple-600 text-white shadow-sm"
                  : ocrStatus === "done"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <span>2</span>
              <span>Ekstrak OCR</span>
              {ocrStatus === "done" && <span>✓</span>}
            </span>
            <span className="text-slate-300">→</span>
            <span
              className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 ${
                ocrStatus === "done"
                  ? "bg-purple-600 text-white shadow-sm"
                  : "bg-slate-100 text-slate-400"
              }`}
            >
              <span>3</span>
              <span>Generate Soal AI</span>
            </span>
          </div>
        </div>

        {/* Photo Preview if Selected */}
        {previewUrl ? (
          <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50/50 p-4 flex flex-col sm:flex-row items-center gap-4">
            <div className="relative w-32 h-32 rounded-xl border border-emerald-200 overflow-hidden bg-white shrink-0 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Preview Foto Materi"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="space-y-2 text-center sm:text-left flex-1">
              <span className="text-xs font-black text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full inline-flex items-center gap-1">
                <span>✅</span>
                <span>Foto Materi Terpilih</span>
              </span>
              <p className="text-xs text-slate-600 font-medium">
                Foto siap diproses OCR. Pastikan tulisan pada materi buku tampak terbaca dengan jelas.
              </p>
              {status !== "success" && (
                <div className="flex flex-wrap gap-3 pt-1 justify-center sm:justify-start">
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1"
                  >
                    <span>🗑️</span>
                    <span>Ganti / Hapus Foto</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-5 text-center text-xs text-slate-500 font-medium">
            💡 Pilih salah satu opsi di atas: <strong>Foto Materi</strong> menggunakan kamera HP atau <strong>Upload Materi</strong> dari galeri.
          </div>
        )}

        {/* Form Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              Judul / Bab Materi <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={namaMateri}
              onChange={(e) => setNamaMateri(e.target.value)}
              placeholder="Contoh: Bab 2 - Struktur Daun dan Fotosintesis"
              disabled={status === "success"}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-100 disabled:bg-slate-50 font-bold transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              Mata Pelajaran <span className="text-red-500">*</span>
            </label>
            <select
              value={mataPelajaran}
              onChange={(e) => setMataPelajaran(e.target.value)}
              disabled={status === "success"}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-xs sm:text-sm text-slate-900 focus:border-purple-600 focus:outline-none disabled:bg-slate-50 font-bold transition"
            >
              {MAPEL_OPTIONS.map((mapel) => (
                <option key={mapel} value={mapel}>
                  {mapel}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              Tingkat Kelas SD <span className="text-red-500">*</span>
            </label>
            <select
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
              disabled={status === "success"}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-xs sm:text-sm text-slate-900 focus:border-purple-600 focus:outline-none disabled:bg-slate-50 font-bold transition"
            >
              {KELAS_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-black uppercase tracking-wider text-slate-700">
              Halaman Buku Pelajaran (Opsional)
            </label>
            <input
              type="text"
              value={halaman}
              onChange={(e) => setHalaman(e.target.value)}
              placeholder="Contoh: Halaman 35 - 38"
              disabled={status === "success"}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:outline-none focus:ring-4 focus:ring-purple-100 disabled:bg-slate-50 font-medium transition"
            />
          </div>
        </div>

        {/* Step 1 Submit Action */}
        {status !== "success" ? (
          <div className="pt-2">
            <button
              onClick={handleUpload}
              disabled={status === "loading" || !file || !namaMateri.trim() || compressing}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-95 px-8 py-3.5 text-sm font-black text-white shadow-lg shadow-purple-600/20 transition disabled:opacity-50"
            >
              {status === "loading" ? (
                <span className="flex items-center gap-2">
                  <span className="inline-block animate-spin">⏳</span>
                  <span>Mengunggah Foto Materi...</span>
                </span>
              ) : (
                "Simpan & Lanjut ke Ekstrak Teks (OCR) →"
              )}
            </button>

            {status === "error" && (
              <p className="mt-2 text-xs text-red-600 font-bold">
                ⚠️ Gagal mengunggah materi. Pastikan file gambar valid dan coba kembali.
              </p>
            )}
          </div>
        ) : (
          /* Step 2 & 3: OCR and AI Generate */
          <div className="space-y-4 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2 text-emerald-800 bg-emerald-50 p-4 rounded-2xl text-xs sm:text-sm font-bold border border-emerald-200">
              <span>✅</span>
              <span>Foto materi berhasil diunggah! Tekan tombol di bawah untuk membaca teks secara otomatis.</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleOCR}
                disabled={ocrStatus === "loading" || ocrStatus === "done"}
                className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 px-6 py-3.5 text-xs sm:text-sm font-black text-white shadow-md transition disabled:opacity-50"
              >
                {ocrStatus === "loading" ? (
                  <>
                    <span className="inline-block animate-spin">⏳</span>
                    <span>Membaca teks dari foto (OCR)...</span>
                  </>
                ) : ocrStatus === "done" ? (
                  "✅ Teks Berhasil Diekstrak"
                ) : (
                  "🔍 Ekstrak Teks Buku Sekarang"
                )}
              </button>

              {ocrStatus === "done" && (
                <a
                  href={`/dashboard/kuis/${materiId}`}
                  className="inline-flex items-center gap-2 rounded-2xl bg-purple-600 hover:bg-purple-700 active:scale-95 px-6 py-3.5 text-xs sm:text-sm font-black text-white shadow-lg shadow-purple-600/20 transition"
                >
                  <span>Lihat & Buat Soal Kuis AI</span>
                  <span>→</span>
                </a>
              )}
            </div>

            {ocrStatus === "error" && (
              <p className="text-xs text-red-600 font-bold">
                ⚠️ Gagal membaca teks dari foto. Silakan klik ekstrak kembali.
              </p>
            )}

            {ocrStatus === "done" && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-black uppercase tracking-wider text-slate-500 block">
                  Hasil Ekstraksi Teks (OCR):
                </label>
                <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 max-h-52 overflow-y-auto whitespace-pre-wrap font-mono border border-slate-200">
                  {teksHasilOCR || "(Tidak ada teks yang terdeteksi. Namun Anda tetap dapat membuat soal.)"}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCaptureCamera}
      />
    </div>
  );
}
