import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Siswa from "@/models/Siswa";

// GET: ambil semua siswa di satu kelas
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    await connectDB();
    const { kelasId } = await params;

    const daftarSiswa = await Siswa.find({ kelas_id: kelasId }).sort({ nama: 1 });
    return NextResponse.json({ success: true, siswa: daftarSiswa });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal mengambil data siswa" }, { status: 500 });
  }
}

// POST: tambah siswa baru ke kelas ini (tanpa kode, cukup nama)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    await connectDB();
    const { kelasId } = await params;
    const { nama } = await req.json();

    if (!nama?.trim()) {
      return NextResponse.json({ error: "Nama siswa wajib diisi" }, { status: 400 });
    }

    const namaTrim = nama.trim();

    // Cek nama sudah ada di kelas ini atau belum (case-insensitive)
    const existing = await Siswa.findOne({
      kelas_id: kelasId,
      nama: { $regex: `^${namaTrim.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Siswa dengan nama "${namaTrim}" sudah terdaftar di kelas ini` },
        { status: 409 }
      );
    }

    const siswaBaru = await Siswa.create({
      kelas_id: kelasId,
      nama: namaTrim,
    });

    return NextResponse.json({ success: true, siswa: siswaBaru });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal menambah siswa" }, { status: 500 });
  }
}
