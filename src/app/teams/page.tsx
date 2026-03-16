"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/app-layout";
import { supabase } from "@/lib/supabase";
import { Team, Student } from "@/lib/types";

interface TeamWithMembers extends Team {
  members: Student[];
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [settings, setSettings] = useState({ max_team_size: 5 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: settingsData } = await supabase.from("app_settings").select("max_team_size").single();
      if (settingsData) setSettings(settingsData);

      const { data: allStudents } = await supabase.from("students").select("*");
      if (allStudents) {
        setTotalStudents(allStudents.length);
        setAssignedCount(allStudents.filter((s: Student) => s.team_id).length);
      }

      const { data: teamsData } = await supabase.from("teams").select("*").order("created_at");
      if (teamsData) {
        const withMembers = await Promise.all(
          teamsData.map(async (t: Team) => {
            const { data: members } = await supabase.from("students").select("*").eq("team_id", t.id).order("name");
            return { ...t, members: members || [] };
          })
        );
        setTeams(withMembers);
      }
    } catch (e) {
      console.error("팀 현황 로드 오류:", e);
    } finally {
      setLoading(false);
    }
  }

  const unassigned = totalStudents - assignedCount;

  if (loading) {
    return (
      <AppLayout>
        <h1 className="text-[28px] font-bold text-[#1D1D1F] mb-6">팀 현황</h1>
        <p className="text-[14px] text-[#86868B] text-center py-12">불러오는 중...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-[28px] font-bold text-[#1D1D1F] mb-6">팀 현황</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-2xl p-5 text-center" style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}>
          <p className="text-[32px] font-bold text-[#007AFF]">{teams.length}</p>
          <p className="text-[13px] font-medium text-[#86868B]">전체 팀</p>
        </div>
        <div className="bg-white rounded-2xl p-5 text-center" style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}>
          <p className="text-[32px] font-bold text-[#007AFF]">{assignedCount}</p>
          <p className="text-[13px] font-medium text-[#86868B]">배정 완료</p>
        </div>
        <div className="bg-white rounded-2xl p-5 text-center" style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}>
          <p className="text-[32px] font-bold text-[#FF9500]">{unassigned}</p>
          <p className="text-[13px] font-medium text-[#86868B]">미배정</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teams.map((t) => {
          const ratio = t.members.length / settings.max_team_size;
          const badgeBg = ratio >= 1 ? "#E8F5E9" : ratio >= 0.5 ? "#E3F2FD" : "#FFF3E0";
          const badgeColor = ratio >= 1 ? "#2E7D32" : ratio >= 0.5 ? "#1565C0" : "#E65100";
          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl p-5 flex flex-col gap-2.5"
              style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[16px] font-semibold text-[#1D1D1F] flex-1">{t.name}</span>
                <span
                  className="h-[22px] px-2.5 rounded-[17px] text-[10px] font-semibold flex items-center"
                  style={{ backgroundColor: badgeBg, color: badgeColor }}
                >
                  {t.members.length}/{settings.max_team_size}명
                </span>
              </div>
              {t.description && <p className="text-[13px] text-[#86868B]">{t.description}</p>}
              <p className="text-[12px] text-[#AEAEB2]">
                {t.members.map((m) => m.name).join(", ")}
              </p>
            </div>
          );
        })}
        {teams.length === 0 && (
          <p className="text-[14px] text-[#86868B] col-span-full text-center py-12">아직 생성된 팀이 없습니다.</p>
        )}
      </div>
    </AppLayout>
  );
}
