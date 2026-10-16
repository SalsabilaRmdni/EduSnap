"use client";

import { useEffect, useState, useId } from "react";
import { useRouter } from "next/navigation";
import EduSnapLogo from "@/components/EduSnapLogo";

type ReasoningEffort = "none" | "low" | "medium" | "high";

interface AIConfigState {
  provider: string;
  model: string;
  reasoningEffort: ReasoningEffort;
  isActive: boolean;
  updatedAt?: string | null;
}

interface ModelItem {
  id: string;
  name: string;
  provider: string;
  badgeRecommended?: boolean;
  badgeStatus: "Available" | "Limited Access" | "Preview";
  costMultiplier: string;
  iconBg: string;
  iconColor: string;
  iconSymbol: string;
}

// Model OpenRouter yang kompatibel dan terverifikasi untuk EduSnap
const AVAILABLE_MODELS: ModelItem[] = [
  {
    id: "google/gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "by Google",
    badgeRecommended: true,
    badgeStatus: "Available",
    costMultiplier: "0.1x",
    iconBg: "bg-purple-100",
    iconColor: "text-purple-600",
    iconSymbol: "⚡",
  },
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    provider: "by Anthropic",
    badgeRecommended: true,
    badgeStatus: "Available",
    costMultiplier: "0.3x",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    iconSymbol: "🧠",
  },
  {
    id: "openrouter/free",
    name: "OpenRouter Free (Auto Router)",
    provider: "by OpenRouter",
    badgeStatus: "Available",
    costMultiplier: "0.0x",
    iconBg: "bg-sky-100",
    iconColor: "text-sky-600",
    iconSymbol: "🔍",
  },
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    provider: "by OpenAI",
    badgeStatus: "Available",
    costMultiplier: "0.5x",
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-700",
    iconSymbol: "⚙️",
  },
  {
    id: "meta-llama/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B",
    provider: "by Meta",
    badgeStatus: "Available",
    costMultiplier: "0.5x",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-700",
    iconSymbol: "🦙",
  },
  {
    id: "google/gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "by Google",
    badgeStatus: "Limited Access",
    costMultiplier: "1x",
    iconBg: "bg-fuchsia-100",
    iconColor: "text-fuchsia-700",
    iconSymbol: "✨",
  },
];

const REASONING_OPTIONS: {
  value: ReasoningEffort;
  title: string;
  badge?: string;
  description: string;
}[] = [
  {
    value: "none",
    title: "None",
    description: "Penalaran dasar, waktu respon paling cepat.",
  },
  {
    value: "low",
    title: "Low",
    description: "Penalaran ringan untuk soal sederhana.",
  },
  {
    value: "medium",
    title: "Medium",
    badge: "Rekomendasi",
    description: "Keseimbangan ideal antara kedalaman dan kecepatan.",
  },
  {
    value: "high",
    title: "High",
    description: "Penalaran mendalam untuk analisis materi bertingkat.",
  },
];

function formatTanggalWaktu(isoString?: string | null): string {
  if (!isoString) return "-";
  try {
    const d = new Date(isoString);
    const tgl = d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const jam = d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${tgl}, pukul ${jam} WIB`;
  } catch {
    return isoString;
  }
}

export default function AdminAIPage() {
  const router = useRouter();
  const customModelInputId = useId();

  // State autentikasi
  const [loadingUser, setLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");

  // Konfigurasi aktif di database
  const [currentConfig, setCurrentConfig] = useState<AIConfigState | null>(null);

  // Form input state (yang sedang diedit)
  const [model, setModel] = useState("google/gemini-2.5-flash");
  const [customModelInput, setCustomModelInput] = useState("");
  const [isCustomModel, setIsCustomModel] = useState(false);
  const [reasoningEffort, setReasoningEffort] = useState<ReasoningEffort>("medium");
  const [isActive, setIsActive] = useState(true);

  // Status komunikasi API
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // 1. Verifikasi role admin
  useEffect(() => {
    async function checkAdmin() {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          router.push("/login?error=" + encodeURIComponent("Silakan login sebagai administrator."));
          return;
        }
        const data = await res.json();
        const role = typeof data.guru?.role === "string" ? data.guru.role.trim().toLowerCase() : "";
        if (data.status === "ok" && role === "admin") {
          setIsAdmin(true);
          setAdminName(data.guru.nama || "Administrator");
          setAdminEmail(data.guru.email || "");
        } else {
          router.push("/dashboard");
          return;
        }
      } catch {
        router.push("/login");
        return;
      } finally {
        setLoadingUser(false);
      }
    }
    checkAdmin();
  }, [router]);

  // 2. Ambil data konfigurasi AI dari database MongoDB
  const loadConfig = async () => {
    setLoadingConfig(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/admin/ai-config");
      const json = await res.json();

      if (res.ok && json.status === "ok" && json.data) {
        const cfg: AIConfigState = {
          provider: json.data.provider || "openrouter",
          model: json.data.model || "google/gemini-2.5-flash",
          reasoningEffort: (json.data.reasoningEffort as ReasoningEffort) || "medium",
          isActive: json.data.isActive ?? true,
          updatedAt: json.data.updatedAt || null,
        };
        setCurrentConfig(cfg);
        setModel(cfg.model);
        setReasoningEffort(cfg.reasoningEffort);
        setIsActive(cfg.isActive);

        // Periksa apakah model terdaftar di predefined list
        const isPredefined = AVAILABLE_MODELS.some((m) => m.id === cfg.model);
        if (!isPredefined) {
          setIsCustomModel(true);
          setCustomModelInput(cfg.model);
        } else {
          setIsCustomModel(false);
          setCustomModelInput("");
        }
      } else if (json.status === "not_configured") {
        const defaultCfg: AIConfigState = {
          provider: "openrouter",
          model: "google/gemini-2.5-flash",
          reasoningEffort: "medium",
          isActive: true,
          updatedAt: null,
        };
        setCurrentConfig(defaultCfg);
        setModel(defaultCfg.model);
        setReasoningEffort(defaultCfg.reasoningEffort);
        setIsActive(defaultCfg.isActive);
      } else {
        setErrorMsg("Konfigurasi AI belum tersedia di database.");
      }
    } catch {
      setErrorMsg("Gagal memuat konfigurasi AI dari server.");
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      loadConfig();
    }
  }, [isAdmin]);

  // Handle Logout
  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Abaikan error jaringan saat logout
    } finally {
      router.push("/login");
    }
  };

  // Pilih model dari daftar
  const handleSelectModel = (selectedId: string) => {
    setModel(selectedId);
    setIsCustomModel(false);
    setErrorMsg("");
  };

  // Validasi sebelum membuka modal konfirmasi
  const handlePreSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    const targetModel = isCustomModel ? customModelInput.trim() : model.trim();
    if (!targetModel) {
      setErrorMsg("Pilih atau masukkan Model ID OpenRouter terlebih dahulu.");
      return;
    }

    setShowConfirmModal(true);
  };

  // Eksekusi simpan ke MongoDB
  const handleConfirmSave = async () => {
    setShowConfirmModal(false);
    if (saving) return;

    const targetModel = isCustomModel ? customModelInput.trim() : model.trim();
    if (!targetModel) {
      setErrorMsg("Model ID tidak boleh kosong.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "openrouter",
          model: targetModel,
          reasoningEffort,
          isActive,
        }),
      });

      const data = await res.json();
      if (res.ok && data.status === "ok") {
        setSuccessMsg("Konfigurasi AI berhasil diperbarui.");
        const updatedCfg: AIConfigState = {
          provider: data.data?.provider || "openrouter",
          model: data.data?.model || targetModel,
          reasoningEffort: data.data?.reasoningEffort || reasoningEffort,
          isActive: data.data?.isActive ?? isActive,
          updatedAt: data.data?.updatedAt || new Date().toISOString(),
        };
        setCurrentConfig(updatedCfg);
        setModel(updatedCfg.model);
        setReasoningEffort(updatedCfg.reasoningEffort);
        setIsActive(updatedCfg.isActive);
      } else {
        setErrorMsg(data.message || "Gagal menyimpan konfigurasi AI.");
      }
    } catch {
      setErrorMsg("Terjadi kendala jaringan saat menyimpan konfigurasi.");
    } finally {
      setSaving(false);
    }
  };

  // Eksekusi reset ke nilai standar rekomendasi
  const handleConfirmReset = () => {
    setShowResetModal(false);
    setModel("google/gemini-2.5-flash");
    setReasoningEffort("medium");
    setIsActive(true);
    setIsCustomModel(false);
    setCustomModelInput("");
    setSuccessMsg("Konfigurasi diatur ulang ke rekomendasi standar (Klik 'Simpan' untuk menerapkan).");
  };

  // Cek apakah ada perubahan
  const activeSelectedModel = isCustomModel ? customModelInput.trim() : model.trim();
  const hasChanges =
    currentConfig &&
    (activeSelectedModel !== currentConfig.model ||
      reasoningEffort !== currentConfig.reasoningEffort ||
      isActive !== currentConfig.isActive);

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-500">Memeriksa hak akses administrator...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 p-2 sm:p-5 md:p-8 flex items-center justify-center font-sans antialiased">
      {/* Outer Card Container mirroring Thinklet.io layout */}
      <div className="w-full max-w-6xl bg-white rounded-3xl border border-slate-200/90 shadow-sm flex flex-col md:flex-row overflow-hidden min-h-[720px]">
        {/* ============================================================ */}
        {/* SIDEBAR KIRI (Persis Referensi Thinklet.io)                   */}
        {/* ============================================================ */}
        <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200/80 p-5 flex flex-col justify-between shrink-0 bg-white">
          <div className="space-y-6">
            {/* Header Sidebar: "< Settings" */}
            <div className="flex items-center gap-2 text-slate-700">
              <span className="text-sm font-bold text-slate-400">‹</span>
              <span className="text-sm font-bold tracking-tight text-slate-900">Settings</span>
            </div>

            {/* Menu Navigasi Vertikal */}
            <nav className="space-y-1">
              {/* General / Pengaturan Umum */}
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-default">
                <span className="text-slate-400 text-sm">ⓘ</span>
                <span>General</span>
              </div>

              {/* AI Configuration (ACTIVE ITEM: Latar ungu muda + Border ungu) */}
              <div className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50/70 border border-purple-200 shadow-2xs transition">
                <span className="text-purple-600 text-sm">✦</span>
                <span>AI Configuration</span>
              </div>

              {/* Status Layanan AI */}
              <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition cursor-default">
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm">⚡</span>
                  <span>Service Status</span>
                </div>
                <span
                  className={`h-2 w-2 rounded-full ${
                    currentConfig?.isActive ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </div>
            </nav>
          </div>

          {/* Bagian Bawah Sidebar: Profil & Tombol Keluar (Logout) */}
          <div className="pt-6 border-t border-slate-100 space-y-3">
            <div className="flex items-center gap-2.5 px-2">
              <div className="h-8 w-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shrink-0">
                {adminName.slice(0, 1).toUpperCase()}
              </div>
              <div className="truncate min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{adminName}</p>
                <p className="text-[10px] text-slate-400 truncate">{adminEmail || "Administrator"}</p>
              </div>
            </div>

            {/* Tombol Keluar yang benar-benar melakukan logout */}
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition cursor-pointer disabled:opacity-50"
            >
              <span>🚪</span>
              <span>{loggingOut ? "Keluar..." : "Keluar (Logout)"}</span>
            </button>
          </div>
        </aside>

        {/* ============================================================ */}
        {/* KONTEN UTAMA (Persis Referensi Thinklet.io)                   */}
        {/* ============================================================ */}
        <main className="flex-1 p-5 sm:p-8 flex flex-col justify-between overflow-y-auto space-y-6">
          <form onSubmit={handlePreSave} className="space-y-5 flex-1">
            {/* Header Konten: Title + Description + Refresh/Reset Icons */}
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-0.5">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  AI Configuration
                </h1>
                <p className="text-xs text-slate-500 font-normal">
                  Configure your AI model preferences and behavior for EduSnap
                </p>
              </div>

              {/* Tombol Icon Refresh & Reset */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={loadConfig}
                  title="Muat ulang konfigurasi dari server"
                  className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 text-xs transition cursor-pointer"
                >
                  <span className={loadingConfig ? "animate-spin" : ""}>↻</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetModal(true)}
                  title="Kembalikan ke rekomendasi default"
                  className="h-8 w-8 rounded-lg border border-slate-200 hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-600 text-xs transition cursor-pointer"
                >
                  🗑
                </button>
              </div>
            </div>

            {/* Notification Info Box (Biru Muda persis screenshot) */}
            <div className="rounded-xl bg-sky-50/80 border border-sky-200/90 p-3.5 sm:p-4 text-xs text-sky-900 flex items-start gap-3 leading-relaxed">
              <span className="text-sky-600 font-bold shrink-0 mt-0.5">ⓘ</span>
              <p className="text-xs font-normal">
                Your AI model selection affects response quality, speed, and usage costs. Limited access
                models may have usage restrictions based on your subscription.
              </p>
            </div>

            {/* Feedback Banners */}
            {errorMsg && (
              <div className="rounded-xl bg-rose-50 p-3 border border-rose-200 text-xs text-rose-800 font-medium flex items-center gap-2">
                <span>⚠️</span>
                <span>{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
                <span>✓</span>
                <span>{successMsg}</span>
              </div>
            )}

            {/* Model Section Header */}
            <div className="space-y-0.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-bold text-slate-800">Primary AI Model</span>
                <span className="text-xs font-semibold text-slate-500">2 Recommended</span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                *Indikator pengali (0.1x, 0.5x, 1x) menunjukkan estimasi beban kuota relatif antar-model, bukan tarif resmi OpenRouter.
              </p>
            </div>

            {/* Model List Cards (Persis gaya horizontal Thinklet.io) */}
            <div className="space-y-2.5">
              {AVAILABLE_MODELS.map((item) => {
                const isSelected = !isCustomModel && model === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectModel(item.id)}
                    className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left flex items-center justify-between gap-3 transition cursor-pointer select-none ${
                      isSelected
                        ? "bg-purple-50/40 border-purple-300 ring-1 ring-purple-200 shadow-2xs"
                        : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                    }`}
                  >
                    {/* Sisi Kiri: Icon Model + Nama + Badges + Provider */}
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Kotak Ikon Model */}
                      <div
                        className={`h-10 w-10 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center text-base shrink-0`}
                      >
                        {item.iconSymbol}
                      </div>

                      {/* Teks Model Info */}
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {item.name}
                          </span>

                          {/* Badge Recommended */}
                          {item.badgeRecommended && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              Recommended
                            </span>
                          )}

                          {/* Badge Status */}
                          {item.badgeStatus === "Available" && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center gap-1">
                              <span>✓</span>
                              <span>Available</span>
                            </span>
                          )}

                          {item.badgeStatus === "Limited Access" && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/80 flex items-center gap-1">
                              <span>⚠️</span>
                              <span>Limited Access</span>
                            </span>
                          )}

                          {item.badgeStatus === "Preview" && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/80">
                              Preview
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 font-normal">
                          {item.provider}{" "}
                          <span className="text-slate-300 font-mono text-[10px]">({item.id})</span>
                        </p>
                      </div>
                    </div>

                    {/* Sisi Kanan: Pengali Biaya / Penggunaan (0.1x, 0.3x, dsb) */}
                    <div className="shrink-0 text-right">
                      <span className="text-xs font-mono font-medium text-slate-500">
                        {item.costMultiplier}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Opsi Model Kustom / Model ID Tambahan */}
              <div
                onClick={() => setIsCustomModel(true)}
                className={`w-full p-3.5 sm:p-4 rounded-2xl border text-left transition cursor-pointer select-none space-y-2.5 ${
                  isCustomModel
                    ? "bg-purple-50/40 border-purple-300 ring-1 ring-purple-200 shadow-2xs"
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center text-sm font-mono shrink-0">
                      id
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-slate-900 block">
                        Custom OpenRouter Model ID
                      </span>
                      <p className="text-[11px] text-slate-400">
                        Gunakan model lain yang tersedia di katalog OpenRouter
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] text-purple-600 font-bold">
                    {isCustomModel ? "● Aktif" : "Pilih"}
                  </span>
                </div>

                {isCustomModel && (
                  <div className="pt-1">
                    <label htmlFor={customModelInputId} className="sr-only">
                      Model ID OpenRouter
                    </label>
                    <input
                      id={customModelInputId}
                      type="text"
                      value={customModelInput}
                      onChange={(e) => setCustomModelInput(e.target.value)}
                      placeholder="Contoh: deepseek/deepseek-chat atau mistralai/mistral-small"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-mono text-slate-900 placeholder:text-slate-400 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-100"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ============================================================ */}
            {/* PENGATURAN TAMBAHAN: REASONING EFFORT & SERVICE STATUS       */}
            {/* ============================================================ */}
            <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card Reasoning Effort */}
              <div className="rounded-2xl border border-slate-200/90 p-4 space-y-2.5 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Tingkat Penalaran (Reasoning)</span>
                  <span className="text-[10px] text-slate-400 font-medium">OpenRouter Thinking</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  {REASONING_OPTIONS.map((opt) => {
                    const isSelected = reasoningEffort === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setReasoningEffort(opt.value)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold text-center border transition cursor-pointer ${
                          isSelected
                            ? "bg-purple-50 text-purple-700 border-purple-300 shadow-2xs"
                            : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100/70"
                        }`}
                      >
                        {opt.title}
                        {opt.badge && (
                          <span className="block text-[9px] font-normal text-purple-600">
                            {opt.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Card Status Layanan AI */}
              <div className="rounded-2xl border border-slate-200/90 p-4 space-y-2.5 bg-white flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800">Status Layanan Pembuatan Soal</span>
                  <span className="text-[10px] text-slate-400 font-medium">Akses Guru</span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsActive(true)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-center border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>🟢</span>
                    <span>Aktif</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsActive(false)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold text-center border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      !isActive
                        ? "bg-rose-50 text-rose-800 border-rose-300 shadow-2xs"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <span>🔴</span>
                    <span>Nonaktif</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Bar: Status Perubahan & Tombol Simpan */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
              <div className="text-xs text-slate-400 font-medium">
                {currentConfig?.updatedAt && (
                  <span>Terakhir disimpan: {formatTanggalWaktu(currentConfig.updatedAt)}</span>
                )}
                {hasChanges && (
                  <span className="ml-2 text-amber-600 font-bold">● Ada perubahan belum disimpan</span>
                )}
              </div>

              <button
                type="submit"
                disabled={saving || loadingConfig}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 active:scale-98 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {saving ? "Menyimpan Konfigurasi..." : "Simpan Konfigurasi"}
              </button>
            </div>
          </form>
        </main>
      </div>

      {/* ============================================================ */}
      {/* MODAL KONFIRMASI SIMPAN (Sebelum vs Sesudah)                 */}
      {/* ============================================================ */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4">
            <div className="space-y-1 text-center">
              <div className="h-10 w-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center text-xl mx-auto mb-2">
                ⚙️
              </div>
              <h3 className="text-base font-bold text-slate-900">Konfirmasi Konfigurasi AI</h3>
              <p className="text-xs text-slate-500">
                Periksa perubahan pengaturan sebelum disimpan ke sistem EduSnap.
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/80 space-y-3 text-xs">
              {/* Model Diff */}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Model AI
                </span>
                <div className="flex items-center justify-between gap-2 font-mono pt-0.5">
                  <span className="text-slate-400 line-through truncate max-w-[140px]">
                    {currentConfig?.model || "-"}
                  </span>
                  <span className="text-slate-400 font-sans">→</span>
                  <span className="font-bold text-purple-700 truncate max-w-[140px]">
                    {activeSelectedModel}
                  </span>
                </div>
              </div>

              {/* Reasoning Diff */}
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Tingkat Penalaran
                </span>
                <div className="flex items-center justify-between gap-2 capitalize pt-0.5">
                  <span className="text-slate-400 line-through">
                    {currentConfig?.reasoningEffort || "medium"}
                  </span>
                  <span className="text-slate-400">→</span>
                  <span className="font-bold text-purple-700">{reasoningEffort}</span>
                </div>
              </div>

              {/* Status Layanan Diff */}
              <div className="pt-2 border-t border-slate-200/60">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Status Layanan
                </span>
                <div className="flex items-center justify-between gap-2 font-bold pt-0.5">
                  <span className={currentConfig?.isActive ? "text-emerald-700" : "text-rose-700"}>
                    {currentConfig?.isActive ? "🟢 Aktif" : "🔴 Nonaktif"}
                  </span>
                  <span className="text-slate-400 font-normal">→</span>
                  <span className={isActive ? "text-emerald-700" : "text-rose-700"}>
                    {isActive ? "🟢 Aktif" : "🔴 Nonaktif"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 rounded-xl border border-slate-200 hover:bg-slate-50 py-2.5 text-xs font-bold text-slate-600 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
              >
                Ya, Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL RESET KONFIGURASI                                      */}
      {/* ============================================================ */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl border border-slate-100 space-y-4 text-center">
            <div className="h-10 w-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center text-xl mx-auto">
              ⚠️
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-900">Reset ke Rekomendasi Standar?</h3>
              <p className="text-xs text-slate-500">
                Pengaturan akan dikembalikan ke Gemini 2.5 Flash dengan reasoning medium dan layanan aktif.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 rounded-xl border border-slate-200 hover:bg-slate-50 py-2.5 text-xs font-bold text-slate-600 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 text-xs font-bold text-white shadow-sm transition cursor-pointer"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
