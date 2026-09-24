import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;

  const origin =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    req.nextUrl.origin ||
    "http://localhost:3000";

  const redirectUri = `${origin}/api/auth/google/callback`;

  // Jika Google Client ID belum diset di .env.local
  if (!clientId || clientId.includes("isi_dengan_client_id")) {
    return NextResponse.redirect(
      new URL(
        "/login?error=" +
          encodeURIComponent(
            "Konfigurasi Google OAuth belum diisi di file .env.local (GOOGLE_CLIENT_ID & GOOGLE_CLIENT_SECRET)."
          ),
        origin
      )
    );
  }

  // Buat state acak untuk mencegah CSRF
  const state = crypto.randomBytes(16).toString("hex");

  const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  googleAuthUrl.searchParams.set("client_id", clientId);
  googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
  googleAuthUrl.searchParams.set("response_type", "code");
  googleAuthUrl.searchParams.set("scope", "openid email profile");
  googleAuthUrl.searchParams.set("access_type", "offline");
  googleAuthUrl.searchParams.set("prompt", "select_account");
  googleAuthUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(googleAuthUrl.toString());

  // Simpan state di cookie untuk divalidasi pada saat callback
  response.cookies.set("google_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 menit
  });

  return response;
}
