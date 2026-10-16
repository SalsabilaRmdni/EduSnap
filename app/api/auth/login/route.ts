import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import Guru from "@/models/Guru";
import { createSessionToken, SESSION_COOKIE_NAME, normalizeRole } from "@/lib/auth";

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

    const cleanInput = email.trim();
    const escapedInput = cleanInput.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const guru = await Guru.findOne({
      $or: [
        { email: cleanInput.toLowerCase() },
        { nama: { $regex: `^${escapedInput}$`, $options: "i" } },
      ],
    });

    if (!guru) {
      return NextResponse.json(
        {
          status: "error",
          message: "Email atau password salah",
        },
        { status: 401 }
      );
    }

    if (!guru.password_hash) {
      return NextResponse.json(
        {
          status: "error",
          message:
            guru.auth_provider === "google"
              ? "Akun ini terdaftar menggunakan Google. Silakan masuk menggunakan tombol 'Masuk dengan Google'."
              : "Email atau password salah",
        },
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

    const role = normalizeRole(guru.role);
    const redirectUrl = role === "admin" ? "/admin/ai" : "/dashboard";

    const token = await createSessionToken({
      guruId: String(guru._id),
      nama: guru.nama,
      email: guru.email,
      role,
    });

    const response = NextResponse.json({
      status: "ok",
      message: "Login berhasil",
      role,
      redirectUrl,
      guru: { id: guru._id, nama: guru.nama, email: guru.email, role },
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
    console.error("Error pada login Guru:", error instanceof Error ? error.message : "Internal error");
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        status: "error",
        message:
          msg.includes("MONGODB_URI") || msg.includes("Mongo") || msg.includes("buffering timed out")
            ? "Gagal terhubung ke database MongoDB. Periksa koneksi internet atau whitelist IP di MongoDB Atlas."
            : msg.includes("JWT_SECRET")
            ? "Konfigurasi server belum lengkap (JWT_SECRET belum diset di .env.local)."
            : "Gagal login. Terjadi kendala pada server, silakan coba lagi.",
      },
      { status: 500 }
    );
  }
}
