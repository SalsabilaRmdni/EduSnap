import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { NextRequest } from "next/server";
import { connectDB } from "../lib/mongodb";
import { createSessionToken, SESSION_COOKIE_NAME } from "../lib/auth";
import Materi from "../models/Materi";
import Soal from "../models/Soal";
import Sesi from "../models/Sesi";
import Peserta from "../models/Peserta";
import ProgressSiswa from "../models/ProgressSiswa";
import Kelas from "../models/Kelas";
import Guru from "../models/Guru";
import Siswa from "../models/Siswa";
import { GET, PATCH, DELETE } from "../app/api/materi/[materiId]/route";

// Load environment variables from .env.local if not already loaded
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

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runMateriCrudTests() {
  console.log("==================================================");
  console.log("TEST AUTOMATION: CRUD MATERI & DATA ISOLATION");
  console.log("==================================================");

  await connectDB();
  console.log("Terhubung ke MongoDB Atlas.");

  const guruAId = new mongoose.Types.ObjectId();
  const guruBId = new mongoose.Types.ObjectId();
  const emailGuruA = `guru_a_${Date.now()}@edusnap.test`;
  const emailGuruB = `guru_b_${Date.now()}@edusnap.test`;

  // Create sessions
  const tokenGuruA = await createSessionToken({
    guruId: guruAId.toString(),
    nama: "Guru A",
    email: emailGuruA,
  });

  const tokenGuruB = await createSessionToken({
    guruId: guruBId.toString(),
    nama: "Guru B",
    email: emailGuruB,
  });

  // Setup Kelas Guru A
  const kelasA = await Kelas.create({
    nama_kelas: "Kelas 4A Uji",
    kode_kelas: `K4A_${Date.now()}`,
    guru_id: guruAId,
    guruEmail: emailGuruA,
    aktif: true,
  });

  // Setup Siswa Guru A
  const siswa1 = await Siswa.create({
    nama: "Budi Siswa",
    email: `budi_${Date.now()}@siswa.test`,
    kelas_id: kelasA._id,
    aktif: true,
  });

  console.log("\n[TEST A] Edit Materi (Update nama, mapel, halaman, kelas):");
  // Buat Materi Guru A
  const materiA = await Materi.create({
    namaMateri: "Bab 1: Perkalian Dasar",
    mataPelajaran: "Matematika",
    kelas: "Kelas 4A Uji",
    kelas_id: kelasA._id,
    halaman: "Hal 10-15",
    guru_id: guruAId,
    guruEmail: emailGuruA,
  });

  // Tambahkan Soal ke Materi A
  const soalA1 = await Soal.create({
    materiId: materiA._id,
    nomor: 1,
    pertanyaan: "7 x 8 = ?",
    pilihan: ["54", "56", "58", "60"],
    jawabanBenar: 1,
    konsep: "Perkalian 1-Langkah",
    level: 1,
    difficulty: "normal",
    penjelasan: "7 x 8 = 56",
    tips: "Tips perkalian",
  });

  // Tambahkan Sesi & Peserta
  const sesiA = await Sesi.create({
    kode_unik: `TEST_${Date.now()}`,
    judul_kuis: "Kuis Bab 1 Perkalian",
    mata_pelajaran: "Matematika",
    tingkat_kelas: "Kelas 4",
    kelas_id: kelasA._id,
    materi_id: materiA._id,
    guru_id: guruAId,
    status: "aktif",
  });

  const pesertaA = await Peserta.create({
    sesi_id: sesiA._id,
    siswa_id: siswa1._id,
    nama_siswa: "Budi Siswa",
    skor: 100,
    sudah_selesai: true,
  });

  // Tambahkan ProgressSiswa
  const progressA = await ProgressSiswa.create({
    siswa_id: siswa1._id,
    materi_id: materiA._id,
    levelSaatIni: 2,
    status: "belajar",
    nilaiLevelSaatIni: 85,
    attemptKe: 1,
  });

  // Test GET Materi & Counts
  const getReq = new NextRequest(`http://localhost:3000/api/materi/${materiA._id}`, {
    method: "GET",
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${tokenGuruA}`,
    },
  });
  const getRes = await GET(getReq, { params: Promise.resolve({ materiId: materiA._id.toString() }) });
  const getData = await getRes.json();
  assert(getRes.status === 200, "GET /api/materi/:id berhasil dengan status 200");
  assert(getData.counts.soal === 1, "Count soal terhubung adalah 1");
  assert(getData.counts.sesi === 1, "Count sesi terhubung adalah 1");
  assert(getData.counts.progressSiswa === 1, "Count progress siswa terhubung adalah 1");

  // Test PATCH Materi
  const patchReq = new NextRequest(`http://localhost:3000/api/materi/${materiA._id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: `${SESSION_COOKIE_NAME}=${tokenGuruA}`,
    },
    body: JSON.stringify({
      namaMateri: "Bab 1: Perkalian dan Pembagian Revisi",
      mataPelajaran: "Matematika Dasar",
      halaman: "Halaman 10-25",
    }),
  });
  const patchRes = await PATCH(patchReq, { params: Promise.resolve({ materiId: materiA._id.toString() }) });
  const patchData = await patchRes.json();

  assert(patchRes.status === 200, "PATCH /api/materi/:id berhasil dengan status 200");
  assert(patchData.materi.namaMateri === "Bab 1: Perkalian dan Pembagian Revisi", "Nama materi berhasil diperbarui");
  assert(patchData.materi.mataPelajaran === "Matematika Dasar", "Mata pelajaran berhasil diperbarui");
  assert(patchData.materi.halaman === "Halaman 10-25", "Halaman berhasil diperbarui");

  // Verifikasi _id tetap sama di database dan relasi anak tetap utuh
  const materiDiDB = await Materi.findById(materiA._id);
  assert(materiDiDB !== null, "Materi ditemukan di DB");
  assert(materiDiDB!._id.toString() === materiA._id.toString(), "ID materi tetap tidak berubah");
  const soalTetapUtuh = await Soal.findOne({ materiId: materiA._id });
  assert(soalTetapUtuh !== null && soalTetapUtuh._id.toString() === soalA1._id.toString(), "Soal tetap terhubung ke materi");
  const progressTetapUtuh = await ProgressSiswa.findOne({ materi_id: materiA._id });
  assert(progressTetapUtuh !== null, "Progress siswa tetap terhubung ke materi");

  console.log("\n[TEST B] Simulasi Batal Hapus Materi:");
  // Guru mengklik batal di UI -> tidak ada request DELETE yang dikirim
  const materiSetelahBatal = await Materi.findById(materiA._id);
  assert(materiSetelahBatal !== null, "Data materi tetap ada setelah batal hapus");
  const soalSetelahBatal = await Soal.countDocuments({ materiId: materiA._id });
  assert(soalSetelahBatal === 1, "Data soal tetap ada setelah batal hapus");

  console.log("\n[TEST D] Data Isolation: Guru B mencoba mengedit & menghapus Materi Guru A:");
  // Guru B mencoba PATCH materi Guru A -> harus 403 Forbidden
  const patchIlegalReq = new NextRequest(`http://localhost:3000/api/materi/${materiA._id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      cookie: `${SESSION_COOKIE_NAME}=${tokenGuruB}`,
    },
    body: JSON.stringify({ namaMateri: "Hacked by Guru B" }),
  });
  const patchIlegalRes = await PATCH(patchIlegalReq, { params: Promise.resolve({ materiId: materiA._id.toString() }) });
  assert(patchIlegalRes.status === 403, "Guru B ditolak edit materi Guru A (403 Forbidden)");

  // Guru B mencoba DELETE materi Guru A -> harus 403 Forbidden
  const deleteIlegalReq = new NextRequest(`http://localhost:3000/api/materi/${materiA._id}`, {
    method: "DELETE",
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${tokenGuruB}`,
    },
  });
  const deleteIlegalRes = await DELETE(deleteIlegalReq, { params: Promise.resolve({ materiId: materiA._id.toString() }) });
  assert(deleteIlegalRes.status === 403, "Guru B ditolak hapus materi Guru A (403 Forbidden)");

  console.log("\n[TEST E] Multi-Material Isolation: Isolasi antar materi dalam satu kelas:");
  // Guru A memiliki Materi X (Bab 1), Materi Y (Bab 2), Materi Z (Bab 3)
  const materiX = await Materi.create({
    namaMateri: "Bab 1: Penjumlahan",
    mataPelajaran: "Matematika",
    kelas_id: kelasA._id,
    guru_id: guruAId,
    guruEmail: emailGuruA,
  });
  const soalX = await Soal.create({
    materiId: materiX._id,
    pertanyaan: "1 + 1 = ?",
    pilihan: ["1", "2", "3", "4"],
    jawabanBenar: 1,
    konsep: "Penjumlahan",
    level: 1,
  });

  const materiY = await Materi.create({
    namaMateri: "Bab 2: Pengurangan",
    mataPelajaran: "Matematika",
    kelas_id: kelasA._id,
    guru_id: guruAId,
    guruEmail: emailGuruA,
  });
  const soalY = await Soal.create({
    materiId: materiY._id,
    pertanyaan: "5 - 3 = ?",
    pilihan: ["1", "2", "3", "4"],
    jawabanBenar: 1,
    konsep: "Pengurangan",
    level: 1,
  });

  const materiZ = await Materi.create({
    namaMateri: "Bab 3: Perkalian",
    mataPelajaran: "Matematika",
    kelas_id: kelasA._id,
    guru_id: guruAId,
    guruEmail: emailGuruA,
  });
  const soalZ = await Soal.create({
    materiId: materiZ._id,
    pertanyaan: "3 x 3 = ?",
    pilihan: ["6", "7", "8", "9"],
    jawabanBenar: 3,
    konsep: "Perkalian",
    level: 1,
  });

  // Hapus Materi Y (Bab 2)
  const deleteYReq = new NextRequest(`http://localhost:3000/api/materi/${materiY._id}`, {
    method: "DELETE",
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${tokenGuruA}`,
    },
  });
  const deleteYRes = await DELETE(deleteYReq, { params: Promise.resolve({ materiId: materiY._id.toString() }) });
  assert(deleteYRes.status === 200, "DELETE Materi Y berhasil (200 OK)");

  // Verifikasi Materi Y dan Soal Y terhapus
  const cekMateriY = await Materi.findById(materiY._id);
  const cekSoalY = await Soal.findById(soalY._id);
  assert(cekMateriY === null, "Materi Y (Bab 2) terhapus dari database");
  assert(cekSoalY === null, "Soal Y terhapus dari database");

  // Verifikasi Materi X dan Z beserta soal masing-masing tetap utuh
  const cekMateriX = await Materi.findById(materiX._id);
  const cekSoalX = await Soal.findById(soalX._id);
  const cekMateriZ = await Materi.findById(materiZ._id);
  const cekSoalZ = await Soal.findById(soalZ._id);
  assert(cekMateriX !== null && cekSoalX !== null, "Materi X (Bab 1) dan soalnya tetap utuh dan aman");
  assert(cekMateriZ !== null && cekSoalZ !== null, "Materi Z (Bab 3) dan soalnya tetap utuh dan aman");

  console.log("\n[TEST C] Konfirmasi Hapus Materi (Cascade Delete Terkendali):");
  // Hapus materiA yang memiliki relasi lengkap (Soal, Sesi, Peserta, ProgressSiswa)
  const deleteAReq = new NextRequest(`http://localhost:3000/api/materi/${materiA._id}`, {
    method: "DELETE",
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${tokenGuruA}`,
    },
  });
  const deleteARes = await DELETE(deleteAReq, { params: Promise.resolve({ materiId: materiA._id.toString() }) });
  const deleteAData = await deleteARes.json();

  assert(deleteARes.status === 200, "DELETE Materi A berhasil (200 OK)");
  assert(deleteAData.deleted.materi === 1, "Materi A terhapus");
  assert(deleteAData.deleted.soal === 1, "Soal A terhapus dalam cascade");
  assert(deleteAData.deleted.sesi === 1, "Sesi A terhapus dalam cascade");
  assert(deleteAData.deleted.peserta === 1, "Peserta A terhapus dalam cascade");
  assert(deleteAData.deleted.progressSiswa === 1, "Progress Siswa A terhapus dalam cascade");

  // Verifikasi di DB
  const cekMateriA = await Materi.findById(materiA._id);
  const cekSoalA = await Soal.find({ materiId: materiA._id });
  const cekSesiA = await Sesi.find({ materi_id: materiA._id });
  const cekPesertaA = await Peserta.find({ sesi_id: sesiA._id });
  const cekProgressA = await ProgressSiswa.find({ materi_id: materiA._id });

  assert(cekMateriA === null, "Materi A benar-benar hilang dari DB");
  assert(cekSoalA.length === 0, "Semua soal Materi A hilang dari DB");
  assert(cekSesiA.length === 0, "Semua sesi Materi A hilang dari DB");
  assert(cekPesertaA.length === 0, "Semua peserta dari sesi Materi A hilang dari DB");
  assert(cekProgressA.length === 0, "Semua progress siswa Materi A hilang dari DB");

  // Verifikasi entitas utama TIDAK ikut terhapus
  const cekKelas = await Kelas.findById(kelasA._id);
  const cekSiswa = await Siswa.findById(siswa1._id);
  assert(cekKelas !== null, "Kelas 4A Uji TIDAK ikut terhapus (terlindungi)");
  assert(cekSiswa !== null, "Akun Siswa TIDAK ikut terhapus (terlindungi)");

  // Cleanup test artifacts
  await Materi.deleteMany({ _id: { $in: [materiX._id, materiZ._id] } });
  await Soal.deleteMany({ _id: { $in: [soalX._id, soalZ._id] } });
  await Kelas.deleteOne({ _id: kelasA._id });
  await Siswa.deleteOne({ _id: siswa1._id });

  console.log("\n==================================================");
  console.log("SEMUA PENGUJIAN CRUD MATERI (TEST A - E) BERHASIL!");
  console.log("==================================================");

  await mongoose.disconnect();
}

runMateriCrudTests().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
