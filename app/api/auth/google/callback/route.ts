import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Guru from "@/models/Guru";
import { createSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    req.nextUrl.origin ||
    "http://localhost:3000";

  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  const storedState = req.cookies.get("google_oauth_state")?.value;

  if (errorParam) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent("Login Google dibatalkan atau gagal.")}`, origin)
    );
  }

  if (!code || !state || !storedState || state !== storedState) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("Verifikasi keamanan sesi Google OAuth tidak valid.")}`,
        origin
      )
    );
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = `${origin}/api/auth/google/callback`;

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          "Konfigurasi GOOGLE_CLIENT_ID atau GOOGLE_CLIENT_SECRET belum lengkap di .env.local."
        )}`,
        origin
      )
    );
  }

  try {
    // 1. Tukar authorization code dengan tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      console.error("Gagal menukar code Google OAuth:", errText);
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Gagal menukar kode otorisasi dengan akun Google.")}`,
          origin
        )
      );
    }

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // 2. Ambil profil user dari Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Gagal mengambil profil akun Google Anda.")}`,
          origin
        )
      );
    }

    const profile = await profileRes.json();
    const email = profile.email?.toLowerCase();
    const nama = profile.name || profile.given_name || email.split("@")[0];
    const googleId = profile.id;

    if (!email) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Akun Google Anda tidak menyediakan alamat email.")}`,
          origin
        )
      );
    }

    // 3. Simpan atau hubungkan akun guru di MongoDB Atlas
    await connectDB();

    let guru = await Guru.findOne({ email });

    if (!guru) {
      // Buat akun guru baru dari akun Google
      guru = await Guru.create({
        nama,
        email,
        auth_provider: "google",
        google_id: googleId,
      });
    } else {
      // Akun sudah ada, hubungkan google_id jika belum terhubung
      if (!guru.google_id) {
        guru.google_id = googleId;
        await guru.save();
      }
    }

    // 4. Buat sesi token JWT EduSnap yang sama dengan login biasa
    const sessionToken = await createSessionToken({
      guruId: String(guru._id),
      nama: guru.nama,
      email: guru.email,
    });

    // 5. Redirect ke dashboard dan pasang cookie
    const response = NextResponse.redirect(new URL("/dashboard", origin));

    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 hari
    });

    // Hapus cookie state OAuth
    response.cookies.delete("google_oauth_state");

    return response;
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          "Terjadi kesalahan saat memproses login dengan akun Google."
        )}`,
        origin
      )
    );
  }
}
