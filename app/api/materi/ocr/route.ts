import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Materi from "@/models/Materi";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

const OCR_ENDPOINTS = [
  "https://api.ocr.space/parse/image",
  "https://apipro1.ocr.space/parse/image",
];

const REQUEST_TIMEOUT_MS = 10000; // 10 detik batas wajar per request OCR

interface OcrParsedResult {
  ParsedText?: string;
  ErrorMessage?: string;
  ErrorDetails?: string;
}

interface OcrSpaceResponse {
  ParsedResults?: OcrParsedResult[];
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string[] | string;
  ProcessingTimeInMilliseconds?: string;
}

/**
 * Helper untuk mengirim gambar ke OCR.space dengan dukungan multi-endpoint,
 * FormData multipart hemat memori, timeout controller, dan fallback parameter bahasa.
 */
async function processOcrPage(
  base64Image: string,
  apiKey: string,
  halamanNomor: number
): Promise<{ teks: string; error?: string; isTimeout?: boolean }> {
  let lastError: Error | null = null;
  let isConnectionTimeout = false;

  for (const endpoint of OCR_ENDPOINTS) {
    try {
      const formData = new FormData();
      formData.append("apikey", apiKey);
      formData.append("base64Image", base64Image);
      formData.append("language", "ind"); // Pertahankan preferensi bahasa Indonesia
      formData.append("isOverlayRequired", "false");
      formData.append("OCREngine", "2");
      formData.append("scale", "true");

      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok && response.status !== 200) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data = (await response.json()) as OcrSpaceResponse;

      // Jika OCR.space menolak kode bahasa 'ind' (E201), coba kembali dengan 'auto'
      const errMsgs = Array.isArray(data.ErrorMessage)
        ? data.ErrorMessage
        : typeof data.ErrorMessage === "string"
        ? [data.ErrorMessage]
        : [];

      if (
        data.IsErroredOnProcessing &&
        errMsgs.some((msg) => typeof msg === "string" && msg.includes("E201"))
      ) {
        const retryFormData = new FormData();
        retryFormData.append("apikey", apiKey);
        retryFormData.append("base64Image", base64Image);
        retryFormData.append("language", "auto");
        retryFormData.append("isOverlayRequired", "false");
        retryFormData.append("OCREngine", "2");
        retryFormData.append("scale", "true");

        const retryRes = await fetch(endpoint, {
          method: "POST",
          body: retryFormData,
          signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });

        if (retryRes.ok) {
          data = (await retryRes.json()) as OcrSpaceResponse;
        }
      }

      if (data.IsErroredOnProcessing) {
        const errorText = Array.isArray(data.ErrorMessage)
          ? data.ErrorMessage.join(", ")
          : data.ErrorMessage || "Terjadi kesalahan saat memproses gambar";
        return {
          teks: "",
          error: `Halaman ${halamanNomor}: ${errorText}`,
          isTimeout: false,
        };
      }

      const hasilTeks = data.ParsedResults?.[0]?.ParsedText || "";
      return { teks: hasilTeks.trim() };
    } catch (err: unknown) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const msg = lastError.message.toLowerCase();
      const isTimeout =
        lastError.name === "TimeoutError" ||
        msg.includes("timeout") ||
        msg.includes("und_err_connect_timeout") ||
        msg.includes("econnreset");

      if (isTimeout) {
        isConnectionTimeout = true;
      }
      console.warn(
        `[OCR] Gagal menghubungi ${endpoint} untuk halaman ${halamanNomor}: ${lastError.message}`
      );
      // Lanjutkan ke endpoint cadangan berikutnya
    }
  }

  return {
    teks: "",
    error: isConnectionTimeout
      ? "OCR tidak dapat terhubung ke layanan OCR (koneksi timeout). Silakan coba lagi."
      : lastError?.message || "Gagal memproses OCR",
    isTimeout: isConnectionTimeout,
  };
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session?.guruId) {
      return NextResponse.json(
        { error: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    const { materiId } = await req.json();

    if (!materiId) {
      return NextResponse.json({ error: "materiId wajib diisi" }, { status: 400 });
    }

    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json({ error: "Materi tidak ditemukan" }, { status: 404 });
    }

    // Pastikan materi milik guru yang sedang login
    const isOwner =
      (materi.guru_id && String(materi.guru_id) === String(session.guruId)) ||
      (materi.guruEmail &&
        materi.guruEmail.toLowerCase() === session.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { error: "Materi ini bukan milik Anda" },
        { status: 403 }
      );
    }

    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OCR_SPACE_API_KEY belum diset di environment variables" },
        { status: 500 }
      );
    }

    const gambarList: string[] = materi.gambarList || [];
    if (gambarList.length === 0) {
      return NextResponse.json(
        { error: "Materi ini tidak punya gambar" },
        { status: 400 }
      );
    }

    const hasilPerHalaman: string[] = [];
    let gagalCount = 0;
    let timeoutCount = 0;

    for (let i = 0; i < gambarList.length; i++) {
      const resPage = await processOcrPage(gambarList[i], apiKey, i + 1);

      if (resPage.teks) {
        hasilPerHalaman.push(`--- Halaman ${i + 1} ---\n${resPage.teks}`);
      } else {
        gagalCount++;
        if (resPage.isTimeout) timeoutCount++;
        const pesanGagal =
          resPage.error ||
          "OCR tidak dapat terhubung ke layanan OCR. Silakan coba lagi.";
        hasilPerHalaman.push(`--- Halaman ${i + 1} ---\n[${pesanGagal}]`);
      }
    }

    // Jika seluruh halaman gagal karena timeout koneksi, jangan simpan teks sampah ke database
    if (gagalCount === gambarList.length) {
      const errorMsg =
        timeoutCount > 0
          ? "OCR tidak dapat terhubung ke layanan OCR. Silakan coba lagi."
          : "Gagal membaca teks dari foto materi. Silakan coba kembali.";

      return NextResponse.json(
        {
          error: errorMsg,
          jumlahHalaman: gambarList.length,
          gagalSemua: true,
        },
        { status: 504 }
      );
    }

    const teksGabungan = hasilPerHalaman.join("\n\n");
    materi.teksHasilOCR = teksGabungan;
    await materi.save();

    return NextResponse.json({
      success: true,
      teks: teksGabungan,
      jumlahHalaman: gambarList.length,
      adaKegagalanParsial: gagalCount > 0,
    });
  } catch (err) {
    console.error("Error route OCR:", err);
    return NextResponse.json(
      { error: "OCR tidak dapat terhubung ke layanan OCR. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
