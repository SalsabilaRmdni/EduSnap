import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import { verifyAdminSession, SESSION_COOKIE_NAME } from "@/lib/auth";
import AIConfig from "@/models/AIConfig";

/**
 * GET /api/admin/ai-config
 * Mengambil konfigurasi AI aktif dari MongoDB.
 * Hanya dapat diakses oleh Admin yang terautentikasi.
 */
export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authCheck = await verifyAdminSession(token);

    if (!authCheck.authorized) {
      return NextResponse.json(
        { status: "error", message: authCheck.error },
        { status: authCheck.status }
      );
    }

    await connectDB();

    const config = await AIConfig.findOne().sort({ updatedAt: -1 });

    if (!config) {
      return NextResponse.json({
        status: "not_configured",
        message: "AI belum dikonfigurasi di database.",
        data: null,
      });
    }

    return NextResponse.json({
      status: "ok",
      data: {
        provider: config.provider,
        model: config.model,
        reasoningEffort: config.reasoningEffort || "medium",
        isActive: !!config.isActive,
        updatedAt: config.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error GET /api/admin/ai-config:", error);
    return NextResponse.json(
      { status: "error", message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/ai-config
 * Memperbarui atau menyimpan konfigurasi AI ke MongoDB.
 * Hanya dapat diakses oleh Admin yang terautentikasi.
 */
export async function PUT(req: NextRequest) {
  try {
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const authCheck = await verifyAdminSession(token);

    if (!authCheck.authorized) {
      return NextResponse.json(
        { status: "error", message: authCheck.error },
        { status: authCheck.status }
      );
    }

    const body = await req.json();
    const { provider, model, reasoningEffort, isActive } = body;

    // 1. Validasi Provider (Untuk tahap sekarang hanya openrouter)
    if (!provider || typeof provider !== "string" || provider.trim().toLowerCase() !== "openrouter") {
      return NextResponse.json(
        {
          status: "error",
          message: 'Provider tidak valid. Saat ini sistem hanya mendukung provider "openrouter".',
        },
        { status: 400 }
      );
    }

    // 2. Validasi Model (Wajib string non-empty)
    if (!model || typeof model !== "string" || !model.trim()) {
      return NextResponse.json(
        {
          status: "error",
          message: "Nama model wajib diisi.",
        },
        { status: 400 }
      );
    }

    // 3. Validasi Reasoning Effort
    const validReasonings = ["none", "low", "medium", "high"];
    const normalizedReasoning = reasoningEffort ? String(reasoningEffort).toLowerCase() : "medium";
    if (!validReasonings.includes(normalizedReasoning)) {
      return NextResponse.json(
        {
          status: "error",
          message: 'Nilai reasoningEffort tidak valid. Pilihan: "none", "low", "medium", "high".',
        },
        { status: 400 }
      );
    }

    // 4. Validasi isActive
    if (typeof isActive !== "boolean") {
      return NextResponse.json(
        {
          status: "error",
          message: "Status isActive wajib bernilai boolean (true/false).",
        },
        { status: 400 }
      );
    }

    await connectDB();

    if (isActive) {
      // Nonaktifkan semua konfigurasi lain jika konfigurasi ini aktif, untuk menjamin hanya ada 1 aktif
      await AIConfig.updateMany({}, { isActive: false });
    }

    // Simpan / perbarui dokumen konfigurasi tunggal aktif
    let currentConfig = await AIConfig.findOne().sort({ updatedAt: -1 });

    if (currentConfig) {
      currentConfig.provider = "openrouter";
      currentConfig.model = model.trim();
      currentConfig.reasoningEffort = normalizedReasoning as "none" | "low" | "medium" | "high";
      currentConfig.isActive = isActive;
      await currentConfig.save();
    } else {
      currentConfig = await AIConfig.create({
        provider: "openrouter",
        model: model.trim(),
        reasoningEffort: normalizedReasoning,
        isActive,
      });
    }

    return NextResponse.json({
      status: "ok",
      message: "Konfigurasi AI berhasil diperbarui.",
      data: {
        provider: currentConfig.provider,
        model: currentConfig.model,
        reasoningEffort: currentConfig.reasoningEffort,
        isActive: currentConfig.isActive,
        updatedAt: currentConfig.updatedAt,
      },
    });
  } catch (error) {
    console.error("Error PUT /api/admin/ai-config:", error);
    return NextResponse.json(
      { status: "error", message: "Terjadi kesalahan pada server." },
      { status: 500 }
    );
  }
}
