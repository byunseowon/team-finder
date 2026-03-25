"use client";

import { useAuth } from "@/lib/auth-context";

export default function LockGuard({ children }: { children: React.ReactNode }) {
  const { isLocked, isTeamBuildingOpen, isAdmin } = useAuth();

  if (isAdmin) return <>{children}</>;

  if (isLocked) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center">
          <span className="text-[32px]">🔒</span>
        </div>
        <h2 className="text-[20px] font-bold text-[#1D1D1F]">팀 빌딩이 잠겼습니다</h2>
        <p className="text-[14px] text-[#86868B]">현재 팀 현황 조회만 가능합니다.</p>
      </div>
    );
  }

  if (!isTeamBuildingOpen) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-16 h-16 bg-[#F5F5F7] rounded-2xl flex items-center justify-center">
          <span className="text-[32px]">⏳</span>
        </div>
        <h2 className="text-[20px] font-bold text-[#1D1D1F]">아직 팀 빌딩이 시작되지 않았습니다</h2>
        <p className="text-[14px] text-[#86868B]">먼저 프로필을 작성하고 기다려 주세요.</p>
      </div>
    );
  }

  return <>{children}</>;
}
