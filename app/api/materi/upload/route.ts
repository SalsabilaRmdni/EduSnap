import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Materi from "@/models/Materi";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const formData = await req.formData();

    // Sekarang bisa menerima banyak file sekaligus dengan key "gambar" yang sama
    const files = formData.getAll("gambar") as File[];
    const namaMateri = formData.get("namaMateri") as string;
    const guruEmail = formData.get("guruEmail") as string;

    const mataPelajaran = (formData.get("mataPelajaran") as string) || "Tematik / Umum";
    const kelas = (formData.get("kelas") as string) || "SD (Umum)";
    const halaman = (formData.get("halaman") as string) || "";

    if (!files || files.length === 0 || !namaMateri || !guruEmail) {
      return NextResponse.json(
        { error: "Data tidak lengkap. Pastikan minimal 1 foto sudah dipilih." },
        { status: 400 }
      );
    }

    // Konversi tiap file ke base64, urut sesuai urutan upload (= urutan halaman)
    const gambarList: string[] = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
      gambarList.push(base64);
    }

    const materiBaru = await Materi.create({
      guruEmail,
      namaMateri,
      mataPelajaran,
      kelas,
      halaman,
      gambarList,
    });

    return NextResponse.json({ success: true, id: materiBaru._id, jumlahHalaman: gambarList.length });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Gagal upload materi" },
      { status: 500 }
    );
  }
}
