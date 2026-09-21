import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Materi from "@/models/Materi";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData = await req.formData();
    const file = formData.get("gambar") as File | null;
    const namaMateri = formData.get("namaMateri") as string;
    const guruEmail = formData.get("guruEmail") as string;

    const mataPelajaran = (formData.get("mataPelajaran") as string) || "Tematik / Umum";
    const kelas = (formData.get("kelas") as string) || "SD (Umum)";
    const halaman = (formData.get("halaman") as string) || "";

    if (!file || !namaMateri || !guruEmail) {
      return NextResponse.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    // konversi file ke base64 (cukup untuk MVP, belum pakai cloud storage)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const materiBaru = await Materi.create({
      guruEmail,
      namaMateri,
      mataPelajaran,
      kelas,
      halaman,
      gambarBase64: base64,
    });

    return NextResponse.json({ success: true, id: materiBaru._id });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal upload materi" },
      { status: 500 }
    );
  }
}