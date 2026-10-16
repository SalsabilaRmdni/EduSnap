import assert from "assert";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { connectDB } from "../lib/mongodb";
import { POST as loginHandler } from "../app/api/auth/login/route";
import { GET as meHandler } from "../app/api/auth/me/route";
import { POST as logoutHandler } from "../app/api/auth/logout/route";
import { GET as googleCallbackHandler } from "../app/api/auth/google/callback/route";
import { GET as getAIConfig } from "../app/api/admin/ai-config/route";
import { SESSION_COOKIE_NAME, verifySessionToken, verifyAdminSession } from "../lib/auth";
import Guru from "../models/Guru";
import bcrypt from "bcryptjs";

// Load environment variables from .env.local if not loaded
if (!process.env.MONGODB_URI) {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf-8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const idx = trimmed.indexOf("=");
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        let val = trimmed.slice(idx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        process.env[key] = val;
      }
    }
  }
}

async function runAuthTests() {
  console.log("==================================================");
  console.log("TESTING AUTHENTICATION & LOGIN GURU");
  console.log("==================================================");

  // 1. Tes koneksi MongoDB
  console.log("\n[1] Verifikasi Koneksi MongoDB:");
  await connectDB();
  assert.ok(mongoose.connection.readyState === 1, "Mongoose harus berada dalam status connected (1)");
  console.log("  ✓ MongoDB berhasil terhubung.");

  // 2. Ambil akun Guru kredensial yang ada di database secara read-only
  const existingGuru = await Guru.findOne({
    password_hash: { $exists: true, $ne: "" },
    auth_provider: "credentials",
  });
  assert.ok(existingGuru, "Harus terdapat minimal satu akun Guru kredensial di database");
  console.log("  ✓ Ditemukan akun Guru terdaftar:", existingGuru.email);

  // 3. Tes email salah / belum terdaftar (Harus 401, BUKAN 500)
  console.log("\n[2] Uji Login dengan Email Tidak Terdaftar:");
  const reqUnregistered = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "unregistered_random_user_999@domain.test", password: "randomPassword123" }),
  });
  const resUnregistered = await loginHandler(reqUnregistered);
  const dataUnregistered = await resUnregistered.json();
  assert.strictEqual(resUnregistered.status, 401, "Status code harus 401");
  assert.strictEqual(dataUnregistered.status, "error");
  assert.ok(dataUnregistered.message.includes("Email atau password salah"));
  console.log("  ✓ Email tidak terdaftar mengembalikan 401 dan pesan error yang aman.");

  // 4. Tes email benar tapi password salah (Harus 401, BUKAN 500)
  console.log("\n[3] Uji Login dengan Email Benar + Password Salah:");
  const reqWrongPass = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: existingGuru.email, password: "IncorrectPasswordXYZ123!" }),
  });
  const resWrongPass = await loginHandler(reqWrongPass);
  const dataWrongPass = await resWrongPass.json();
  assert.strictEqual(resWrongPass.status, 401, "Status code harus 401");
  assert.strictEqual(dataWrongPass.status, "error");
  assert.ok(dataWrongPass.message.includes("Email atau password salah"));
  console.log("  ✓ Password salah mengembalikan 401 dan pesan error yang aman.");

  // 5. Tes email akun Google tanpa password (Harus 401 dengan pesan Google, BUKAN 500)
  console.log("\n[4] Uji Akun Google tanpa Password:");
  const googleGuru = await Guru.findOne({ auth_provider: "google" });
  if (googleGuru) {
    const reqGoogle = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: googleGuru.email, password: "anyPassword" }),
    });
    const resGoogle = await loginHandler(reqGoogle);
    const dataGoogle = await resGoogle.json();
    assert.strictEqual(resGoogle.status, 401, "Status code harus 401");
    assert.ok(dataGoogle.message.includes("Google"), "Pesan harus mengarahkan ke Google login");
    console.log("  ✓ Akun Google login via credentials ditolak dengan 401 tanpa crash 500.");
  }

  // 6. Tes pembentukan Session Token dan Cookie
  console.log("\n[5] Verifikasi Session Token dan Cookie guru_session:");
  const { createSessionToken } = await import("../lib/auth");
  const testToken = await createSessionToken({
    guruId: existingGuru._id.toString(),
    nama: existingGuru.nama,
    email: existingGuru.email,
  });
  assert.ok(testToken && testToken.length > 50, "Token harus terbentuk");
  
  const decodedSession = await verifySessionToken(testToken);
  assert.ok(decodedSession, "Token harus dapat diverifikasi");
  assert.strictEqual(decodedSession.guruId, existingGuru._id.toString());
  assert.strictEqual(decodedSession.email, existingGuru.email);
  console.log("  ✓ JWT session token berhasil dibuat dan diverifikasi.");

  // 7. Tes Route /api/auth/me dengan Cookie
  console.log("\n[6] Uji Endpoint /api/auth/me:");
  const reqMe = new NextRequest("http://localhost:3000/api/auth/me", {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${testToken}`,
    },
  });
  const resMe = await meHandler(reqMe);
  const dataMe = await resMe.json();
  assert.strictEqual(resMe.status, 200);
  assert.strictEqual(dataMe.status, "ok");
  assert.strictEqual(dataMe.guru.email, existingGuru.email);
  console.log("  ✓ /api/auth/me membaca session cookie dengan benar.");

  // 8. Tes Logout
  console.log("\n[7] Uji Endpoint /api/auth/logout:");
  const resLogout = await logoutHandler();
  assert.strictEqual(resLogout.status, 200);
  const cookieHeader = resLogout.headers.get("set-cookie") || "";
  assert.ok(cookieHeader.includes(SESSION_COOKIE_NAME), "Header set-cookie harus menghapus cookie");
  console.log("  ✓ Logout berhasil dan menghapus cookie session.");

  // 9. Uji Konsistensi Role pada Session Payload Google OAuth
  console.log("\n[8] Uji Session Payload Google OAuth (Role Guru & Admin):");
  const mockGuru: { role?: "guru" | "admin" } = { role: "guru" };
  const mockAdmin: { role?: "guru" | "admin" } = { role: "admin" };
  const mockDefault: { role?: "guru" | "admin" } = {};

  // A. Guru dengan role "guru"
  const guruRoleToken = await createSessionToken({
    guruId: "test_guru_id_001",
    nama: "Guru Biasa",
    email: "guru.biasa@edusnap.test",
    role: mockGuru.role || "guru",
  });
  const decodedGuruRole = await verifySessionToken(guruRoleToken);
  assert.ok(decodedGuruRole, "Token guru harus valid");
  assert.strictEqual(decodedGuruRole.role, "guru", "Session role harus 'guru'");
  console.log("  ✓ Akun role 'guru' menghasilkan session role 'guru'.");

  // B. Guru dengan role "admin"
  const adminRoleToken = await createSessionToken({
    guruId: "test_admin_id_001",
    nama: "Admin Operator",
    email: "admin.operator@edusnap.test",
    role: mockAdmin.role || "guru",
  });
  const decodedAdminRole = await verifySessionToken(adminRoleToken);
  assert.ok(decodedAdminRole, "Token admin harus valid");
  assert.strictEqual(decodedAdminRole.role, "admin", "Session role harus 'admin'");
  console.log("  ✓ Akun role 'admin' menghasilkan session role 'admin'.");

  // C. Guru tanpa role (fallback ke default "guru")
  const defaultRoleToken = await createSessionToken({
    guruId: "test_default_id_001",
    nama: "Guru Default",
    email: "guru.default@edusnap.test",
    role: mockDefault.role || "guru",
  });
  const decodedDefaultRole = await verifySessionToken(defaultRoleToken);
  assert.ok(decodedDefaultRole, "Token default harus valid");
  assert.strictEqual(decodedDefaultRole.role, "guru", "Fallback role harus 'guru'");
  console.log("  ✓ Akun dengan role kosong menghasilkan fallback session role 'guru'.");

  // 10. Uji Mekanisme Keamanan OAuth Callback (State & Error handling tetap utuh)
  console.log("\n[9] Uji Keamanan Mekanisme Google OAuth Callback:");
  // A. Request callback dengan error param dari Google
  const reqGoogleError = new NextRequest("http://localhost:3000/api/auth/google/callback?error=access_denied");
  const resGoogleError = await googleCallbackHandler(reqGoogleError);
  assert.ok(resGoogleError.status >= 300 && resGoogleError.status < 400, "Harus redirect ke halaman login");
  const redirectLocationError = resGoogleError.headers.get("location") || "";
  assert.ok(redirectLocationError.includes("/login?error="), "Harus redirect ke /login dengan error");
  console.log("  ✓ Callback menangani error param dari Google dengan redirect aman.");

  // B. Request callback dengan CSRF state tidak valid
  const reqInvalidState = new NextRequest("http://localhost:3000/api/auth/google/callback?code=mock_code&state=fake_state");
  const resInvalidState = await googleCallbackHandler(reqInvalidState);
  assert.ok(resInvalidState.status >= 300 && resInvalidState.status < 400, "Harus redirect saat state invalid");
  const redirectLocationState = resInvalidState.headers.get("location") || "";
  // 11. Uji Validasi Role Guru vs Admin & Hak Akses /admin/ai
  console.log("\n[10] Uji Validasi Role Guru vs Admin & Hak Akses /admin/ai:");
  
  // A. Guru dengan role "guru" -> /api/auth/me = "guru" & ditolak dari Admin API
  const testGuruUser = await Guru.create({
    nama: "Test Regular Guru",
    email: `test_regular_${Date.now()}@edusnap.test`,
    password_hash: "$2b$10$dummyhashregular",
    role: "guru",
  });
  const tokenGuruUser = await createSessionToken({
    guruId: testGuruUser._id.toString(),
    nama: testGuruUser.nama,
    email: testGuruUser.email,
    role: "guru",
  });
  const reqMeGuru = new NextRequest("http://localhost:3000/api/auth/me", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenGuruUser}` },
  });
  const resMeGuru = await meHandler(reqMeGuru);
  const dataMeGuru = await resMeGuru.json();
  assert.strictEqual(dataMeGuru.guru.role, "guru", "Guru role guru harus menghasilkan /api/auth/me = guru");
  console.log("  ✓ Guru role guru -> /api/auth/me mengembalikan role: 'guru'.");

  const adminAuthGuru = await verifyAdminSession(tokenGuruUser);
  assert.strictEqual(adminAuthGuru.authorized, false, "Guru biasa tidak boleh lolos verifyAdminSession");
  assert.strictEqual((adminAuthGuru as any).status, 403, "Guru biasa harus ditolak dengan status 403");
  const reqApiGuru = new NextRequest("http://localhost:3000/api/admin/ai-config", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenGuruUser}` },
  });
  const resApiGuru = await getAIConfig(reqApiGuru);
  assert.strictEqual(resApiGuru.status, 403, "API Admin harus menolak akun guru biasa dengan 403");
  console.log("  ✓ Guru biasa ditolak dari /admin/ai dan API Admin dengan 403.");

  // B. Admin dengan role "admin" -> /api/auth/me = "admin" & diizinkan ke Admin API
  const testAdminUser = await Guru.create({
    nama: "Test Admin User",
    email: `test_admin_${Date.now()}@edusnap.test`,
    password_hash: "$2b$10$dummyhashadmin",
    role: "admin",
  });
  const tokenAdminUser = await createSessionToken({
    guruId: testAdminUser._id.toString(),
    nama: testAdminUser.nama,
    email: testAdminUser.email,
    role: "admin",
  });
  const reqMeAdmin = new NextRequest("http://localhost:3000/api/auth/me", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenAdminUser}` },
  });
  const resMeAdmin = await meHandler(reqMeAdmin);
  const dataMeAdmin = await resMeAdmin.json();
  assert.strictEqual(dataMeAdmin.guru.role, "admin", "Admin role admin harus menghasilkan /api/auth/me = admin");
  console.log("  ✓ Admin role admin -> /api/auth/me mengembalikan role: 'admin'.");

  const adminAuthAdmin = await verifyAdminSession(tokenAdminUser);
  assert.strictEqual(adminAuthAdmin.authorized, true, "Admin harus lolos verifyAdminSession");
  const reqApiAdmin = new NextRequest("http://localhost:3000/api/admin/ai-config", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${tokenAdminUser}` },
  });
  const resApiAdmin = await getAIConfig(reqApiAdmin);
  assert.notStrictEqual(resApiAdmin.status, 401, "Admin tidak boleh 401");
  assert.notStrictEqual(resApiAdmin.status, 403, "Admin tidak boleh 403");
  console.log("  ✓ Admin diizinkan mengakses /admin/ai dan API Admin (Status: 200).");

  // C. Uji Perubahan Dinamis Role di Database (Guru dipromosikan jadi Admin)
  console.log("\n[11] Uji Pembacaan Dinamis Perubahan Role di Database:");
  // Ubah role user testGuruUser di database dari "guru" menjadi "admin"
  await Guru.updateOne({ _id: testGuruUser._id }, { $set: { role: "admin" } });
  
  // Panggil /api/auth/me menggunakan token lama (yang awalnya dibuat saat role guru)
  const resMeDynamic = await meHandler(reqMeGuru);
  const dataMeDynamic = await resMeDynamic.json();
  assert.strictEqual(dataMeDynamic.guru.role, "admin", "Role baru di DB harus langsung terbaca sebagai admin");

  const adminAuthDynamic = await verifyAdminSession(tokenGuruUser);
  assert.strictEqual(adminAuthDynamic.authorized, true, "User yang dipromosikan harus langsung diizinkan sebagai admin");
  console.log("  ✓ Perubahan role di MongoDB langsung terbaca tanpa perlu token/login baru.");

  // D. Uji Normalisasi Pre-Init Schema (Normalisasi jika key tersimpan malformed)
  const testMalformedDoc = await Guru.create({
    nama: "Test Malformed Admin",
    email: `test_malformed_${Date.now()}@edusnap.test`,
    password_hash: "$2b$10$dummyhashmalformed",
    role: "guru",
  });
  // Simulasikan malformed key di MongoDB raw collection
  await mongoose.connection.db!.collection("gurus").updateOne(
    { _id: testMalformedDoc._id },
    { $unset: { role: "" }, $set: { 'role: "admin"': "" } }
  );
  const malformedFetched = await Guru.findById(testMalformedDoc._id);
  assert.strictEqual(malformedFetched?.role, "admin", "Pre-init hook harus menormalkan malformed role ke 'admin'");
  console.log("  ✓ Normalisasi pre-init schema berhasil membaca role admin dari malformed key.");

  // Cleanup data tes
  await Guru.deleteMany({
    email: { $in: [testGuruUser.email, testAdminUser.email, testMalformedDoc.email] },
  });

  // 12. Uji Role-Based Redirect Setelah Login (Credentials & Google OAuth)
  console.log("\n[12] Uji Role-Based Redirect Setelah Login (Credentials & Google OAuth):");

  const hashedPassword = await bcrypt.hash("TestPass123!", 10);

  // A. Credentials Login: Admin -> redirect /admin/ai
  const credAdmin = await Guru.create({
    nama: "Admin Redirect Test",
    email: `test_cred_admin_${Date.now()}@edusnap.test`,
    password_hash: hashedPassword,
    role: "admin",
  });
  const reqCredAdmin = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: credAdmin.email, password: "TestPass123!" }),
  });
  const resCredAdmin = await loginHandler(reqCredAdmin);
  const dataCredAdmin = await resCredAdmin.json();
  assert.strictEqual(resCredAdmin.status, 200);
  assert.strictEqual(dataCredAdmin.role, "admin", "Role admin harus dikembalikan");
  assert.strictEqual(dataCredAdmin.redirectUrl, "/admin/ai", "Admin harus diarahkan ke /admin/ai");
  console.log("  ✓ Credentials login admin -> redirectUrl: '/admin/ai'.");

  // B. Credentials Login: Guru -> redirect /dashboard
  const credGuru = await Guru.create({
    nama: "Guru Redirect Test",
    email: `test_cred_guru_${Date.now()}@edusnap.test`,
    password_hash: hashedPassword,
    role: "guru",
  });
  const reqCredGuru = new NextRequest("http://localhost:3000/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: credGuru.email, password: "TestPass123!" }),
  });
  const resCredGuru = await loginHandler(reqCredGuru);
  const dataCredGuru = await resCredGuru.json();
  assert.strictEqual(resCredGuru.status, 200);
  assert.strictEqual(dataCredGuru.role, "guru", "Role guru harus dikembalikan");
  assert.strictEqual(dataCredGuru.redirectUrl, "/dashboard", "Guru harus diarahkan ke /dashboard");
  console.log("  ✓ Credentials login guru -> redirectUrl: '/dashboard'.");

  // C. Google OAuth: Admin -> redirect /admin/ai
  const googleAdmin = await Guru.create({
    nama: "Google Admin Test",
    email: `test_google_admin_${Date.now()}@edusnap.test`,
    role: "admin",
    auth_provider: "google",
  });

  const originalFetch = globalThis.fetch;
  try {
    let mockEmail = googleAdmin.email;
    globalThis.fetch = async (input: any, init?: any) => {
      const urlStr = String(input);
      if (urlStr.includes("oauth2.googleapis.com/token")) {
        return new Response(JSON.stringify({ access_token: "mock_access_token_123" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (urlStr.includes("googleapis.com/oauth2/v2/userinfo")) {
        return new Response(
          JSON.stringify({
            id: `google_id_${Date.now()}`,
            email: mockEmail,
            name: "Mock Google User",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
      return originalFetch(input, init);
    };

    const reqGoogleAdmin = new NextRequest(
      "http://localhost:3000/api/auth/google/callback?code=mock_code&state=valid_state",
      {
        headers: { cookie: "google_oauth_state=valid_state" },
      }
    );
    const resGoogleAdmin = await googleCallbackHandler(reqGoogleAdmin);
    assert.strictEqual(resGoogleAdmin.status, 307);
    const locationAdmin = resGoogleAdmin.headers.get("location") || "";
    assert.ok(locationAdmin.endsWith("/admin/ai"), `Google OAuth admin harus redirect ke /admin/ai, got: ${locationAdmin}`);
    console.log("  ✓ Google OAuth callback admin -> redirect ke '/admin/ai'.");

    // D. Google OAuth: Guru -> redirect /dashboard
    const googleGuru = await Guru.create({
      nama: "Google Guru Test",
      email: `test_google_guru_${Date.now()}@edusnap.test`,
      role: "guru",
      auth_provider: "google",
    });
    mockEmail = googleGuru.email;

    const reqGoogleGuru = new NextRequest(
      "http://localhost:3000/api/auth/google/callback?code=mock_code&state=valid_state",
      {
        headers: { cookie: "google_oauth_state=valid_state" },
      }
    );
    const resGoogleGuru = await googleCallbackHandler(reqGoogleGuru);
    assert.strictEqual(resGoogleGuru.status, 307);
    const locationGuru = resGoogleGuru.headers.get("location") || "";
    assert.ok(locationGuru.endsWith("/dashboard"), `Google OAuth guru harus redirect ke /dashboard, got: ${locationGuru}`);
    console.log("  ✓ Google OAuth callback guru -> redirect ke '/dashboard'.");

    await Guru.deleteMany({
      email: { $in: [googleAdmin.email, googleGuru.email] },
    });
  } finally {
    globalThis.fetch = originalFetch;
  }

  await Guru.deleteMany({
    email: { $in: [credAdmin.email, credGuru.email] },
  });

  console.log("\n==================================================");
  console.log("SEMUA PENGUJIAN AUTHENTICATION & LOGIN GURU SUKSES (100% PASS)!");
  console.log("==================================================");
  await mongoose.disconnect();
}

runAuthTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
