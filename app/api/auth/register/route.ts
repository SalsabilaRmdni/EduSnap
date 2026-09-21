import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Guru from "@/models/Guru";

export async function POST(req: NextRequest) {
  try {
    const { nama, email, password } = await req.json();

    if (!nama || !email || !password) {
      return NextResponse.json(
        { status: "error", message: "nama, email, dan password wajib diisi" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { status: "error", message: "Password minimal 6 karakter" },
        { status: 400 }
      );
    }

    await connectDB();

    const existing = await Guru.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json(
        { status: "error", message: "Email sudah terdaftar" },
        { status: 409 }
      );
    }

    const password_hash = await bcrypt.hash(password, 10);

    const guru = await Guru.create({
      nama,
      email: email.toLowerCase(),
      password_hash,
    });

    return NextResponse.json({
      status: "ok",
      message: "Registrasi berhasil, silakan login",
      guru: { id: guru._id, nama: guru.nama, email: guru.email },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal registrasi",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
