"use client";

import { useState, useEffect, useRef } from "react";
import AppLayout from "@/components/app-layout";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";
import * as XLSX from "xlsx";

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
    showMsg("팀이 승인되었습니다.");
    loadTeams();
  }

  async function handleCancelApproval(teamId: string) {
    await supabase.from("teams").update({ status: "building" }).eq("id", teamId);
    showMsg("승인이 취소되었습니다.");
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
    if (newOpen && !confirm("팀 빌딩을 시작하시겠습니까? 수강생들이 인원 탐색, 구인구직, 팀 생성을 할 수 있게 됩니다.")) return;
    if (!newOpen && !confirm("팀 빌딩을 닫으시겠습니까? 수강생들은 프로필 작성과 팀 현황 조회만 가능합니다.")) return;
    await supabase.from("app_settings").update({ team_building_open: newOpen }).not("id", "is", null);
    setTeamBuildingOpen(newOpen);
    await refreshLock();
  }

  async function handleToggleLock() {
    const newLock = !isLocked;
    if (newLock && !confirm("팀 빌딩을 잠그시겠습니까? 수강생들은 팀 현황만 조회 가능합니다.")) return;
    await supabase.from("app_settings").update({ is_locked: newLock }).not("id", "is", null);
    setIsLocked(newLock);
    await refreshLock();
  }

  async function handleSaveSettings() {
    setSaving(true);
    await supabase.from("app_settings").update({ min_team_size: minSize, max_team_size: maxSize }).not("id", "is", null);
    showMsg("팀 설정이 저장되었습니다.");
    setSaving(false);
  }

  async function handleSaveNames() {
    setSaving(true);
    const names = nameList
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n.length > 0);

    const { data: existing } = await supabase.from("students").select("name");
    const existingNames = new Set((existing || []).map((s) => s.name));

    const newNames = names.filter((n) => !existingNames.has(n));
    const removedNames = [...existingNames].filter((n) => !names.includes(n));

    if (newNames.length > 0) {
      await supabase.from("students").insert(newNames.map((name) => ({ name })));
    }
    if (removedNames.length > 0) {
      for (const name of removedNames) {
        await supabase.from("students").delete().eq("name", name);
      }
    }

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
        if (val && val !== "이름" && val !== "name" && val !== "Name") {
          names.push(val);
        }
      }
    }

    if (names.length === 0) {
      alert("엑셀 파일에서 이름을 찾을 수 없습니다.");
      return;
    }

    const currentNames = nameList.split("\n").map((n) => n.trim()).filter((n) => n);
    const merged = [...new Set([...currentNames, ...names])];
    setNameList(merged.join("\n"));
    showMsg(`엑셀에서 ${names.length}명을 읽었습니다. 저장 버튼을 눌러 반영하세요.`);

    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSavePassword() {
    setSaving(true);
    await supabase.from("app_settings").update({ common_password: commonPw }).not("id", "is", null);
    showMsg("비밀번호가 변경되었습니다.");
    setSaving(false);
  }

  function showMsg(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(""), 3000);
  }

  if (!isAdmin) return null;

  return (
    <AppLayout>
      <h1 className="text-[28px] font-bold text-[#1D1D1F] mb-6">관리자 페이지</h1>

      {msg && (
        <div className="mb-4 h-10 bg-[#E8F5E9] rounded-[10px] px-4 flex items-center text-[13px] font-medium text-[#2E7D32]">
          {msg}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {/* 승인 신청 목록 */}
        {pendingTeams.length > 0 && (
          <div
            className="bg-white rounded-2xl p-6 flex flex-col gap-4"
            style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
          >
            <div className="flex items-center gap-2">
              <p className="text-[16px] font-semibold text-[#1D1D1F] flex-1">승인 신청 ({pendingTeams.length}건)</p>
            </div>
            {pendingTeams.map((t) => (
              <div key={t.id} className="flex items-center gap-4 bg-[#F5F5F7] rounded-[10px] px-4 py-3">
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#1D1D1F]">{t.name}</p>
                  <p className="text-[12px] text-[#86868B]">{t.members.map((m) => m.name).join(", ")} ({t.members.length}명)</p>
                </div>
                <button
                  onClick={() => handleApprove(t.id)}
                  className="h-9 px-4 bg-[#34C759] hover:bg-[#2DB84D] text-white text-[13px] font-semibold rounded-[10px] transition-colors"
                >
                  승인
                </button>
              </div>
            ))}
          </div>
        )}

        {/* 승인 완료 목록 */}
        {approvedTeams.length > 0 && (
          <div
            className="bg-white rounded-2xl p-6 flex flex-col gap-4"
            style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
          >
            <p className="text-[16px] font-semibold text-[#1D1D1F]">승인 완료 ({approvedTeams.length}팀)</p>
            {approvedTeams.map((t) => (
              <div key={t.id} className="flex items-center gap-4 bg-[#E8F5E9] rounded-[10px] px-4 py-3">
                <div className="flex-1">
                  <p className="text-[14px] font-semibold text-[#1D1D1F]">{t.name}</p>
                  <p className="text-[12px] text-[#86868B]">{t.members.map((m) => m.name).join(", ")} ({t.members.length}명)</p>
                </div>
                <button
                  onClick={() => handleCancelApproval(t.id)}
                  className="h-9 px-4 bg-[#F5F5F7] hover:bg-[#ECECEE] text-[#FF3B30] text-[13px] font-medium rounded-[10px] transition-colors"
                >
                  승인 취소
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Team Building Open */}
        <div
          className="bg-white rounded-2xl p-6 flex items-center gap-5"
          style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
        >
          <div className="flex-1">
            <p className="text-[16px] font-semibold text-[#1D1D1F]">팀 빌딩 시작</p>
            <p className="text-[13px] text-[#86868B]">
              {teamBuildingOpen
                ? "팀 빌딩이 진행 중입니다. 수강생들이 인원 탐색, 구인구직, 팀 생성을 할 수 있습니다."
                : "현재 프로필 작성만 가능합니다. 시작하면 모든 팀 빌딩 기능이 열립니다."}
            </p>
          </div>
          <button
            onClick={handleToggleTeamBuilding}
            className={`h-11 px-5 rounded-[10px] text-[14px] font-semibold transition-colors shrink-0 ${
              teamBuildingOpen
                ? "bg-[#FF9500] hover:bg-[#E68600] text-white"
                : "bg-[#007AFF] hover:bg-[#0066DD] text-white"
            }`}
          >
            {teamBuildingOpen ? "팀 빌딩 닫기" : "팀 빌딩 시작"}
          </button>
        </div>

        {/* Lockdown */}
        <div
          className="bg-white rounded-2xl p-6 flex items-center gap-5"
          style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
        >
          <div className="flex-1">
            <p className="text-[16px] font-semibold text-[#1D1D1F]">팀 빌딩 잠금</p>
            <p className="text-[13px] text-[#86868B]">
              잠금 시 팀 현황 조회만 가능하고, 나머지 기능은 모두 비활성화됩니다.
            </p>
          </div>
          <button
            onClick={handleToggleLock}
            className={`h-11 px-5 rounded-[10px] text-[14px] font-semibold transition-colors shrink-0 ${
              isLocked
                ? "bg-[#34C759] hover:bg-[#2DB84D] text-white"
                : "bg-[#FF3B30] hover:bg-[#E5342B] text-white"
            }`}
          >
            {isLocked ? "잠금 해제" : "잠금 실행"}
          </button>
        </div>

        {/* Team settings */}
        <div
          className="bg-white rounded-2xl p-6 flex flex-col gap-5"
          style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
        >
          <p className="text-[16px] font-semibold text-[#1D1D1F]">팀 설정</p>
          <div className="flex items-center gap-4">
            <span className="text-[14px] font-medium text-[#1D1D1F] w-[100px]">최소 인원</span>
            <input
              type="number"
              value={minSize}
              onChange={(e) => setMinSize(Number(e.target.value))}
              className="w-20 h-10 bg-[#F5F5F7] rounded-[10px] text-center text-[14px] font-medium text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
            />
            <span className="text-[14px] text-[#86868B]">명</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[14px] font-medium text-[#1D1D1F] w-[100px]">최대 인원</span>
            <input
              type="number"
              value={maxSize}
              onChange={(e) => setMaxSize(Number(e.target.value))}
              className="w-20 h-10 bg-[#F5F5F7] rounded-[10px] text-center text-[14px] font-medium text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
            />
            <span className="text-[14px] text-[#86868B]">명</span>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="self-start h-10 px-6 bg-[#007AFF] hover:bg-[#0066DD] text-white text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-50"
          >
            저장
          </button>
        </div>

        {/* Student name list */}
        <div
          className="bg-white rounded-2xl p-6 flex flex-col gap-4"
          style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
        >
          <p className="text-[16px] font-semibold text-[#1D1D1F]">수강생 명단 관리</p>
          <p className="text-[13px] text-[#86868B]">
            로그인 가능한 수강생 이름을 등록합니다. 줄바꿈으로 구분하여 입력하거나, 엑셀 파일을 업로드하세요.
          </p>
          <textarea
            value={nameList}
            onChange={(e) => setNameList(e.target.value)}
            rows={8}
            placeholder={"김언리얼\n이블루프\n박게임\n..."}
            className="bg-[#F5F5F7] rounded-[10px] px-4 py-3 text-[13px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none resize-none focus:ring-2 focus:ring-[#007AFF]/30 font-mono"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveNames}
              disabled={saving}
              className="h-10 px-6 bg-[#007AFF] hover:bg-[#0066DD] text-white text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-50"
            >
              저장
            </button>
            <label className="h-10 px-5 bg-[#F5F5F7] hover:bg-[#ECECEE] text-[#1D1D1F] text-[14px] font-medium rounded-[10px] flex items-center cursor-pointer transition-colors">
              엑셀 업로드
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleExcelUpload}
                className="hidden"
              />
            </label>
            <span className="text-[13px] text-[#86868B]">현재 등록: {studentCount}명</span>
          </div>
        </div>

        {/* Password */}
        <div
          className="bg-white rounded-2xl p-6 flex items-center gap-4"
          style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
        >
          <div className="flex-1">
            <p className="text-[16px] font-semibold text-[#1D1D1F]">공통 비밀번호</p>
            <p className="text-[13px] text-[#86868B]">수강생 로그인 시 사용하는 공통 비밀번호입니다.</p>
          </div>
          <input
            value={commonPw}
            onChange={(e) => setCommonPw(e.target.value)}
            className="w-[200px] h-10 bg-[#F5F5F7] rounded-[10px] px-4 text-[13px] font-medium text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
          />
          <button
            onClick={handleSavePassword}
            disabled={saving}
            className="h-10 px-5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-50"
          >
            변경
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
