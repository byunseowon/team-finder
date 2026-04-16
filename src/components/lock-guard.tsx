"use client";

import { useAuth } from "@/lib/auth-context";

export default function LockGuard({ children }: { children: React.ReactNode }) {
  const { isLocked, isTeamBuildingOpen, isAdmin } = useAuth();

  if (isAdmin) return <>{children}</>;

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#111E30", border: "1px solid #2A4060" }}>
          <span className="text-[32px]">⚔️</span>
        </div>
        <h2 className="text-[20px] font-bold" style={{ color: "#E8DCBC", fontFamily: "'Playfair Display', serif" }}>원정이 확정되었습니다</h2>
        <p className="text-[14px]" style={{ color: "#4A6A8A" }}>현재 파티 현황 조회만 가능합니다.</p>
      </div>
    );
  }

  if (!isTeamBuildingOpen) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "#111E30", border: "1px solid #2A4060" }}>
          <span className="text-[32px]">🗺️</span>
        </div>
        <h2 className="text-[20px] font-bold" style={{ color: "#E8DCBC", fontFamily: "'Playfair Display', serif" }}>원정이 아직 시작되지 않았습니다</h2>
        <p className="text-[14px]" style={{ color: "#4A6A8A" }}>먼저 프로필을 작성하고 기다려 주세요.</p>
      </div>
    );
  }

  return <>{children}</>;
}
