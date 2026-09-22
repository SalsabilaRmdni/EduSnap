import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Kelas from "@/models/Kelas";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { generateKodeKelas } from "@/lib/generateKode";

// GET: Ambil semua kelas milik guru (dan backfill kode_kelas jika belum ada)
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const searchParams = req.nextUrl.searchParams;
    let guruId = searchParams.get("guruId");

    if (!guruId) {
      const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
      const session = token ? await verifySessionToken(token) : null;
      guruId = session?.guruId || null;
    }

    if (!guruId) {
      return NextResponse.json({ error: "guruId wajib disertakan" }, { status: 400 });
    }

    const daftarKelas = await Kelas.find({ guru_id: guruId }).sort({ nama_kelas: 1 });

    // Pastikan setiap kelas memiliki kode_kelas
    for (const k of daftarKelas) {
      if (!k.kode_kelas) {
        k.kode_kelas = await generateKodeKelas(k.nama_kelas);
        await k.save();
      }
    }

    return NextResponse.json({ success: true, kelas: daftarKelas });
  } catch (err) {
    console.error("Error get kelas:", err);
    return NextResponse.json({ error: "Gagal mengambil data kelas" }, { status: 500 });
  }
}

// POST: Cari atau buat kelas baru untuk guru
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    const body = await req.json();
    const guruId = body.guruId || session?.guruId;
    const namaKelas = body.namaKelas?.trim();

    if (!guruId || !namaKelas) {
      return NextResponse.json(
        { error: "guruId dan namaKelas wajib diisi" },
        { status: 400 }
      );
    }

    // Cari kelas yang sudah ada atau buat baru
    let kelas = await Kelas.findOne({ guru_id: guruId, nama_kelas: namaKelas });
    if (!kelas) {
      const kodeKelas = await generateKodeKelas(namaKelas);
      kelas = await Kelas.create({
        guru_id: guruId,
        nama_kelas: namaKelas,
        kode_kelas: kodeKelas,
      });
    } else if (!kelas.kode_kelas) {
      kelas.kode_kelas = await generateKodeKelas(namaKelas);
      await kelas.save();
    }

    return NextResponse.json({ success: true, kelas });
  } catch (err) {
    console.error("Error post kelas:", err);
    return NextResponse.json({ error: "Gagal memproses data kelas" }, { status: 500 });
  }
}