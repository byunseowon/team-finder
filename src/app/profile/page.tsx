"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/app-layout";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const CARD_SHADOW = "0 4px 24px rgba(0,0,0,0.4)";
const GENRE_OPTIONS = ["RPG", "FPS", "액션", "퍼즐", "시뮬레이션", "플랫포머", "공포", "레이싱", "스포츠", "기타"];
const SKILL_OPTIONS = ["프로그래밍", "아트", "기획"];
const INPUT_STYLE = { background: "#162030", border: "1px solid #2A4060", color: "#E8DCBC", caretColor: "#C8952A" } as React.CSSProperties;

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
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState({ text: "", ok: true });

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
    await supabase.from("students").update({ part: skills.join(","), genres, intro, game_concept: gameConcept, collab_style: collabStyle, favorite_games: favoriteGames }).eq("id", user.id);
    await refreshUser();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleChangePassword() {
    if (!user) return;
    if (newPw.length < 4) { setPwMsg({ text: "비밀번호는 4자 이상이어야 합니다.", ok: false }); return; }
    if (newPw !== confirmPw) { setPwMsg({ text: "비밀번호가 일치하지 않습니다.", ok: false }); return; }
    await supabase.from("students").update({ password: newPw }).eq("id", user.id);
    setNewPw(""); setConfirmPw("");
    setPwMsg({ text: "비밀번호가 변경되었습니다.", ok: true });
    setTimeout(() => setPwMsg({ text: "", ok: true }), 3000);
  }

  if (!user) {
    return (
      <AppLayout>
        <h1 className="text-[28px] font-bold mb-6" style={{ color: "#E0B847", fontFamily: "'Playfair Display', serif" }}>내 프로필</h1>
        <p className="text-[14px] text-center py-12" style={{ color: "#4A6A8A" }}>길드마스터 계정에서는 프로필 기능을 사용할 수 없습니다.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-[28px] font-bold mb-6" style={{ color: "#E0B847", fontFamily: "'Playfair Display', serif" }}>내 프로필</h1>

      <div className="rounded-2xl p-7 flex flex-col gap-5" style={{ background: "#111E30", border: "1px solid #2A4060", boxShadow: CARD_SHADOW }}>
        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium" style={{ color: "#4A6A8A" }}>이름</label>
          <div className="h-11 rounded-[10px] px-4 flex items-center text-[14px]" style={{ background: "#162030", border: "1px solid #2A4060", color: "#E8DCBC" }}>
            {user?.name}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium" style={{ color: "#4A6A8A" }}>역량 (복수 선택)</label>
          <div className="flex gap-2 flex-wrap">
            {SKILL_OPTIONS.map((s) => (
              <button key={s} onClick={() => toggleSkill(s)} className="h-[34px] px-4 rounded-[6px] text-[13px] font-medium transition-colors" style={skills.includes(s) ? { background: "#C8952A", color: "#0D1520" } : { background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium" style={{ color: "#4A6A8A" }}>선호 장르 (복수 선택)</label>
          <div className="flex gap-2 flex-wrap">
            {GENRE_OPTIONS.map((g) => (
              <button key={g} onClick={() => toggleGenre(g)} className="h-[34px] px-4 rounded-[6px] text-[13px] font-medium transition-colors" style={genres.includes(g) ? { background: "#C8952A", color: "#0D1520" } : { background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}>
                {g}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium" style={{ color: "#4A6A8A" }}>좋아하는 게임</label>
          <input value={favoriteGames} onChange={(e) => setFavoriteGames(e.target.value)} placeholder="좋아하는 게임을 적어 주세요 (예: 엘든링, 발로란트, 젤다)" className="h-11 rounded-[10px] px-4 text-[14px] outline-none" style={{ ...INPUT_STYLE, color: "#E8DCBC" }} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium" style={{ color: "#4A6A8A" }}>한줄 소개</label>
          <input value={intro} onChange={(e) => setIntro(e.target.value)} placeholder="자신을 한줄로 소개해 주세요" className="h-11 rounded-[10px] px-4 text-[14px] outline-none" style={INPUT_STYLE} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium" style={{ color: "#4A6A8A" }}>만들고 싶은 게임</label>
          <textarea value={gameConcept} onChange={(e) => setGameConcept(e.target.value)} placeholder="어떤 게임을 만들고 싶은지 자유롭게 적어 주세요" rows={3} className="rounded-[10px] px-4 py-3 text-[14px] outline-none resize-none" style={INPUT_STYLE} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[12px] font-medium" style={{ color: "#4A6A8A" }}>선호하는 협업 방식</label>
          <textarea value={collabStyle} onChange={(e) => setCollabStyle(e.target.value)} placeholder="선호하는 소통/협업 스타일을 적어 주세요" rows={3} className="rounded-[10px] px-4 py-3 text-[14px] outline-none resize-none" style={INPUT_STYLE} />
        </div>

        <div className="flex gap-2.5 pt-2">
          <button onClick={handleSave} disabled={saving} className="h-11 px-6 text-[15px] font-semibold rounded-[10px] transition-colors disabled:opacity-50" style={{ background: "#C8952A", color: "#0D1520" }}>
            {saving ? "저장 중..." : "저장"}
          </button>
          {saved && <span className="text-[13px] self-center" style={{ color: "#38C870" }}>저장되었습니다</span>}
        </div>
      </div>

      {/* 비밀번호 변경 */}
      <div className="rounded-2xl p-7 flex flex-col gap-4 mt-4" style={{ background: "#111E30", border: "1px solid #2A4060", boxShadow: CARD_SHADOW }}>
        <p className="text-[16px] font-semibold" style={{ color: "#E8DCBC" }}>비밀번호 변경</p>
        <p className="text-[13px]" style={{ color: "#4A6A8A" }}>개인 비밀번호를 설정하면 길드 암호 대신 개인 비밀번호로 로그인합니다.</p>
        <div className="flex flex-col gap-3">
          <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} placeholder="새 비밀번호 (4자 이상)" className="h-11 rounded-[10px] px-4 text-[14px] outline-none" style={INPUT_STYLE} />
          <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} placeholder="새 비밀번호 확인" className="h-11 rounded-[10px] px-4 text-[14px] outline-none" style={INPUT_STYLE} />
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleChangePassword} disabled={!newPw || !confirmPw} className="h-10 px-6 text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-50" style={{ background: "#C8952A", color: "#0D1520" }}>변경</button>
          {pwMsg.text && <span className="text-[13px]" style={{ color: pwMsg.ok ? "#38C870" : "#E05050" }}>{pwMsg.text}</span>}
        </div>
      </div>
    </AppLayout>
  );
}
