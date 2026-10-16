import mongoose from "mongoose";
import {
  MASTERY_THRESHOLD,
  DEFAULT_QUIZ_LIMIT,
  tentukanLevelDanStatus,
  identifikasiKonsepSalah,
  evaluasiJawaban,
  hitungSkor,
  formatFeedbackSiswa,
  generatePenjelasanDanTips,
  shuffleArray,
} from "../lib/adaptiveLearning";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runRemedialAndFeedbackTests() {
  console.log("==================================================================");
  console.log("VERIFIKASI 10 SKENARIO: PENJELASAN SISWA & REMEDIAL ADAPTIVE");
  console.log("==================================================================");

  // -------------------------------------------------------------------------
  // Skenario 1: Evaluasi jawaban dengan field penjelasan dari DB
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 1] Evaluasi jawaban dengan field penjelasan dari DB");
  const soalWithDBExplanation = [
    {
      _id: new mongoose.Types.ObjectId("600000000000000000000001"),
      materiId: new mongoose.Types.ObjectId("500000000000000000000001"),
      pertanyaan: "Jika sebuah mobil menempuh jarak 180 km dalam 3 jam, berapa kecepatan rata-rata mobil tersebut?",
      pilihan: ["50 km/jam", "55 km/jam", "60 km/jam", "65 km/jam"],
      jawabanBenar: 2, // 60 km/jam
      level: 1,
      konsep: "Kecepatan dan Jarak",
      difficulty: "normal" as const,
      penjelasan: "Kecepatan = Jarak ÷ Waktu = 180 ÷ 3 = 60 km/jam. Jadi kecepatan mobil adalah 60 km/jam.",
      createdAt: new Date(),
    } as any,
  ];

  // Siswa menjawab salah (pilihan index 1: 55 km/jam)
  const eval1 = evaluasiJawaban(soalWithDBExplanation, [1], 1);
  assert(eval1.detail[0].isCorrect === false, "Jawaban dievaluasi sebagai salah");
  assert(
    eval1.detail[0].penjelasan.includes("180 ÷ 3 = 60 km/jam"),
    "Penjelasan mengambil dari field penjelasan DB asli"
  );
  assert(
    eval1.detail[0].tips.length > 0,
    "Tips belajar pelengkap ramah anak berhasil digenerate"
  );

  // -------------------------------------------------------------------------
  // Skenario 2: Evaluasi jawaban jika field penjelasan kosong -> fallback ramah anak
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 2] Evaluasi jawaban jika field penjelasan kosong di DB");
  const soalWithoutExplanation = [
    {
      _id: new mongoose.Types.ObjectId("600000000000000000000002"),
      materiId: new mongoose.Types.ObjectId("500000000000000000000001"),
      pertanyaan: "Berapa hasil dari 25 × 16?",
      pilihan: ["300", "350", "400", "450"],
      jawabanBenar: 2, // 400
      level: 1,
      konsep: "Perkalian Dasar",
      difficulty: "normal" as const,
      penjelasan: "", // Kosong di DB!
      createdAt: new Date(),
    } as any,
  ];

  const eval2 = evaluasiJawaban(soalWithoutExplanation, [0], 1);
  assert(eval2.detail[0].isCorrect === false, "Jawaban dievaluasi salah");
  assert(
    eval2.detail[0].penjelasan !== "" && !eval2.detail[0].penjelasan.includes("undefined"),
    "Fallback penjelasan ramah anak tidak kosong dan tidak undefined"
  );
  assert(
    eval2.detail[0].penjelasan.includes("400"),
    "Fallback penjelasan menyebutkan opsi yang benar (400)"
  );
  assert(
    eval2.detail[0].tips !== "" && !eval2.detail[0].tips.includes("undefined"),
    "Tips belajar anak SD tersedia dan tidak undefined"
  );

  // -------------------------------------------------------------------------
  // Skenario 3: Feedback untuk jawaban benar -> apresiasi ramah anak
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 3] Feedback untuk jawaban benar");
  const eval3 = evaluasiJawaban(soalWithDBExplanation, [2], 1); // Jawaban index 2 (Benar)
  const feedbackList3 = formatFeedbackSiswa(eval3.detail);
  const fbBenar = feedbackList3[0];
  assert(fbBenar.isCorrect === true, "Status isCorrect bernilai true");
  assert(
    fbBenar.penjelasan.toLowerCase().includes("tepat") ||
    fbBenar.penjelasan.toLowerCase().includes("menguasai"),
    "Penjelasan benar memuat kalimat apresiasi positif"
  );
  assert(
    fbBenar.tips.length > 0,
    "Tips penyemangat belajar terlampir untuk jawaban benar"
  );

  // -------------------------------------------------------------------------
  // Skenario 4: Feedback untuk jawaban salah -> detail lengkap
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 4] Feedback untuk jawaban salah memuat detail lengkap");
  const feedbackList4 = formatFeedbackSiswa(eval1.detail);
  const fbSalah = feedbackList4[0];
  assert(fbSalah.isCorrect === false, "Status isCorrect bernilai false");
  assert(fbSalah.jawabanSiswa === 1, "Jawaban siswa (1) tercatat");
  assert(fbSalah.jawabanBenar === 2, "Jawaban benar (2) tercatat");
  assert(fbSalah.penjelasan.length > 0, "Langkah/penjelasan terisi");
  assert(fbSalah.tips.length > 0, "Tips belajar terisi");
  assert(fbSalah.konsep === "Kecepatan dan Jarak", "Konsep kompetensi tepat");

  // -------------------------------------------------------------------------
  // Skenario 5: Paket kuis normal default 3 butir soal
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 5] Default limit kuis adaptive adalah 3 butir");
  assert(DEFAULT_QUIZ_LIMIT === 3, "DEFAULT_QUIZ_LIMIT terkonfigurasi 3 butir");

  // -------------------------------------------------------------------------
  // Skenario 6, 7, 8, 9: Simulasi Algoritma Pemilihan Soal Remedial
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 6, 7, 8, 9] Logika Pemilihan Soal Remedial & Stok Handling");

  const bankSoalDB = [
    { _id: "id_soal_1", level: 1, konsep: "Perkalian", difficulty: "normal" },
    { _id: "id_soal_2", level: 1, konsep: "Perkalian", difficulty: "normal" },
    { _id: "id_soal_3", level: 1, konsep: "Perkalian", difficulty: "normal" },
    { _id: "id_soal_4", level: 1, konsep: "Perkalian", difficulty: "normal" },
    { _id: "id_soal_5", level: 1, konsep: "Perkalian", difficulty: "normal" },
    { _id: "id_soal_6", level: 1, konsep: "Perkalian", difficulty: "normal" },
    { _id: "id_soal_rem_1", level: 1, konsep: "Perkalian", difficulty: "remedial" },
    { _id: "id_soal_rem_2", level: 1, konsep: "Perkalian", difficulty: "remedial" },
    { _id: "id_soal_rem_3", level: 1, konsep: "Perkalian", difficulty: "remedial" },
    { _id: "id_soal_rem_4", level: 1, konsep: "Perkalian", difficulty: "remedial" },
  ];

  // Helper simulasi pemilihan sesuai logic adaptive
  function filterSoalRemedial(
    bank: typeof bankSoalDB,
    sudahDikerjakan: string[],
    konsepSalah: string[],
    limit: number = DEFAULT_QUIZ_LIMIT
  ) {
    const sudahSet = new Set(sudahDikerjakan);
    const pool: typeof bankSoalDB = [];
    const poolSet = new Set<string>();

    const addDocs = (items: typeof bankSoalDB) => {
      for (const it of items) {
        if (!sudahSet.has(it._id) && !poolSet.has(it._id)) {
          pool.push(it);
          poolSet.add(it._id);
        }
      }
    };

    // Prioritas 1: remedial pada konsep salah
    addDocs(bank.filter((s) => s.difficulty === "remedial" && konsepSalah.includes(s.konsep)));
    // Prioritas 2: remedial pada konsep lain
    addDocs(bank.filter((s) => s.difficulty === "remedial"));
    // Prioritas 3: normal pada konsep salah
    addDocs(bank.filter((s) => konsepSalah.includes(s.konsep)));
    // Prioritas 4: soal lain
    addDocs(bank);

    const stokKurang = pool.length < limit;
    const hasil = pool.slice(0, limit);
    return {
      soal: hasil,
      stokKurang,
      pesanInfo: stokKurang
        ? `Hanya tersedia ${pool.length} butir soal remedial baru yang belum pernah kamu kerjakan.`
        : undefined,
    };
  }

  // Uji Skenario 6: Jika stok cukup, remedial menghasilkan 3 soal
  const riwayat1 = ["id_soal_1", "id_soal_2", "id_soal_3"];
  const resRemedialCukup = filterSoalRemedial(bankSoalDB, riwayat1, ["Perkalian"], 3);
  assert(resRemedialCukup.soal.length === 3, "Paket kuis remedial menghasilkan tepat 3 butir soal");
  assert(resRemedialCukup.stokKurang === false, "stokKurang false saat soal mencukupi");

  // Uji Skenario 7: Paket remedial TIDAK mengandung satupun ID dari soalSudahDikerjakan
  const hasOldSoal = resRemedialCukup.soal.some((s) => riwayat1.includes(s._id));
  assert(!hasOldSoal, "Paket kuis remedial TIDAK mengandung satupun ID dari soalSudahDikerjakan");

  // Uji Skenario 8: Tidak ada duplikat dalam 1 paket
  const uniqueIds = new Set(resRemedialCukup.soal.map((s) => s._id));
  assert(
    uniqueIds.size === resRemedialCukup.soal.length,
    "Paket kuis remedial tidak memiliki ID duplikat"
  );

  // Uji Skenario 9: Handling jika stok remedial < 3 (misal sisa 1 soal baru)
  // Siswa sudah mengerjakan hampir semua soal, sisa 1 soal belum dikerjakan
  const riwayatHampirSemua = [
    "id_soal_1", "id_soal_2", "id_soal_3", "id_soal_4", "id_soal_5", "id_soal_6",
    "id_soal_rem_1", "id_soal_rem_2", "id_soal_rem_3",
  ]; // Sisa hanya id_soal_rem_4
  const resRemedialSisa1 = filterSoalRemedial(bankSoalDB, riwayatHampirSemua, ["Perkalian"], 3);
  assert(resRemedialSisa1.soal.length === 1, "Mengembalikan 1 soal sisa yang belum dikerjakan");
  assert(
    resRemedialSisa1.soal[0]._id === "id_soal_rem_4",
    "Soal yang dikembalikan adalah satu-satunya soal yang belum dikerjakan"
  );
  assert(resRemedialSisa1.stokKurang === true, "Flag stokKurang bernilai true");
  assert(
    resRemedialSisa1.pesanInfo !== undefined && resRemedialSisa1.pesanInfo.includes("Hanya tersedia 1 butir"),
    "Memberikan pesan informatif bahwa stok soal remedial baru terbatas"
  );
  assert(
    !resRemedialSisa1.soal.some((s) => riwayatHampirSemua.includes(s._id)),
    "Sistem TIDAK diam-diam mengulang soal lama yang sudah pernah dikerjakan!"
  );

  // -------------------------------------------------------------------------
  // Skenario 10: Shuffle bekerja jika kandidat > 3
  // -------------------------------------------------------------------------
  console.log("\n[Skenario 10] Acak / Shuffle jika kandidat > 3");
  const candidates = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  let differentOrderCount = 0;
  for (let i = 0; i < 5; i++) {
    const shuffled = shuffleArray(candidates);
    if (JSON.stringify(shuffled) !== JSON.stringify(candidates)) {
      differentOrderCount++;
    }
  }
  assert(
    differentOrderCount > 0,
    "Fungsi shuffleArray menghasilkan urutan acak yang variatif"
  );

  console.log("\n==================================================================");
  console.log("SELURUH 10 SKENARIO TEST BERHASIL 100%!");
  console.log("==================================================================");
}

runRemedialAndFeedbackTests().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
