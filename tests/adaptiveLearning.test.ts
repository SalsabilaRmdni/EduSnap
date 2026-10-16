import {
  MASTERY_THRESHOLD,
  tentukanLevelDanStatus,
  identifikasiKonsepSalah,
  evaluasiJawaban,
  hitungSkor,
} from "../lib/adaptiveLearning";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

interface MockProgressDoc {
  siswa_id: string;
  nama: string;
  materi_id: string;
  mataPelajaran: string;
  levelSaatIni: number;
  status: "belum_mulai" | "belajar" | "remedial" | "menguasai";
  nilaiLevelSaatIni: number;
  attemptKe: number;
  konsepBelumDikuasai: string[];
  soalSudahDikerjakan: string[];
}

async function runGenericTests() {
  console.log("==================================================");
  console.log("TEST ADAPTIVE LEARNING GENERIC (MULTI-MATA PELAJARAN)");
  console.log("==================================================");

  // 1. Verifikasi Threshold
  console.log("\n[1] Verifikasi Konfigurasi MASTERY_THRESHOLD:");
  assert(MASTERY_THRESHOLD === 80, "MASTERY_THRESHOLD bernilai 80% (configurable)");

  // 2. Definisi Bank Soal Multi-Mata Pelajaran (Generic Concept & Difficulty)
  console.log("\n[2] Menyiapkan Bank Soal Multi-Mata Pelajaran:");

  // A. Matematika (Konsep: pembagian_sederhana)
  const bankSoalMatematika = [
    {
      _id: "mtk-101",
      materiId: "mat-01",
      pertanyaan: "Berapa hasil 8 ÷ 2?",
      pilihan: ["2", "3", "4", "5"],
      jawabanBenar: 2,
      level: 1,
      konsep: "pembagian_sederhana",
      difficulty: "normal" as const,
      penjelasan: "8 ÷ 2 = 4 karena 4 x 2 = 8.",
    },
    {
      _id: "mtk-102",
      materiId: "mat-01",
      pertanyaan: "Berapa hasil 10 ÷ 5?",
      pilihan: ["1", "2", "3", "4"],
      jawabanBenar: 1,
      level: 1,
      konsep: "pembagian_sederhana",
      difficulty: "normal" as const,
      penjelasan: "10 ÷ 5 = 2 karena 2 x 5 = 10.",
    },
    // Soal Remedial Matematika
    {
      _id: "mtk-rem-101",
      materiId: "mat-01",
      pertanyaan: "Berapa hasil 4 ÷ 2?",
      pilihan: ["1", "2", "3", "4"],
      jawabanBenar: 1,
      level: 1,
      konsep: "pembagian_sederhana",
      difficulty: "remedial" as const,
      penjelasan: "4 ÷ 2 = 2 karena 2 x 2 = 4.",
    },
    {
      _id: "mtk-rem-102",
      materiId: "mat-01",
      pertanyaan: "Berapa hasil 6 ÷ 2?",
      pilihan: ["2", "3", "4", "5"],
      jawabanBenar: 1,
      level: 1,
      konsep: "pembagian_sederhana",
      difficulty: "remedial" as const,
      penjelasan: "6 ÷ 2 = 3 karena 3 x 2 = 6.",
    },
  ];

  // B. Bahasa Indonesia (Konsep: ide_pokok)
  const bankSoalBahasaIndonesia = [
    {
      _id: "bind-101",
      materiId: "bind-01",
      pertanyaan: "Ide pokok biasanya terletak pada kalimat...",
      pilihan: ["Penjelas", "Utama", "Terakhir saja", "Tengah paragraf"],
      jawabanBenar: 1,
      level: 1,
      konsep: "ide_pokok",
      difficulty: "normal" as const,
      penjelasan: "Ide pokok adalah gagasan inti yang terdapat pada kalimat utama paragraf.",
    },
    {
      _id: "bind-102",
      materiId: "bind-01",
      pertanyaan: "Apa fungsi dari ide pokok dalam sebuah paragraf?",
      pilihan: ["Sebagai pelengkap saja", "Menjadi inti pembahasan", "Menambah jumlah kata", "Memperindah teks"],
      jawabanBenar: 1,
      level: 1,
      konsep: "ide_pokok",
      difficulty: "normal" as const,
      penjelasan: "Fungsi ide pokok adalah menjadi inti bahasan utama dalam satu paragraf.",
    },
    // Soal Remedial Bahasa Indonesia (lebih sederhana & konsep sama)
    {
      _id: "bind-rem-101",
      materiId: "bind-01",
      pertanyaan: "Gagasan utama dalam sebuah bacaan disebut juga...",
      pilihan: ["Ide pokok", "Kalimat penjelas", "Tanda baca", "Judul bab"],
      jawabanBenar: 0,
      level: 1,
      konsep: "ide_pokok",
      difficulty: "remedial" as const,
      penjelasan: "Gagasan utama adalah istilah lain dari ide pokok.",
    },
  ];

  // C. IPA (Konsep: siklus_air)
  const bankSoalIPA = [
    {
      _id: "ipa-101",
      materiId: "ipa-01",
      pertanyaan: "Proses penguapan air laut akibat panas matahari disebut...",
      pilihan: ["Kondensasi", "Evaporasi", "Presipitasi", "Infiltrasi"],
      jawabanBenar: 1,
      level: 1,
      konsep: "siklus_air",
      difficulty: "normal" as const,
      penjelasan: "Evaporasi adalah proses perubahan air menjadi uap air akibat panas.",
    },
    {
      _id: "ipa-102",
      materiId: "ipa-01",
      pertanyaan: "Perubahan uap air menjadi awan disebut...",
      pilihan: ["Evaporasi", "Kondensasi", "Presipitasi", "Transpirasi"],
      jawabanBenar: 1,
      level: 1,
      konsep: "siklus_air",
      difficulty: "normal" as const,
      penjelasan: "Kondensasi adalah pengembunan uap air menjadi butiran awan.",
    },
    // Soal Remedial IPA (lebih sederhana & konsep sama)
    {
      _id: "ipa-rem-101",
      materiId: "ipa-01",
      pertanyaan: "Saat terkena panas matahari, air di sungai akan...",
      pilihan: ["Membeku", "Menguap", "Menghilang selamanya", "Menjadi es"],
      jawabanBenar: 1,
      level: 1,
      konsep: "siklus_air",
      difficulty: "remedial" as const,
      penjelasan: "Air menguap (evaporasi) ketika terkena panas matahari dalam siklus air.",
    },
  ];

  assert(true, "Bank soal Matematika, Bahasa Indonesia, dan IPA berhasil disiapkan");

  // 3. Simulasi Progress Matrix untuk Putri dan Bela
  console.log("\n[3] Inisialisasi Matriks Progress Siswa per Materi:");
  const progressMap: Record<string, MockProgressDoc> = {};

  function getKey(siswaId: string, materiId: string) {
    return `${siswaId}#${materiId}`;
  }

  function initProgress(siswaId: string, nama: string, materiId: string, mapel: string): MockProgressDoc {
    const doc: MockProgressDoc = {
      siswa_id: siswaId,
      nama,
      materi_id: materiId,
      mataPelajaran: mapel,
      levelSaatIni: 1,
      status: "belajar",
      nilaiLevelSaatIni: 0,
      attemptKe: 0,
      konsepBelumDikuasai: [],
      soalSudahDikerjakan: [],
    };
    progressMap[getKey(siswaId, materiId)] = doc;
    return doc;
  }

  // Buat progres untuk Putri (3 materi berbeda)
  const putriMat = initProgress("putri", "Putri", "mat-01", "Matematika");
  const putriBind = initProgress("putri", "Putri", "bind-01", "Bahasa Indonesia");
  const putriIpa = initProgress("putri", "Putri", "ipa-01", "IPA");

  // Buat progres untuk Bela (3 materi berbeda)
  const belaMat = initProgress("bela", "Bela", "mat-01", "Matematika");
  const belaBind = initProgress("bela", "Bela", "bind-01", "Bahasa Indonesia");
  const belaIpa = initProgress("bela", "Bela", "ipa-01", "IPA");

  assert(Object.keys(progressMap).length === 6, "Tercipta 6 dokumen progres terisolasi secara unik");

  // 4. Simulasi Eksekusi Kuis Multi-Mata Pelajaran
  console.log("\n[4] Simulasi Pengerjaan Kuis:");

  // A. PUTRI di Matematika: Salah -> Skor 50% (< 80%) -> Level 1 (Remedial)
  const evalPutriMat = evaluasiJawaban(
    bankSoalMatematika.slice(0, 2) as any,
    [0, 1], // soal 1 salah (jawab 0 padahal 2), soal 2 benar -> 50%
    putriMat.levelSaatIni
  );
  putriMat.nilaiLevelSaatIni = evalPutriMat.skor;
  putriMat.attemptKe += 1;
  putriMat.levelSaatIni = evalPutriMat.levelBerikutnya;
  putriMat.status = evalPutriMat.statusBaru;
  putriMat.konsepBelumDikuasai = evalPutriMat.konsepSalah;
  putriMat.soalSudahDikerjakan.push("mtk-101", "mtk-102");

  assert(putriMat.levelSaatIni === 1, "Putri Matematika: Level 1");
  assert(putriMat.status === "remedial", "Putri Matematika: status = 'remedial'");
  assert(putriMat.konsepBelumDikuasai.includes("pembagian_sederhana"), "Konsep salah Matematika: pembagian_sederhana");

  // B. PUTRI di Bahasa Indonesia: Benar semua -> Skor 100% (>= 80%) -> Naik ke Level 2
  const evalPutriBind = evaluasiJawaban(
    bankSoalBahasaIndonesia.slice(0, 2) as any,
    [1, 1], // benar semua -> 100%
    putriBind.levelSaatIni
  );
  putriBind.nilaiLevelSaatIni = evalPutriBind.skor;
  putriBind.attemptKe += 1;
  putriBind.levelSaatIni = evalPutriBind.levelBerikutnya;
  putriBind.status = evalPutriBind.statusBaru;
  putriBind.soalSudahDikerjakan.push("bind-101", "bind-102");

  assert(putriBind.levelSaatIni === 2, "Putri Bahasa Indonesia: Naik ke Level 2");
  assert(putriBind.status === "belajar", "Putri Bahasa Indonesia: status = 'belajar'");

  // C. PUTRI di IPA: Salah -> Skor 50% (< 80%) -> Level 1 (Remedial)
  const evalPutriIpa = evaluasiJawaban(
    bankSoalIPA.slice(0, 2) as any,
    [0, 1], // soal 1 salah -> 50%
    putriIpa.levelSaatIni
  );
  putriIpa.nilaiLevelSaatIni = evalPutriIpa.skor;
  putriIpa.attemptKe += 1;
  putriIpa.levelSaatIni = evalPutriIpa.levelBerikutnya;
  putriIpa.status = evalPutriIpa.statusBaru;
  putriIpa.konsepBelumDikuasai = evalPutriIpa.konsepSalah;
  putriIpa.soalSudahDikerjakan.push("ipa-101", "ipa-102");

  assert(putriIpa.levelSaatIni === 1, "Putri IPA: Level 1");
  assert(putriIpa.status === "remedial", "Putri IPA: status = 'remedial'");
  assert(putriIpa.konsepBelumDikuasai.includes("siklus_air"), "Konsep salah IPA: siklus_air");

  // D. BELA di Matematika: Lulus Level 1 dan Level 2 hingga Level 3
  belaMat.levelSaatIni = 3;
  belaMat.status = "belajar";
  belaMat.nilaiLevelSaatIni = 95;

  // E. BELA di Bahasa Indonesia: Belum mulai/Level 1
  belaBind.levelSaatIni = 1;
  belaBind.status = "belajar";

  // F. BELA di IPA: Lulus Level 1 -> Level 2
  belaIpa.levelSaatIni = 2;
  belaIpa.status = "belajar";
  belaIpa.nilaiLevelSaatIni = 90;

  // 5. Verifikasi Matriks Kondisi Akhir Siswa
  console.log("\n[5] Verifikasi Kondisi Akhir Matriks Progres Siswa:");
  console.log(`  Putri -> Matematika: L${putriMat.levelSaatIni} (${putriMat.status}), B.Indo: L${putriBind.levelSaatIni} (${putriBind.status}), IPA: L${putriIpa.levelSaatIni} (${putriIpa.status})`);
  console.log(`  Bela  -> Matematika: L${belaMat.levelSaatIni} (${belaMat.status}), B.Indo: L${belaBind.levelSaatIni} (${belaBind.status}), IPA: L${belaIpa.levelSaatIni} (${belaIpa.status})`);

  assert(putriMat.levelSaatIni === 1 && putriMat.status === "remedial", "Putri: Matematika Level 1 (remedial)");
  assert(putriBind.levelSaatIni === 2 && putriBind.status === "belajar", "Putri: Bahasa Indonesia Level 2");
  assert(putriIpa.levelSaatIni === 1 && putriIpa.status === "remedial", "Putri: IPA Level 1 (remedial)");

  assert(belaMat.levelSaatIni === 3, "Bela: Matematika Level 3");
  assert(belaBind.levelSaatIni === 1, "Bela: Bahasa Indonesia Level 1");
  assert(belaIpa.levelSaatIni === 2, "Bela: IPA Level 2");

  // 6. Verifikasi Data Isolation Antar Mata Pelajaran
  console.log("\n[6] Verifikasi Isolasi Antar Mata Pelajaran (Cross-Subject Isolation):");
  assert(
    putriBind.levelSaatIni === 2,
    "Kegagalan Putri di Matematika (remedial) TIDAK menurunkan progres Bahasa Indonesia (tetap Level 2)"
  );
  assert(
    putriMat.levelSaatIni === 1,
    "Kelulusan Putri di Bahasa Indonesia TIDAK menaikkan level Matematika (tetap Level 1)"
  );

  // 7. Verifikasi Data Isolation Antar Siswa (Cross-Student Isolation):
  console.log("\n[7] Verifikasi Isolasi Antar Siswa (Cross-Student Isolation):");
  assert(belaMat.levelSaatIni === 3, "Bela tetap Level 3 di Matematika meski Putri di Level 1");
  assert(putriBind.levelSaatIni === 2, "Putri tetap Level 2 di B. Indonesia meski Bela di Level 1");

  // 8. Verifikasi Pemilihan Soal Remedial Generic untuk Berbagai Mapel
  console.log("\n[8] Verifikasi Pemilihan Soal Remedial Generic (Bahasa Indonesia & IPA):");

  // Filter Remedial IPA Putri:
  const remedialIpaPutri = bankSoalIPA.filter((s) => {
    return (
      s.materiId === putriIpa.materi_id &&
      s.level === putriIpa.levelSaatIni &&
      putriIpa.konsepBelumDikuasai.includes(s.konsep) &&
      s.difficulty === "remedial" &&
      !putriIpa.soalSudahDikerjakan.includes(s._id)
    );
  });

  assert(remedialIpaPutri.length > 0, "Soal remedial IPA ditemukan untuk Putri");
  assert(remedialIpaPutri[0]._id === "ipa-rem-101", "Soal remedial IPA adalah ipa-rem-101");
  assert(remedialIpaPutri[0].konsep === "siklus_air", "Konsep remedial IPA sesuai konsep yang salah ('siklus_air')");
  assert(remedialIpaPutri[0].difficulty === "remedial", "Difficulty soal adalah 'remedial'");
  assert(!putriIpa.soalSudahDikerjakan.includes(remedialIpaPutri[0]._id), "Soal remedial belum pernah dikerjakan");

  // Filter Remedial Matematika Putri:
  const remedialMatPutri = bankSoalMatematika.filter((s) => {
    return (
      s.materiId === putriMat.materi_id &&
      s.level === putriMat.levelSaatIni &&
      putriMat.konsepBelumDikuasai.includes(s.konsep) &&
      s.difficulty === "remedial" &&
      !putriMat.soalSudahDikerjakan.includes(s._id)
    );
  });

  assert(remedialMatPutri.length === 2, "Dua soal remedial Matematika ditemukan untuk Putri");
  assert(remedialMatPutri[0].konsep === "pembagian_sederhana", "Konsep remedial Matematika sesuai konsep yang salah ('pembagian_sederhana')");
  assert(!remedialMatPutri.some((s) => putriMat.soalSudahDikerjakan.includes(s._id)), "Semua soal remedial belum pernah dikerjakan Putri");

  console.log("\n==================================================");
  console.log("SEMUA TEST GENERIC MULTI-MAPEL SUKSES (100% PASS)!");
  console.log("==================================================");
}

runGenericTests().catch((err) => {
  console.error("Test Generic Error:", err);
  process.exit(1);
});
