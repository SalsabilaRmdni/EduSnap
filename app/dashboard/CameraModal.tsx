"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export default function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  const stopTracks = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  const startCamera = useCallback(async (mode: "environment" | "user") => {
    stopTracks();
    setErrorMsg("");

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMsg("Browser kamu belum mendukung akses kamera langsung. Gunakan opsi upload file.");
        return;
      }

      // Cek jumlah kamera
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter((d) => d.kind === "videoinput");
        setHasMultipleCameras(videoDevices.length > 1);
      } catch {
        // Abaikan jika enumerateDevices gagal
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMsg(
        "Tidak dapat mengakses kamera. Pastikan kamu telah mengizinkan akses kamera pada browser atau gunakan tombol kamera bawaan HP."
      );
    }
  }, [stopTracks]);

  useEffect(() => {
    if (isOpen) {
      startCamera(facingMode);
    } else {
      stopTracks();
      setCapturedUrl(null);
      setCapturedBlob(null);
      setErrorMsg("");
    }
    return () => {
      stopTracks();
    };
  }, [isOpen, facingMode, startCamera, stopTracks]);

  const handleSwitchCamera = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
  };

  const handleSnap = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          setCapturedBlob(blob);
          setCapturedUrl(url);
        }
      },
      "image/jpeg",
      0.92
    );
  };

  const handleRetake = () => {
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedUrl(null);
    setCapturedBlob(null);
  };

  const handleConfirm = () => {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], "buku_materi_foto.jpg", {
      type: "image/jpeg",
    });
    onCapture(file);
    handleClose();
  };

  const handleClose = () => {
    stopTracks();
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
    }
    setCapturedUrl(null);
    setCapturedBlob(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl bg-gray-900 border border-gray-800 text-white overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-gray-900/90">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <h3 className="font-bold text-sm sm:text-base">Kamera Materi Buku SD</h3>
          </div>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition text-sm"
          >
            ✕
          </button>
        </div>

        {/* Viewfinder / Area Kamera */}
        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px] sm:min-h-[400px]">
          {errorMsg ? (
            <div className="p-6 text-center space-y-3 max-w-sm">
              <span className="text-4xl">⚠️</span>
              <p className="text-sm text-red-400 font-medium">{errorMsg}</p>
              <button
                onClick={handleClose}
                className="rounded-xl bg-gray-800 px-4 py-2 text-xs font-semibold text-white hover:bg-gray-700"
              >
                Tutup & Gunakan Upload File
              </button>
            </div>
          ) : capturedUrl ? (
            /* Tampilan Preview Foto yang sudah dijepret */
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedUrl}
                alt="Hasil Foto"
                className="max-h-[60vh] w-auto max-w-full object-contain"
              />
              <div className="absolute top-3 left-3 bg-emerald-600/90 text-white text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm">
                ✅ Foto Siap Digunakan
              </div>
            </div>
          ) : (
            /* Tampilan Live Video Stream dari Kamera */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="max-h-[60vh] w-full object-cover"
              />

              {/* Bingkai Panduan Dokumen Buku */}
              <div className="absolute inset-8 sm:inset-12 border-2 border-dashed border-white/60 rounded-xl pointer-events-none flex flex-col items-center justify-between p-3">
                <span className="bg-black/50 text-white text-[11px] font-medium px-2.5 py-1 rounded-md backdrop-blur-sm">
                  Arahkan kamera ke halaman buku materi
                </span>
                <span className="bg-black/50 text-white/80 text-[10px] px-2 py-0.5 rounded backdrop-blur-sm">
                  Pastikan teks terlihat jelas & tidak buram
                </span>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Footer / Tombol Kontrol */}
        <div className="p-4 bg-gray-900 border-t border-gray-800 flex items-center justify-between gap-3">
          {capturedUrl ? (
            <>
              <button
                onClick={handleRetake}
                className="flex-1 rounded-xl border border-gray-700 bg-gray-800 py-3 text-sm font-semibold text-white hover:bg-gray-700 active:scale-95 transition"
              >
                🔄 Ambil Ulang
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 active:scale-95 transition"
              >
                ✅ Gunakan Foto Ini
              </button>
            </>
          ) : (
            <>
              <div className="w-10">
                {hasMultipleCameras && (
                  <button
                    type="button"
                    onClick={handleSwitchCamera}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 transition text-sm"
                    title="Putar Kamera Depan / Belakang"
                  >
                    🔄
                  </button>
                )}
              </div>

              {/* Tombol Shutter Besar */}
              <button
                type="button"
                onClick={handleSnap}
                disabled={Boolean(errorMsg)}
                className="flex items-center justify-center gap-2 h-14 w-14 sm:h-16 sm:w-16 rounded-full bg-white text-gray-900 shadow-xl border-4 border-indigo-500 hover:scale-105 active:scale-95 transition disabled:opacity-50 mx-auto"
                title="Jepret Foto"
              >
                <span className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-indigo-600 flex items-center justify-center text-white text-lg sm:text-xl">
                  📸
                </span>
              </button>

              <div className="w-10 flex justify-end">
                <button
                  type="button"
                  onClick={handleClose}
                  className="text-xs text-gray-400 hover:text-white"
                >
                  Batal
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
