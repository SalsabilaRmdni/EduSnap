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

    const prompt = `Kamu adalah asisten guru. Berdasarkan materi pelajaran berikut, buatkan 3 soal pilihan ganda (4 opsi jawaban, 1 jawaban benar) dalam Bahasa Indonesia.

Materi:
"""
${materi.teksHasilOCR}
"""

Balas HANYA dengan JSON array (tanpa markdown, tanpa penjelasan tambahan), dengan format persis seperti ini:
[
  {
    "pertanyaan": "...",
    "pilihan": ["...", "...", "...", "..."],
    "jawabanBenar": 0
  }
]
"jawabanBenar" adalah index (0-3) dari array "pilihan" yang merupakan jawaban benar.`;

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

    let soalDariAI;
    try {
      soalDariAI = JSON.parse(rawContent);
    } catch (parseErr) {
      console.error("Gagal parse JSON dari AI:", rawContent);
      return NextResponse.json({ error: "Respon AI tidak valid" }, { status: 500 });
    }

    if (!Array.isArray(soalDariAI) || soalDariAI.length === 0) {
      return NextResponse.json({ error: "AI tidak menghasilkan soal" }, { status: 500 });
    }

    const soalTersimpan = await Soal.insertMany(
      soalDariAI.map((s: any) => ({
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawabanBenar: s.jawabanBenar,
        materiId,
      }))
    );

    return NextResponse.json({ success: true, soal: soalTersimpan });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Gagal generate soal" }, { status: 500 });
  }
}