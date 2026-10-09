import mongoose, { Schema, models, model } from "mongoose";

export interface ISoal {
  pertanyaan: string;
  tipe?: string;
  pilihan: string[];
  jawaban_benar: string | number;
  level?: number;
}

export interface ISesi extends mongoose.Document {
  guru_id?: mongoose.Types.ObjectId;
  guru_email?: string;
  materi_id?: mongoose.Types.ObjectId;
  kelas_id?: mongoose.Types.ObjectId;
  kode_unik: string;
  mata_pelajaran: string;
  tingkat_kelas?: string;
  judul_kuis: string;
  status: "draft" | "aktif" | "selesai";
  passing_grade?: number;
  soal_per_level?: number;
  soal: ISoal[];
  createdAt: Date;
  updatedAt: Date;
}

const SoalSchema = new Schema<ISoal>(
  {
    pertanyaan: { type: String, required: true },
    tipe: { type: String, default: "pilihan_ganda" },
    pilihan: { type: [String], default: [] },
    jawaban_benar: { type: Schema.Types.Mixed, required: true },
    level: { type: Number, enum: [1, 2, 3], default: 1 },
  },
  { _id: true }
);

const SesiSchema = new Schema<ISesi>(
  {
    guru_id: { type: Schema.Types.ObjectId, ref: "Guru", required: false },
    guru_email: { type: String, required: false },
    materi_id: { type: Schema.Types.ObjectId, ref: "Materi", required: false },
    kelas_id: { type: Schema.Types.ObjectId, ref: "Kelas", required: false },
    kode_unik: { type: String, required: true, unique: true, uppercase: true },
    mata_pelajaran: { type: String, default: "Tematik / Umum" },
    tingkat_kelas: { type: String, default: "SD" },
    judul_kuis: { type: String, required: true },
    status: { type: String, enum: ["draft", "aktif", "selesai"], default: "aktif" },
    passing_grade: { type: Number, default: 70 },
    soal_per_level: { type: Number, default: 5 },
    soal: { type: [SoalSchema], default: [] },
  },
  { timestamps: true }
);

export default models.Sesi || model<ISesi>("Sesi", SesiSchema);
