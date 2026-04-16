"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/app-layout";
import LockGuard from "@/components/lock-guard";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Student } from "@/lib/types";

const CARD_SHADOW = "0 4px 24px rgba(0,0,0,0.4)";
const GENRE_OPTIONS = ["RPG", "FPS", "액션", "퍼즐", "시뮬레이션", "플랫포머", "공포", "레이싱", "스포츠", "기타"];

export default function BrowsePage() {
  return (
    <Suspense fallback={<AppLayout><p className="text-[14px] text-center py-12" style={{ color: "#4A6A8A" }}>불러오는 중...</p></AppLayout>}>
      <BrowseContent />
    </Suspense>
  );
}

function BrowseContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [students, setStudents] = useState<Student[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filterGenre, setFilterGenre] = useState("");
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set());
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    loadStudents();
    if (user) loadMyInterests();
  }, [user]);

  async function loadStudents() {
    const { data } = await supabase.from("students").select("*").order("name");
    if (data) setStudents(data);
  }

  async function loadMyInterests() {
    if (!user) return;
    const { data } = await supabase.from("interests").select("to_student_id").eq("from_student_id", user.id).not("to_student_id", "is", null);
    if (data) setMyInterests(new Set(data.map((d) => d.to_student_id!)));
  }

  async function toggleInterest(targetId: string) {
    if (!user) return;
    if (myInterests.has(targetId)) {
      await supabase.from("interests").delete().eq("from_student_id", user.id).eq("to_student_id", targetId);
    } else {
      await supabase.from("interests").insert({ from_student_id: user.id, to_student_id: targetId });
    }
    await loadMyInterests();
  }

  const filtered = students.filter((s) => {
    if (user && s.id === user.id) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!s.name.toLowerCase().includes(q) && !s.game_concept?.toLowerCase().includes(q)) return false;
    }
    if (filterGenre && (!s.genres || !s.genres.includes(filterGenre))) return false;
    return true;
  });

  return (
    <AppLayout>
      <LockGuard>
        <h1 className="text-[28px] font-bold mb-6" style={{ color: "#E0B847", fontFamily: "'Playfair Display', serif" }}>모험가 탐색</h1>

        <div className="flex gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 희망 게임으로 검색..."
            className="flex-1 h-10 rounded-[10px] px-4 text-[13px] outline-none"
            style={{ background: "#111E30", border: "1px solid #2A4060", color: "#E8DCBC", caretColor: "#C8952A" }}
          />
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilterGenre("")}
            className="h-[30px] px-3 rounded-[15px] text-[12px] font-medium transition-colors"
            style={filterGenre === "" ? { background: "#C8952A", color: "#0D1520" } : { background: "#111E30", color: "#4A6A8A", border: "1px solid #2A4060" }}
          >
            전체
          </button>
          {GENRE_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setFilterGenre(filterGenre === g ? "" : g)}
              className="h-[30px] px-3 rounded-[15px] text-[12px] font-medium transition-colors"
              style={filterGenre === g ? { background: "#C8952A", color: "#0D1520" } : { background: "#111E30", color: "#4A6A8A", border: "1px solid #2A4060" }}
            >
              {g}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s) => {
            const skillsDisplay = s.part ? s.part.split(",").map((x: string) => x.trim()).filter(Boolean) : [];
            return (
              <div
                key={s.id}
                onClick={() => setSelectedStudent(s)}
                className="rounded-2xl p-5 flex flex-col gap-3 cursor-pointer transition-all"
                style={{ background: "#111E30", border: "1px solid #2A4060", boxShadow: CARD_SHADOW }}
              >
                <div>
                  <p className="text-[16px] font-semibold" style={{ color: "#E8DCBC", fontFamily: "'Playfair Display', serif" }}>{s.name}</p>
                  <p className="text-[12px] font-medium" style={{ color: "#4A6A8A" }}>
                    {skillsDisplay.length > 0 ? skillsDisplay.join(", ") : "역량 미설정"}
                  </p>
                </div>
                {s.genres && s.genres.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {s.genres.map((g) => (
                      <span key={g} className="h-[26px] px-3 rounded-[4px] text-[11px] font-medium flex items-center" style={{ background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}>
                        {g}
                      </span>
                    ))}
                  </div>
                )}
                {s.intro && <p className="text-[13px] line-clamp-1" style={{ color: "#E8DCBC" }}>{s.intro}</p>}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-[14px] col-span-full text-center py-12" style={{ color: "#4A6A8A" }}>검색 결과가 없습니다.</p>
          )}
        </div>

        {/* 프로필 모달 */}
        {selectedStudent && (() => {
          const s = selectedStudent;
          const skillsDisplay = s.part ? s.part.split(",").map((x: string) => x.trim()).filter(Boolean) : [];
          return (
            <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ background: "rgba(0,0,0,0.7)" }} onClick={() => setSelectedStudent(null)}>
              <div
                className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl p-7 flex flex-col gap-5"
                onClick={(e) => e.stopPropagation()}
                style={{ background: "#111E30", border: "1px solid #2A4060", boxShadow: "0 8px 40px rgba(0,0,0,0.8)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[22px] font-bold" style={{ color: "#E8DCBC", fontFamily: "'Playfair Display', serif" }}>{s.name}</p>
                    <p className="text-[13px] font-medium" style={{ color: "#4A6A8A" }}>
                      {skillsDisplay.length > 0 ? skillsDisplay.join(", ") : "역량 미설정"}
                    </p>
                  </div>
                  <button onClick={() => setSelectedStudent(null)} className="w-8 h-8 rounded-full flex items-center justify-center text-[16px] transition-colors" style={{ background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}>
                    ✕
                  </button>
                </div>

                {s.genres && s.genres.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[11px] font-medium" style={{ color: "#3A5A78" }}>선호 장르</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {s.genres.map((g) => (
                        <span key={g} className="h-[28px] px-3.5 rounded-[4px] text-[12px] font-medium flex items-center" style={{ background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}>{g}</span>
                      ))}
                    </div>
                  </div>
                )}

                {[
                  { label: "한줄 소개", value: s.intro },
                  { label: "좋아하는 게임", value: s.favorite_games },
                  { label: "만들고 싶은 게임", value: s.game_concept },
                  { label: "선호하는 협업 방식", value: s.collab_style },
                ].map(({ label, value }) => value ? (
                  <div key={label} className="flex flex-col gap-1">
                    <span className="text-[11px] font-medium" style={{ color: "#3A5A78" }}>{label}</span>
                    <p className="text-[14px]" style={{ color: "#E8DCBC" }}>{value}</p>
                  </div>
                ) : null)}

                <button
                  onClick={(e) => { e.stopPropagation(); toggleInterest(s.id); }}
                  className="w-full h-11 rounded-[10px] text-[14px] font-semibold transition-colors"
                  style={myInterests.has(s.id)
                    ? { background: "#C8952A", color: "#0D1520" }
                    : { background: "#162030", color: "#C8952A", border: "1px solid #C8952A" }}
                >
                  {myInterests.has(s.id) ? "관심 표시됨" : "관심 표시"}
                </button>
              </div>
            </div>
          );
        })()}
      </LockGuard>
    </AppLayout>
  );
}
