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
  const [myInterests, setMyInterests] = useState<Set<string>>(new Set());

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

        <div className="flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => setFilterGenre("")}
            className={`h-[30px] px-3 rounded-[15px] text-[12px] font-medium transition-colors ${
              filterGenre === ""
                ? "bg-[#007AFF] text-white"
                : "bg-white text-[#86868B] hover:bg-[#ECECEE]"
            }`}
            style={filterGenre !== "" ? { boxShadow: "0 2px 20px rgba(0,0,0,0.03)" } : {}}
          >
            전체
          </button>
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
                className="bg-white rounded-2xl p-5 flex flex-col gap-3"
                style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
              >
                <div>
                  <p className="text-[16px] font-semibold text-[#1D1D1F]">{s.name}</p>
                  <p className="text-[12px] font-medium text-[#86868B]">
                    {skillsDisplay.length > 0 ? skillsDisplay.join(", ") : "역량 미설정"}
                  </p>
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
                {s.intro && <p className="text-[13px] text-[#1D1D1F]">{s.intro}</p>}
                {s.game_concept && (
                  <p className="text-[12px] text-[#86868B] line-clamp-2">{s.game_concept}</p>
                )}
                <button
                  onClick={() => toggleInterest(s.id)}
                  className={`w-full h-9 rounded-[10px] text-[13px] font-medium transition-colors ${
                    myInterests.has(s.id)
                      ? "bg-[#007AFF] text-white"
                      : "bg-[#F5F5F7] text-[#007AFF] hover:bg-[#ECECEE]"
                  }`}
                >
                  {myInterests.has(s.id) ? "관심 표시됨" : "관심 표시"}
                </button>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="text-[14px] text-[#86868B] col-span-full text-center py-12">검색 결과가 없습니다.</p>
          )}
        </div>
      </LockGuard>
    </AppLayout>
  );
}
