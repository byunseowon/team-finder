"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, isAdmin, login, adminLogin } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) router.push("/profile");
    if (isAdmin) router.push("/admin");
  }, [user, isAdmin, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isAdminMode) {
        const res = await adminLogin(name, password);
        if (res.ok) router.push("/admin");
        else setError(res.error || "로그인 실패");
      } else {
        const res = await login(name, password);
        if (res.ok) router.push("/profile");
        else setError(res.error || "로그인 실패");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#0D1520" }}>
      <form
        onSubmit={handleSubmit}
        className="w-[400px] rounded-[16px] p-12 flex flex-col gap-6"
        style={{ background: "#111E30", border: "1px solid #2A4060", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }}
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-2">
          <div
            className="w-14 h-14 rounded-[14px] flex items-center justify-center"
            style={{ background: "#1A2E48", border: "2px solid #C8952A" }}
          >
            <span style={{ fontFamily: "'Playfair Display', serif", fontSize: 20, fontWeight: 700, color: "#E0B847" }}>TF</span>
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 26, fontWeight: 700, color: "#E0B847" }}>
            Team Finder
          </h1>
          <p className="text-[14px]" style={{ color: "#4A6A8A" }}>Unreal 7기 파티 결성</p>
        </div>

        {/* Form */}
        <div className="flex flex-col gap-3">
          <label className="text-[12px] font-medium" style={{ color: "#4A6A8A" }}>
            {isAdminMode ? "길드마스터 ID" : "모험가 이름"}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isAdminMode ? "ID를 입력하세요" : "사전 등록된 이름을 입력하세요"}
            className="w-full h-12 rounded-xl px-4 text-[14px] outline-none"
            style={{
              background: "#162030",
              border: "1px solid #2A4060",
              color: "#E8DCBC",
              caretColor: "#C8952A",
            }}
          />
          <label className="text-[12px] font-medium" style={{ color: "#4A6A8A" }}>
            {isAdminMode ? "비밀번호" : "길드 암호"}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isAdminMode ? "비밀번호" : "길드 암호를 입력하세요"}
            className="w-full h-12 rounded-xl px-4 text-[14px] outline-none"
            style={{
              background: "#162030",
              border: "1px solid #2A4060",
              color: "#E8DCBC",
              caretColor: "#C8952A",
            }}
          />
        </div>

        {error && <p className="text-[13px] text-center" style={{ color: "#E05050" }}>{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-[48px] text-[15px] font-semibold rounded-xl transition-colors disabled:opacity-50"
          style={{ background: "#C8952A", color: "#0D1520" }}
        >
          {loading ? "입장 중..." : "입장"}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsAdminMode(!isAdminMode);
            setName("");
            setPassword("");
            setError("");
          }}
          className="text-[12px] text-center transition-colors"
          style={{ color: "#3A5A78" }}
        >
          {isAdminMode ? "모험가 로그인으로 돌아가기" : "길드마스터 계정으로 로그인"}
        </button>
      </form>
    </div>
  );
}
