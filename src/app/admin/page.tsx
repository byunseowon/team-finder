"use client";

import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/app-layout";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

const CARD_SHADOW = "0 4px 24px rgba(0,0,0,0.4)";
const INPUT_STYLE = { background: "#162030", border: "1px solid #2A4060", color: "#E8DCBC", caretColor: "#C8952A" } as React.CSSProperties;

export default function AdminPage() {
  const { isAdmin, refreshLock } = useAuth();
  const [isLocked, setIsLocked] = useState(false);
  const [teamBuildingOpen, setTeamBuildingOpen] = useState(false);
  const [minSize, setMinSize] = useState(3);
  const [maxSize, setMaxSize] = useState(5);
  const [nameList, setNameList] = useState("");
  const [studentCount, setStudentCount] = useState(0);
  const [commonPw, setCommonPw] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingTeams, setPendingTeams] = useState<{ id: string; name: string; members: { name: string; part: string | null }[] }[]>([]);
  const [approvedTeams, setApprovedTeams] = useState<{ id: string; name: string; members: { name: string; part: string | null }[] }[]>([]);

  useEffect(() => {
    if (isAdmin) { loadSettings(); loadTeams(); }
  }, [isAdmin]);

  async function loadTeams() {
    const { data: teams } = await supabase.from("teams").select("id, name, status").order("created_at");
    if (!teams) return;
    const withMembers = await Promise.all(
      teams.map(async (t) => {
        const { data: members } = await supabase.from("students").select("name, part").eq("team_id", t.id).order("name");
        return { ...t, members: members || [] };
      })
    );
    setPendingTeams(withMembers.filter((t) => t.status === "pending"));
    setApprovedTeams(withMembers.filter((t) => t.status === "approved"));
  }

  async function handleApprove(teamId: string) {
    await supabase.from("teams").update({ status: "approved" }).eq("id", teamId);
    showMsg("파티 원정이 확정되었습니다.");
    loadTeams();
  }

  async function handleCancelApproval(teamId: string) {
    await supabase.from("teams").update({ status: "building" }).eq("id", teamId);
    showMsg("원정 확정이 취소되었습니다.");
    loadTeams();
  }

  async function loadSettings() {
    const { data } = await supabase.from("app_settings").select("*").single();
    if (data) {
      setIsLocked(data.is_locked);
      setTeamBuildingOpen(data.team_building_open);
      setMinSize(data.min_team_size);
      setMaxSize(data.max_team_size);
      setCommonPw(data.common_password);
    }
    const { count } = await supabase.from("students").select("*", { count: "exact", head: true });
    setStudentCount(count || 0);
    const { data: students } = await supabase.from("students").select("name").order("name");
    if (students) setNameList(students.map((s) => s.name).join("\n"));
  }

  async function handleToggleTeamBuilding() {
    const newOpen = !teamBuildingOpen;
    if (newOpen && !confirm("원정을 시작하시겠습니까? 모험가들이 탐색, 게시판, 파티 결성을 할 수 있게 됩니다.")) return;
    if (!newOpen && !confirm("원정을 닫으시겠습니까? 모험가들은 프로필 작성과 파티 현황 조회만 가능합니다.")) return;
    await supabase.from("app_settings").update({ team_building_open: newOpen }).not("id", "is", null);
    setTeamBuildingOpen(newOpen);
    await refreshLock();
  }

  async function handleToggleLock() {
    const newLock = !isLocked;
    if (newLock && !confirm("원정을 확정하시겠습니까? 모험가들은 파티 현황만 조회 가능합니다.")) return;
    await supabase.from("app_settings").update({ is_locked: newLock }).not("id", "is", null);
    setIsLocked(newLock);
    await refreshLock();
  }

  async function handleSaveSettings() {
    setSaving(true);
    await supabase.from("app_settings").update({ min_team_size: minSize, max_team_size: maxSize }).not("id", "is", null);
    showMsg("파티 설정이 저장되었습니다.");
    setSaving(false);
  }

  async function handleSaveNames() {
    setSaving(true);
    const names = nameList.split("\n").map((n) => n.trim()).filter((n) => n.length > 0);
    const { data: existing } = await supabase.from("students").select("name");
    const existingNames = new Set((existing || []).map((s) => s.name));
    const newNames = names.filter((n) => !existingNames.has(n));
    const removedNames = [...existingNames].filter((n) => !names.includes(n));
    if (newNames.length > 0) await supabase.from("students").insert(newNames.map((name) => ({ name })));
    if (removedNames.length > 0) { for (const name of removedNames) await supabase.from("students").delete().eq("name", name); }
    const { count } = await supabase.from("students").select("*", { count: "exact", head: true });
    setStudentCount(count || 0);
    showMsg(`명단이 저장되었습니다. (총 ${count}명)`);
    setSaving(false);
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const names: string[] = [];
    for (const row of rows) {
      for (const cell of row) {
        const val = String(cell).trim();
        if (val && val !== "이름" && val !== "name" && val !== "Name") names.push(val);
      }
    }
    if (names.length === 0) { alert("엑셀 파일에서 이름을 찾을 수 없습니다."); return; }
    const currentNames = nameList.split("\n").map((n) => n.trim()).filter((n) => n);
    setNameList([...new Set([...currentNames, ...names])].join("\n"));
    showMsg(`엑셀에서 ${names.length}명을 읽었습니다. 저장 버튼을 눌러 반영하세요.`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSavePassword() {
    setSaving(true);
    await supabase.from("app_settings").update({ common_password: commonPw }).not("id", "is", null);
    showMsg("길드 암호가 변경되었습니다.");
    setSaving(false);
  }

  function showMsg(text: string) { setMsg(text); setTimeout(() => setMsg(""), 3000); }

  if (!isAdmin) return null;

  const sectionCard = { background: "#111E30", border: "1px solid #2A4060", boxShadow: CARD_SHADOW };
  const labelStyle = { color: "#4A6A8A", fontSize: 12, fontWeight: 500 } as React.CSSProperties;

  return (
    <AppLayout>
      <h1 className="text-[28px] font-bold mb-6" style={{ color: "#E0B847", fontFamily: "'Playfair Display', serif" }}>길드마스터</h1>

      {msg && (
        <div className="mb-4 h-10 rounded-[10px] px-4 flex items-center text-[13px] font-medium" style={{ background: "#0A1810", color: "#38C870", border: "1px solid #1A4030" }}>
          {msg}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* 원정 신청 목록 */}
        {pendingTeams.length > 0 && (
          <div className="rounded-2xl p-6 flex flex-col gap-4" style={sectionCard}>
            <p className="text-[16px] font-semibold" style={{ color: "#E8DCBC" }}>원정 신청 ({pendingTeams.length}건)</p>
            {pendingTeams.map((t) => (
              <div key={t.id} className="flex items-center gap-4 rounded-[10px] px-4 py-3" style={{ background: "#0E1A2E", border: "1px solid #2A3A5A" }}>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold" style={{ color: "#E8DCBC" }}>{t.name}</p>
                  <p className="text-[12px]" style={{ color: "#4A6A8A" }}>{t.members.map((m) => m.name).join(", ")} ({t.members.length}명)</p>
                </div>
                <button onClick={() => handleApprove(t.id)} className="h-9 px-4 text-[13px] font-semibold rounded-[10px] transition-colors" style={{ background: "#38C870", color: "#0A1810" }}>원정 확정</button>
              </div>
            ))}
          </div>
        )}

        {/* 원정 확정 목록 */}
        {approvedTeams.length > 0 && (
          <div className="rounded-2xl p-6 flex flex-col gap-4" style={sectionCard}>
            <p className="text-[16px] font-semibold" style={{ color: "#E8DCBC" }}>원정 확정 ({approvedTeams.length}파티)</p>
            {approvedTeams.map((t) => (
              <div key={t.id} className="flex items-center gap-4 rounded-[10px] px-4 py-3" style={{ background: "#0A1810", border: "1px solid #1A4030" }}>
                <div className="flex-1">
                  <p className="text-[14px] font-semibold" style={{ color: "#E8DCBC" }}>{t.name}</p>
                  <p className="text-[12px]" style={{ color: "#4A6A8A" }}>{t.members.map((m) => m.name).join(", ")} ({t.members.length}명)</p>
                </div>
                <button onClick={() => handleCancelApproval(t.id)} className="h-9 px-4 text-[13px] font-medium rounded-[10px] transition-colors" style={{ background: "#162030", color: "#E05050", border: "1px solid #5A2A2A" }}>확정 취소</button>
              </div>
            ))}
          </div>
        )}

        {/* 원정 시작 */}
        <div className="rounded-2xl p-6 flex items-center gap-5" style={sectionCard}>
          <div className="flex-1">
            <p className="text-[16px] font-semibold" style={{ color: "#E8DCBC" }}>원정 시작</p>
            <p className="text-[13px] mt-1" style={{ color: "#4A6A8A" }}>
              {teamBuildingOpen ? "원정이 진행 중입니다. 모험가들이 탐색, 게시판, 파티 결성을 할 수 있습니다." : "현재 프로필 작성만 가능합니다. 시작하면 모든 기능이 열립니다."}
            </p>
          </div>
          <button onClick={handleToggleTeamBuilding} className="h-11 px-5 rounded-[10px] text-[14px] font-semibold transition-colors shrink-0" style={teamBuildingOpen ? { background: "#E8962A", color: "#0D1520" } : { background: "#C8952A", color: "#0D1520" }}>
            {teamBuildingOpen ? "원정 닫기" : "원정 시작"}
          </button>
        </div>

        {/* 원정 확정 잠금 */}
        <div className="rounded-2xl p-6 flex items-center gap-5" style={sectionCard}>
          <div className="flex-1">
            <p className="text-[16px] font-semibold" style={{ color: "#E8DCBC" }}>원정 확정 잠금</p>
            <p className="text-[13px] mt-1" style={{ color: "#4A6A8A" }}>잠금 시 파티 현황 조회만 가능하고 나머지 기능은 비활성화됩니다.</p>
          </div>
          <button onClick={handleToggleLock} className="h-11 px-5 rounded-[10px] text-[14px] font-semibold transition-colors shrink-0" style={isLocked ? { background: "#38C870", color: "#0A1810" } : { background: "#E05050", color: "#FFFFFF" }}>
            {isLocked ? "잠금 해제" : "잠금 실행"}
          </button>
        </div>

        {/* 파티 설정 */}
        <div className="rounded-2xl p-6 flex flex-col gap-5" style={sectionCard}>
          <p className="text-[16px] font-semibold" style={{ color: "#E8DCBC" }}>파티 설정</p>
          {[
            { label: "최소 인원", value: minSize, setter: setMinSize },
            { label: "최대 인원", value: maxSize, setter: setMaxSize },
          ].map(({ label, value, setter }) => (
            <div key={label} className="flex items-center gap-4">
              <span className="text-[14px] font-medium w-[100px]" style={{ color: "#E8DCBC" }}>{label}</span>
              <input type="number" value={value} onChange={(e) => setter(Number(e.target.value))} className="w-20 h-10 rounded-[10px] text-center text-[14px] font-medium outline-none" style={INPUT_STYLE} />
              <span className="text-[14px]" style={{ color: "#4A6A8A" }}>명</span>
            </div>
          ))}
          <button onClick={handleSaveSettings} disabled={saving} className="self-start h-10 px-6 text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-50" style={{ background: "#C8952A", color: "#0D1520" }}>저장</button>
        </div>

        {/* 모험가 명단 */}
        <div className="rounded-2xl p-6 flex flex-col gap-4" style={sectionCard}>
          <p className="text-[16px] font-semibold" style={{ color: "#E8DCBC" }}>모험가 명단</p>
          <p className="text-[13px]" style={labelStyle}>로그인 가능한 모험가 이름을 등록합니다. 줄바꿈으로 구분하여 입력하거나, 엑셀 파일을 업로드하세요.</p>
          <textarea value={nameList} onChange={(e) => setNameList(e.target.value)} rows={8} placeholder={"김언리얼\n이블루프\n박게임\n..."} className="rounded-[10px] px-4 py-3 text-[13px] outline-none resize-none font-mono" style={INPUT_STYLE} />
          <div className="flex items-center gap-3">
            <button onClick={handleSaveNames} disabled={saving} className="h-10 px-6 text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-50" style={{ background: "#C8952A", color: "#0D1520" }}>저장</button>
            <label className="h-10 px-5 text-[14px] font-medium rounded-[10px] flex items-center cursor-pointer transition-colors" style={{ background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}>
              엑셀 업로드
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
            </label>
            <span className="text-[13px]" style={{ color: "#4A6A8A" }}>현재 등록: {studentCount}명</span>
          </div>
        </div>

        {/* 길드 암호 */}
        <div className="rounded-2xl p-6 flex items-center gap-4" style={sectionCard}>
          <div className="flex-1">
            <p className="text-[16px] font-semibold" style={{ color: "#E8DCBC" }}>길드 암호</p>
            <p className="text-[13px] mt-1" style={{ color: "#4A6A8A" }}>모험가 로그인 시 사용하는 공통 비밀번호입니다.</p>
          </div>
          <input value={commonPw} onChange={(e) => setCommonPw(e.target.value)} className="w-[200px] h-10 rounded-[10px] px-4 text-[13px] font-medium outline-none" style={INPUT_STYLE} />
          <button onClick={handleSavePassword} disabled={saving} className="h-10 px-5 text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-50" style={{ background: "#C8952A", color: "#0D1520" }}>변경</button>
        </div>
      </div>
    </AppLayout>
  );
}
