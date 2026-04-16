"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/profile", label: "내 프로필" },
  { href: "/browse", label: "모험가 탐색" },
  { href: "/board", label: "모험 게시판" },
  { href: "/my-team", label: "내 파티" },
  { href: "/teams", label: "파티 현황" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, isAdmin, logout } = useAuth();

  return (
    <aside className="w-[240px] min-h-screen bg-[#101A2C] flex flex-col shrink-0" style={{ borderRight: "1px solid #1E3248" }}>
      {/* Gold top accent */}
      <div className="h-[3px] w-full" style={{ background: "linear-gradient(90deg, transparent, #C8952A, transparent)" }} />

      {/* Logo */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-5">
        <div
          className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0"
          style={{ background: "#1A2E48", border: "1.5px solid #C8952A" }}
        >
          <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: "#E0B847" }}>TF</span>
        </div>
        <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 16, fontWeight: 700, color: "#E0B847" }}>
          Team Finder
        </span>
      </div>

      {/* Divider */}
      <div className="mx-5 h-px bg-[#1E3248] mb-2" />

      {/* Nav */}
      <nav className="flex flex-col gap-1 px-3 flex-1">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center h-10 px-3 rounded-[8px] text-[13px] transition-colors"
              style={
                active
                  ? { background: "#1A2E48", color: "#E0B847", fontWeight: 600, border: "1px solid #C8952A" }
                  : { color: "#4A6A8A", fontWeight: 500 }
              }
            >
              {item.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex items-center h-10 px-3 rounded-[8px] text-[13px] transition-colors"
            style={
              pathname === "/admin"
                ? { background: "#1A2E48", color: "#E0B847", fontWeight: 600, border: "1px solid #C8952A" }
                : { color: "#4A6A8A", fontWeight: 500 }
            }
          >
            길드마스터
          </Link>
        )}
      </nav>

      {/* Bottom: user + logout */}
      <div className="px-3 pb-4 pt-2" style={{ borderTop: "1px solid #1E3248" }}>
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-2 mb-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: "#1A2E48", border: "1px solid #C8952A" }}>
              <span className="text-[11px] font-bold" style={{ color: "#C8952A" }}>
                {user.name.charAt(0)}
              </span>
            </div>
            <span className="text-[12px] text-[#4A6A8A] truncate">{user.name}</span>
          </div>
        )}
        <button
          onClick={logout}
          className="flex items-center h-9 px-3 rounded-[8px] text-[13px] w-full transition-colors"
          style={{ color: "#3A5A78" }}
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
