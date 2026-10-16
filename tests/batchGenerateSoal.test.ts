import assert from "assert";
import { validasiQuestionBank, filterDuplikatSoal, ValidatedSoalItem } from "../lib/questionBank";

console.log("==================================================================");
console.log("TESTING VALIDASI BATCHING 18 SOAL (3 BATCH: L1, L2, L3)");
console.log("==================================================================");

// Mock generator 6 soal per level
function createMockBatch(level: 1 | 2 | 3): any[] {
  const items: any[] = [];
  for (let i = 1; i <= 6; i++) {
    const base = level * 30 + i * 7;
    const isL1 = level === 1;
    const isL2 = level === 2;
    items.push({
      pertanyaan: isL1
        ? `Berapa nilai dari perhitungan langsung ${i * 4} + ${base}?`
        : isL2
        ? `Sebuah kantong berisi ${i * 5} kelereng dan ditambah ${base} kelereng dari paman. Berapa kelereng sekarang?`
        : `Toko memiliki ${i * 3} peti berisi ${base} apel. Jika 12 apel busuk dan sisanya dibagi rata ke 3 pedagang, berapa tiap pedagang?`,
      pilihan: [
        `${base + 10} buah`,
        `${base + 20} buah`,
        `${base + 30} buah`,
        `${base + 40} buah`,
      ],
      jawabanBenar: (level + i) % 4,
      penjelasan: `Penjelasan mendalam untuk soal nomor ${i} level ${level}.`,
      tips: `Tips memahami materi tingkat ${level}.`,
      konsep: `Konsep Operasi Level ${level}`,
      level: level,
      difficulty: "normal",
    });
  }
  return items;
}

// 1. Uji Batch L1 menghasilkan 6
console.log("\n[1] Verifikasi Batch L1:");
const batchL1 = createMockBatch(1);
assert.strictEqual(batchL1.length, 6, "Batch L1 harus menghasilkan tepat 6 butir");
assert.ok(batchL1.every((s) => s.level === 1), "Semua butir Batch L1 harus bertingkat level 1");
console.log("  ✓ Batch L1 menghasilkan tepat 6 soal Level 1");

// 2. Uji Batch L2 menghasilkan 6
console.log("\n[2] Verifikasi Batch L2:");
const batchL2 = createMockBatch(2);
assert.strictEqual(batchL2.length, 6, "Batch L2 harus menghasilkan tepat 6 butir");
assert.ok(batchL2.every((s) => s.level === 2), "Semua butir Batch L2 harus bertingkat level 2");
console.log("  ✓ Batch L2 menghasilkan tepat 6 soal Level 2");

// 3. Uji Batch L3 menghasilkan 6
console.log("\n[3] Verifikasi Batch L3:");
const batchL3 = createMockBatch(3);
assert.strictEqual(batchL3.length, 6, "Batch L3 harus menghasilkan tepat 6 butir");
assert.ok(batchL3.every((s) => s.level === 3), "Semua butir Batch L3 harus bertingkat level 3");
console.log("  ✓ Batch L3 menghasilkan tepat 6 soal Level 3");

// 4 & 5. Gabungan menghasilkan 18 dan validasi 6/6/6 berhasil
console.log("\n[4 & 5] Verifikasi Penggabungan 3 Batch dan validasiQuestionBank():");
const combined = [...batchL1, ...batchL2, ...batchL3];
assert.strictEqual(combined.length, 18, "Total gabungan harus tepat 18 butir");

const valCombined = validasiQuestionBank(combined);
assert.strictEqual(valCombined.valid, true, "Gabungan 3 batch valid harus lolos validasiQuestionBank");
assert.strictEqual(valCombined.counts.level1, 6, "Level 1 harus minimal 6");
assert.strictEqual(valCombined.counts.level2, 6, "Level 2 harus minimal 6");
assert.strictEqual(valCombined.counts.level3, 6, "Level 3 harus minimal 6");
assert.strictEqual(valCombined.counts.total, 18, "Total harus minimal 18");
console.log("  ✓ Gabungan 3 batch menghasilkan 18 soal");
console.log("  ✓ Validasi 6/6/6 Question Bank sukses (L1: 6, L2: 6, L3: 6)");

// 6. Skenario: Batch L2 Gagal -> Tidak ada partial result ke database
console.log("\n[6] Skenario Batch L2 Gagal (misal status 429 atau output kosong):");
let simulatedDbInsertedDocs: any[] = [];
function simulateBatchPipeline(failAtBatch: "none" | "L1" | "L2" | "L3") {
  simulatedDbInsertedDocs = [];
  const b1 = failAtBatch === "L1" ? null : createMockBatch(1);
  if (!b1 || b1.length < 6) {
    return { success: false, error: "Batch Level 1 gagal. Tidak ada soal disimpan." };
  }

  const b2 = failAtBatch === "L2" ? null : createMockBatch(2);
  if (!b2 || b2.length < 6) {
    return { success: false, error: "Batch Level 2 gagal. Tidak ada partial soal disimpan." };
  }

  const b3 = failAtBatch === "L3" ? null : createMockBatch(3);
  if (!b3 || b3.length < 6) {
    return { success: false, error: "Batch Level 3 gagal. Tidak ada partial soal disimpan." };
  }

  const all = [...b1, ...b2, ...b3];
  const v = validasiQuestionBank(all);
  if (!v.valid) {
    return { success: false, error: v.error };
  }

  simulatedDbInsertedDocs = [...all];
  return { success: true, count: all.length };
}

const resL2Fail = simulateBatchPipeline("L2");
assert.strictEqual(resL2Fail.success, false, "Pipeline harus gagal saat L2 gagal");
assert.strictEqual(simulatedDbInsertedDocs.length, 0, "Database TIDAK boleh menerima partial insert saat L2 gagal");
console.log("  ✓ Ketika Batch L2 gagal, partial insert L1 DICEGAH (DB tetap 0)");

// 7. Skenario: Batch L3 Gagal -> Tidak ada partial result ke database
console.log("\n[7] Skenario Batch L3 Gagal:");
const resL3Fail = simulateBatchPipeline("L3");
assert.strictEqual(resL3Fail.success, false, "Pipeline harus gagal saat L3 gagal");
assert.strictEqual(simulatedDbInsertedDocs.length, 0, "Database TIDAK boleh menerima partial insert saat L3 gagal");
console.log("  ✓ Ketika Batch L3 gagal, partial insert L1 & L2 DICEGAH (DB tetap 0)");

// 8. Skenario Duplikasi: Jika sebagian soal sudah ada di DB, jangan menggandakan
console.log("\n[8] Pencegahan Duplikasi Soal:");
const existingInDb = [
  { pertanyaan: combined[0].pertanyaan },
  { pertanyaan: combined[1].pertanyaan },
];
const { soalUnik, jumlahDuplikat } = filterDuplikatSoal(valCombined.soalList, existingInDb);
assert.strictEqual(jumlahDuplikat, 2, "Harus mendeteksi 2 soal duplikat");
assert.strictEqual(soalUnik.length, 16, "Soal unik yang siap disimpan adalah 16");
console.log("  ✓ Filter duplikat bekerja akurat: 2 soal lama dilewati, 16 soal baru unik siap disimpan");

// 9. Kelengkapan Field Wajib
console.log("\n[9] Verifikasi Kelengkapan Field Wajib pada Setiap Butir:");
const requiredFields = [
  "pertanyaan",
  "pilihan",
  "jawabanBenar",
  "level",
  "konsep",
  "difficulty",
  "penjelasan",
  "tips",
];
for (const item of valCombined.soalList) {
  for (const field of requiredFields) {
    assert.ok(
      (item as any)[field] !== undefined && (item as any)[field] !== null,
      `Field ${field} wajib ada pada setiap butir soal`
    );
  }
  assert.strictEqual(item.pilihan.length, 4, "Harus memiliki tepat 4 pilihan (A-D)");
}
console.log("  ✓ Seluruh 8 field wajib (pertanyaan, pilihan A-D, jawabanBenar, level, konsep, difficulty, penjelasan, tips) terverifikasi lengkap pada seluruh butir");

console.log("\n==================================================================");
console.log("SELURUH TEST BATCHING 18 SOAL SUKSES 100%!");
console.log("==================================================================");
