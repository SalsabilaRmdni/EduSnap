import mongoose, { Schema, models, model } from "mongoose";

export interface IPercobaanRiwayat {
  percobaan_ke: number;
  level: number;
  soal_ids: mongoose.Types.ObjectId[];
  jawaban: (number | string)[];
  skor: number;
  jumlah_benar: number;
  total_soal: number;
  lulus: boolean;
  createdAt: Date;
}

export interface IPercobaanAktif {
  level: number;
  soal_ids: mongoose.Types.ObjectId[];
  dimulai_pada: Date;
}

export interface IProgresSiswa extends mongoose.Document {
  sesi_id: mongoose.Types.ObjectId;
  siswa_id?: mongoose.Types.ObjectId;
  nama_siswa: string;
  nama_ternormalisasi: string;
  level_saat_ini: number;
  status_materi: "sedang_belajar" | "selesai";
  soal_pernah_dikeluarkan: mongoose.Types.ObjectId[];
  percobaan_aktif: IPercobaanAktif | null;
  riwayat_percobaan: IPercobaanRiwayat[];
  skor_tertinggi: number;
  createdAt: Date;
  updatedAt: Date;
}

const PercobaanRiwayatSchema = new Schema<IPercobaanRiwayat>(
  {
    percobaan_ke: { type: Number, required: true },
    level: { type: Number, enum: [1, 2, 3], required: true },
    soal_ids: { type: [Schema.Types.ObjectId], default: [] },
    jawaban: { type: [Schema.Types.Mixed], default: [] },
    skor: { type: Number, default: 0 },
    jumlah_benar: { type: Number, default: 0 },
    total_soal: { type: Number, default: 5 },
    lulus: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PercobaanAktifSchema = new Schema<IPercobaanAktif>(
  {
    level: { type: Number, enum: [1, 2, 3], required: true },
    soal_ids: { type: [Schema.Types.ObjectId], default: [] },
    dimulai_pada: { type: Date, default: Date.now },
  },
  { _id: false }
);

const ProgresSiswaSchema = new Schema<IProgresSiswa>(
  {
    sesi_id: { type: Schema.Types.ObjectId, ref: "Sesi", required: true },
    siswa_id: { type: Schema.Types.ObjectId, ref: "Siswa", required: false },
    nama_siswa: { type: String, required: true, trim: true },
    nama_ternormalisasi: { type: String, required: true, trim: true, lowercase: true },
    level_saat_ini: { type: Number, enum: [1, 2, 3], default: 1 },
    status_materi: {
      type: String,
      enum: ["sedang_belajar", "selesai"],
      default: "sedang_belajar",
    },
    soal_pernah_dikeluarkan: { type: [Schema.Types.ObjectId], default: [] },
    percobaan_aktif: { type: PercobaanAktifSchema, default: null },
    riwayat_percobaan: { type: [PercobaanRiwayatSchema], default: [] },
    skor_tertinggi: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Index unik agar tiap siswa hanya punya 1 dokumen progres per sesi kuis
ProgresSiswaSchema.index({ sesi_id: 1, nama_ternormalisasi: 1 }, { unique: true });
ProgresSiswaSchema.index({ sesi_id: 1, siswa_id: 1 }, { sparse: true });

export default models.ProgresSiswa || model<IProgresSiswa>("ProgresSiswa", ProgresSiswaSchema);
