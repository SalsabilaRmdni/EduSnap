import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Materi from "@/models/Materi";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { materiId } = await req.json();

    if (!materiId) {
      return NextResponse.json({ error: "materiId wajib diisi" }, { status: 400 });
    }

    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json({ error: "Materi tidak ditemukan" }, { status: 404 });
    }

    const apiKey = process.env.OCR_SPACE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OCR_SPACE_API_KEY belum diset di environment variables" },
        { status: 500 }
      );
    }

    const ocrRes = await fetch("https://api.ocr.space/parse/image", {
      method: "POST",
      headers: {
        apikey: apiKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        base64Image: materi.gambarBase64,
        language: "eng",
        isOverlayRequired: "false",
        OCREngine: "2",
        scale: "true",
      }),
    });

    const ocrData = await ocrRes.json();

    if (ocrData.IsErroredOnProcessing) {
      console.error("OCR.space error:", ocrData.ErrorMessage);
      return NextResponse.json(
        { error: ocrData.ErrorMessage?.[0] || "Gagal proses OCR" },
        { status: 500 }
      );
    }

    const teks = ocrData.ParsedResults?.[0]?.ParsedText || "";

    materi.teksHasilOCR = teks;
    await materi.save();

    return NextResponse.json({ success: true, teks });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal proses OCR" }, { status: 500 });
  }
}