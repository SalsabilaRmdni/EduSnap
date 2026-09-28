import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Materi from "@/models/Materi";
import Kelas from "@/models/Kelas";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

// GET: ambil semua materi di satu kelas milik guru yang login
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ kelasId: string }> }
) {
  try {
    await connectDB();
    const { kelasId } = await params;

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session?.guruId) {
      return NextResponse.json(
        { error: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    const kelas = await Kelas.findOne({
      _id: kelasId,
      guru_id: session.guruId,
      is_active: { $ne: false },
    });

    if (!kelas) {
      return NextResponse.json(
        { error: "Kelas tidak ditemukan atau bukan milik Anda" },
        { status: 403 }
      );
    }

    // Ambil materi untuk kelas ini (kecualikan gambarList agar payload ringan & cepat)
    const daftarMateri = await Materi.find({
      $or: [
        { kelas_id: kelasId },
        // Dukungan backward-compatibility jika materi lama dibuat dengan nama kelas yang sama oleh guru ini
        { guruEmail: session.email, kelas: kelas.nama_kelas, kelas_id: null },
      ],
    })
      .select("-gambarList")
      .sort({ createdAt: -1 });

    return NextResponse.json({ success: true, materi: daftarMateri });
  } catch (err) {
    console.error("Error GET materi kelas:", err);
    return NextResponse.json(
      { error: "Gagal mengambil data materi kelas" },
      { status: 500 }
    );
  }
}
