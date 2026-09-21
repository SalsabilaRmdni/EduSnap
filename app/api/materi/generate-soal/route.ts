import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Soal from "@/models/Soal";
import Materi from "@/models/Materi";

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { materiId } = await req.json();

    if (!materiId) {
      return NextResponse.json({ error: "materiId wajib diisi" }, { status: 400 });
    }

    const materi = await Materi.findById(materiId);
    if (!materi) {
      return NextResponse.json({ error: "Materi tidak ditemukan" }, { status: 404 });
    }

    if (!materi.teksHasilOCR || materi.teksHasilOCR.trim().length < 10) {
      return NextResponse.json(
        { error: "Teks hasil OCR kosong atau terlalu pendek, tidak bisa generate soal" },
        { status: 400 }
      );
    }

    interface SoalAIItem {
      pertanyaan: string;
      pilihan: string[];
      jawabanBenar: number;
    }

    const konteksMapel = materi.mataPelajaran || "Tematik / Umum";
    const konteksKelas = materi.kelas || "Sekolah Dasar (SD)";
    const konteksHalaman = materi.halaman ? `(Halaman: ${materi.halaman})` : "";

    const prompt = `Kamu adalah guru ${konteksKelas} yang ramah dan mendidik.
Berdasarkan materi pelajaran dari buku sekolah berikut:
- Mata Pelajaran: ${konteksMapel}
- Tingkat Siswa: ${konteksKelas} ${konteksHalaman}
- Judul Bab/Materi: ${materi.namaMateri}

Teks Buku Pelajaran (Hasil OCR):
"""
${materi.teksHasilOCR}
"""

TUGAS:
Buatkan 3 butir soal kuis pilihan ganda dalam Bahasa Indonesia yang sederhana, jelas, dan sesuai tingkat pemahaman siswa ${konteksKelas}.
Setiap soal memiliki 4 pilihan jawaban dan 1 index jawaban benar (0, 1, 2, atau 3).

Balas HANYA dengan JSON array murni (tanpa teks pembuka/penutup, tanpa markdown):
[
  {
    "pertanyaan": "...",
    "pilihan": ["...", "...", "...", "..."],
    "jawabanBenar": 0
  }
]`;

    const aiRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("OpenRouter error:", errText);
      return NextResponse.json({ error: "Gagal menghubungi AI" }, { status: 500 });
    }

    const aiData = await aiRes.json();
    let rawContent = aiData.choices?.[0]?.message?.content ?? "";

    // Bersihkan kalau AI membungkus jawaban dengan ```json ... ```
    rawContent = rawContent.replace(/```json|```/g, "").trim();

    let soalDariAI: SoalAIItem[];
    try {
      soalDariAI = JSON.parse(rawContent);
    } catch (parseError) {
      console.error("Gagal parse JSON dari AI:", rawContent, parseError);
      return NextResponse.json({ error: "Respon AI tidak valid" }, { status: 500 });
    }

    if (!Array.isArray(soalDariAI) || soalDariAI.length === 0) {
      return NextResponse.json({ error: "AI tidak menghasilkan soal" }, { status: 500 });
    }

    const soalTersimpan = await Soal.insertMany(
      soalDariAI.map((s: SoalAIItem) => ({
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawabanBenar: Number(s.jawabanBenar) || 0,
        materiId,
      }))
    );

    return NextResponse.json({ success: true, soal: soalTersimpan });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal generate soal" }, { status: 500 });
  }
}