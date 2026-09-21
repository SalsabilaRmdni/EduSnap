"use client";

import { useState } from "react";

export default function UploadMateriSection({ guruEmail }: { guruEmail: string }) {
  const [namaMateri, setNamaMateri] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [materiId, setMateriId] = useState<string | null>(null);

  const [ocrStatus, setOcrStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [teksHasilOCR, setTeksHasilOCR] = useState("");

  const handleUpload = async () => {
    if (!file || !namaMateri) return;
    setStatus("loading");

    const formData = new FormData();
    formData.append("gambar", file);
    formData.append("namaMateri", namaMateri);
    formData.append("guruEmail", guruEmail);

    const res = await fetch("/api/materi/upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const data = await res.json();
      setMateriId(data.id);
      setStatus("success");
      setNamaMateri("");
      setFile(null);
    } else {
      setStatus("error");
    }
  };

  const handleOCR = async () => {
    if (!materiId) return;
    setOcrStatus("loading");

    const res = await fetch("/api/materi/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materiId }),
    });

    if (res.ok) {
      const data = await res.json();
      setTeksHasilOCR(data.teks);
      setOcrStatus("done");
    } else {
      setOcrStatus("error");
    }
  };

  return (
    <div className="mt-8 w-full max-w-md rounded-md border border-gray-200 p-6 text-left space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">Upload Materi</h2>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Nama Materi</label>
        <input
          type="text"
          value={namaMateri}
          onChange={(e) => setNamaMateri(e.target.value)}
          placeholder="Misal: Bab 3 - Fotosintesis"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">Foto Materi</label>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm"
        />
      </div>

      <button
        onClick={handleUpload}
        disabled={status === "loading" || !file || !namaMateri}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition disabled:opacity-50"
      >
        {status === "loading" ? "Mengupload..." : "Upload"}
      </button>

      {status === "error" && (
        <p className="text-sm text-red-600">Gagal upload, coba lagi.</p>
      )}

      {status === "success" && materiId && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-sm text-green-600">Materi berhasil diupload!</p>

          <button
            onClick={handleOCR}
            disabled={ocrStatus === "loading"}
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            {ocrStatus === "loading" ? "Membaca teks foto..." : "Ekstrak Teks (OCR)"}
          </button>

          {ocrStatus === "done" && (
            <div className="rounded-md bg-gray-50 p-3 text-sm text-gray-700 max-h-40 overflow-y-auto whitespace-pre-wrap">
              {teksHasilOCR || "(Tidak ada teks terbaca dari foto ini)"}
            </div>
          )}
          {ocrStatus === "error" && (
            <p className="text-sm text-red-600">Gagal ekstrak teks, coba lagi.</p>
          )}

          <a
            href={`/dashboard/kuis/${materiId}`}
            className="block text-sm underline font-medium text-indigo-600"
          >
            Lihat kuis →
          </a>
        </div>
      )}
    </div>
  );
}