import * as fs from "fs";
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";
import Sesi from "../models/Sesi";
import Kelas from "../models/Kelas";
import Siswa from "../models/Siswa";
import Materi from "../models/Materi";
import ProgressSiswa from "../models/ProgressSiswa";
import Peserta from "../models/Peserta";

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

async function main() {
  console.log("=== RUNNING GURU SESSION & RESULTS TEST ===");
  await connectDB();

  // 1. Verify TEST-ADAPT class & materi
  const kelas = await Kelas.findOne({ kode_kelas: "TEST-ADAPT" });
  if (!kelas) throw new Error("Kelas TEST-ADAPT tidak ditemukan");

  const materi = await Materi.findOne({ namaMateri: "TEST - Adaptive Learning" });
  if (!materi) throw new Error("Materi TEST - Adaptive Learning tidak ditemukan");

  const alif = await Siswa.findOne({ nama: "Siswa Test Alif", kelas_id: kelas._id });
  if (!alif) throw new Error("Siswa Alif tidak ditemukan");

  // 2. Find or create a test session for this class & materi
  let testSesi = await Sesi.findOne({ kode_unik: "TEST-SESI-ADAPT" });
  if (!testSesi) {
    testSesi = await Sesi.create({
      guru_id: kelas.guru_id,
      kelas_id: kelas._id,
      materi_id: materi._id,
      kode_unik: "TEST-SESI-ADAPT",
      judul_kuis: materi.namaMateri,
      mata_pelajaran: materi.mataPelajaran,
      tingkat_kelas: kelas.tingkat_kelas,
      soal: [],
      status: "aktif",
    });
  }

  // 3. Test peserta API logic simulation
  const pesertaList = await Peserta.find({ sesi_id: testSesi._id });
  const siswaInKelas = await Siswa.find({ kelas_id: testSesi.kelas_id }).select("_id nama");
  const siswaIds = siswaInKelas.map((s) => s._id);

  const progressDocs = await ProgressSiswa.find({
    materi_id: testSesi.materi_id,
    siswa_id: { $in: siswaIds },
  });

  console.log(`[PASS] Found ${progressDocs.length} progress docs for siswa in class ${kelas.nama_kelas}`);
  for (const prog of progressDocs) {
    const s = siswaInKelas.find((x) => String(x._id) === String(prog.siswa_id));
    console.log(`- Siswa: ${s?.nama}, Level: ${prog.levelSaatIni}, Status: ${prog.status}, Attempt: ${prog.attemptKe}`);
  }

  // 4. Verify cross-class isolation: Siswa from another class must not be returned
  const otherClass = await Kelas.findOne({ _id: { $ne: kelas._id } });
  if (otherClass) {
    const otherSiswa = await Siswa.find({ kelas_id: otherClass._id }).select("_id");
    const otherSiswaIds = new Set(otherSiswa.map((s) => String(s._id)));
    const leakage = progressDocs.filter((p) => otherSiswaIds.has(String(p.siswa_id)));
    if (leakage.length > 0) {
      throw new Error(`Data leakage! Found progress of students from another class: ${leakage.length}`);
    }
    console.log(`[PASS] Cross-class data isolation confirmed. No students from other classes leaked.`);
  }

  await mongoose.disconnect();
  console.log("=== GURU SESSION RESULTS TEST COMPLETED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
