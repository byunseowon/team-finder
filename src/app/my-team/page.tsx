"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/app-layout";
import LockGuard from "@/components/lock-guard";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Student, Team } from "@/lib/types";

const CARD_SHADOW = "0 4px 24px rgba(0,0,0,0.4)";

const STATUS_INFO = {
  building: { text: "🗡 결성중",    bg: "#2E1818", color: "#E05050", border: "#5A2A2A" },
  pending:  { text: "🔮 원정 신청", bg: "#0E1A2E", color: "#5090D8", border: "#2A3A5A" },
  approved: { text: "✨ 원정 확정", bg: "#0A1810", color: "#38C870", border: "#1A4030" },
};

const INPUT_STYLE = {
  background: "#162030",
  border: "1px solid #2A4060",
  color: "#E8DCBC",
  caretColor: "#C8952A",
} as React.CSSProperties;

export default function MyTeamPage() {
  const { user, refreshUser } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Student[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState({ min_team_size: 2, max_team_size: 5 });

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => {
    if (user?.team_id) loadTeam(user.team_id);
    else { setTeam(null); setMembers([]); }
  }, [user]);

  async function loadSettings() {
    const { data } = await supabase.from("app_settings").select("min_team_size, max_team_size").single();
    if (data) setSettings(data);
  }

  async function loadTeam(teamId: string) {
    const { data: t } = await supabase.from("teams").select("*").eq("id", teamId).single();
    if (t) setTeam(t);
    const { data: m } = await supabase.from("students").select("*").eq("team_id", teamId).order("name");
    if (m) setMembers(m);
  }

  async function handleCreate() {
    if (!user || !teamName.trim()) return;
    setCreating(true);
    const { data: newTeam } = await supabase
      .from("teams")
      .insert({ name: teamName, description: teamDesc, leader_id: user.id, status: "building" })
      .select().single();
    if (newTeam) {
      await supabase.from("students").update({ team_id: newTeam.id }).eq("id", user.id);
      await refreshUser();
    }
    setCreating(false);
    setShowCreate(false);
    setTeamName("");
    setTeamDesc("");
  }

  async function handleLeave() {
    if (!user || !team) return;
    if (team.status === "approved") { alert("원정이 확정된 파티는 탈퇴할 수 없습니다."); return; }
    if (!confirm("정말 파티를 탈퇴하시겠습니까?")) return;
    await supabase.from("students").update({ team_id: null }).eq("id", user.id);
    if (team.leader_id === user.id) {
      const remaining = members.filter((m) => m.id !== user.id);
      if (remaining.length > 0) {
        await supabase.from("teams").update({ leader_id: remaining[0].id }).eq("id", team.id);
      } else {
        await supabase.from("teams").delete().eq("id", team.id);
      }
    }
    await refreshUser();
  }

  async function handleAddMember() {
    if (!team || team.status !== "building") return;
    const name = prompt("추가할 모험가 이름을 입력하세요:");
    if (!name) return;
    const { data: student } = await supabase.from("students").select("*").eq("name", name.trim()).single();
    if (!student) { alert("등록되지 않은 이름입니다."); return; }
    if (student.team_id) { alert("이미 다른 파티에 소속된 모험가입니다."); return; }
    if (members.length >= settings.max_team_size) { alert(`최대 인원(${settings.max_team_size}명)을 초과할 수 없습니다.`); return; }
    await supabase.from("students").update({ team_id: team.id }).eq("id", student.id);
    await loadTeam(team.id);
  }

  async function handleRequestApproval() {
    if (!team) return;
    if (members.length < settings.min_team_size || members.length > settings.max_team_size) {
      alert(`파티 인원이 ${settings.min_team_size}명 이상 ${settings.max_team_size}명 이하일 때만 원정 신청이 가능합니다.`);
      return;
    }
    if (!confirm("원정 신청 후에는 파티원을 변경할 수 없습니다. 진행하시겠습니까?")) return;
    await supabase.from("teams").update({ status: "pending" }).eq("id", team.id);
    await loadTeam(team.id);
  }

  async function handleCancelRequest() {
    if (!team) return;
    if (!confirm("원정 신청을 취소하고 결성중으로 돌아가시겠습니까?")) return;
    await supabase.from("teams").update({ status: "building" }).eq("id", team.id);
    await loadTeam(team.id);
  }

  const isLeader = user && team?.leader_id === user.id;
  const isEditable = team?.status === "building";
  const st = team ? STATUS_INFO[team.status] : null;

  if (!user) {
    return (
      <AppLayout>
        <h1 className="text-[28px] font-bold mb-6" style={{ color: "#E0B847", fontFamily: "'Playfair Display', serif" }}>내 파티</h1>
        <p className="text-[14px] text-center py-12" style={{ color: "#4A6A8A" }}>길드마스터 계정에서는 내 파티 기능을 사용할 수 없습니다.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <LockGuard>
        <h1 className="text-[28px] font-bold mb-6" style={{ color: "#E0B847", fontFamily: "'Playfair Display', serif" }}>내 파티</h1>

        {!team ? (
          <div className="flex flex-col items-center gap-6 py-16">
            <p className="text-[14px]" style={{ color: "#4A6A8A" }}>아직 소속된 파티가 없습니다.</p>
            {!showCreate ? (
              <button
                onClick={() => setShowCreate(true)}
                className="h-11 px-6 text-[15px] font-semibold rounded-[10px] transition-colors"
                style={{ background: "#C8952A", color: "#0D1520" }}
              >
                새 파티 결성
              </button>
            ) : (
              <div className="w-full max-w-md rounded-2xl p-7 flex flex-col gap-4" style={{ background: "#111E30", border: "1px solid #2A4060", boxShadow: CARD_SHADOW }}>
                <input
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="파티 이름"
                  className="h-11 rounded-[10px] px-4 text-[14px] outline-none"
                  style={INPUT_STYLE}
                />
                <textarea
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  placeholder="파티 소개 (선택)"
                  rows={3}
                  className="rounded-[10px] px-4 py-3 text-[14px] outline-none resize-none"
                  style={INPUT_STYLE}
                />
                <div className="flex gap-2.5">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="h-11 px-6 text-[15px] font-medium rounded-[10px] transition-colors"
                    style={{ background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={creating || !teamName.trim()}
                    className="h-11 px-6 text-[15px] font-semibold rounded-[10px] transition-colors disabled:opacity-50"
                    style={{ background: "#C8952A", color: "#0D1520" }}
                  >
                    {creating ? "결성 중..." : "파티 결성"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-2xl p-7 flex flex-col gap-5" style={{ background: "#111E30", border: `1px solid ${st?.border ?? "#2A4060"}`, boxShadow: CARD_SHADOW }}>
            {/* 헤더 */}
            <div className="flex items-center gap-3">
              <h2 className="text-[20px] font-bold flex-1" style={{ color: "#E8DCBC", fontFamily: "'Playfair Display', serif" }}>{team.name}</h2>
              {st && (
                <span className="h-7 px-3.5 rounded-[6px] text-[12px] font-semibold flex items-center" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>
                  {st.text}
                </span>
              )}
              <span className="h-7 px-3.5 rounded-[6px] text-[12px] font-semibold flex items-center" style={{ background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}>
                {members.length}/{settings.max_team_size}명
              </span>
            </div>

            {team.description && <p className="text-[14px]" style={{ color: "#4A6A8A" }}>{team.description}</p>}

            {/* 상태 안내 배너 */}
            {team.status === "building" && isLeader && (
              <div className="rounded-[10px] px-4 py-3 text-[13px]" style={{ background: "#2E1818", color: "#E05050", border: "1px solid #5A2A2A" }}>
                원정 신청은 파티원이 {settings.min_team_size}명 이상 {settings.max_team_size}명 이하일 때 가능합니다. 현재 {members.length}명입니다.
              </div>
            )}
            {team.status === "pending" && (
              <div className="rounded-[10px] px-4 py-3 text-[13px]" style={{ background: "#0E1A2E", color: "#5090D8", border: "1px solid #2A3A5A" }}>
                원정 신청이 완료되었습니다. 길드마스터의 확정을 기다리는 중입니다.
              </div>
            )}
            {team.status === "approved" && (
              <div className="rounded-[10px] px-4 py-3 text-[13px]" style={{ background: "#0A1810", color: "#38C870", border: "1px solid #1A4030" }}>
                원정이 확정되었습니다. 파티 구성을 변경할 수 없습니다.
              </div>
            )}

            <div className="w-full h-px" style={{ background: "#2A4060" }} />

            {/* 파티원 목록 */}
            <div className="flex items-center justify-between">
              <span className="text-[14px] font-semibold" style={{ color: "#E8DCBC" }}>파티원</span>
              {isLeader && isEditable && members.length < settings.max_team_size && (
                <button onClick={handleAddMember} className="text-[13px] font-medium hover:underline" style={{ color: "#C8952A" }}>
                  + 파티원 추가
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {members.map((m) => (
                <div key={m.id} className="flex items-center h-11 px-4 rounded-[10px] gap-3" style={{ background: "#162030", border: "1px solid #2A4060" }}>
                  <span className="text-[14px] font-medium flex-1" style={{ color: "#E8DCBC" }}>{m.name}</span>
                  <span className="text-[12px]" style={{ color: "#4A6A8A" }}>{m.part || "파트 미설정"}</span>
                  {m.id === team.leader_id && (
                    <span className="h-[22px] px-2.5 rounded-[4px] text-[10px] font-semibold flex items-center" style={{ background: "#C8952A", color: "#0D1520" }}>
                      파티장
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* 하단 버튼 */}
            <div className="flex gap-2.5 pt-2 flex-wrap">
              {isLeader && team.status === "building" && (
                <button
                  onClick={handleRequestApproval}
                  disabled={members.length < settings.min_team_size || members.length > settings.max_team_size}
                  className="h-10 px-5 text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-40"
                  style={{ background: "#C8952A", color: "#0D1520" }}
                >
                  원정 신청
                </button>
              )}
              {isLeader && team.status === "pending" && (
                <button
                  onClick={handleCancelRequest}
                  className="h-10 px-5 text-[14px] font-medium rounded-[10px] transition-colors"
                  style={{ background: "#162030", color: "#E05050", border: "1px solid #5A2A2A" }}
                >
                  신청 취소
                </button>
              )}
              {team.status !== "approved" && (
                <button
                  onClick={handleLeave}
                  className="h-10 px-5 text-[14px] font-medium rounded-[10px] transition-colors"
                  style={{ background: "#162030", color: "#E05050", border: "1px solid #5A2A2A" }}
                >
                  파티 탈퇴
                </button>
              )}
            </div>
          </div>
        )}
      </LockGuard>
    </AppLayout>
  );
}
