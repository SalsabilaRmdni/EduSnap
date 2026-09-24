import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { connectDB } from "@/lib/mongodb";
import Guru from "@/models/Guru";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { status: "error", message: "Masukkan alamat email Anda yang terdaftar." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    await connectDB();

    const guru = await Guru.findOne({ email: cleanEmail });
    if (!guru) {
      // Demi keamanan, kembalikan pesan informatif bahwa jika email ada, tautan dikirim
      return NextResponse.json({
        status: "ok",
        message:
          "Jika email Anda terdaftar, tautan reset kata sandi telah dikirimkan ke kotak masuk email Anda.",
      });
    }

    // 1. Buat token acak yang aman
    const rawToken = crypto.randomBytes(32).toString("hex");

    // 2. Simpan hash token SHA-256 dan masa kedaluwarsa (1 jam)
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 jam

    guru.reset_password_token = hashedToken;
    guru.reset_password_expires = expiresAt;
    await guru.save();

    // 3. Tentukan origin aplikasi
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      req.nextUrl.origin ||
      "http://localhost:3000";

    const resetUrl = `${origin}/reset-password?token=${rawToken}`;

    // 4. Kirim email via Nodemailer
    const emailResult = await sendPasswordResetEmail({
      toEmail: guru.email,
      namaGuru: guru.nama,
      resetUrl,
    });

    return NextResponse.json({
      status: "ok",
      message:
        "Tautan untuk mengatur ulang kata sandi telah dikirimkan ke email Anda. Silakan periksa kotak masuk atau spam.",
      simulated: emailResult.simulated || false,
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Terjadi kesalahan saat memproses permintaan reset password.",
      },
      { status: 500 }
    );
  }
}
