import mongoose, { Schema, models, model } from "mongoose";

export interface ISoal {
  pertanyaan: string;
  tipe: "pilihan_ganda" | "isian";
  pilihan?: string[];
  jawaban_benar: string;
}

export interface ISesi extends mongoose.Document {
  guru_id: mongoose.Types.ObjectId;
  kelas_id: mongoose.Types.ObjectId;
  kode_unik: string;
  mata_pelajaran: string;
  status: "draft" | "aktif" | "selesai";
  soal: ISoal[];
}

const SoalSchema = new Schema<ISoal>(
  {
    pertanyaan: { type: String, required: true },
    tipe: { type: String, enum: ["pilihan_ganda", "isian"], required: true },
    pilihan: { type: [String], default: undefined },
    jawaban_benar: { type: String, required: true },
  },
  { _id: false }
);

const SesiSchema = new Schema<ISesi>(
  {
    guru_id: { type: Schema.Types.ObjectId, ref: "Guru", required: true },
    kelas_id: { type: Schema.Types.ObjectId, ref: "Kelas", required: true },
    kode_unik: { type: String, required: true, unique: true },
    mata_pelajaran: { type: String, required: true },
    status: { type: String, enum: ["draft", "aktif", "selesai"], default: "draft" },
    soal: { type: [SoalSchema], default: [] },
  },
  { timestamps: true }
);

export default models.Sesi || model<ISesi>("Sesi", SesiSchema);
