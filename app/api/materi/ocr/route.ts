import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Materi from "@/models/Materi";
import { createWorker } from "tesseract.js";
import path from "path";

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

    const fs = await import("fs");
    const localTrainedData = path.join(process.cwd(), "ind.traineddata");
    const useLocal = fs.existsSync(localTrainedData);

    const workerOptions: Record<string, unknown> = {
      langPath: useLocal ? process.cwd() : "https://tessdata.projectnaptha.com/4.0.0",
      cachePath: process.cwd(),
    };

    const worker = await createWorker("ind", 1, workerOptions);
    const { data: { text } } = await worker.recognize(materi.gambarBase64);
    await worker.terminate();

    materi.teksHasilOCR = text;
    await materi.save();

    return NextResponse.json({ success: true, teks: text });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal proses OCR" }, { status: 500 });
  }
}