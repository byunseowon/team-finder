"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/app-layout";
import LockGuard from "@/components/lock-guard";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Student } from "@/lib/types";

const GENRE_OPTIONS = ["RPG", "FPS", "액션", "퍼즐", "시뮬레이션", "플랫포머", "공포", "레이싱", "스포츠", "기타"];

export default function BrowsePage() {
  return (
    <Suspense fallback={<AppLayout><p className="text-[14px] text-[#86868B] text-center py-12">불러오는 중...</p></AppLayout>}>
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
  const [filterInterest, setFilterInterest] = useState(false);
  const [filterUnassigned, setFilterUnassigned] = useState(false);
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
    const { data } = await supabase
      .from("interests")
      .select("to_student_id")
      .eq("from_student_id", user.id)
      .not("to_student_id", "is", null);
    if (data) setMyInterests(new Set(data.map((d) => d.to_student_id!)));
  }

  async function toggleInterest(targetId: string) {
    if (!user) return;
    if (myInterests.has(targetId)) {
      await supabase
        .from("interests")
        .delete()
        .eq("from_student_id", user.id)
        .eq("to_student_id", targetId);
    } else {
      await supabase.from("interests").insert({ from_student_id: user.id, to_student_id: targetId });
    }
    await loadMyInterests();
  }

  const filtered = students.filter((s) => {
    if (user && s.id === user.id) return false;
    if (filterInterest && !myInterests.has(s.id)) return false;
    if (filterUnassigned && s.team_id) return false;
    if (search) {
      const q = search.toLowerCase();
      const nameMatch = s.name.toLowerCase().includes(q);
      const gameMatch = s.game_concept?.toLowerCase().includes(q);
      if (!nameMatch && !gameMatch) return false;
    }
    if (filterGenre && (!s.genres || !s.genres.includes(filterGenre))) return false;
    return true;
  });

  return (
    <AppLayout>
      <LockGuard>
        <h1 className="text-[28px] font-bold text-[#1D1D1F] mb-6">인원 탐색</h1>

        <div className="flex gap-3 mb-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="이름 또는 희망 게임으로 검색..."
            className="flex-1 h-10 bg-white rounded-[10px] px-4 text-[13px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
            style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
          />
        </div>

        {/* 윗줄: 전체 / 관심 인원만 / 미합류만 */}
        <div className="flex gap-2 mb-2 flex-wrap">
          <button
            onClick={() => { setFilterInterest(false); setFilterUnassigned(false); }}
            className={`h-[30px] px-3 rounded-[15px] text-[12px] font-medium transition-colors ${
              !filterInterest && !filterUnassigned
                ? "bg-[#007AFF] text-white"
                : "bg-white text-[#86868B] hover:bg-[#ECECEE]"
            }`}
            style={filterInterest || filterUnassigned ? { boxShadow: "0 2px 20px rgba(0,0,0,0.03)" } : {}}
          >
            전체
          </button>
          {user && (
            <button
              onClick={() => setFilterInterest((v) => !v)}
              className={`h-[30px] px-3 rounded-[15px] text-[12px] font-medium transition-colors ${
                filterInterest
                  ? "bg-[#1D1D1F] text-white"
                  : "bg-white text-[#86868B] hover:bg-[#ECECEE]"
              }`}
              style={!filterInterest ? { boxShadow: "0 2px 20px rgba(0,0,0,0.03)" } : {}}
            >
              관심 인원만
            </button>
          )}
          <button
            onClick={() => setFilterUnassigned((v) => !v)}
            className={`h-[30px] px-3 rounded-[15px] text-[12px] font-medium transition-colors ${
              filterUnassigned
                ? "bg-[#1D1D1F] text-white"
                : "bg-white text-[#86868B] hover:bg-[#ECECEE]"
            }`}
            style={!filterUnassigned ? { boxShadow: "0 2px 20px rgba(0,0,0,0.03)" } : {}}
          >
            미합류만
          </button>
        </div>

        {/* 아랫줄: 장르 필터 */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {GENRE_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setFilterGenre(filterGenre === g ? "" : g)}
              className={`h-[30px] px-3 rounded-[15px] text-[12px] font-medium transition-colors ${
                filterGenre === g
                  ? "bg-[#007AFF] text-white"
                  : "bg-white text-[#86868B] hover:bg-[#ECECEE]"
              }`}
              style={filterGenre !== g ? { boxShadow: "0 2px 20px rgba(0,0,0,0.03)" } : {}}
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
                className="bg-white rounded-2xl p-5 flex flex-col gap-3 cursor-pointer hover:ring-2 hover:ring-[#007AFF]/30 transition-all"
                style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-[16px] font-semibold text-[#1D1D1F]">{s.name}</p>
                    <p className="text-[12px] font-medium text-[#86868B]">
                      {skillsDisplay.length > 0 ? skillsDisplay.join(", ") : "역량 미설정"}
                    </p>
                  </div>
                  {s.team_id && (
                    <span className="shrink-0 h-[22px] px-2.5 bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-semibold rounded-[11px] flex items-center">
                      팀 합류
                    </span>
                  )}
                </div>
                {s.genres && s.genres.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {s.genres.map((g) => (
                      <span key={g} className="h-[26px] px-3 bg-[#F5F5F7] rounded-[17px] text-[11px] font-medium text-[#86868B] flex items-center">
                        {g}
                      </span>
                    ))}
                  </div>
                )}
                {s.intro && <p className="text-[13px] text-[#1D1D1F] line-clamp-1">{s.intro}</p>}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-[14px] text-[#86868B] col-span-full text-center py-12">검색 결과가 없습니다.</p>
          )}
        </div>

        {/* Profile Modal */}
        {selectedStudent && (() => {
          const s = selectedStudent;
          const skillsDisplay = s.part ? s.part.split(",").map((x: string) => x.trim()).filter(Boolean) : [];
          return (
            <div
              className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
              onClick={() => setSelectedStudent(null)}
            >
              <div
                className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-7 flex flex-col gap-5"
                onClick={(e) => e.stopPropagation()}
                style={{ boxShadow: "0 8px 40px rgba(0,0,0,0.12)" }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-[22px] font-bold text-[#1D1D1F]">{s.name}</p>
                      {s.team_id && (
                        <span className="h-[22px] px-2.5 bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-semibold rounded-[11px] flex items-center">
                          팀 합류
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] font-medium text-[#86868B]">
                      {skillsDisplay.length > 0 ? skillsDisplay.join(", ") : "역량 미설정"}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center text-[#86868B] hover:bg-[#ECECEE] transition-colors text-[18px]"
                  >
                    X
                  </button>
                </div>

                {s.genres && s.genres.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[12px] font-medium text-[#AEAEB2]">선호 장르</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {s.genres.map((g) => (
                        <span key={g} className="h-[28px] px-3.5 bg-[#F5F5F7] rounded-[17px] text-[12px] font-medium text-[#86868B] flex items-center">
                          {g}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {s.intro && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-[#AEAEB2]">한줄 소개</span>
                    <p className="text-[14px] text-[#1D1D1F]">{s.intro}</p>
                  </div>
                )}

                {s.favorite_games && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-[#AEAEB2]">좋아하는 게임</span>
                    <p className="text-[14px] text-[#1D1D1F]">{s.favorite_games}</p>
                  </div>
                )}

                {s.game_concept && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-[#AEAEB2]">만들고 싶은 게임</span>
                    <p className="text-[14px] text-[#1D1D1F]">{s.game_concept}</p>
                  </div>
                )}

                {s.collab_style && (
                  <div className="flex flex-col gap-1">
                    <span className="text-[12px] font-medium text-[#AEAEB2]">선호하는 협업 방식</span>
                    <p className="text-[14px] text-[#1D1D1F]">{s.collab_style}</p>
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleInterest(s.id);
                  }}
                  className={`w-full h-11 rounded-[10px] text-[14px] font-semibold transition-colors ${
                    myInterests.has(s.id)
                      ? "bg-[#007AFF] text-white"
                      : "bg-[#F5F5F7] text-[#007AFF] hover:bg-[#ECECEE]"
                  }`}
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
