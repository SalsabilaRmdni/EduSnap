import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Materi from "@/models/Materi";
import Kelas from "@/models/Kelas";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Verifikasi sesi login guru dari cookie
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session?.guruId) {
      return NextResponse.json(
        { error: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    // Sekarang bisa menerima banyak file sekaligus dengan key "gambar" yang sama
    const files = formData.getAll("gambar") as File[];
    const namaMateri = formData.get("namaMateri") as string;
    const kelasId = formData.get("kelasId") as string;

    const mataPelajaran = (formData.get("mataPelajaran") as string) || "Tematik / Umum";
    const halaman = (formData.get("halaman") as string) || "";

    if (!files || files.length === 0 || !namaMateri?.trim()) {
      return NextResponse.json(
        { error: "Data tidak lengkap. Pastikan judul materi dan minimal 1 foto sudah dipilih." },
        { status: 400 }
      );
    }

    // Jika kelasId disertakan, pastikan kelas itu benar milik guru yang sedang login
    let kelasDoc = null;
    if (kelasId) {
      kelasDoc = await Kelas.findOne({
        _id: kelasId,
        guru_id: session.guruId,
      });

      if (!kelasDoc) {
        return NextResponse.json(
          { error: "Kelas tidak ditemukan atau bukan milik Anda" },
          { status: 403 }
        );
      }
    }

    // Konversi tiap file ke base64, urut sesuai urutan upload (= urutan halaman)
    const gambarList: string[] = [];
    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);
      const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
      gambarList.push(base64);
    }

    const namaKelas = kelasDoc
      ? kelasDoc.nama_kelas
      : (formData.get("kelas") as string) || "SD (Umum)";

    const materiBaru = await Materi.create({
      guru_id: session.guruId,
      guruEmail: session.email,
      kelas_id: kelasDoc ? kelasDoc._id : undefined,
      namaMateri: namaMateri.trim(),
      mataPelajaran,
      kelas: namaKelas,
      halaman: halaman.trim(),
      gambarList,
    });

    return NextResponse.json({
      success: true,
      id: materiBaru._id,
      jumlahHalaman: gambarList.length,
      kelas_id: materiBaru.kelas_id,
      namaKelas: materiBaru.kelas,
    });
  } catch (err) {
    console.error("Error upload materi:", err);
    return NextResponse.json(
      { error: "Gagal upload materi" },
      { status: 500 }
    );
  }
}
