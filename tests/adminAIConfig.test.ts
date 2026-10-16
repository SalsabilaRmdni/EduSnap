import assert from "assert";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { connectDB } from "../lib/mongodb";
import { createSessionToken, SESSION_COOKIE_NAME } from "../lib/auth";
import Guru from "../models/Guru";
import AIConfig from "../models/AIConfig";
import { GET as getAIConfig, PUT as putAIConfig } from "../app/api/admin/ai-config/route";
import { POST as generateSoalHandler } from "../app/api/materi/generate-soal/route";
import Materi from "../models/Materi";

// Load environment variables from .env.local
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

async function runAdminAITests() {
  console.log("==================================================");
  console.log("TESTING ADMIN AI CONFIGURATION & ACCESS CONTROL");
  console.log("==================================================");

  await connectDB();

  // Bersihkan data tes terdahulu jika ada
  await Guru.deleteMany({ email: /test_admin_suite_.*@edusnap\.test/ });
  await AIConfig.deleteMany({ model: /test-model-.*/ });

  // 1. Setup Akun Guru Biasa dan Akun Admin
  const regularGuru = await Guru.create({
    nama: "Guru Biasa Test",
    email: `test_admin_suite_guru_${Date.now()}@edusnap.test`,
    password_hash: "$2b$10$dummyhashforregularguru",
    role: "guru",
  });

  const adminGuru = await Guru.create({
    nama: "Admin Test",
    email: `test_admin_suite_admin_${Date.now()}@edusnap.test`,
    password_hash: "$2b$10$dummyhashforadminguru",
    role: "admin",
  });

  const regularToken = await createSessionToken({
    guruId: String(regularGuru._id),
    nama: regularGuru.nama,
    email: regularGuru.email,
    role: "guru",
  });

  const adminToken = await createSessionToken({
    guruId: String(adminGuru._id),
    nama: adminGuru.nama,
    email: adminGuru.email,
    role: "admin",
  });

  // ==================================================
  // TEST 1: User tanpa login ditolak dari Admin API
  // ==================================================
  console.log("\n[1] User Tanpa Login Mengakses Admin API (Harus 401):");
  const reqNoAuth = new NextRequest("http://localhost:3000/api/admin/ai-config");
  const resNoAuth = await getAIConfig(reqNoAuth);
  assert.strictEqual(resNoAuth.status, 401, "Harus ditolak dengan HTTP 401");
  console.log("  ✓ Akses tanpa login ditolak dengan 401");

  // ==================================================
  // TEST 2: Guru Biasa ditolak dari Admin API
  // ==================================================
  console.log("\n[2] Guru Biasa Mengakses Admin API (Harus 403):");
  const reqGuruGet = new NextRequest("http://localhost:3000/api/admin/ai-config", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${regularToken}` },
  });
  const resGuruGet = await getAIConfig(reqGuruGet);
  assert.strictEqual(resGuruGet.status, 403, "Guru biasa harus ditolak dengan HTTP 403");

  const reqGuruPut = new NextRequest("http://localhost:3000/api/admin/ai-config", {
    method: "PUT",
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${regularToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "openrouter",
      model: "openrouter/free",
      reasoningEffort: "medium",
      isActive: true,
    }),
  });
  const resGuruPut = await putAIConfig(reqGuruPut);
  assert.strictEqual(resGuruPut.status, 403, "Guru biasa tidak boleh PUT konfigurasi AI (403)");
  console.log("  ✓ Guru biasa berhasil ditolak dari GET dan PUT Admin API dengan 403");

  // ==================================================
  // TEST 3: Admin Berhasil GET & PUT Konfigurasi AI
  // ==================================================
  console.log("\n[3] Admin Mengakses dan Menyimpan Konfigurasi AI:");
  const testModelA = `test-model-free-${Date.now()}`;
  const reqAdminPut = new NextRequest("http://localhost:3000/api/admin/ai-config", {
    method: "PUT",
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${adminToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      provider: "openrouter",
      model: testModelA,
      reasoningEffort: "medium",
      isActive: true,
    }),
  });
  const resAdminPut = await putAIConfig(reqAdminPut);
  const dataAdminPut = await resAdminPut.json();
  assert.strictEqual(resAdminPut.status, 200, "Admin harus berhasil menyimpan konfigurasi (200)");
  assert.strictEqual(dataAdminPut.data.model, testModelA);
  console.log("  ✓ Admin berhasil PUT konfigurasi AI baru");

  const reqAdminGet = new NextRequest("http://localhost:3000/api/admin/ai-config", {
    headers: { cookie: `${SESSION_COOKIE_NAME}=${adminToken}` },
  });
  const resAdminGet = await getAIConfig(reqAdminGet);
  const dataAdminGet = await resAdminGet.json();
  assert.strictEqual(resAdminGet.status, 200);
  assert.strictEqual(dataAdminGet.data.model, testModelA);
  console.log("  ✓ Admin berhasil GET konfigurasi AI aktif dari database");

  // ==================================================
  // TEST 4: Proteksi Keamanan API Key
  // ==================================================
  console.log("\n[4] Memeriksa Proteksi API Key:");
  const resString = JSON.stringify(dataAdminGet);
  assert.ok(!resString.includes("sk-or"), "API Key tidak boleh pernah bocor di response API");
  assert.ok(!resString.includes("OPENROUTER_API_KEY"), "Key name tidak boleh ada di response");
  const configInDb = await AIConfig.findOne({ model: testModelA }).lean();
  assert.ok(configInDb, "Dokumen config harus ada di DB");
  assert.strictEqual((configInDb as any).apiKey, undefined, "Field apiKey tidak boleh ada di MongoDB");
  assert.strictEqual((configInDb as any).OPENROUTER_API_KEY, undefined, "Field OPENROUTER_API_KEY tidak boleh ada di MongoDB");
  console.log("  ✓ API Key terbukti aman: tidak pernah di database dan tidak ada di response API");

  // ==================================================
  // TEST 5: Generate Soal Membaca Model Dinamis dari AIConfig
  // ==================================================
  console.log("\n[5] Verifikasi Generate Soal Mengambil Model Dinamis:");

  // Siapkan materi tes untuk Guru biasa
  const testMateri = await Materi.create({
    namaMateri: "Materi Tes AI Model Switch",
    mataPelajaran: "Matematika",
    kelas: "Kelas 4 SD",
    halaman: "Hal 1-5",
    gambarList: ["data:image/png;base64,dummy"],
    teksHasilOCR: "Operasi hitung perkalian dan pembagian dasar untuk siswa kelas empat.",
    guru_id: regularGuru._id,
    guruEmail: regularGuru.email,
  });

  // Mock global fetch untuk menangkap model yang dikirim ke OpenRouter
  let capturedModelInRequest = "";
  let capturedReasoningInRequest = "";
  const originalFetch = global.fetch;

  // Mock 6 soal per level agar batching berhasil
  function getMockAIResponse(level: number) {
    const list = [];
    for (let i = 1; i <= 6; i++) {
      list.push({
        pertanyaan: `Pertanyaan model switch level ${level} nomor ${i}?`,
        pilihan: ["A", "B", "C", "D"],
        jawabanBenar: (i + level) % 4,
        penjelasan: "Penjelasan",
        tips: "Tips",
        konsep: `Konsep ${level}_${i}`,
        level: level,
        difficulty: "normal",
      });
    }
    return JSON.stringify(list);
  }

  (global as any).fetch = async (url: string, opts: any) => {
    if (String(url).includes("openrouter.ai")) {
      const parsedBody = JSON.parse(opts.body);
      capturedModelInRequest = parsedBody.model;
      capturedReasoningInRequest = parsedBody.reasoning?.effort || "none";
      const lvl = capturedModelInRequest ? 1 : 1;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: getMockAIResponse(lvl) } }],
        }),
      } as any;
    }
    return originalFetch(url, opts);
  };

  try {
    // A. Generate Soal dengan model A
    const reqGenA = new NextRequest("http://localhost:3000/api/materi/generate-soal", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${regularToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ materiId: String(testMateri._id) }),
    });
    await generateSoalHandler(reqGenA);
    assert.strictEqual(
      capturedModelInRequest,
      testModelA,
      "Generate Soal harus membaca model A dari database"
    );
    console.log(`  ✓ Generate Soal berhasil membaca model aktif dari database: "${testModelA}"`);

    // B. Admin mengganti model menjadi model B di database
    const testModelB = `test-model-premium-${Date.now()}`;
    await AIConfig.updateOne(
      { model: testModelA },
      { model: testModelB, reasoningEffort: "high" }
    );

    // C. Generate Soal berikutnya (tanpa ubah source code) harus memakai model B
    const reqGenB = new NextRequest("http://localhost:3000/api/materi/generate-soal", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${regularToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ materiId: String(testMateri._id) }),
    });
    await generateSoalHandler(reqGenB);
    assert.strictEqual(
      capturedModelInRequest,
      testModelB,
      "Generate Soal harus membaca model B yang baru dari database tanpa ubah kode"
    );
    assert.strictEqual(
      capturedReasoningInRequest,
      "high",
      "Generate Soal harus membaca reasoning effort 'high' dari database"
    );
    console.log(`  ✓ Model berhasil beralih ke: "${testModelB}" (reasoning: high) secara dinamis`);

    // ==================================================
    // TEST 6: AIConfig Inactive menghentikan Generate Soal
    // ==================================================
    console.log("\n[6] AIConfig Dinonaktifkan (isActive: false):");
    await AIConfig.updateOne({ model: testModelB }, { isActive: false });

    const reqGenInactive = new NextRequest("http://localhost:3000/api/materi/generate-soal", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${regularToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ materiId: String(testMateri._id) }),
    });
    const resGenInactive = await generateSoalHandler(reqGenInactive);
    const dataGenInactive = await resGenInactive.json();
    assert.strictEqual(resGenInactive.status, 503, "Harus mengembalikan HTTP 503");
    assert.ok(
      dataGenInactive.error.includes("dinonaktifkan"),
      "Harus ada pesan layanan dinonaktifkan"
    );
    console.log("  ✓ Request dibatalkan dengan aman saat AIConfig inactive (503)");

    // ==================================================
    // TEST 7: AIConfig Belum Dikonfigurasi (Tidak Ada Dokumen)
    // ==================================================
    console.log("\n[7] AIConfig Belum Ada di Database (Tanpa Fallback Diam-diam):");
    await AIConfig.deleteMany({}); // Hapus semua konfigurasi sementara

    const reqGenEmpty = new NextRequest("http://localhost:3000/api/materi/generate-soal", {
      method: "POST",
      headers: {
        cookie: `${SESSION_COOKIE_NAME}=${regularToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ materiId: String(testMateri._id) }),
    });
    const resGenEmpty = await generateSoalHandler(reqGenEmpty);
    const dataGenEmpty = await resGenEmpty.json();
    assert.strictEqual(resGenEmpty.status, 503, "Harus mengembalikan HTTP 503");
    assert.ok(
      dataGenEmpty.error.includes("belum tersedia"),
      "Harus memberi tahu guru bahwa AI belum dikonfigurasi oleh admin"
    );
    console.log("  ✓ Request ditolak dengan jelas dan TIDAK ADA fallback diam-diam (503)");

    // Kembalikan konfigurasi standar aktif untuk database
    await AIConfig.create({
      provider: "openrouter",
      model: "openrouter/free",
      reasoningEffort: "medium",
      isActive: true,
    });
    console.log("  ✓ Konfigurasi default aktif dikembalikan ke MongoDB (openrouter/free).");
  } finally {
    // Restore fetch asli
    global.fetch = originalFetch;
  }

  // Bersihkan data tes
  await Guru.deleteMany({ _id: { $in: [regularGuru._id, adminGuru._id] } });
  await Materi.deleteOne({ _id: testMateri._id });

  console.log("\n==================================================");
  console.log("SELURUH TEST ADMIN AI CONFIGURATION SUKSES 100%!");
  console.log("==================================================");

  await mongoose.disconnect();
}

runAdminAITests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
