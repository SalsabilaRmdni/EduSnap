/**
 * Question Bank Generator & Validation Engine untuk Adaptive Learning EduSnap
 *
 * Mengatur taksonomi tingkat kesulitan kognitif berjenjang:
 * - LEVEL 1 (MUDAH)  : Pemahaman konsep dasar, definisi, fakta langsung (1 langkah berpikir).
 * - LEVEL 2 (SEDANG) : Penerapan konsep (application), situasi kontekstual, soal cerita dasar (1-2 langkah berpikir).
 * - LEVEL 3 (SULIT)  : Analisis kasus, penalaran kritis, pemecahan masalah bertingkat (multi-langkah berpikir).
 */

export interface RawSoalAI {
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number;
  penjelasan?: string;
  tips?: string;
  konsep?: string;
  level?: number;
  difficulty?: "normal" | "remedial";
}

export interface ValidatedSoalItem {
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number;
  penjelasan: string;
  tips: string;
  konsep: string;
  level: 1 | 2 | 3;
  difficulty: "normal" | "remedial";
}

/**
 * Normalisasi teks pertanyaan untuk mendeteksi kesamaan/duplikasi teks:
 * Mengubah ke huruf kecil, menghapus tanda baca & simbol, dan menyatukan spasi berlebih.
 */
export function normalisasiPertanyaan(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Mengekstrak pola dasar/template pertanyaan dengan menormalkan angka dan nama orang,
 * untuk mendeteksi apakah soal di level berikutnya HANYA mengganti angka dari level sebelumnya.
 */
export function ekstrakPolaPertanyaan(pertanyaan: string): string {
  return normalisasiPertanyaan(pertanyaan)
    .replace(/\b\d+\b/g, "<NUM>")
    .replace(/\b(siti|budi|andi|edo|lani|dayu|beni|udin|rudi|ani|putri|bela)\b/gi, "<NAME>")
    .trim();
}

/**
 * Memeriksa apakah soal Level 2 dan Level 3 memiliki pola berpikir yang berbeda
 * dan BUKAN sekadar mengganti angka/nama dari Level sebelumnya.
 */
export function periksaPolaAntarLevel(soalList: ValidatedSoalItem[]): {
  valid: boolean;
  pelanggaran?: string;
} {
  const polaL1 = new Set<string>();
  const polaL2 = new Set<string>();

  for (const s of soalList) {
    if (s.level === 1) {
      polaL1.add(ekstrakPolaPertanyaan(s.pertanyaan));
    }
  }

  for (const s of soalList) {
    if (s.level === 2) {
      const pola = ekstrakPolaPertanyaan(s.pertanyaan);
      if (polaL1.has(pola)) {
        return {
          valid: false,
          pelanggaran: `Soal Level 2 "${s.pertanyaan}" memiliki pola yang sama persis dengan soal Level 1 (hanya mengganti angka/nama).`,
        };
      }
      polaL2.add(pola);
    }
  }

  for (const s of soalList) {
    if (s.level === 3) {
      const pola = ekstrakPolaPertanyaan(s.pertanyaan);
      if (polaL1.has(pola) || polaL2.has(pola)) {
        return {
          valid: false,
          pelanggaran: `Soal Level 3 "${s.pertanyaan}" memiliki pola yang sama persis dengan soal Level sebelumnya (hanya mengganti angka/nama).`,
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Memeriksa apakah pilihan jawaban dan jawaban benar bervariasi
 * (mencegah jawaban sengaja dibuat seragam/sama persis di seluruh level).
 */
export function periksaVariasiJawaban(soalList: ValidatedSoalItem[]): {
  variatif: boolean;
  pesan?: string;
} {
  if (soalList.length === 0) return { variatif: true };

  const jawabanBenarTexts = new Set<string>();
  for (const s of soalList) {
    const textBenar = (s.pilihan[s.jawabanBenar] || "").trim().toLowerCase();
    if (textBenar) {
      jawabanBenarTexts.add(textBenar);
    }
  }

  // Jika dari 18 butir soal seluruh jawabannya hanya menghasilkan 1-2 variasi nilai,
  // maka bank soal dianggap belum memiliki variasi jawaban yang wajar
  if (soalList.length >= 18 && jawabanBenarTexts.size <= 2) {
    return {
      variatif: false,
      pesan: "Pilihan jawaban benar antar level terlalu seragam atau monoton.",
    };
  }

  return { variatif: true };
}

/**
 * Validasi dan pembersihan satu butir soal dari AI
 */
export function validasiSoalItem(
  item: any,
  index: number
): { valid: boolean; error?: string; soal?: ValidatedSoalItem } {
  if (!item || typeof item !== "object") {
    return { valid: false, error: `Soal #${index + 1} bukan objek yang valid` };
  }

  // 1. Validasi Pertanyaan
  const pertanyaan = String(item.pertanyaan || "").trim();
  if (pertanyaan.length < 5) {
    return { valid: false, error: `Soal #${index + 1}: Pertanyaan terlalu pendek atau kosong` };
  }

  // 2. Validasi Pilihan Jawaban (tepat 4 opsi non-kosong)
  if (!Array.isArray(item.pilihan) || item.pilihan.length !== 4) {
    return { valid: false, error: `Soal #${index + 1}: Pilihan jawaban harus berupa array tepat 4 opsi` };
  }
  const pilihanBersih: string[] = [];
  for (let i = 0; i < item.pilihan.length; i++) {
    const opsi = String(item.pilihan[i] || "").trim();
    if (!opsi) {
      return { valid: false, error: `Soal #${index + 1}: Opsi jawaban index ${i} tidak boleh kosong` };
    }
    pilihanBersih.push(opsi);
  }

  // 3. Validasi Jawaban Benar (0 - 3)
  const jawabanBenar = Number(item.jawabanBenar);
  if (isNaN(jawabanBenar) || jawabanBenar < 0 || jawabanBenar > 3 || !Number.isInteger(jawabanBenar)) {
    return { valid: false, error: `Soal #${index + 1}: Kunci jawabanBenar harus angka antara 0 hingga 3` };
  }

  // 4. Validasi Level (1, 2, atau 3)
  const levelRaw = Number(item.level);
  if (![1, 2, 3].includes(levelRaw)) {
    return { valid: false, error: `Soal #${index + 1}: Level harus bernilai 1, 2, atau 3` };
  }
  const level = levelRaw as 1 | 2 | 3;

  // 5. Validasi Konsep (spesifik materi, tidak boleh kosong)
  let konsep = String(item.konsep || "").trim();
  if (!konsep) {
    konsep = "konsep dasar";
  }

  // 6. Validasi Penjelasan
  let penjelasan = String(item.penjelasan || "").trim();
  if (!penjelasan) {
    penjelasan = `Jawaban yang tepat adalah "${pilihanBersih[jawabanBenar]}". Perhatikan inti konsep pada soal ini ya!`;
  }

  // 7. Validasi Tips
  let tips = String(item.tips || "").trim();
  if (!tips) {
    tips = `Tips: Cermati kata kunci dan pahami konsep ${konsep} secara teliti.`;
  }

  const difficulty = item.difficulty === "remedial" ? "remedial" : "normal";

  return {
    valid: true,
    soal: {
      pertanyaan,
      pilihan: pilihanBersih,
      jawabanBenar,
      penjelasan,
      tips,
      konsep,
      level,
      difficulty,
    },
  };
}

/**
 * Validasi koleksi Question Bank dari AI:
 * - Memastikan ada minimal 6 soal Level 1, 6 soal Level 2, 6 soal Level 3 (total min 18).
 * - Mencegah duplikasi internal di antara paket soal yang baru digenerate.
 * - Memeriksa progresi pola antar level (Level 2 & 3 bukan sekadar ganti angka dari Level 1).
 * - Memeriksa variasi jawaban.
 */
export function validasiQuestionBank(items: any[]): {
  valid: boolean;
  error?: string;
  soalList: ValidatedSoalItem[];
  counts: { level1: number; level2: number; level3: number; total: number };
} {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      valid: false,
      error: "Hasil AI bukan array atau kosong.",
      soalList: [],
      counts: { level1: 0, level2: 0, level3: 0, total: 0 },
    };
  }

  const validatedList: ValidatedSoalItem[] = [];
  const seenPertanyaanNorm = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const valRes = validasiSoalItem(items[i], i);
    if (!valRes.valid || !valRes.soal) {
      return {
        valid: false,
        error: valRes.error || `Soal #${i + 1} tidak valid`,
        soalList: [],
        counts: { level1: 0, level2: 0, level3: 0, total: 0 },
      };
    }

    const norm = normalisasiPertanyaan(valRes.soal.pertanyaan);
    // Jika ada duplikasi persis di antara output AI, lewati yang duplikat
    if (seenPertanyaanNorm.has(norm)) {
      continue;
    }
    seenPertanyaanNorm.add(norm);
    validatedList.push(valRes.soal);
  }

  const counts = {
    level1: validatedList.filter((s) => s.level === 1).length,
    level2: validatedList.filter((s) => s.level === 2).length,
    level3: validatedList.filter((s) => s.level === 3).length,
    total: validatedList.length,
  };

  // Validasi target minimum per level (Target: 6 Level 1, 6 Level 2, 6 Level 3 = total 18)
  if (counts.level1 < 6 || counts.level2 < 6 || counts.level3 < 6) {
    return {
      valid: false,
      error: `Question Bank belum memenuhi kuota minimum 18 soal (Level 1: ${counts.level1}/6, Level 2: ${counts.level2}/6, Level 3: ${counts.level3}/6).`,
      soalList: validatedList,
      counts,
    };
  }

  // Validasi pola penalaran antar level (L2 & L3 tidak boleh hanya ganti angka dari L1)
  const cekPola = periksaPolaAntarLevel(validatedList);
  if (!cekPola.valid) {
    return {
      valid: false,
      error: cekPola.pelanggaran || "Tingkat kesulitan antar level belum menunjukkan progresi yang memadai.",
      soalList: validatedList,
      counts,
    };
  }

  // Validasi variasi jawaban benar
  const cekVariasi = periksaVariasiJawaban(validatedList);
  if (!cekVariasi.variatif) {
    return {
      valid: false,
      error: cekVariasi.pesan || "Pilihan jawaban belum cukup bervariasi antar level.",
      soalList: validatedList,
      counts,
    };
  }

  return {
    valid: true,
    soalList: validatedList,
    counts,
  };
}

/**
 * Filter duplikasi terhadap data soal lama di database:
 * Memastikan soal baru yang dimasukkan tidak pernah ada sebelumnya pada materi tersebut.
 */
export function filterDuplikatSoal(
  soalBaru: ValidatedSoalItem[],
  soalExisting: { pertanyaan: string }[]
): {
  soalUnik: ValidatedSoalItem[];
  jumlahDuplikat: number;
} {
  const existingNormSet = new Set<string>();
  for (const s of soalExisting) {
    if (s && s.pertanyaan) {
      existingNormSet.add(normalisasiPertanyaan(s.pertanyaan));
    }
  }

  const soalUnik: ValidatedSoalItem[] = [];
  let jumlahDuplikat = 0;

  for (const item of soalBaru) {
    const norm = normalisasiPertanyaan(item.pertanyaan);
    if (existingNormSet.has(norm)) {
      jumlahDuplikat++;
    } else {
      soalUnik.push(item);
      existingNormSet.add(norm); // Cegah duplikat dalam batch baru juga
    }
  }

  return {
    soalUnik,
    jumlahDuplikat,
  };
}
