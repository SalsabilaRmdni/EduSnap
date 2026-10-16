import * as fs from "fs";
import * as path from "path";

try {
  const envContent = fs.readFileSync(".env.local", "utf8");
  envContent.split("\n").forEach((line) => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      const val = match[2].trim().replace(/^['"]|['"]$/g, "");
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  });
} catch (e) {
  console.warn("Notice: .env.local could not be loaded directly", e);
}

import { connectDB } from "../lib/mongodb";
import Kelas from "../models/Kelas";
import Siswa from "../models/Siswa";
import Materi from "../models/Materi";
import Soal from "../models/Soal";
import ProgressSiswa from "../models/ProgressSiswa";
import { POST as loginSiswa } from "../app/api/siswa/login/route";
import { GET as getDashboard } from "../app/api/siswa/dashboard/route";
import { GET as getAdaptiveQuiz } from "../app/api/siswa/adaptive-quiz/route";
import { POST as submitAdaptiveQuiz } from "../app/api/siswa/adaptive-quiz/submit/route";
import { NextRequest } from "next/server";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`[FAIL] ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runE2E() {
  console.log("==================================================================");
  console.log("PENGUJIAN END-TO-END (E2E) ADAPTIVE LEARNING SISI SISWA");
  console.log("Data Testing: Kelas TEST-ADAPT, Siswa Alif & Bunga");
  console.log("==================================================================");

  await connectDB();

  // Reset Progress Khusus Materi Test untuk Pengujian Bersih
  const materiTest = await Materi.findOne({ namaMateri: "TEST - Adaptive Learning" });
  assert(!!materiTest, "Materi 'TEST - Adaptive Learning' ditemukan di database");
  const materiId = String(materiTest!._id);

  await ProgressSiswa.deleteMany({ materi_id: materiTest!._id });
  console.log("✓ Progress awal materi test telah dibersihkan untuk pengujian murni");

  // ------------------------------------------------------------------
  // 1. PENGUJIAN LOGIN SISWA: Siswa Test Alif (TEST-ADAPT)
  // ------------------------------------------------------------------
  console.log("\n[1] Pengujian Login Siswa (/api/siswa/login):");
  const reqLoginAlif = new NextRequest("http://localhost:3000/api/siswa/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nama: "Siswa Test Alif", kodeKelas: "TEST-ADAPT" }),
  });
  const resLoginAlif = await loginSiswa(reqLoginAlif);
  const dataLoginAlif = await resLoginAlif.json();

  assert(dataLoginAlif.status === "ok", "Login Siswa Test Alif berhasil");
  assert(dataLoginAlif.siswa.nama === "Siswa Test Alif", "Data nama siswa sesuai");
  assert(dataLoginAlif.kelas.kode_kelas === "TEST-ADAPT", "Data kode kelas sesuai");
  const alifId = dataLoginAlif.siswa.id;

  // ------------------------------------------------------------------
  // 2. PENGUJIAN DASHBOARD SISWA: Materi & Level Awal
  // ------------------------------------------------------------------
  console.log("\n[2] Pengujian Dashboard Siswa (/api/siswa/dashboard):");
  const reqDashboard = new NextRequest(
    `http://localhost:3000/api/siswa/dashboard?kode=TEST-ADAPT&nama=${encodeURIComponent(
      "Siswa Test Alif"
    )}`
  );
  const resDashboard = await getDashboard(reqDashboard);
  const dataDashboard = await resDashboard.json();

  assert(dataDashboard.status === "ok", "Dashboard siswa termuat dengan sukses");
  const materiInDashboard = dataDashboard.materiList.find((m: any) => String(m.id) === materiId);
  assert(!!materiInDashboard, "Materi 'TEST - Adaptive Learning' muncul di dashboard siswa");
  assert(materiInDashboard.progress.levelSaatIni === 1, "Siswa baru berada di Level 1 (Mudah)");
  assert(
    materiInDashboard.progress.status === "belum_mulai",
    "Status awal siswa adalah 'belum_mulai'"
  );
  assert(materiInDashboard.progress.attemptKe === 0, "Jumlah attempt awal adalah 0");

  // ------------------------------------------------------------------
  // 3. PENGUJIAN FETCH SOAL AWAL (LEVEL 1)
  // ------------------------------------------------------------------
  console.log("\n[3] Pengujian Pengambilan Soal Adaptive Level 1 (/api/siswa/adaptive-quiz):");
  const reqQuiz1 = new NextRequest(
    `http://localhost:3000/api/siswa/adaptive-quiz?materiId=${materiId}&kodeKelas=TEST-ADAPT&namaSiswa=${encodeURIComponent(
      "Siswa Test Alif"
    )}`
  );
  const resQuiz1 = await getAdaptiveQuiz(reqQuiz1);
  const dataQuiz1 = await resQuiz1.json();

  assert(dataQuiz1.status === "ok", "Paket kuis Level 1 berhasil didapatkan");
  assert(dataQuiz1.infoQuiz.level === 1, "Kuis terkonfirmasi Level 1");
  assert(dataQuiz1.infoQuiz.isRemedial === false, "Bukan status remedial (normal kuis)");
  assert(dataQuiz1.soal.length === 3, "Tepat 3 butir soal diberikan per attempt");
  assert(
    dataQuiz1.soal.every((s: any) => s.level === 1),
    "Semua butir soal terverifikasi Level 1"
  );
  assert(
    dataQuiz1.soal.every((s: any) => s.jawabanBenar === undefined),
    "Kunci jawaban terlindungi (tidak dibocorkan ke client)"
  );

  const attempt1SoalList = dataQuiz1.soal;
  const attempt1SoalIds = attempt1SoalList.map((s: any) => s.id);

  // Ambil data asli dari DB untuk evaluasi jawaban
  const docsAttempt1 = await Soal.find({ _id: { $in: attempt1SoalIds } });

  // ------------------------------------------------------------------
  // 4. SKENARIO NILAI < 80% (GAGAL -> TETAP LEVEL 1 + REMEDIAL)
  // ------------------------------------------------------------------
  console.log("\n[4] Skenario Siswa Nilai < 80% (1 Benar, 2 Salah = 33%):");
  // Jawab soal 0 benar, soal 1 & 2 salah
  const jawabanAttempt1: Record<number, number> = {};
  attempt1SoalList.forEach((s: any, idx: number) => {
    const doc = docsAttempt1.find((d) => String(d._id) === s.id)!;
    if (idx === 0) {
      jawabanAttempt1[idx] = doc.jawabanBenar; // Benar
    } else {
      jawabanAttempt1[idx] = (doc.jawabanBenar + 1) % 4; // Salah
    }
  });

  const reqSubmit1 = new NextRequest(
    "http://localhost:3000/api/siswa/adaptive-quiz/submit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kodeKelas: "TEST-ADAPT",
        namaSiswa: "Siswa Test Alif",
        materiId,
        soalIds: attempt1SoalIds,
        jawaban: jawabanAttempt1,
      }),
    }
  );
  const resSubmit1 = await submitAdaptiveQuiz(reqSubmit1);
  const dataSubmit1 = await resSubmit1.json();

  assert(dataSubmit1.status === "ok", "Submit kuis berhasil diproses");
  assert(dataSubmit1.hasil.skor === 33, "Skor bernilai 33% (< 80%)");
  assert(dataSubmit1.hasil.lulusLevel === false, "lulusLevel bernilai false");
  assert(dataSubmit1.hasil.levelBaru === 1, "Siswa tetap berada di Level 1");
  assert(dataSubmit1.hasil.statusBaru === "remedial", "Status siswa beralih ke 'remedial'");
  assert(
    dataSubmit1.hasil.konsepPerluRemedial.length > 0,
    `Konsep kelemahan teridentifikasi: ${dataSubmit1.hasil.konsepPerluRemedial.join(", ")}`
  );

  // Verifikasi Feedback ramah anak
  assert(dataSubmit1.hasil.feedback.length === 3, "Feedback memuat 3 item soal");
  const fbItemSalah = dataSubmit1.hasil.feedback.find((f: any) => !f.isCorrect);
  assert(fbItemSalah.jawabanSiswa !== undefined, "Feedback memuat jawaban siswa");
  assert(fbItemSalah.jawabanBenar !== undefined, "Feedback memuat kunci jawaban benar");
  assert(!!fbItemSalah.penjelasan, "Feedback memuat penjelasan mendidik");
  assert(!!fbItemSalah.tips, "Feedback memuat tips belajar ramah anak");

  // ------------------------------------------------------------------
  // 5. PENGUJIAN SOAL REMEDIAL (STRICT NO-REPEAT & TARGETED CONCEPT)
  // ------------------------------------------------------------------
  console.log("\n[5] Pengujian Pengambilan Soal Remedial:");
  const reqQuizRemedial = new NextRequest(
    `http://localhost:3000/api/siswa/adaptive-quiz?materiId=${materiId}&kodeKelas=TEST-ADAPT&namaSiswa=${encodeURIComponent(
      "Siswa Test Alif"
    )}`
  );
  const resQuizRemedial = await getAdaptiveQuiz(reqQuizRemedial);
  const dataQuizRemedial = await resQuizRemedial.json();

  assert(dataQuizRemedial.status === "ok", "Paket kuis remedial berhasil didapatkan");
  assert(dataQuizRemedial.infoQuiz.level === 1, "Kuis remedial berada di Level 1");
  assert(dataQuizRemedial.infoQuiz.isRemedial === true, "Indikator isRemedial bernilai true");

  const remedialSoalIds = dataQuizRemedial.soal.map((s: any) => s.id);
  assert(
    !remedialSoalIds.some((id: string) => attempt1SoalIds.includes(id)),
    "STRICT NO-REPEAT: Soal remedial 100% berbeda dari soal attempt 1 yang sudah dikerjakan!"
  );

  // ------------------------------------------------------------------
  // 6. SKENARIO NILAI >= 80% (LULUS REMEDIAL -> NAIK KE LEVEL 2)
  // ------------------------------------------------------------------
  console.log("\n[6] Skenario Remedial Lulus >= 80% (3 Benar = 100%):");
  const docsRemedial = await Soal.find({ _id: { $in: remedialSoalIds } });
  const jawabanRemedial: Record<number, number> = {};
  dataQuizRemedial.soal.forEach((s: any, idx: number) => {
    const doc = docsRemedial.find((d) => String(d._id) === s.id)!;
    jawabanRemedial[idx] = doc.jawabanBenar; // Semua Benar
  });

  const reqSubmitRemedial = new NextRequest(
    "http://localhost:3000/api/siswa/adaptive-quiz/submit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kodeKelas: "TEST-ADAPT",
        namaSiswa: "Siswa Test Alif",
        materiId,
        soalIds: remedialSoalIds,
        jawaban: jawabanRemedial,
      }),
    }
  );
  const resSubmitRemedial = await submitAdaptiveQuiz(reqSubmitRemedial);
  const dataSubmitRemedial = await resSubmitRemedial.json();

  assert(dataSubmitRemedial.hasil.skor === 100, "Skor remedial 100%");
  assert(dataSubmitRemedial.hasil.lulusLevel === true, "Lulus Level 1");
  assert(dataSubmitRemedial.hasil.levelBaru === 2, "Naik ke Level 2!");
  assert(dataSubmitRemedial.hasil.statusBaru === "belajar", "Status beralih ke 'belajar'");

  // ------------------------------------------------------------------
  // 7. PENGUJIAN LEVEL 2 & KEMAJUAN KE LEVEL 3 (Termasuk Skenario Remedial Level 2)
  // ------------------------------------------------------------------
  console.log("\n[7] Pengujian Soal Level 2 (Attempt 1 - Simulasi Gagal < 80%):");
  const reqQuizL2 = new NextRequest(
    `http://localhost:3000/api/siswa/adaptive-quiz?materiId=${materiId}&kodeKelas=TEST-ADAPT&namaSiswa=${encodeURIComponent(
      "Siswa Test Alif"
    )}`
  );
  const resQuizL2 = await getAdaptiveQuiz(reqQuizL2);
  const dataQuizL2 = await resQuizL2.json();

  assert(dataQuizL2.infoQuiz.level === 2, "Siswa sekarang menerima kuis Level 2");
  assert(
    dataQuizL2.soal.every((s: any) => s.level === 2),
    "Semua butir soal terverifikasi Level 2 (Soal Cerita / Penerapan)"
  );
  const l2Attempt1Ids = dataQuizL2.soal.map((s: any) => s.id);
  assert(
    !l2Attempt1Ids.some((id: string) => [...attempt1SoalIds, ...remedialSoalIds].includes(id)),
    "Soal Level 2 tidak mengulang satupun soal Level 1 yang telah dikerjakan"
  );

  // Alif menjawab 1 benar dan 2 salah pada Level 2 (Skor 33%)
  const docsL2Attempt1 = await Soal.find({ _id: { $in: l2Attempt1Ids } });
  const jawabanL2Attempt1: Record<number, number> = {};
  dataQuizL2.soal.forEach((s: any, idx: number) => {
    const doc = docsL2Attempt1.find((d) => String(d._id) === s.id)!;
    if (idx === 0) {
      jawabanL2Attempt1[idx] = doc.jawabanBenar;
    } else {
      jawabanL2Attempt1[idx] = (doc.jawabanBenar + 1) % 4;
    }
  });

  const reqSubmitL2Fail = new NextRequest(
    "http://localhost:3000/api/siswa/adaptive-quiz/submit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kodeKelas: "TEST-ADAPT",
        namaSiswa: "Siswa Test Alif",
        materiId,
        soalIds: l2Attempt1Ids,
        jawaban: jawabanL2Attempt1,
      }),
    }
  );
  const resSubmitL2Fail = await submitAdaptiveQuiz(reqSubmitL2Fail);
  const dataSubmitL2Fail = await resSubmitL2Fail.json();

  assert(dataSubmitL2Fail.hasil.skor === 33, "Skor Level 2 Attempt 1 bernilai 33% (< 80%)");
  assert(dataSubmitL2Fail.hasil.levelBaru === 2, "Siswa tetap berada di Level 2");
  assert(dataSubmitL2Fail.hasil.statusBaru === "remedial", "Status siswa beralih ke 'remedial' Level 2");

  // Fetch Remedial Level 2
  console.log("\n[8] Pengujian Pengambilan Soal Remedial Level 2:");
  const reqQuizL2Remedial = new NextRequest(
    `http://localhost:3000/api/siswa/adaptive-quiz?materiId=${materiId}&kodeKelas=TEST-ADAPT&namaSiswa=${encodeURIComponent(
      "Siswa Test Alif"
    )}`
  );
  const resQuizL2Remedial = await getAdaptiveQuiz(reqQuizL2Remedial);
  const dataQuizL2Remedial = await resQuizL2Remedial.json();

  assert(dataQuizL2Remedial.infoQuiz.level === 2, "Kuis remedial berada di Level 2");
  assert(dataQuizL2Remedial.infoQuiz.isRemedial === true, "isRemedial Level 2 bernilai true");
  const l2RemedialIds = dataQuizL2Remedial.soal.map((s: any) => s.id);
  assert(
    !l2RemedialIds.some((id: string) => l2Attempt1Ids.includes(id)),
    "STRICT NO-REPEAT: Soal remedial Level 2 tidak mengulang soal Level 2 sebelumnya!"
  );

  // Selesaikan Remedial Level 2 dengan 100%
  console.log("\n[9] Menyelesaikan Remedial Level 2 dengan skor 100% -> Menuju Level 3:");
  const docsL2Remedial = await Soal.find({ _id: { $in: l2RemedialIds } });
  const jawabanL2Remedial: Record<number, number> = {};
  dataQuizL2Remedial.soal.forEach((s: any, idx: number) => {
    const doc = docsL2Remedial.find((d) => String(d._id) === s.id)!;
    jawabanL2Remedial[idx] = doc.jawabanBenar;
  });

  const reqSubmitL2Pass = new NextRequest(
    "http://localhost:3000/api/siswa/adaptive-quiz/submit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kodeKelas: "TEST-ADAPT",
        namaSiswa: "Siswa Test Alif",
        materiId,
        soalIds: l2RemedialIds,
        jawaban: jawabanL2Remedial,
      }),
    }
  );
  const resSubmitL2Pass = await submitAdaptiveQuiz(reqSubmitL2Pass);
  const dataSubmitL2Pass = await resSubmitL2Pass.json();

  assert(dataSubmitL2Pass.hasil.skor === 100, "Skor Remedial Level 2 bernilai 100%");
  assert(dataSubmitL2Pass.hasil.levelBaru === 3, "Berhasil naik ke Level 3!");
  assert(dataSubmitL2Pass.hasil.statusBaru === "belajar", "Status kembali ke 'belajar'");

  // ------------------------------------------------------------------
  // 9. PENGUJIAN LEVEL 3 & MASTERY LEARNING (STATUS MENGUASAI)
  // ------------------------------------------------------------------
  console.log("\n[9] Pengujian Level 3 (Sulit / Penalaran Multi-Langkah) & Mastery:");
  const reqQuizL3 = new NextRequest(
    `http://localhost:3000/api/siswa/adaptive-quiz?materiId=${materiId}&kodeKelas=TEST-ADAPT&namaSiswa=${encodeURIComponent(
      "Siswa Test Alif"
    )}`
  );
  const resQuizL3 = await getAdaptiveQuiz(reqQuizL3);
  const dataQuizL3 = await resQuizL3.json();

  assert(dataQuizL3.infoQuiz.level === 3, "Siswa menerima kuis Level 3");
  assert(
    dataQuizL3.soal.every((s: any) => s.level === 3),
    "Semua butir soal terverifikasi Level 3"
  );
  const l3SoalIds = dataQuizL3.soal.map((s: any) => s.id);

  const docsL3 = await Soal.find({ _id: { $in: l3SoalIds } });
  const jawabanL3: Record<number, number> = {};
  dataQuizL3.soal.forEach((s: any, idx: number) => {
    const doc = docsL3.find((d) => String(d._id) === s.id)!;
    jawabanL3[idx] = doc.jawabanBenar;
  });

  const reqSubmitL3 = new NextRequest(
    "http://localhost:3000/api/siswa/adaptive-quiz/submit",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kodeKelas: "TEST-ADAPT",
        namaSiswa: "Siswa Test Alif",
        materiId,
        soalIds: l3SoalIds,
        jawaban: jawabanL3,
      }),
    }
  );
  const resSubmitL3 = await submitAdaptiveQuiz(reqSubmitL3);
  const dataSubmitL3 = await resSubmitL3.json();

  assert(dataSubmitL3.hasil.skor === 100, "Skor Level 3 bernilai 100%");
  assert(dataSubmitL3.hasil.statusBaru === "menguasai", "Status beralih ke 'menguasai' (Mastered)!");
  assert(dataSubmitL3.hasil.levelBaru === 3, "Level tetap 3 (Max level, tidak reset ke 1)");

  // Cek jika kuis dibuka lagi setelah menguasai
  const reqQuizFinished = new NextRequest(
    `http://localhost:3000/api/siswa/adaptive-quiz?materiId=${materiId}&kodeKelas=TEST-ADAPT&namaSiswa=${encodeURIComponent(
      "Siswa Test Alif"
    )}`
  );
  const resQuizFinished = await getAdaptiveQuiz(reqQuizFinished);
  const dataQuizFinished = await resQuizFinished.json();

  assert(dataQuizFinished.status === "ok", "Respon selesai berstatus 'ok'");
  assert(dataQuizFinished.selesai === true, "Flag selesai bernilai true");
  assert(dataQuizFinished.progress.status === "menguasai", "Status tetap 'menguasai'");
  assert(dataQuizFinished.progress.levelSaatIni === 3, "Level tidak pernah reset ke Level 1");

  // ------------------------------------------------------------------
  // 10. PENGUJIAN ISOLASI SISWA (ALIF VS BUNGA)
  // ------------------------------------------------------------------
  console.log("\n[10] Pengujian Isolasi Siswa (Siswa Test Bunga):");
  const reqDashboardBunga = new NextRequest(
    `http://localhost:3000/api/siswa/dashboard?kode=TEST-ADAPT&nama=${encodeURIComponent(
      "Siswa Test Bunga"
    )}`
  );
  const resDashboardBunga = await getDashboard(reqDashboardBunga);
  const dataDashboardBunga = await resDashboardBunga.json();

  const materiBunga = dataDashboardBunga.materiList.find((m: any) => String(m.id) === materiId);
  assert(
    materiBunga.progress.levelSaatIni === 1,
    "ISOLASI TOTAL: Bunga tetap di Level 1 meski Alif sudah tamat Level 3"
  );
  assert(
    materiBunga.progress.status === "belum_mulai",
    "ISOLASI TOTAL: Status Bunga 'belum_mulai' (tidak terpengaruh Alif)"
  );
  assert(materiBunga.progress.attemptKe === 0, "ISOLASI TOTAL: Attempt Bunga tetap 0");

  // Bunga mengambil kuis pertamanya
  const reqQuizBunga = new NextRequest(
    `http://localhost:3000/api/siswa/adaptive-quiz?materiId=${materiId}&kodeKelas=TEST-ADAPT&namaSiswa=${encodeURIComponent(
      "Siswa Test Bunga"
    )}`
  );
  const resQuizBunga = await getAdaptiveQuiz(reqQuizBunga);
  const dataQuizBunga = await resQuizBunga.json();

  assert(dataQuizBunga.infoQuiz.level === 1, "Bunga menerima kuis Level 1 mandiri");
  assert(dataQuizBunga.infoQuiz.isRemedial === false, "Bunga berstatus normal");

  // ------------------------------------------------------------------
  // 11. PENGUJIAN INTEGRITAS DATA PRODUKSI
  // ------------------------------------------------------------------
  console.log("\n[11] Verifikasi Isolasi Data Produksi:");
  const materiProdCount = await Materi.countDocuments({ namaMateri: { $ne: "TEST - Adaptive Learning" } });
  assert(materiProdCount > 0, `Materi produksi (${materiProdCount} dokumen) tetap utuh`);

  const prodProgressCount = await ProgressSiswa.countDocuments({ materi_id: { $ne: materiTest!._id } });
  console.log(`  ✓ Data progress materi produksi (${prodProgressCount} dokumen) tidak tersentuh`);

  console.log("\n==================================================================");
  console.log("SELURUH PENGUJIAN RUNTIME E2E ADAPTIVE LEARNING LULUS 100%!");
  console.log("==================================================================");
}

runE2E()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("E2E Test Failed:", err);
    process.exit(1);
  });
