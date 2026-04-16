"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import AppLayout from "@/components/app-layout";
import { supabase } from "@/lib/supabase";
import { Team, Student } from "@/lib/types";

const CARD_SHADOW = "0 4px 24px rgba(0,0,0,0.4)";

interface TeamWithMembers extends Team {
  members: Student[];
}

const STATUS_INFO = {
  building: { text: "🗡 결성중",    bg: "#2E1818", color: "#E05050", border: "#5A2A2A" },
  pending:  { text: "🔮 원정 신청", bg: "#0E1A2E", color: "#5090D8", border: "#2A3A5A" },
  approved: { text: "✨ 원정 확정", bg: "#0A1810", color: "#38C870", border: "#1A4030" },
};

export default function TeamsPage() {
  return (
    <Suspense fallback={<AppLayout><h1 className="text-[28px] font-bold mb-6" style={{ color: "#E0B847", fontFamily: "'Playfair Display', serif" }}>파티 현황</h1><p className="text-[14px] text-center py-12" style={{ color: "#4A6A8A" }}>불러오는 중...</p></AppLayout>}>
      <TeamsContent />
    </Suspense>
  );
}

function TeamsContent() {
  const [teams, setTeams] = useState<TeamWithMembers[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [assignedCount, setAssignedCount] = useState(0);
  const [settings, setSettings] = useState({ max_team_size: 5 });
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [filterStatus, setFilterStatus] = useState<"" | "building" | "pending" | "approved">("");

  useEffect(() => { loadData(); }, []);

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
      console.error("파티 현황 로드 오류:", e);
    } finally {
      setLoading(false);
    }
  }

  const unassigned = totalStudents - assignedCount;

  if (loading) {
    return (
      <AppLayout>
        <h1 className="text-[28px] font-bold mb-6" style={{ color: "#E0B847", fontFamily: "'Playfair Display', serif" }}>파티 현황</h1>
        <p className="text-[14px] text-center py-12" style={{ color: "#4A6A8A" }}>불러오는 중...</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <h1 className="text-[28px] font-bold mb-6" style={{ color: "#E0B847", fontFamily: "'Playfair Display', serif" }}>파티 현황</h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { value: teams.length, label: "전체 파티" },
          { value: assignedCount, label: "파티 합류" },
          { value: unassigned, label: "모험가 대기", warn: true },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-5 text-center" style={{ background: "#111E30", border: `1px solid ${s.warn ? "#5A3A14" : "#2A4060"}`, boxShadow: CARD_SHADOW }}>
            <p className="text-[32px] font-bold" style={{ color: s.warn ? "#E8962A" : "#E0B847", fontFamily: "'Playfair Display', serif" }}>{s.value}</p>
            <p className="text-[12px] font-medium mt-1" style={{ color: "#4A6A8A" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="파티 이름 또는 파티원 이름으로 검색"
        className="w-full h-11 rounded-[10px] px-4 text-[14px] outline-none mb-4"
        style={{ background: "#111E30", border: "1px solid #2A4060", color: "#E8DCBC", caretColor: "#C8952A" }}
      />

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {[
          { value: "", label: "전체" },
          { value: "building", label: "🗡 결성중" },
          { value: "pending",  label: "🔮 원정 신청" },
          { value: "approved", label: "✨ 원정 확정" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFilterStatus(f.value as "" | "building" | "pending" | "approved")}
            className="h-[34px] px-4 rounded-[17px] text-[12px] font-medium transition-colors"
            style={
              filterStatus === f.value
                ? { background: "#C8952A", color: "#0D1520" }
                : { background: "#111E30", color: "#4A6A8A", border: "1px solid #2A4060" }
            }
          >
            {f.label}
            {f.value !== "" && (
              <span className="ml-1.5">({teams.filter((t) => t.status === f.value).length})</span>
            )}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teams.filter((t) => {
          if (filterStatus && t.status !== filterStatus) return false;
          if (!search.trim()) return true;
          const q = search.trim().toLowerCase();
          return t.name.toLowerCase().includes(q) || t.members.some((m) => m.name.toLowerCase().includes(q));
        }).map((t) => {
          const si = STATUS_INFO[t.status] || STATUS_INFO.building;
          return (
            <div
              key={t.id}
              className="rounded-2xl p-5 flex flex-col gap-2.5"
              style={{ background: "#111E30", border: `1px solid ${si.border}`, boxShadow: CARD_SHADOW }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold flex-1" style={{ color: "#E8DCBC", fontFamily: "'Playfair Display', serif" }}>{t.name}</span>
                <span className="h-[22px] px-2.5 rounded-[4px] text-[10px] font-semibold flex items-center" style={{ background: si.bg, color: si.color, border: `1px solid ${si.border}` }}>
                  {si.text}
                </span>
                <span className="h-[22px] px-2.5 rounded-[4px] text-[10px] font-semibold flex items-center" style={{ background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}>
                  {t.members.length}/{settings.max_team_size}명
                </span>
              </div>
              {t.description && <p className="text-[13px]" style={{ color: "#4A6A8A" }}>{t.description}</p>}
              <p className="text-[12px]" style={{ color: "#3A5A78" }}>
                {t.members.map((m) => m.name).join(", ")}
              </p>
            </div>
          );
        })}
        {teams.length === 0 && (
          <p className="text-[14px] col-span-full text-center py-12" style={{ color: "#4A6A8A" }}>아직 결성된 파티가 없습니다.</p>
        )}
      </div>
    </AppLayout>
  );
}
