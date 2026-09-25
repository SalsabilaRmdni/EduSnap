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

    const gambarList: string[] = materi.gambarList || [];
    if (gambarList.length === 0) {
      return NextResponse.json({ error: "Materi ini tidak punya gambar" }, { status: 400 });
    }

    // Proses OCR tiap halaman satu per satu (sequential, biar aman dari rate limit OCR.space),
    // lalu gabung hasilnya per halaman jadi satu teks utuh.
    const hasilPerHalaman: string[] = [];

    for (let i = 0; i < gambarList.length; i++) {
      try {
        const ocrRes = await fetch("https://api.ocr.space/parse/image", {
          method: "POST",
          headers: {
            apikey: apiKey,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            base64Image: gambarList[i],
            language: "eng",
            isOverlayRequired: "false",
            OCREngine: "2",
            scale: "true",
          }),
        });

        const ocrData = await ocrRes.json();

        if (ocrData.IsErroredOnProcessing) {
          console.error(`OCR.space error halaman ${i + 1}:`, ocrData.ErrorMessage);
          hasilPerHalaman.push(
            `--- Halaman ${i + 1} ---\n[Gagal membaca halaman ini, coba foto ulang halaman ${i + 1} jika teks penting hilang]`
          );
          continue;
        }

        const teksHalaman = ocrData.ParsedResults?.[0]?.ParsedText || "";
        hasilPerHalaman.push(`--- Halaman ${i + 1} ---\n${teksHalaman.trim()}`);
      } catch (pageErr) {
        console.error(`Gagal proses OCR halaman ${i + 1}:`, pageErr);
        hasilPerHalaman.push(`--- Halaman ${i + 1} ---\n[Gagal membaca halaman ini]`);
      }
    }

    const teksGabungan = hasilPerHalaman.join("\n\n");

    materi.teksHasilOCR = teksGabungan;
    await materi.save();

    return NextResponse.json({ success: true, teks: teksGabungan, jumlahHalaman: gambarList.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal proses OCR" }, { status: 500 });
  }
}
