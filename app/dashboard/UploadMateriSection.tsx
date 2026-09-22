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
    <div className="w-full max-w-3xl rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header & Stepper */}
      <div className="space-y-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Upload & Foto Materi Buku Pelajaran SD
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Foto halaman materi buku SD menggunakan kamera HP atau galeri. Sistem akan mengekstrak teks (OCR) dan AI membuat soal pilihan ganda.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
          <span className={`px-3 py-1.5 rounded-xl flex items-center gap-2 ${
            status !== "success" ? "bg-indigo-600 text-white shadow-sm" : "bg-emerald-100 text-emerald-800"
          }`}>
            <span>1</span>
            <span>Unggah / Foto</span>
            {status === "success" && <span>✓</span>}
          </span>
          <span className="text-slate-300">→</span>
          <span className={`px-3 py-1.5 rounded-xl flex items-center gap-2 ${
            status === "success" && ocrStatus !== "done"
              ? "bg-indigo-600 text-white shadow-sm"
              : ocrStatus === "done"
              ? "bg-emerald-100 text-emerald-800"
              : "bg-slate-100 text-slate-400"
          }`}>
            <span>2</span>
            <span>Ekstrak Teks OCR</span>
            {ocrStatus === "done" && <span>✓</span>}
          </span>
          <span className="text-slate-300">→</span>
          <span className={`px-3 py-1.5 rounded-xl flex items-center gap-2 ${
            ocrStatus === "done" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 text-slate-400"
          }`}>
            <span>3</span>
            <span>Generate Soal AI</span>
          </span>
        </div>
      </div>

      {/* Form Details */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Judul / Bab Materi <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={namaMateri}
            onChange={(e) => setNamaMateri(e.target.value)}
            placeholder="Contoh: Fotosintesis & Bagian Tumbuhan"
            disabled={status === "success"}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 transition"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Mata Pelajaran <span className="text-red-500">*</span>
          </label>
          <select
            value={mataPelajaran}
            onChange={(e) => setMataPelajaran(e.target.value)}
            disabled={status === "success"}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-indigo-600 focus:outline-none disabled:bg-slate-50 transition"
          >
            {MAPEL_OPTIONS.map((mapel) => (
              <option key={mapel} value={mapel}>
                {mapel}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Tingkat Kelas SD <span className="text-red-500">*</span>
          </label>
          <select
            value={kelas}
            onChange={(e) => setKelas(e.target.value)}
            disabled={status === "success"}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:border-indigo-600 focus:outline-none disabled:bg-slate-50 transition"
          >
            {KELAS_OPTIONS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Halaman Buku Pelajaran (Opsional)
          </label>
          <input
            type="text"
            value={halaman}
            onChange={(e) => setHalaman(e.target.value)}
            placeholder="Contoh: Hal. 24 - 26"
            disabled={status === "success"}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-4 focus:ring-indigo-100 disabled:bg-slate-50 transition"
          />
        </div>

        {/* Foto Picker Section */}
        <div className="space-y-2 sm:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Foto Halaman Materi <span className="text-red-500">*</span>
          </label>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {!previewUrl ? (
            <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 sm:p-8 text-center bg-slate-50/60 hover:bg-slate-50 transition space-y-4">
              <span className="text-4xl block">📷</span>
              <div className="space-y-1 max-w-sm mx-auto">
                <p className="text-sm font-bold text-slate-900">
                  Ambil Foto Buku atau Unggah File
                </p>
                <p className="text-xs text-slate-500">
                  Pastikan foto halaman buku terlihat jelas dan pencahayaannya cukup agar teks mudah terbaca.
                </p>
              </div>

              <div className="flex flex-wrap justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(true)}
                  disabled={status === "success" || compressing}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
                >
                  <span>📷</span>
                  <span>Buka Kamera HP</span>
                </button>

                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  disabled={status === "success" || compressing}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 active:scale-95 px-5 py-3 text-xs sm:text-sm font-bold text-slate-700 transition disabled:opacity-50"
                >
                  <span>🖼️</span>
                  <span>Pilih dari Galeri</span>
                </button>
              </div>

              {compressing && (
                <p className="text-xs text-slate-400 animate-pulse pt-2">
                  Memproses dan mengoptimalkan ukuran foto...
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row items-center gap-4">
              <div className="relative w-36 h-36 rounded-xl border border-slate-200 overflow-hidden bg-white shrink-0 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Preview Foto Materi" className="w-full h-full object-cover" />
              </div>

              <div className="space-y-2 text-center sm:text-left">
                <p className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md inline-block">
                  ✓ Foto siap diunggah
                </p>
                <p className="text-xs text-slate-500">
                  Foto berhasil diambil. Jika kurang jelas, Anda dapat mengambil ulang foto buku materi.
                </p>
                {status !== "success" && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline block"
                  >
                    🗑️ Hapus dan ambil ulang foto
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Step 1 Submit Button */}
      {status !== "success" ? (
        <div className="pt-2">
          <button
            onClick={handleUpload}
            disabled={status === "loading" || !file || !namaMateri.trim() || compressing}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-7 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50"
          >
            {status === "loading" ? (
              <span className="flex items-center gap-2">
                <span className="inline-block animate-spin">⏳</span>
                <span>Mengunggah Foto Materi...</span>
              </span>
            ) : (
              "Lanjut ke Ekstrak Teks (OCR) →"
            )}
          </button>

          {status === "error" && (
            <p className="mt-2 text-xs text-red-600 font-semibold">
              Gagal mengunggah materi. Pastikan file valid dan coba kembali.
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
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 active:scale-95 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md transition disabled:opacity-50"
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
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 px-6 py-3.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition"
              >
                <span>Lihat & Buat Soal Kuis AI</span>
                <span>→</span>
              </a>
            )}
          </div>

          {ocrStatus === "error" && (
            <p className="text-xs text-red-600 font-semibold">
              Gagal membaca teks dari foto. Silakan klik ekstrak kembali.
            </p>
          )}

          {ocrStatus === "done" && (
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Hasil Ekstraksi Teks (OCR):
              </label>
              <div className="rounded-2xl bg-slate-50 p-4 text-xs text-slate-700 max-h-52 overflow-y-auto whitespace-pre-wrap font-mono border border-slate-200">
                {teksHasilOCR || "(Tidak ada teks yang terdeteksi. Namun Anda tetap dapat membuat soal.)"}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Camera Modal */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCaptureCamera}
      />
    </div>
  );
}
