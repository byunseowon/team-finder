"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/app-layout";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import { Student, Team } from "@/lib/types";

const STATUS_INFO = {
  building: { text: "팀빌딩 중", bg: "#FFF3E0", color: "#E65100" },
  pending:  { text: "승인 신청", bg: "#E3F2FD", color: "#1565C0" },
  approved: { text: "승인 완료", bg: "#E8F5E9", color: "#2E7D32" },
};

export default function MyTeamPage() {
  const { user, refreshUser, isTeamBuildingOpen, isLocked } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Student[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [teamDesc, setTeamDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [settings, setSettings] = useState({ min_team_size: 2, max_team_size: 5 });

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    if (user?.team_id) loadTeam(user.team_id);
    else {
      setTeam(null);
      setMembers([]);
    }
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
      .select()
      .single();
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
    if (team.status === "approved") { alert("승인된 팀은 탈퇴할 수 없습니다."); return; }
    if (!confirm("정말 팀을 탈퇴하시겠습니까?")) return;
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
    const name = prompt("추가할 수강생 이름을 입력하세요:");
    if (!name) return;
    const { data: student } = await supabase.from("students").select("*").eq("name", name.trim()).single();
    if (!student) { alert("등록되지 않은 이름입니다."); return; }
    if (student.team_id) { alert("이미 다른 팀에 소속된 수강생입니다."); return; }
    if (members.length >= settings.max_team_size) { alert(`최대 인원(${settings.max_team_size}명)을 초과할 수 없습니다.`); return; }
    await supabase.from("students").update({ team_id: team.id }).eq("id", student.id);
    await loadTeam(team.id);
  }

  async function handleRequestApproval() {
    if (!team) return;
    if (members.length < settings.min_team_size || members.length > settings.max_team_size) {
      alert(`팀 인원이 ${settings.min_team_size}명 이상 ${settings.max_team_size}명 이하일 때만 승인 신청이 가능합니다.`);
      return;
    }
    if (!confirm("승인 신청 후에는 팀원을 변경할 수 없습니다. 진행하시겠습니까?")) return;
    await supabase.from("teams").update({ status: "pending" }).eq("id", team.id);
    await loadTeam(team.id);
  }

  async function handleCancelRequest() {
    if (!team) return;
    if (!confirm("승인 신청을 취소하고 팀빌딩 중으로 돌아가시겠습니까?")) return;
    await supabase.from("teams").update({ status: "building" }).eq("id", team.id);
    await loadTeam(team.id);
  }

  const isLeader = user && team?.leader_id === user.id;
  const isEditable = team?.status === "building" && !isLocked;
  const st = team ? STATUS_INFO[team.status] : null;

  if (!user) {
    return (
      <AppLayout>
        <h1 className="text-[28px] font-bold text-[#1D1D1F] mb-6">내 팀</h1>
        <p className="text-[14px] text-[#86868B] text-center py-12">관리자 계정에서는 내 팀 기능을 사용할 수 없습니다.</p>
      </AppLayout>
    );
  }

  if (!isTeamBuildingOpen && !isLocked) {
    return (
      <AppLayout>
        <h1 className="text-[28px] font-bold text-[#1D1D1F] mb-6">내 팀</h1>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center">
            <span className="text-[32px]">⏳</span>
          </div>
          <h2 className="text-[20px] font-bold text-[#1D1D1F]">아직 팀 빌딩이 시작되지 않았습니다</h2>
          <p className="text-[14px] text-[#86868B]">먼저 프로필을 작성하고 기다려 주세요.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-[28px] font-bold text-[#1D1D1F] mb-6">내 팀</h1>

      {isLocked && (
        <div className="bg-[#F5F5F7] rounded-[10px] px-4 py-3 text-[13px] text-[#86868B] mb-6">
          팀 빌딩이 종료되어 수정이 불가합니다.
        </div>
      )}

      {!team ? (
        <div className="flex flex-col items-center gap-6 py-16">
          <p className="text-[14px] text-[#86868B]">아직 소속된 팀이 없습니다.</p>
          {!isLocked && !showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="h-11 px-6 bg-[#007AFF] hover:bg-[#0066DD] text-white text-[15px] font-semibold rounded-[10px] transition-colors"
            >
              새 팀 만들기
            </button>
          )}
          {!isLocked && showCreate && (
            <div
              className="w-full max-w-md bg-white rounded-2xl p-7 flex flex-col gap-4"
              style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
            >
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="팀 이름"
                className="h-11 bg-[#F5F5F7] rounded-[10px] px-4 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
              />
              <textarea
                value={teamDesc}
                onChange={(e) => setTeamDesc(e.target.value)}
                placeholder="팀 소개 (선택)"
                rows={3}
                className="bg-[#F5F5F7] rounded-[10px] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none resize-none focus:ring-2 focus:ring-[#007AFF]/30"
              />
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowCreate(false)}
                  className="h-11 px-6 bg-[#F5F5F7] text-[#1D1D1F] text-[15px] font-medium rounded-[10px] hover:bg-[#ECECEE] transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !teamName.trim()}
                  className="h-11 px-6 bg-[#007AFF] hover:bg-[#0066DD] text-white text-[15px] font-semibold rounded-[10px] transition-colors disabled:opacity-50"
                >
                  {creating ? "생성 중..." : "팀 생성"}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className="bg-white rounded-2xl p-7 flex flex-col gap-5"
          style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] font-bold text-[#1D1D1F] flex-1">{team.name}</h2>
            {st && (
              <span
                className="h-7 px-3.5 rounded-[17px] text-[12px] font-semibold flex items-center"
                style={{ backgroundColor: st.bg, color: st.color }}
              >
                {st.text}
              </span>
            )}
            <span className="h-7 px-3.5 bg-[#E3F2FD] rounded-[17px] text-[12px] font-semibold text-[#1565C0] flex items-center">
              {members.length}/{settings.max_team_size}명
            </span>
          </div>

          {team.description && <p className="text-[14px] text-[#86868B]">{team.description}</p>}

          {!isLocked && team.status === "building" && (
            <div className="bg-[#FFF3E0] rounded-[10px] px-4 py-3 text-[13px] text-[#E65100]">
              승인 신청은 팀원이 {settings.min_team_size}명 이상 {settings.max_team_size}명 이하일 때 가능합니다.
              현재 {members.length}명입니다.
            </div>
          )}
          {!isLocked && team.status === "pending" && (
            <div className="bg-[#E3F2FD] rounded-[10px] px-4 py-3 text-[13px] text-[#1565C0]">
              승인 신청이 완료되었습니다. 운영진의 승인을 기다리는 중입니다.
            </div>
          )}
          {team.status === "approved" && (
            <div className="bg-[#E8F5E9] rounded-[10px] px-4 py-3 text-[13px] text-[#2E7D32]">
              팀 구성이 승인되었습니다.
            </div>
          )}

          <div className="w-full h-px bg-[#F5F5F7]" />

          <div className="flex items-center justify-between">
            <span className="text-[14px] font-semibold text-[#1D1D1F]">팀원</span>
            {isEditable && members.length < settings.max_team_size && (
              <button
                onClick={handleAddMember}
                className="text-[13px] text-[#007AFF] font-medium hover:underline"
              >
                + 팀원 추가
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2.5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center h-11 px-4 bg-[#F5F5F7] rounded-[10px] gap-3">
                <span className="text-[14px] font-medium text-[#1D1D1F] flex-1">{m.name}</span>
                <span className="text-[12px] text-[#86868B]">{m.part || "파트 미설정"}</span>
                {m.id === team.leader_id && (
                  <span className="h-[22px] px-2.5 bg-[#007AFF] rounded-[17px] text-[10px] font-semibold text-white flex items-center">
                    팀장
                  </span>
                )}
              </div>
            ))}
          </div>

          {!isLocked && (
            <div className="flex gap-2.5 pt-2 flex-wrap">
              {team.status === "building" && (
                <button
                  onClick={handleRequestApproval}
                  disabled={members.length < settings.min_team_size || members.length > settings.max_team_size}
                  className="h-10 px-5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-40"
                >
                  승인 신청
                </button>
              )}
              {team.status === "pending" && (
                <button
                  onClick={handleCancelRequest}
                  className="h-10 px-5 bg-[#F5F5F7] text-[#E65100] text-[14px] font-medium rounded-[10px] hover:bg-[#ECECEE] transition-colors"
                >
                  신청 취소
                </button>
              )}
              {team.status !== "approved" && (
                <button
                  onClick={handleLeave}
                  className="h-10 px-5 bg-[#F5F5F7] text-[#FF3B30] text-[14px] font-medium rounded-[10px] hover:bg-[#ECECEE] transition-colors"
                >
                  팀 탈퇴
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}
