import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Soal from "@/models/Soal";
import Materi from "@/models/Materi";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";

export const maxDuration = 60; // Batas waktu fungsi serverless 60 detik untuk 3 pemanggilan AI

interface SoalAIItem {
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number;
  level: number;
  penjelasan?: string;
}

const LEVEL_CONFIGS = {
  1: {
    nama: "Level 1 (Mudah)",
    panduan:
      "Tingkat Mudah / Pemahaman Dasar (C1–C2): Mengingat fakta langsung, definisi kata/istilah sederhana, dan informasi eksplisit dari teks buku. Kalimat pertanyaan harus singkat, lugas, dan mudah dipahami anak SD.",
  },
  2: {
    nama: "Level 2 (Sedang)",
    panduan:
      "Tingkat Sedang / Penerapan Konsep (C3): Memahami hubungan sebab-akibat sederhana, contoh penerapan konsep dalam kehidupan sehari-hari anak SD berdasarkan teks, atau mengelompokkan informasi.",
  },
  3: {
    nama: "Level 3 (Sulit / HOTS)",
    panduan:
      "Tingkat Sulit / Penalaran Kritis & HOTS (C4): Menganalisis situasi, menarik kesimpulan yang tidak tertulis langsung, mengevaluasi pernyataan, atau memecahkan masalah kontekstual berdasarkan konsep materi.",
  },
} as const;

// Helper parser cerdas & kebal format untuk mengekstrak array soal dari respon model AI apapun
function extractSoalListFromAI(rawContent: string): unknown[] {
  if (!rawContent || typeof rawContent !== "string") return [];

  // 1. Hilangkan tag penalaran reasoning model (misal <think>...</think> pada DeepSeek)
  let cleanText = rawContent
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .trim();

  // 2. Hilangkan pembungkus markdown code fence (```json ... ```)
  cleanText = cleanText.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();

  // 3. Coba parse langsung keseluruhan teks
  try {
    const direct = JSON.parse(cleanText);
    if (Array.isArray(direct)) return direct;
    if (direct && typeof direct === "object") {
      for (const val of Object.values(direct)) {
        if (Array.isArray(val) && val.length > 0) return val;
      }
    }
  } catch {
    // Lanjut ke metode berikutnya
  }

  // 4. Cari array [ ... ] terluar
  const firstBracket = cleanText.indexOf("[");
  const lastBracket = cleanText.lastIndexOf("]");
  if (firstBracket !== -1 && lastBracket > firstBracket) {
    const arraySlice = cleanText.slice(firstBracket, lastBracket + 1);
    try {
      const parsed = JSON.parse(arraySlice);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      try {
        const sanitized = arraySlice.replace(/,\s*([\]}])/g, "$1");
        const parsed = JSON.parse(sanitized);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Lanjut ke object
      }
    }
  }

  // 5. Cari object { ... } terluar jika dibungkus { "soal": [...] }
  const firstBrace = cleanText.indexOf("{");
  const lastBrace = cleanText.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const objSlice = cleanText.slice(firstBrace, lastBrace + 1);
    try {
      const sanitized = objSlice.replace(/,\s*([\]}])/g, "$1");
      const parsed = JSON.parse(sanitized);
      if (parsed && typeof parsed === "object") {
        for (const val of Object.values(parsed)) {
          if (Array.isArray(val) && val.length > 0) return val;
        }
      }
    } catch {
      // Lanjut ke scanning blok per butir
    }
  }

  // 6. Ekstraksi per butir objek mandiri (balanced braces scanner) jika format terputus
  const recovered: unknown[] = [];
  let depth = 0;
  let startIdx = -1;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    if (char === "{") {
      if (depth === 0) startIdx = i;
      depth++;
    } else if (char === "}") {
      depth--;
      if (depth === 0 && startIdx !== -1) {
        const candidate = cleanText.slice(startIdx, i + 1);
        try {
          const item = JSON.parse(candidate.replace(/,\s*([\]}])/g, "$1"));
          if (
            item &&
            typeof item === "object" &&
            ("pertanyaan" in item || "question" in item || "soal" in item || "options" in item || "pilihan" in item)
          ) {
            recovered.push(item);
          }
        } catch {
          // Lewati blok yang tidak valid
        }
        startIdx = -1;
      }
    }
  }

  return recovered;
}

// Helper normalisasi butir soal AI ke format SoalAIItem
function normalizeSoalItem(raw: unknown, level: number): SoalAIItem | null {
  if (!raw || typeof raw !== "object") return null;
  const item = raw as Record<string, unknown>;

  // Ambil teks pertanyaan
  const rawPertanyaan =
    item.pertanyaan ?? item.question ?? item.soal ?? item.tanya ?? item.teks;
  if (typeof rawPertanyaan !== "string" || rawPertanyaan.trim().length < 3) {
    return null;
  }

  // Ambil pilihan
  let rawPilihan = item.pilihan ?? item.options ?? item.choices ?? item.opsi;
  if (!Array.isArray(rawPilihan) && rawPilihan && typeof rawPilihan === "object") {
    rawPilihan = Object.values(rawPilihan);
  }

  if (!Array.isArray(rawPilihan) || rawPilihan.length < 2) {
    return null;
  }

  const pilihan = rawPilihan.map((p) => String(p).trim()).filter(Boolean);
  if (pilihan.length < 2) return null;

  // Ambil kunci jawaban
  const rawKunci =
    item.jawabanBenar ??
    item.jawaban_benar ??
    item.kunci ??
    item.kunciJawaban ??
    item.correct_answer ??
    item.answer;

  let jawabanBenar = 0;
  if (typeof rawKunci === "number" && rawKunci >= 0 && rawKunci < pilihan.length) {
    jawabanBenar = rawKunci;
  } else if (typeof rawKunci === "string") {
    const upper = rawKunci.trim().toUpperCase();
    if (upper === "A") jawabanBenar = 0;
    else if (upper === "B") jawabanBenar = 1;
    else if (upper === "C") jawabanBenar = 2;
    else if (upper === "D") jawabanBenar = 3;
    else {
      const num = parseInt(upper, 10);
      if (!isNaN(num) && num >= 0 && num < pilihan.length) {
        jawabanBenar = num;
      } else {
        const found = pilihan.findIndex((p) => p.toLowerCase() === rawKunci.trim().toLowerCase());
        if (found !== -1) jawabanBenar = found;
      }
    }
  }

  const rawPenjelasan =
    item.penjelasan ?? item.explanation ?? item.pembahasan ?? item.alasan;

  return {
    pertanyaan: rawPertanyaan.trim(),
    pilihan,
    jawabanBenar,
    level,
    penjelasan: typeof rawPenjelasan === "string" ? rawPenjelasan.trim() : undefined,
  };
}

// Helper untuk memanggil AI khusus per level dengan mekanisme retry mandiri per level
async function requestLevelSoal(
  level: 1 | 2 | 3,
  konteksMapel: string,
  konteksKelas: string,
  konteksHalaman: string,
  namaMateri: string,
  teksOCR: string,
  apiKey: string,
  modelName: string,
  maxRetry = 3
): Promise<SoalAIItem[]> {
  const { nama, panduan } = LEVEL_CONFIGS[level];

  const isOcrValid =
    teksOCR &&
    teksOCR.trim().length >= 10 &&
    !teksOCR.includes("[Gagal membaca");

  const sumberMateri = isOcrValid
    ? `Teks Buku Pelajaran (Hasil OCR):
"""
${teksOCR}
"""`
    : `(Catatan: Teks hasil pindai kurang terbaca, jadi gunakan topik materi "${namaMateri}" untuk mata pelajaran ${konteksMapel} ${konteksKelas} sebagai acuan pembuatan soal).`;

  const prompt = `Kamu adalah guru ${konteksKelas} yang ramah, mendidik, dan ahli dalam penyusunan soal evaluasi SD berjenjang.
Berdasarkan materi pelajaran dari buku sekolah berikut:
- Mata Pelajaran: ${konteksMapel}
- Tingkat Siswa: ${konteksKelas} ${konteksHalaman}
- Judul Bab/Materi: ${namaMateri}

${sumberMateri}

TUGAS:
Buatkan 10 butir soal kuis pilihan ganda khusus untuk ${nama}.
Panduan Karakteristik Soal:
${panduan}

Ketentuan Khusus:
1. Buat tepat 10 butir soal.
2. Setiap soal memiliki tepat 4 pilihan jawaban yang masuk akal bagi anak SD.
3. Setiap soal memiliki tepat 1 kunci jawaban berupa indeks angka (0, 1, 2, atau 3).
4. Setiap soal memiliki penjelasan/pembahasan singkat yang mendidik dan mudah dipahami anak SD.
5. Pertanyaan dan pilihan harus ringkas, lugas, dan padat.

Balas HANYA dengan JSON valid seperti struktur berikut (tanpa pembuka/penutup dan tanpa markdown):
{
  "soal": [
    {
      "pertanyaan": "Pertanyaan soal...",
      "pilihan": ["Pilihan A", "Pilihan B", "Pilihan C", "Pilihan D"],
      "jawabanBenar": 0,
      "penjelasan": "Penjelasan ringkas mengapa jawaban ini benar."
    }
  ]
}`;

  // Daftar prioritas model: model pilihan -> model gratis Llama 3.3 70B -> auto free router
  const candidateModels = [
    modelName,
    "meta-llama/llama-3.3-70b-instruct:free",
    "openrouter/free",
  ];

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    const activeModel = candidateModels[Math.min(attempt - 1, candidateModels.length - 1)];

    try {
      const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: activeModel,
          messages: [
            {
              role: "system",
              content: "Kamu adalah AI guru penyusun soal evaluasi kuis sekolah dasar. Balas HANYA dengan format JSON murni tanpa markdown.",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 3500,
        }),
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        console.warn(`[GenerateSoal] Attempt ${attempt} dengan model ${activeModel} gagal (HTTP ${aiRes.status}):`, errText.slice(0, 200));

        if (aiRes.status === 402) {
          // Lanjut ke percobaan berikutnya yang menggunakan model gratis
          lastError = new Error("Saldo kredit OpenRouter terbatas (HTTP 402)");
          await new Promise((r) => setTimeout(r, 1200));
          continue;
        }

        throw new Error(`OpenRouter HTTP ${aiRes.status}: ${errText.slice(0, 120)}`);
      }

      const aiData = await aiRes.json();
      const rawContent: string = aiData.choices?.[0]?.message?.content ?? "";

      const rawItems = extractSoalListFromAI(rawContent);
      const validSoal: SoalAIItem[] = [];

      for (const raw of rawItems) {
        const item = normalizeSoalItem(raw, level);
        if (item) {
          validSoal.push(item);
        }
      }

      if (validSoal.length < 5) {
        throw new Error(
          `Hanya ${validSoal.length} butir soal valid yang dapat diekstrak dari respon AI (minimal 5 butir)`
        );
      }

      return validSoal;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[Generate Soal] Percobaan ${attempt} gagal untuk ${nama}:`, lastError.message);
      if (attempt < maxRetry) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }

  throw new Error(`Gagal menghasilkan soal ${nama}: ${lastError?.message}`);
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;

    if (!session?.guruId) {
      return NextResponse.json(
        { error: "Sesi guru tidak valid atau belum login" },
        { status: 401 }
      );
    }

    const { materiId } = await req.json();

    if (!materiId) {
      return NextResponse.json({ error: "materiId wajib diisi" }, { status: 400 });
    }

    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json({ error: "Materi tidak ditemukan" }, { status: 404 });
    }

    // Pastikan materi ini milik guru yang sedang login
    const isOwner =
      (materi.guru_id && String(materi.guru_id) === String(session.guruId)) ||
      (materi.guruEmail && materi.guruEmail.toLowerCase() === session.email.toLowerCase());

    if (!isOwner) {
      return NextResponse.json(
        { error: "Materi ini bukan milik Anda" },
        { status: 403 }
      );
    }

    const isOcrEmpty =
      !materi.teksHasilOCR ||
      materi.teksHasilOCR.trim().length < 5 ||
      materi.teksHasilOCR.includes("[Gagal membaca");

    if (isOcrEmpty && (!materi.namaMateri || materi.namaMateri.trim().length < 3)) {
      return NextResponse.json(
        { error: "Teks buku atau judul materi tidak valid, tidak bisa generate soal" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY belum dikonfigurasi di environment variables" },
        { status: 500 }
      );
    }

    const modelName = process.env.OPENROUTER_MODEL || "google/gemini-3.8-flash";
    const konteksMapel = materi.mataPelajaran || "Tematik / Umum";
    const konteksKelas = materi.kelas || "Sekolah Dasar (SD)";
    const konteksHalaman = materi.halaman ? `(Halaman: ${materi.halaman})` : "";

    // Panggil secara berurutan (sekuensial) agar tidak memicu error in_flight_budget_exhausted di OpenRouter
    const soalLvl1 = await requestLevelSoal(1, konteksMapel, konteksKelas, konteksHalaman, materi.namaMateri, materi.teksHasilOCR || "", apiKey, modelName);
    await new Promise((r) => setTimeout(r, 800));

    const soalLvl2 = await requestLevelSoal(2, konteksMapel, konteksKelas, konteksHalaman, materi.namaMateri, materi.teksHasilOCR || "", apiKey, modelName);
    await new Promise((r) => setTimeout(r, 800));

    const soalLvl3 = await requestLevelSoal(3, konteksMapel, konteksKelas, konteksHalaman, materi.namaMateri, materi.teksHasilOCR || "", apiKey, modelName);

    const semuaSoal = [...soalLvl1, ...soalLvl2, ...soalLvl3];

    // Pastikan koneksi DB tetap aktif setelah pemanggilan AI paralel
    await connectDB();

    const soalTersimpan = await Soal.insertMany(
      semuaSoal.map((s) => ({
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawabanBenar: s.jawabanBenar,
        level: s.level,
        penjelasan: s.penjelasan,
        materiId,
      }))
    );

    return NextResponse.json({
      success: true,
      totalSoal: soalTersimpan.length,
      breakdown: {
        level1: soalLvl1.length,
        level2: soalLvl2.length,
        level3: soalLvl3.length,
      },
      soal: soalTersimpan,
    });
  } catch (err) {
    console.error("Gagal generate bank soal adaptif:", err);
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Gagal generate soal dari AI",
      },
      { status: 500 }
    );
  }
}