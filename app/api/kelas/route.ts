import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Kelas from "@/models/Kelas";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { generateKodeKelas } from "@/lib/generateKode";

// GET: Ambil semua kelas milik guru yang sedang login
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    // Ambil session guru dari cookie
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    // Pastikan guru sudah login
    if (!session?.guruId) {
      return NextResponse.json(
        { error: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    // Gunakan guruId dari session, bukan dari URL
    const guruId = session.guruId;

    // Ambil hanya kelas milik guru yang sedang login yang masih aktif
    const daftarKelas = await Kelas.find({
      guru_id: guruId,
      is_active: { $ne: false },
    }).sort({ nama_kelas: 1 });

    // Pastikan setiap kelas memiliki kode_kelas
    for (const k of daftarKelas) {
      if (!k.kode_kelas) {
        k.kode_kelas = await generateKodeKelas(k.nama_kelas);
        await k.save();
      }
    }

    return NextResponse.json({
      success: true,
      kelas: daftarKelas,
    });
  } catch (err) {
    console.error("Error GET kelas:", err);

    return NextResponse.json(
      { error: "Gagal mengambil data kelas" },
      { status: 500 }
    );
  }
}

// POST: Buat kelas baru untuk guru yang sedang login
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Ambil session guru dari cookie
    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    // Pastikan guru sudah login
    if (!session?.guruId) {
      return NextResponse.json(
        { error: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    // Gunakan guruId dari session
    const guruId = session.guruId;

    // Ambil nama kelas dari request
    const body = await req.json();
    const namaKelas =
      typeof body.namaKelas === "string"
        ? body.namaKelas.trim()
        : "";

    if (!namaKelas) {
      return NextResponse.json(
        { error: "Nama kelas wajib diisi" },
        { status: 400 }
      );
    }

    if (namaKelas.length < 2 || namaKelas.length > 50) {
      return NextResponse.json(
        { error: "Nama kelas harus antara 2 hingga 50 karakter" },
        { status: 400 }
      );
    }

    const escapedNama = namaKelas.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Cek apakah guru ini sudah memiliki kelas aktif dengan nama yang sama
    const existing = await Kelas.findOne({
      guru_id: guruId,
      is_active: { $ne: false },
      nama_kelas: { $regex: `^${escapedNama}$`, $options: "i" },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Kelas dengan nama "${namaKelas}" sudah ada.` },
        { status: 409 }
      );
    }

    // Buat kelas baru
    const kodeKelas = await generateKodeKelas(namaKelas);

    const kelas = await Kelas.create({
      guru_id: guruId,
      nama_kelas: namaKelas,
      kode_kelas: kodeKelas,
      is_active: true,
    });

    return NextResponse.json({
      success: true,
      kelas,
    });
  } catch (err) {
    console.error("Error POST kelas:", err);

    return NextResponse.json(
      { error: "Gagal membuat kelas" },
      { status: 500 }
    );
  }
}