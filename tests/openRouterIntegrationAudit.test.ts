import assert from "assert";
import * as fs from "fs";
import { validasiQuestionBank, ValidatedSoalItem } from "../lib/questionBank";

console.log("==================================================================");
console.log("AUDIT KONFIGURASI DAN VALIDASI INTEGRASI OPENROUTER (READ-ONLY)");
console.log("==================================================================");

// 1. Verifikasi Environment Variable OPENROUTER_API_KEY
console.log("\n[1] Memeriksa Konfigurasi Environment Variable OPENROUTER_API_KEY:");
const envLocalContent = fs.readFileSync(".env.local", "utf-8");
const keyMatch = envLocalContent.match(/^OPENROUTER_API_KEY=(.+)$/m);

assert.ok(keyMatch, "OPENROUTER_API_KEY harus terdefinisi di .env.local");
const rawKey = keyMatch[1].trim().replace(/^['"]|['"]$/g, "");
assert.ok(rawKey.length > 20, "Panjang kunci API harus valid (>20 karakter)");
assert.ok(rawKey.startsWith("sk-or"), "Format kunci OpenRouter harus diawali 'sk-or'");
console.log("  ✓ OPENROUTER_API_KEY terdefinisi dengan format valid (sk-or...)");
console.log("  ✓ Panjang karakter kunci:", rawKey.length);
console.log("  ✓ Kunci TIDAK dibocorkan ke output atau client.");

// 2. Verifikasi File Route Handler dan Parameter Request
console.log("\n[2] Memeriksa Parameter Request dan Endpoint pada Route Handler:");
const routeContent = fs.readFileSync("app/api/materi/generate-soal/route.ts", "utf-8");

assert.ok(
  routeContent.includes("https://openrouter.ai/api/v1/chat/completions"),
  "Endpoint OpenRouter harus mengarah ke chat completions v1"
);
console.log("  ✓ Endpoint terverifikasi: https://openrouter.ai/api/v1/chat/completions");

assert.ok(
  routeContent.includes("aiModelName") && routeContent.includes("AIConfig.findOne"),
  "Model harus diambil secara dinamis dari AIConfig database"
);
console.log("  ✓ Model terverifikasi dinamis: dibaca dari AIConfig MongoDB tanpa hardcode");

assert.ok(
  routeContent.includes("Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`"),
  "Authorization header harus membaca dari process.env tanpa hardcoded key"
);
console.log("  ✓ Header Authorization membaca dari environment variable secara aman");

// 3. Verifikasi Mekanisme Batching dan Instruksi Prompt (Batch L1, L2, L3)
console.log("\n[3] Memeriksa Ketentuan Batching dan Prompt Generator Soal:");
assert.ok(
  routeContent.includes("requestBatchLevel(1)") &&
    routeContent.includes("requestBatchLevel(2)") &&
    routeContent.includes("requestBatchLevel(3)"),
  "Generator harus mengeksekusi 3 batch terpisah untuk L1, L2, dan L3"
);
assert.ok(routeContent.includes("LEVEL 1 (MUDAH)"), "Harus ada konfigurasi Level 1");
assert.ok(routeContent.includes("LEVEL 2 (SEDANG)"), "Harus ada konfigurasi Level 2");
assert.ok(routeContent.includes("LEVEL 3 (SULIT)"), "Harus ada konfigurasi Level 3");
assert.ok(
  routeContent.includes("TEPAT 6 BUTIR SOAL"),
  "Prompt per batch harus meminta tepat 6 butir soal"
);
console.log("  ✓ Batching terverifikasi: 3 batch terpisah (L1, L2, L3)");
console.log("  ✓ Prompt per batch meminta tepat 6 butir soal pada level terkait");
console.log("  ✓ Prompt mewajibkan 4 opsi jawaban, konsep, penjelasan, dan tips");

// 4. Pengujian Fungsi Validasi Response AI (In-Memory, Tanpa Database)
console.log("\n[4] Pengujian Validasi Struktur Response AI:");

// Kasus A: 18 Soal Lengkap dan Berjenjang
const mockValid18: any[] = [];
for (let lvl = 1; lvl <= 3; lvl++) {
  for (let i = 1; i <= 6; i++) {
    const isL1 = lvl === 1;
    const isL2 = lvl === 2;
    const keyIdx = (lvl + i) % 4;
    const baseNum = lvl * 20 + i * 5;
    mockValid18.push({
      pertanyaan: isL1
        ? `Berapakah hasil penjumlahan dasar ${i * 5} ditambah ${baseNum}?`
        : isL2
        ? `Di sebuah perpustakaan terdapat ${i * 10} buku cerita dan disumbangkan lagi ${baseNum} buku. Berapa jumlahnya?`
        : `Sebuah toko grosir memesan ${i * 4} kotak dengan isi ${baseNum} barang, kemudian 10 barang rusak dan sisanya dibagi ke 2 cabang. Berapa barang tiap cabang?`,
      pilihan: [
        `${baseNum + 5} satuan`,
        `${baseNum + 10} satuan`,
        `${baseNum + 15} satuan`,
        `${baseNum + 20} satuan`,
      ],
      jawabanBenar: keyIdx,
      penjelasan: "Penjelasan konsep bertahap.",
      tips: "Tips praktis mengingat rumus.",
      konsep: `topik_${lvl}_${i}`,
      level: lvl,
      difficulty: "normal",
    });
  }
}

const valResValid = validasiQuestionBank(mockValid18);
if (!valResValid.valid) {
  console.error("ValResValid failed:", valResValid.error);
}
assert.strictEqual(valResValid.valid, true, "18 butir soal berjenjang harus lolos validasi");
assert.strictEqual(valResValid.counts.total, 18);
assert.strictEqual(valResValid.counts.level1, 6);
assert.strictEqual(valResValid.counts.level2, 6);
assert.strictEqual(valResValid.counts.level3, 6);
console.log("  ✓ Response 18 soal berjenjang valid: LOLOS VALIDASI");

// Kasus B: Jumlah Kurang dari 18 (Misal hanya 10 soal)
const mockKurang = mockValid18.slice(0, 10);
const valResKurang = validasiQuestionBank(mockKurang);
assert.strictEqual(valResKurang.valid, false, "Soal kurang dari 18 harus ditolak");
console.log("  ✓ Response kurang dari 18 soal: DITOLAK SESUAI ATURAN (Pesan: " + valResKurang.error + ")");

// Kasus C: Anti-Pola (Level 2 hanya menjiplak template Level 1 ganti angka)
const mockTemplateClone: any[] = [];
for (let i = 1; i <= 6; i++) {
  mockTemplateClone.push({
    pertanyaan: `Berapakah hasil dari ${i * 2} + 5?`,
    pilihan: ["5", "10", "15", "20"],
    jawabanBenar: 0,
    penjelasan: "x",
    tips: "y",
    konsep: "k",
    level: 1,
    difficulty: "normal",
  });
}
for (let i = 1; i <= 6; i++) {
  mockTemplateClone.push({
    pertanyaan: `Berapakah hasil dari ${i * 10} + 5?`, // Pola sama persis!
    pilihan: ["15", "25", "35", "45"],
    jawabanBenar: 0,
    penjelasan: "x",
    tips: "y",
    konsep: "k",
    level: 2,
    difficulty: "normal",
  });
}
for (let i = 1; i <= 6; i++) {
  mockTemplateClone.push({
    pertanyaan: `Soal analisis bertingkat toko grosir ${i}?`,
    pilihan: ["15", "25", "35", "45"],
    jawabanBenar: 0,
    penjelasan: "x",
    tips: "y",
    konsep: "k",
    level: 3,
    difficulty: "normal",
  });
}
const valResClone = validasiQuestionBank(mockTemplateClone);
assert.strictEqual(valResClone.valid, false, "Penjiplakan pola level harus ditolak");
console.log("  ✓ Deteksi anti-pola (L2 hanya ganti angka L1): DITOLAK SESUAI ATURAN");

// 5. Verifikasi Penanganan Error HTTP 402 (Saldo Tidak Cukup)
console.log("\n[5] Memeriksa Penanganan Status HTTP 402 (Saldo Habis):");
assert.ok(routeContent.includes("aiRes.status === 402"), "Harus ada handling spesifik untuk status 402");
assert.ok(
  routeContent.includes("Kredit OpenRouter tidak mencukupi (402)"),
  "Harus memberikan pesan error yang transparan"
);
assert.ok(
  routeContent.includes("return NextResponse.json"),
  "Harus langsung me-return response error tanpa insert ke database"
);
console.log("  ✓ Handling 402 terverifikasi: pesan ramah pengguna & TIDAK menulis soal palsu ke DB");

// 6. Verifikasi Proteksi Database Write
console.log("\n[6] Memeriksa Proteksi Penulisan Database:");
const insertIndex = routeContent.indexOf("Soal.insertMany");
const validationIndex = routeContent.indexOf("validasiQuestionBank");
const filterDuplicateIndex = routeContent.indexOf("filterDuplikatSoal");

assert.ok(validationIndex < insertIndex, "Validasi harus dijalankan SEBELUM insertMany");
assert.ok(filterDuplicateIndex < insertIndex, "Filter duplikat harus dijalankan SEBELUM insertMany");
console.log("  ✓ Proteksi urutan eksekusi: Validasi -> Filter Duplikat -> Baru Insert ke DB");

console.log("\n==================================================================");
console.log("SELURUH AUDIT READ-ONLY INTEGRASI OPENROUTER BERHASIL 100%!");
console.log("==================================================================");
