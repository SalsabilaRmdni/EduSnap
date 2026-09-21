import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Guru from "@/models/Guru";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { status: "error", message: "email dan password wajib diisi" },
        { status: 400 }
      );
    }

    await connectDB();

    const guru = await Guru.findOne({ email: email.toLowerCase() });
    if (!guru) {
      return NextResponse.json(
        { status: "error", message: "Email atau password salah" },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(password, guru.password_hash);
    if (!passwordValid) {
      return NextResponse.json(
        { status: "error", message: "Email atau password salah" },
        { status: 401 }
      );
    }

    const token = await createSessionToken({
      guruId: String(guru._id),
      nama: guru.nama,
      email: guru.email,
    });

    const response = NextResponse.json({
      status: "ok",
      message: "Login berhasil",
      guru: { id: guru._id, nama: guru.nama, email: guru.email },
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    return response;
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        message: "Gagal login",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
