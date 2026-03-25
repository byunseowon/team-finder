"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/app-layout";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const GENRE_OPTIONS = ["RPG", "FPS", "액션", "퍼즐", "시뮬레이션", "플랫포머", "공포", "레이싱", "스포츠", "기타"];
const SKILL_OPTIONS = ["프로그래밍", "아트", "기획"];

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [skills, setSkills] = useState<string[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [intro, setIntro] = useState("");
  const [gameConcept, setGameConcept] = useState("");
  const [collabStyle, setCollabStyle] = useState("");
  const [favoriteGames, setFavoriteGames] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setSkills(user.part ? user.part.split(",").map((s: string) => s.trim()).filter(Boolean) : []);
      setGenres(user.genres || []);
      setIntro(user.intro || "");
      setGameConcept(user.game_concept || "");
      setCollabStyle(user.collab_style || "");
      setFavoriteGames(user.favorite_games || "");
    }
  }, [user]);

  function toggleSkill(s: string) {
    setSkills((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  function toggleGenre(g: string) {
    setGenres((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    await supabase
      .from("students")
      .update({ part: skills.join(","), genres, intro, game_concept: gameConcept, collab_style: collabStyle, favorite_games: favoriteGames })
      .eq("id", user.id);
    await refreshUser();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!user) {
    return (
      <AppLayout>
        <h1 className="text-[28px] font-bold text-[#1D1D1F] mb-6">내 프로필</h1>
        <p className="text-[14px] text-[#86868B] text-center py-12">관리자 계정에서는 프로필 기능을 사용할 수 없습니다.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-[28px] font-bold text-[#1D1D1F] mb-6">내 프로필</h1>
      <div
        className="bg-white rounded-2xl p-7 flex flex-col gap-5"
        style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#86868B]">이름</label>
          <div className="h-11 bg-[#F5F5F7] rounded-[10px] px-4 flex items-center text-[14px] text-[#1D1D1F]">
            {user?.name}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#86868B]">역량 (복수 선택)</label>
          <div className="flex gap-2 flex-wrap">
            {SKILL_OPTIONS.map((s) => (
              <button
                key={s}
                onClick={() => toggleSkill(s)}
                className={`h-[34px] px-4 rounded-[17px] text-[13px] font-medium transition-colors ${
                  skills.includes(s)
                    ? "bg-[#007AFF] text-white"
                    : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#ECECEE]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#86868B]">선호 장르 (복수 선택)</label>
          <div className="flex gap-2 flex-wrap">
            {GENRE_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => toggleGenre(g)}
                className={`h-[34px] px-4 rounded-[17px] text-[13px] font-medium transition-colors ${
                  genres.includes(g)
                    ? "bg-[#007AFF] text-white"
                    : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#ECECEE]"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#86868B]">좋아하는 게임</label>
          <input
            value={favoriteGames}
            onChange={(e) => setFavoriteGames(e.target.value)}
            placeholder="좋아하는 게임을 적어 주세요 (예: 엘든링, 발로란트, 젤다)"
            className="h-11 bg-[#F5F5F7] rounded-[10px] px-4 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#86868B]">한줄 소개</label>
          <input
            value={intro}
            onChange={(e) => setIntro(e.target.value)}
            placeholder="자신을 한줄로 소개해 주세요"
            className="h-11 bg-[#F5F5F7] rounded-[10px] px-4 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#86868B]">만들고 싶은 게임</label>
          <textarea
            value={gameConcept}
            onChange={(e) => setGameConcept(e.target.value)}
            placeholder="어떤 게임을 만들고 싶은지 자유롭게 적어 주세요"
            rows={3}
            className="bg-[#F5F5F7] rounded-[10px] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none resize-none focus:ring-2 focus:ring-[#007AFF]/30"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-[#86868B]">선호하는 협업 방식</label>
          <textarea
            value={collabStyle}
            onChange={(e) => setCollabStyle(e.target.value)}
            placeholder="선호하는 소통/협업 스타일을 적어 주세요"
            rows={3}
            className="bg-[#F5F5F7] rounded-[10px] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none resize-none focus:ring-2 focus:ring-[#007AFF]/30"
          />
        </div>

        <div className="flex gap-2.5 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-11 px-6 bg-[#007AFF] hover:bg-[#0066DD] text-white text-[15px] font-semibold rounded-[10px] transition-colors disabled:opacity-50"
          >
            {saving ? "저장 중..." : "저장"}
          </button>
          {saved && <span className="text-[13px] text-[#34C759] self-center">저장되었습니다</span>}
        </div>
      </div>
    </AppLayout>
  );
}
