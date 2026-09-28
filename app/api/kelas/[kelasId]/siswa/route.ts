import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Siswa from "@/models/Siswa";
import Kelas from "@/models/Kelas";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

// Helper: Verifikasi sesi guru dan kepemilikan kelas
async function verifikasiKepemilikanKelas(req: NextRequest, kelasId: string) {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (!session?.guruId) {
    return { error: "Sesi guru tidak valid atau belum login", status: 401 };
  }

  const kelas = await Kelas.findOne({
    _id: kelasId,
    guru_id: session.guruId,
    is_active: { $ne: false },
  });

  if (!kelas) {
    return { error: "Kelas tidak ditemukan atau bukan milik Anda", status: 403 };
  }

  return { session, kelas };
}

// GET: ambil semua siswa di satu kelas (hanya jika kelas milik guru yang login)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    await connectDB();
    const { kelasId } = await params;

    const authCheck = await verifikasiKepemilikanKelas(req, kelasId);
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const daftarSiswa = await Siswa.find({ kelas_id: kelasId }).sort({ nama: 1 });
    return NextResponse.json({ success: true, siswa: daftarSiswa });
  } catch (err) {
    console.error("Error GET siswa:", err);
    return NextResponse.json({ error: "Gagal mengambil data siswa" }, { status: 500 });
  }
}

// POST: tambah siswa baru ke kelas ini (hanya jika kelas milik guru yang login)
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    await connectDB();
    const { kelasId } = await params;

    const authCheck = await verifikasiKepemilikanKelas(req, kelasId);
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

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
    console.error("Error POST siswa:", err);
    return NextResponse.json({ error: "Gagal menambah siswa" }, { status: 500 });
  }
}

// DELETE: hapus siswa dari kelas ini (hanya jika kelas milik guru yang login)
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    await connectDB();
    const { kelasId } = await params;

    const authCheck = await verifikasiKepemilikanKelas(req, kelasId);
    if ("error" in authCheck) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(req.url);
    const siswaId = searchParams.get("siswaId");

    if (!siswaId) {
      return NextResponse.json({ error: "siswaId wajib disertakan" }, { status: 400 });
    }

    const deleted = await Siswa.findOneAndDelete({
      _id: siswaId,
      kelas_id: kelasId,
    });

    if (!deleted) {
      return NextResponse.json({ error: "Siswa tidak ditemukan di kelas ini" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Siswa berhasil dihapus" });
  } catch (err) {
    console.error("Error DELETE siswa:", err);
    return NextResponse.json({ error: "Gagal menghapus siswa" }, { status: 500 });
  }
}
