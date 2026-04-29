"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

export default function Sidebar() {
  const pathname = usePathname();
  const { isAdmin, logout, isTeamBuildingOpen, isLocked } = useAuth();

  const navItems = [
    { href: "/profile", label: "내 프로필" },
    ...(isAdmin || (isTeamBuildingOpen && !isLocked) ? [
      { href: "/browse", label: "인원 탐색" },
      { href: "/board", label: "구인구직 보드" },
    ] : []),
    ...(isAdmin || isTeamBuildingOpen || isLocked ? [
      { href: "/my-team", label: "내 팀" },
      { href: "/teams", label: "팀 현황" },
    ] : []),
  ];

  return (
    <aside className="w-[240px] min-h-screen bg-white flex flex-col p-6 gap-0.5 shrink-0">
      <div className="flex items-center gap-2.5 px-2 pt-2 pb-5">
        <div className="w-8 h-8 bg-[#007AFF] rounded-lg flex items-center justify-center">
          <span className="text-white text-[13px] font-bold">TF</span>
        </div>
        <span className="text-[15px] font-semibold text-[#1D1D1F]">Team Finder</span>
      </div>
      {navItems.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center h-9 px-3 rounded-lg text-[13px] transition-colors ${
              active
                ? "bg-[#007AFF] text-white font-semibold"
                : "text-[#1D1D1F] font-medium hover:bg-[#F5F5F7]"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
      {isAdmin && (
        <Link
          href="/admin"
          className={`flex items-center h-9 px-3 rounded-lg text-[13px] transition-colors ${
            pathname === "/admin"
              ? "bg-[#007AFF] text-white font-semibold"
              : "text-[#1D1D1F] font-medium hover:bg-[#F5F5F7]"
          }`}
        >
          관리자
        </Link>
      )}
      <div className="mt-auto pt-4">
        <button
          onClick={logout}
          className="flex items-center h-9 px-3 rounded-lg text-[13px] text-[#86868B] hover:bg-[#F5F5F7] w-full transition-colors"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
