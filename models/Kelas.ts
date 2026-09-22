import mongoose, { Schema, models, model } from "mongoose";

export interface IKelas extends mongoose.Document {
  guru_id: mongoose.Types.ObjectId;
  nama_kelas: string;
  kode_kelas: string;
  created_at: Date;
}

const KelasSchema = new Schema<IKelas>({
  guru_id: { type: Schema.Types.ObjectId, ref: "Guru", required: true },
  nama_kelas: { type: String, required: true },
  kode_kelas: { type: String, required: true, unique: true, uppercase: true },
  created_at: { type: Date, default: Date.now },
});

export default models.Kelas || model<IKelas>("Kelas", KelasSchema);
