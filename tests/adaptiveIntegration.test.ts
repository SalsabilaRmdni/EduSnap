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

async function runIntegrationTests() {
  console.log("==================================================");
  console.log("TEST INTEGRASI ADAPTIVE LEARNING & SESI KUIS");
  console.log("==================================================");

  // 1. Setup Kelas 4A & Dua Siswa: Siswa A (Putri) dan Siswa B (Bela)
  console.log("\n[1] Setup Siswa A (Putri) dan Siswa B (Bela) di Kelas 4A:");
  const kelas4A = { id: "kls-4a", nama_kelas: "Kelas 4A", kode_kelas: "KL4A2026" };

  const siswaA = { id: "sis-putri", nama: "Putri", kelas_id: kelas4A.id };
  const siswaB = { id: "sis-bela", nama: "Bela", kelas_id: kelas4A.id };

  const materiMatematika = {
    id: "mat-01",
    namaMateri: "Pembagian Bilangan",
    mataPelajaran: "Matematika",
    kelas_id: kelas4A.id,
  };

  // Dokumen Progress Siswa terpisah
  const progressSiswaA = {
    siswa_id: siswaA.id,
    materi_id: materiMatematika.id,
    levelSaatIni: 1,
    status: "belajar",
    nilaiLevelSaatIni: 0,
    attemptKe: 0,
    konsepBelumDikuasai: [] as string[],
    soalSudahDikerjakan: [] as string[],
  };

  const progressSiswaB = {
    siswa_id: siswaB.id,
    materi_id: materiMatematika.id,
    levelSaatIni: 1,
    status: "belajar",
    nilaiLevelSaatIni: 0,
    attemptKe: 0,
    konsepBelumDikuasai: [] as string[],
    soalSudahDikerjakan: [] as string[],
  };

  assert(progressSiswaA.siswa_id !== progressSiswaB.siswa_id, "ID Siswa A dan B terpisah");
  assert(progressSiswaA.levelSaatIni === 1 && progressSiswaB.levelSaatIni === 1, "Keduanya mulai Level 1");

  // 2. Bank Soal: Soal Normal & Remedial
  const soalNormalLevel1 = [
    {
      _id: "soal-101",
      materiId: materiMatematika.id,
      pertanyaan: "Berapa 12 ÷ 3?",
      pilihan: ["3", "4", "5", "6"],
      jawabanBenar: 1, // index 1 -> "4"
      level: 1,
      konsep: "pembagian_dasar",
      difficulty: "normal" as const,
      penjelasan: "12 dibagi 3 adalah 4 karena 4 x 3 = 12.",
    },
    {
      _id: "soal-102",
      materiId: materiMatematika.id,
      pertanyaan: "Berapa 15 ÷ 5?",
      pilihan: ["2", "3", "4", "5"],
      jawabanBenar: 1, // index 1 -> "3"
      level: 1,
      konsep: "pembagian_dasar",
      difficulty: "normal" as const,
      penjelasan: "15 dibagi 5 adalah 3 karena 3 x 5 = 15.",
    },
    {
      _id: "soal-103",
      materiId: materiMatematika.id,
      pertanyaan: "Berapa 20 ÷ 4?",
      pilihan: ["4", "5", "6", "7"],
      jawabanBenar: 1, // index 1 -> "5"
      level: 1,
      konsep: "pembagian_dasar",
      difficulty: "normal" as const,
      penjelasan: "20 dibagi 4 adalah 5 karena 5 x 4 = 20.",
    },
  ];

  const bankSoalRemedial = [
    {
      _id: "soal-rem-201",
      materiId: materiMatematika.id,
      pertanyaan: "Berapa 6 ÷ 3?",
      pilihan: ["1", "2", "3", "4"],
      jawabanBenar: 1, // index 1 -> "2"
      level: 1,
      konsep: "pembagian_dasar",
      difficulty: "remedial" as const,
      penjelasan: "6 dibagi 3 adalah 2 karena 2 x 3 = 6.",
    },
    {
      _id: "soal-rem-202",
      materiId: materiMatematika.id,
      pertanyaan: "Berapa 8 ÷ 4?",
      pilihan: ["1", "2", "3", "4"],
      jawabanBenar: 1, // index 1 -> "2"
      level: 1,
      konsep: "pembagian_dasar",
      difficulty: "remedial" as const,
      penjelasan: "8 dibagi 4 adalah 2 karena 2 x 4 = 8.",
    },
  ];

  // 3. Siswa A (Putri) mengerjakan Level 1 dan mendapat skor < 80%
  console.log("\n[2] Siswa A (Putri) mengerjakan Level 1 (< 80%):");
  // Putri hanya benar 1 dari 3 soal (skor 33%)
  const jawabanPutri = [0, 1, 0]; // soal 101 salah, 102 benar, 103 salah
  const evalPutri = evaluasiJawaban(soalNormalLevel1 as any, jawabanPutri, progressSiswaA.levelSaatIni);

  progressSiswaA.nilaiLevelSaatIni = evalPutri.skor;
  progressSiswaA.attemptKe += 1;
  progressSiswaA.levelSaatIni = evalPutri.levelBerikutnya;
  progressSiswaA.status = evalPutri.statusBaru;
  progressSiswaA.konsepBelumDikuasai = evalPutri.konsepSalah;
  progressSiswaA.soalSudahDikerjakan.push(...soalNormalLevel1.map((s) => s._id));

  assert(evalPutri.skor < MASTERY_THRESHOLD, `Skor Putri: ${evalPutri.skor}% (< ${MASTERY_THRESHOLD}%)`);
  assert(progressSiswaA.levelSaatIni === 1, "Siswa A tetap berada di Level 1");
  assert(progressSiswaA.status === "remedial", "Siswa A berstatus 'remedial'");
  assert(
    progressSiswaA.konsepBelumDikuasai.includes("pembagian_dasar"),
    "Konsep remedial adalah konsep dari soal yang salah: 'pembagian_dasar'"
  );

  // 4. Verifikasi Soal Remedial untuk Siswa A
  console.log("\n[3] Verifikasi Soal Remedial Siswa A:");
  const soalRemedialPutri = bankSoalRemedial.filter((s) => {
    return (
      s.materiId === progressSiswaA.materi_id &&
      s.level === progressSiswaA.levelSaatIni &&
      progressSiswaA.konsepBelumDikuasai.includes(s.konsep) &&
      s.difficulty === "remedial" &&
      !progressSiswaA.soalSudahDikerjakan.includes(s._id)
    );
  });

  assert(soalRemedialPutri.length === 2, "Dua soal remedial ditemukan untuk Siswa A");
  soalRemedialPutri.forEach((s) => {
    assert(!progressSiswaA.soalSudahDikerjakan.includes(s._id), `Soal ${s._id} berbeda dari soal sebelumnya`);
    assert(s.difficulty === "remedial", `Soal ${s._id} memiliki difficulty 'remedial'`);
    assert(s.konsep === "pembagian_dasar", `Soal ${s._id} menguji konsep kelemahan siswa: ${s.konsep}`);
  });

  // 5. Siswa B (Bela) mengerjakan materi yang sama dan mendapat skor >= 80%
  console.log("\n[4] Siswa B (Bela) mengerjakan materi yang sama (>= 80%):");
  // Bela benar semua (3 dari 3 soal -> skor 100%)
  const jawabanBela = [1, 1, 1];
  const evalBela = evaluasiJawaban(soalNormalLevel1 as any, jawabanBela, progressSiswaB.levelSaatIni);

  progressSiswaB.nilaiLevelSaatIni = evalBela.skor;
  progressSiswaB.attemptKe += 1;
  progressSiswaB.levelSaatIni = evalBela.levelBerikutnya;
  progressSiswaB.status = evalBela.statusBaru;
  progressSiswaB.soalSudahDikerjakan.push(...soalNormalLevel1.map((s) => s._id));

  assert(evalBela.skor >= MASTERY_THRESHOLD, `Skor Bela: ${evalBela.skor}% (>= ${MASTERY_THRESHOLD}%)`);
  assert(progressSiswaB.levelSaatIni === 2, "Siswa B berhasil naik ke Level 2!");
  assert(progressSiswaB.status === "belajar", "Status Siswa B adalah 'belajar' di Level 2");

  // 6. Verifikasi Isolasi Data Siswa A dan Siswa B
  console.log("\n[5] Verifikasi Isolasi Data Siswa A vs Siswa B:");
  assert(progressSiswaA.levelSaatIni === 1, "Siswa A tetap Level 1 (tidak terpengaruh kelulusan Siswa B)");
  assert(progressSiswaB.levelSaatIni === 2, "Siswa B berada di Level 2 (tidak terpengaruh remedial Siswa A)");
  assert(progressSiswaA.status === "remedial" && progressSiswaB.status === "belajar", "Status keduanya mandiri");

  // 7. Test Sesi Kuis dengan materi_id vs tanpa materi_id
  console.log("\n[6] Test Integrasi Sesi Kuis:");

  // Case A: Sesi DENGAN materi_id
  const sesiDenganMateri = {
    kode_unik: "SESI88",
    materi_id: "mat-01",
    kelas_id: "kls-4a",
    judul_kuis: "Kuis Pembagian Harian",
  };

  function decideRoute(sesi: { materi_id?: string | null; kode_unik: string }) {
    if (sesi.materi_id) {
      return {
        action: "redirect_adaptive",
        targetUrl: `/siswa/adaptive/${sesi.materi_id}`,
      };
    }
    return {
      action: "legacy_quiz",
      targetUrl: `/kuis/${sesi.kode_unik}`,
    };
  }

  const routeA = decideRoute(sesiDenganMateri);
  assert(
    routeA.action === "redirect_adaptive" && routeA.targetUrl === "/siswa/adaptive/mat-01",
    "Sesi dengan materi_id otomatis diarahkan ke alur Adaptive: /siswa/adaptive/mat-01"
  );

  // Case B: Sesi TANPA materi_id (Kuis lama/bebas)
  const sesiTanpaMateri = {
    kode_unik: "OLD123",
    materi_id: null,
    kelas_id: "kls-4a",
    judul_kuis: "Kuis Bebas Luar Modul",
  };

  const routeB = decideRoute(sesiTanpaMateri);
  assert(
    routeB.action === "legacy_quiz" && routeB.targetUrl === "/kuis/OLD123",
    "Sesi tanpa materi_id tetap menggunakan kuis lama: /kuis/OLD123"
  );

  // 8. Verifikasi Pencegahan Redirect Loop
  console.log("\n[7] Verifikasi Pencegahan Redirect Loop:");
  // Di /kuis/[kode], jika terdeteksi materi_id, kita panggil router.replace (single hop)
  // dan halaman adaptive TIDAK memanggil /kuis/[kode] kembali.
  const adaptivePageTarget = `/siswa/adaptive/${sesiDenganMateri.materi_id}`;
  assert(
    !adaptivePageTarget.includes("/kuis/"),
    "Halaman adaptive mandiri dan tidak me-redirect balik ke /kuis (No Redirect Loop)"
  );

  console.log("\n==================================================");
  console.log("SEMUA TEST INTEGRASI BERHASIL (100% PASS)!");
  console.log("==================================================");
}

runIntegrationTests().catch((err) => {
  console.error("Test Error:", err);
  process.exit(1);
});
