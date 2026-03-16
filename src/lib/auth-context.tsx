"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Student } from "./types";
import { supabase } from "./supabase";

interface AuthContextType {
  user: Student | null;
  isAdmin: boolean;
  isLocked: boolean;
  ready: boolean;
  login: (name: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  adminLogin: (id: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshLock: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Student | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tf_user");
    const savedAdmin = localStorage.getItem("tf_admin");
    if (saved) setUser(JSON.parse(saved));
    if (savedAdmin === "true") setIsAdmin(true);
    setReady(true);
    refreshLock();
  }, []);

  async function refreshLock() {
    const { data } = await supabase.from("app_settings").select("is_locked").single();
    if (data) setIsLocked(data.is_locked);
  }

  async function refreshUser() {
    if (!user) return;
    const { data } = await supabase.from("students").select("*").eq("id", user.id).single();
    if (data) {
      setUser(data);
      localStorage.setItem("tf_user", JSON.stringify(data));
    }
  }

  async function login(name: string, password: string) {
    const { data: settings } = await supabase.from("app_settings").select("common_password").single();
    if (!settings || password !== settings.common_password) {
      return { ok: false, error: "비밀번호가 올바르지 않습니다." };
    }
    const { data: student } = await supabase.from("students").select("*").eq("name", name.trim()).single();
    if (!student) {
      return { ok: false, error: "등록되지 않은 이름입니다." };
    }
    setUser(student);
    setIsAdmin(false);
    localStorage.setItem("tf_user", JSON.stringify(student));
    localStorage.removeItem("tf_admin");
    return { ok: true };
  }

  async function adminLogin(id: string, password: string) {
    const { data: settings } = await supabase.from("app_settings").select("admin_id, admin_password").single();
    if (!settings || id !== settings.admin_id || password !== settings.admin_password) {
      return { ok: false, error: "관리자 인증에 실패했습니다." };
    }
    setIsAdmin(true);
    setUser(null);
    localStorage.setItem("tf_admin", "true");
    localStorage.removeItem("tf_user");
    return { ok: true };
  }

  function logout() {
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem("tf_user");
    localStorage.removeItem("tf_admin");
  }

  return (
    <AuthContext.Provider value={{ user, isAdmin, isLocked, ready, login, adminLogin, logout, refreshUser, refreshLock }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
