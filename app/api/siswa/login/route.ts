import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Kelas from "@/models/Kelas";
import Siswa from "@/models/Siswa";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { nama, kodeKelas } = await req.json();

    const cleanNama = typeof nama === "string" ? nama.trim() : "";
    const cleanKode = typeof kodeKelas === "string" ? kodeKelas.trim().toUpperCase() : "";

    if (!cleanNama) {
      return NextResponse.json(
        { status: "error", message: "Masukkan nama lengkap kamu terlebih dahulu." },
        { status: 400 }
      );
    }

    if (!cleanKode) {
      return NextResponse.json(
        { status: "error", message: "Masukkan kode kelas dari gurumu." },
        { status: 400 }
      );
    }

    // 1. Cari kelas berdasarkan kode_kelas
    const kelas = await Kelas.findOne({ kode_kelas: cleanKode });
    if (!kelas) {
      return NextResponse.json(
        { status: "error", message: `Kode kelas "${cleanKode}" tidak ditemukan. Silakan tanyakan kode kelas yang tepat ke gurumu.` },
        { status: 404 }
      );
    }

    // 2. Pastikan siswa terdaftar di kelas tersebut
    const escapedNama = cleanNama.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const siswa = await Siswa.findOne({
      kelas_id: kelas._id,
      nama: { $regex: `^${escapedNama}$`, $options: "i" },
    });

    if (!siswa) {
      return NextResponse.json(
        {
          status: "error",
          message: `Nama "${cleanNama}" belum terdaftar di ${kelas.nama_kelas}. Periksa ejaan namamu atau minta gurumu menambahkannya.`,
        },
        { status: 404 }
      );
    }

    // Siswa valid!
    return NextResponse.json({
      status: "ok",
      message: `Selamat datang di ${kelas.nama_kelas}, ${siswa.nama}!`,
      siswa: {
        id: siswa._id,
        nama: siswa.nama,
      },
      kelas: {
        id: kelas._id,
        nama_kelas: kelas.nama_kelas,
        kode_kelas: kelas.kode_kelas,
      },
    });
  } catch (error) {
    console.error("Error login siswa:", error);
    return NextResponse.json(
      { status: "error", message: "Terjadi kesalahan pada server saat verifikasi siswa." },
      { status: 500 }
    );
  }
}
