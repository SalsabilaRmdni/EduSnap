import mongoose, { Schema, models, model } from "mongoose";

export interface IDetailJawabanAttempt {
  soalId: mongoose.Types.ObjectId;
  pertanyaan: string;
  pilihan: string[];
  jawabanSiswa: number;
  jawabanBenar: number;
  isBenar: boolean;
  konsep: string;
  level: number;
  difficulty: "normal" | "remedial";
  penjelasan?: string;
}

export interface IRiwayatAttempt {
  attemptKe: number;
  level: number;
  tipeQuiz: "normal" | "remedial";
  skor: number;
  jumlahBenar: number;
  totalSoal: number;
  konsepSalah: string[];
  detailJawaban: IDetailJawabanAttempt[];
  createdAt: Date;
}

export interface IProgressSiswa extends mongoose.Document {
  siswa_id: mongoose.Types.ObjectId;
  materi_id: mongoose.Types.ObjectId;
  levelSaatIni: number;
  status: "belum_mulai" | "belajar" | "remedial" | "menguasai";
  nilaiLevelSaatIni: number;
  attemptKe: number;
  konsepBelumDikuasai: string[];
  soalSudahDikerjakan: mongoose.Types.ObjectId[];
  riwayatAttempt: IRiwayatAttempt[];
  lastAttemptAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const DetailJawabanSchema = new Schema<IDetailJawabanAttempt>(
  {
    soalId: { type: Schema.Types.ObjectId, ref: "Soal", required: true },
    pertanyaan: { type: String, required: true },
    pilihan: { type: [String], default: [] },
    jawabanSiswa: { type: Number, required: true },
    jawabanBenar: { type: Number, required: true },
    isBenar: { type: Boolean, required: true },
    konsep: { type: String, required: true },
    level: { type: Number, required: true },
    difficulty: { type: String, enum: ["normal", "remedial"], required: true },
    penjelasan: { type: String, default: "" },
  },
  { _id: false }
);

const RiwayatAttemptSchema = new Schema<IRiwayatAttempt>(
  {
    attemptKe: { type: Number, required: true },
    level: { type: Number, required: true },
    tipeQuiz: { type: String, enum: ["normal", "remedial"], required: true },
    skor: { type: Number, required: true },
    jumlahBenar: { type: Number, required: true },
    totalSoal: { type: Number, required: true },
    konsepSalah: { type: [String], default: [] },
    detailJawaban: { type: [DetailJawabanSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ProgressSiswaSchema = new Schema<IProgressSiswa>(
  {
    siswa_id: { type: Schema.Types.ObjectId, ref: "Siswa", required: true },
    materi_id: { type: Schema.Types.ObjectId, ref: "Materi", required: true },
    levelSaatIni: { type: Number, enum: [1, 2, 3], default: 1 },
    status: {
      type: String,
      enum: ["belum_mulai", "belajar", "remedial", "menguasai"],
      default: "belum_mulai",
    },
    nilaiLevelSaatIni: { type: Number, default: 0 },
    attemptKe: { type: Number, default: 0 },
    konsepBelumDikuasai: { type: [String], default: [] },
    soalSudahDikerjakan: [{ type: Schema.Types.ObjectId, ref: "Soal" }],
    riwayatAttempt: { type: [RiwayatAttemptSchema], default: [] },
    lastAttemptAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Satu siswa hanya punya 1 dokumen progres per materi
ProgressSiswaSchema.index({ siswa_id: 1, materi_id: 1 }, { unique: true });

export default models.ProgressSiswa ||
  model<IProgressSiswa>("ProgressSiswa", ProgressSiswaSchema);
