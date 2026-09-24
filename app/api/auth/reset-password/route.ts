import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Guru from "@/models/Guru";

export async function POST(req: NextRequest) {
  try {
    const { token, password } = await req.json();

    if (!token || typeof token !== "string" || !token.trim()) {
      return NextResponse.json(
        { status: "error", message: "Token reset kata sandi tidak valid." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { status: "error", message: "Kata sandi baru minimal 6 karakter." },
        { status: 400 }
      );
    }

    await connectDB();

    // Hash token untuk dicocokkan dengan yang ada di database
    const hashedToken = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const guru = await Guru.findOne({
      reset_password_token: hashedToken,
      reset_password_expires: { $gt: new Date() },
    });

    if (!guru) {
      return NextResponse.json(
        {
          status: "error",
          message:
            "Tautan reset kata sandi tidak valid atau sudah kedaluwarsa. Silakan ajukan permintaan baru.",
        },
        { status: 400 }
      );
    }

    // Hash password baru menggunakan bcrypt
    const password_hash = await bcrypt.hash(password, 10);

    guru.password_hash = password_hash;
    guru.reset_password_token = undefined;
    guru.reset_password_expires = undefined;
    await guru.save();

    return NextResponse.json({
      status: "ok",
      message: "Kata sandi berhasil diatur ulang! Silakan masuk dengan kata sandi baru Anda.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat mengatur ulang kata sandi.",
      },
      { status: 500 }
    );
  }
}
