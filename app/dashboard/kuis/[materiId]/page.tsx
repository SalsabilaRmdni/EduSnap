"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

type Soal = {
  _id: string;
  pertanyaan: string;
  pilihan: string[];
  jawabanBenar: number;
};

export default function KuisPage() {
  const { materiId } = useParams<{ materiId: string }>();
  const [soalList, setSoalList] = useState<Soal[]>([]);
  const [loading, setLoading] = useState(false);

  const generateSoal = async () => {
    setLoading(true);
    const res = await fetch("/api/materi/generate-soal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ materiId }),
    });
    const data = await res.json();
    setSoalList(data.soal ?? []);
    setLoading(false);
  };

  useEffect(() => {
    generateSoal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <main className="p-8 text-center text-gray-500">Membuat soal...</main>;
  }

  return (
    <main className="max-w-xl mx-auto p-8 space-y-6">
      <h1 className="text-2xl font-semibold text-center">Kuis & Kunci Jawaban</h1>

      {soalList.map((s, i) => (
        <div key={s._id} className="space-y-2 border-b border-gray-200 pb-4">
          <p className="font-medium">
            {i + 1}. {s.pertanyaan}
          </p>
          <div className="space-y-1">
            {s.pilihan.map((opsi, idx) => {
              const isBenar = idx === s.jawabanBenar;
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${
                    isBenar
                      ? "bg-green-50 text-green-700 font-medium"
                      : "text-gray-600"
                  }`}
                >
                  {isBenar ? "✅" : "⬜"} {opsi}
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {soalList.length === 0 && (
        <p className="text-center text-gray-400 text-sm">Belum ada soal.</p>
      )}
    </main>
  );
}