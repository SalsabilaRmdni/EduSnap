import mongoose from "mongoose";
import Soal, { ISoalItem } from "@/models/Soal";

/**
 * Konfigurasi batas kelulusan mastery level.
 * Mudah diubah untuk keperluan penyesuaian kurikulum / kebijakan kelas.
 */
export const MASTERY_THRESHOLD = 80;

export const MAX_LEVEL = 3;

export const DEFAULT_QUIZ_LIMIT = 3;

export type StatusProgress = "belum_mulai" | "belajar" | "remedial" | "menguasai";

export interface EvaluasiHasilItem {
  soalId: string;
  nomor: number;
  pertanyaan: string;
  pilihan: string[];
  jawabanSiswa: number;
  jawabanBenar: number;
  isCorrect: boolean;
  konsep: string;
  level: number;
  difficulty: "normal" | "remedial";
  penjelasan: string;
  tips: string;
}

export interface EvaluasiSubmitResult {
  skor: number;
  jumlahBenar: number;
  totalSoal: number;
  lulusLevel: boolean;
  levelBerikutnya: number;
  statusBaru: StatusProgress;
  konsepSalah: string[];
  detail: EvaluasiHasilItem[];
}

/**
 * Menghitung persentase skor pembulatan
 */
export function hitungSkor(jumlahBenar: number, totalSoal: number): number {
  if (totalSoal <= 0) return 0;
  return Math.round((jumlahBenar / totalSoal) * 100);
}

/**
 * Menentukan level berikutnya dan status mastery baru berdasarkan skor
 */
export function tentukanLevelDanStatus(
  levelSaatIni: number,
  skor: number
): {
  lulusLevel: boolean;
  levelBerikutnya: number;
  status: StatusProgress;
} {
  const lulus = skor >= MASTERY_THRESHOLD;

  if (lulus) {
    if (levelSaatIni >= MAX_LEVEL) {
      return {
        lulusLevel: true,
        levelBerikutnya: MAX_LEVEL,
        status: "menguasai",
      };
    }
    return {
      lulusLevel: true,
      levelBerikutnya: levelSaatIni + 1,
      status: "belajar",
    };
  }

  // Jika di bawah threshold, tetap di level saat ini dan masuk remedial
  return {
    lulusLevel: false,
    levelBerikutnya: levelSaatIni,
    status: "remedial",
  };
}

/**
 * Mengidentifikasi daftar konsep unik dari soal-soal yang salah dijawab
 */
export function identifikasiKonsepSalah(
  evaluasiList: { isCorrect: boolean; konsep: string }[]
): string[] {
  const salahSet = new Set<string>();
  for (const item of evaluasiList) {
    if (!item.isCorrect && item.konsep) {
      salahSet.add(item.konsep.trim());
    }
  }
  return Array.from(salahSet);
}

/**
 * Menghasilkan penjelasan dan tips belajar ramah anak SD secara generik untuk semua mata pelajaran
 */
export function generatePenjelasanDanTips(
  pertanyaan: string,
  pilihan: string[],
  jawabanBenar: number,
  konsep: string = "umum",
  penjelasanDB: string = ""
): { penjelasan: string; tips: string } {
  const opsiBenarText =
    pilihan && pilihan[jawabanBenar] !== undefined
      ? pilihan[jawabanBenar]
      : "Opsi yang sesuai";
  const namaKonsep = konsep && konsep.trim().toLowerCase() !== "umum" ? konsep : "materi ini";

  let penjelasan = (penjelasanDB || "").trim();
  let tips = "";

  // 1. Jika penjelasan di DB sudah ada dan bermakna, gunakan sebagai inti penjelasan
  if (!penjelasan) {
    // Fallback generik ramah anak yang aman, edukatif, dan kontekstual
    const isHitungan =
      /[\d+×÷=/\-:]/.test(pertanyaan) ||
      /\b(hitung|berapa|jumlah|selisih|hasil|kecepatan|jarak|waktu|luas|keliling|volume)\b/i.test(
        pertanyaan
      );

    if (isHitungan) {
      penjelasan = `Jawaban yang benar adalah "${opsiBenarText}". Untuk menyelesaikan pertanyaan tentang ${namaKonsep}, perhatikan angka yang diketahui pada soal dan lakukan langkah perhitungan dengan teliti ya.`;
      tips = `Tuliskan angka yang diketahui di kertas coret-coretan, lalu hitung langkah demi langkah sebelum memilih jawaban.`;
    } else {
      penjelasan = `Jawaban yang tepat adalah "${opsiBenarText}". Pada konsep ${namaKonsep}, pilihan ini paling sesuai dengan inti pertanyaan yang diberikan.`;
      tips = `Baca kembali pertanyaan secara perlahan dan cari kata kunci utamanya ya.`;
    }
  } else {
    // Bila penjelasan dari DB sudah ada, sediakan tips belajar pelengkap ramah anak
    tips = `Pahami konsep ${namaKonsep} dengan mengaitkannya ke contoh kegiatan sehari-hari di sekitarmu.`;
  }

  return {
    penjelasan,
    tips,
  };
}

/**
 * Mengevaluasi jawaban yang dikirim siswa terhadap daftar soal asli
 */
export function evaluasiJawaban(
  soalList: ISoalItem[],
  jawabanSiswaMap: Record<string, number> | number[],
  levelSaatIni: number
): EvaluasiSubmitResult {
  const totalSoal = soalList.length;
  let jumlahBenar = 0;

  const detail: EvaluasiHasilItem[] = soalList.map((s, idx) => {
    let ans = -1;
    if (Array.isArray(jawabanSiswaMap)) {
      ans = jawabanSiswaMap[idx] !== undefined ? Number(jawabanSiswaMap[idx]) : -1;
    } else {
      const idKey = String(s._id);
      ans =
        jawabanSiswaMap[idKey] !== undefined
          ? Number(jawabanSiswaMap[idKey])
          : jawabanSiswaMap[idx] !== undefined
          ? Number(jawabanSiswaMap[idx])
          : -1;
    }

    const isCorrect = ans === Number(s.jawabanBenar);
    if (isCorrect) jumlahBenar++;

    const konsep = s.konsep || "umum";
    const { penjelasan, tips } = generatePenjelasanDanTips(
      s.pertanyaan,
      s.pilihan,
      Number(s.jawabanBenar),
      konsep,
      s.penjelasan || ""
    );

    return {
      soalId: String(s._id),
      nomor: idx + 1,
      pertanyaan: s.pertanyaan,
      pilihan: s.pilihan,
      jawabanSiswa: ans,
      jawabanBenar: Number(s.jawabanBenar),
      isCorrect,
      konsep,
      level: s.level || 1,
      difficulty: s.difficulty || "normal",
      penjelasan,
      tips,
    };
  });

  const skor = hitungSkor(jumlahBenar, totalSoal);
  const { lulusLevel, levelBerikutnya, status } = tentukanLevelDanStatus(
    levelSaatIni,
    skor
  );
  const konsepSalah = identifikasiKonsepSalah(detail);

  return {
    skor,
    jumlahBenar,
    totalSoal,
    lulusLevel,
    levelBerikutnya,
    statusBaru: status,
    konsepSalah,
    detail,
  };
}

/**
 * Menghasilkan feedback aman untuk dikirim ke siswa:
 * Baik benar maupun salah dilengkapi penjelasan dan tips ramah anak SD.
 */
export function formatFeedbackSiswa(detail: EvaluasiHasilItem[]) {
  return detail.map((d) => {
    if (d.isCorrect) {
      return {
        soalId: d.soalId,
        nomor: d.nomor,
        pertanyaan: d.pertanyaan,
        pilihan: d.pilihan,
        isCorrect: true,
        jawabanSiswa: d.jawabanSiswa,
        jawabanBenar: d.jawabanBenar,
        penjelasan: `Jawabanmu tepat! Kamu sudah menguasai konsep ${d.konsep} dengan sangat baik.`,
        tips: "Pertahankan ketelitianmu dan terus semangat belajar!",
        konsep: d.konsep,
        level: d.level,
        difficulty: d.difficulty,
      };
    }
    return {
      soalId: d.soalId,
      nomor: d.nomor,
      pertanyaan: d.pertanyaan,
      pilihan: d.pilihan,
      isCorrect: false,
      jawabanSiswa: d.jawabanSiswa,
      jawabanBenar: d.jawabanBenar,
      penjelasan: d.penjelasan,
      tips: d.tips,
      konsep: d.konsep,
      level: d.level,
      difficulty: d.difficulty,
    };
  });
}

/**
 * Mengacak array menggunakan Fisher-Yates shuffle
 */
export function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export interface PilihSoalOptions {
  materiId: string | mongoose.Types.ObjectId;
  level: number;
  isRemedial: boolean;
  konsepBermasalah?: string[];
  soalSudahDikerjakanIds?: (string | mongoose.Types.ObjectId)[];
  limit?: number;
}

export interface HasilPilihSoal {
  soal: ISoalItem[];
  stokKurang: boolean;
  pesanInfo?: string;
}

/**
 * Memilih paket soal adaptive untuk siswa:
 *
 * ATURAN KETAT:
 * 1. Default paket soal = 3 butir (konfigurasi limit).
 * 2. Soal remedial TIDAK BOLEH mengulang soal yang sudah dikerjakan (ada di soalSudahDikerjakanIds).
 * 3. Soal remedial memprioritaskan difficulty = "remedial" dan konsep yang salah.
 * 4. Soal dalam 1 paket TIDAK BOLEH duplikat.
 * 5. Jika kandidat yang memenuhi syarat > limit, lakukan shuffle secara acak.
 * 6. Jika bank soal remedial tersisa < limit yang belum pernah dikerjakan:
 *    - Ambil semua soal yang belum dikerjakan.
 *    - JANGAN diam-diam mengulang soal lama.
 *    - Berikan flag stokKurang dan pesan informatif yang jelas.
 */
export async function pilihSoalAdaptive(
  options: PilihSoalOptions
): Promise<HasilPilihSoal> {
  const {
    materiId,
    level,
    isRemedial,
    konsepBermasalah = [],
    soalSudahDikerjakanIds = [],
    limit = DEFAULT_QUIZ_LIMIT,
  } = options;

  const targetMateriId =
    typeof materiId === "string" && mongoose.Types.ObjectId.isValid(materiId)
      ? new mongoose.Types.ObjectId(materiId)
      : materiId;

  // Set ID soal yang sudah pernah dikerjakan siswa (dalam bentuk string)
  const sudahDikerjakanStrSet = new Set<string>(
    (soalSudahDikerjakanIds || []).map((id) => String(id))
  );

  const objectIdSudahDikerjakan = Array.from(sudahDikerjakanStrSet)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  // ==========================================
  // KASUS REMEDIAL
  // ==========================================
  if (isRemedial) {
    const kandidatPool: ISoalItem[] = [];
    const poolIdSet = new Set<string>();

    const tambahKandidat = (soalDocs: ISoalItem[]) => {
      for (const doc of soalDocs) {
        const idStr = String(doc._id);
        // STRICT: Jangan masukkan yang sudah pernah dikerjakan siswa dan jangan duplikat
        if (!sudahDikerjakanStrSet.has(idStr) && !poolIdSet.has(idStr)) {
          kandidatPool.push(doc);
          poolIdSet.add(idStr);
        }
      }
    };

    // Prioritas 1: Soal remedial dengan konsep yang bermasalah pada level yang sama
    if (konsepBermasalah.length > 0) {
      const remedialKonsepDocs = await Soal.find({
        materiId: targetMateriId,
        level: level,
        konsep: { $in: konsepBermasalah },
        difficulty: "remedial",
        _id: { $nin: objectIdSudahDikerjakan },
      });
      tambahKandidat(remedialKonsepDocs);
    }

    // Prioritas 2: Soal remedial level tersebut di luar konsep bermasalah
    if (kandidatPool.length < limit) {
      const remedialLevelDocs = await Soal.find({
        materiId: targetMateriId,
        level: level,
        difficulty: "remedial",
        _id: {
          $nin: [
            ...objectIdSudahDikerjakan,
            ...Array.from(poolIdSet)
              .filter((id) => mongoose.Types.ObjectId.isValid(id))
              .map((id) => new mongoose.Types.ObjectId(id)),
          ],
        },
      });
      tambahKandidat(remedialLevelDocs);
    }

    // Prioritas 3: Soal pada konsep bermasalah dengan level yang sama yang belum pernah dikerjakan
    if (kandidatPool.length < limit && konsepBermasalah.length > 0) {
      const normalKonsepDocs = await Soal.find({
        materiId: targetMateriId,
        level: level,
        konsep: { $in: konsepBermasalah },
        _id: {
          $nin: [
            ...objectIdSudahDikerjakan,
            ...Array.from(poolIdSet)
              .filter((id) => mongoose.Types.ObjectId.isValid(id))
              .map((id) => new mongoose.Types.ObjectId(id)),
          ],
        },
      });
      tambahKandidat(normalKonsepDocs);
    }

    // Prioritas 4: Soal apapun pada level yang sama yang belum pernah dikerjakan
    if (kandidatPool.length < limit) {
      const sisaLevelDocs = await Soal.find({
        materiId: targetMateriId,
        level: level,
        _id: {
          $nin: [
            ...objectIdSudahDikerjakan,
            ...Array.from(poolIdSet)
              .filter((id) => mongoose.Types.ObjectId.isValid(id))
              .map((id) => new mongoose.Types.ObjectId(id)),
          ],
        },
      });
      tambahKandidat(sisaLevelDocs);
    }

    // Jika kandidat > limit, lakukan shuffle acak lalu ambil sejumlah limit
    if (kandidatPool.length > limit) {
      const shuffled = shuffleArray(kandidatPool);
      return {
        soal: shuffled.slice(0, limit),
        stokKurang: false,
      };
    }

    // Jika kandidat antara 1 dan limit (stok baru terbatas)
    if (kandidatPool.length > 0) {
      const stokKurang = kandidatPool.length < limit;
      return {
        soal: shuffleArray(kandidatPool),
        stokKurang,
        pesanInfo: stokKurang
          ? `Hanya tersedia ${kandidatPool.length} butir soal latihan baru yang belum pernah kamu kerjakan. Kerjakan dengan teliti ya!`
          : undefined,
      };
    }

    // STRICT: Jika 0 butir soal baru (semua soal level ini sudah dikerjakan siswa),
    // JANGAN PERNAH mengulang soal lama yang sudah dikerjakan. Berikan respon transparan.
    return {
      soal: [],
      stokKurang: true,
      pesanInfo: `Kamu telah mengerjakan semua butir soal yang tersedia di Level ${level}. Hubungi gurumu untuk penambahan soal baru.`,
    };
  }

  // ==========================================
  // KASUS NORMAL (BUKAN REMEDIAL)
  // ==========================================
  // Ambil soal level yang sama yang belum pernah dikerjakan oleh siswa
  // Prioritaskan difficulty: "normal" terlebih dahulu
  let kandidatNormal = await Soal.find({
    materiId: targetMateriId,
    level: level,
    difficulty: "normal",
    _id: { $nin: objectIdSudahDikerjakan },
  });

  // Jika belum memenuhi limit, tambahkan soal lain di level yang sama yang belum pernah dikerjakan
  if (kandidatNormal.length < limit) {
    const existingIds = new Set(kandidatNormal.map((s) => String(s._id)));
    const sisa = await Soal.find({
      materiId: targetMateriId,
      level: level,
      _id: {
        $nin: [
          ...objectIdSudahDikerjakan,
          ...Array.from(existingIds)
            .filter((id) => mongoose.Types.ObjectId.isValid(id))
            .map((id) => new mongoose.Types.ObjectId(id)),
        ],
      },
    });
    kandidatNormal = [...kandidatNormal, ...sisa];
  }

  // Jika ada soal yang belum dikerjakan
  if (kandidatNormal.length > 0) {
    const shuffled = shuffleArray(kandidatNormal);
    const stokKurang = shuffled.length < limit;
    return {
      soal: shuffled.slice(0, limit),
      stokKurang,
      pesanInfo: stokKurang
        ? `Hanya tersedia ${shuffled.length} butir soal latihan baru yang belum pernah kamu kerjakan. Kerjakan dengan teliti ya!`
        : undefined,
    };
  }

  // STRICT: JANGAN pernah fallback mengulang soal lama yang sudah dikerjakan siswa
  return {
    soal: [],
    stokKurang: true,
    pesanInfo: `Kamu telah mengerjakan semua butir soal yang tersedia di Level ${level}. Hubungi gurumu untuk penambahan soal baru.`,
  };
}
