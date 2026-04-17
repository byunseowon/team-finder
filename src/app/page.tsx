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
    <div className="min-h-screen flex items-center justify-center bg-[#F5F5F7]">
      <form
        onSubmit={handleSubmit}
        className="w-[400px] bg-white rounded-[20px] p-12 flex flex-col gap-6"
        style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
      >
        <div className="flex flex-col items-center gap-1.5">
          <div className="w-14 h-14 bg-[#007AFF] rounded-[14px] flex items-center justify-center">
            <span className="text-white text-[22px] font-bold">TF</span>
          </div>
          <h1 className="text-[28px] font-bold text-[#1D1D1F]">Team Finder</h1>
          <p className="text-[15px] text-[#86868B]">Unreal 7기 팀 빌딩</p>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-[13px] font-medium text-[#86868B]">
            {isAdminMode ? "관리자 ID" : "이름"}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={isAdminMode ? "관리자 ID를 입력하세요" : "사전 등록된 이름을 입력하세요"}
            className="w-full h-12 bg-[#F5F5F7] rounded-xl px-4 text-[15px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
          />
          <label className="text-[13px] font-medium text-[#86868B]">비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={isAdminMode ? "관리자 비밀번호" : "공통 비밀번호"}
            className="w-full h-12 bg-[#F5F5F7] rounded-xl px-4 text-[15px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
          />
        </div>

        {error && <p className="text-[13px] text-[#FF3B30] text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-[50px] bg-[#007AFF] hover:bg-[#0066DD] text-white text-[16px] font-semibold rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>

        <button
          type="button"
          onClick={() => {
            setIsAdminMode(!isAdminMode);
            setName("");
            setPassword("");
            setError("");
          }}
          className="text-[13px] text-[#AEAEB2] hover:text-[#86868B] text-center transition-colors"
        >
          {isAdminMode ? "수강생 로그인으로 돌아가기" : "관리자 계정으로 로그인"}
        </button>
      </form>
    </div>
  );
}
