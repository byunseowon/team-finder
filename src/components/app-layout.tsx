"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin, ready } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !user && !isAdmin) router.push("/");
  }, [ready, user, isAdmin, router]);

  if (!ready) return null;
  if (!user && !isAdmin) return null;

  return (
    <div className="flex min-h-screen bg-[#0D1520]">
      <Sidebar />
      <main className="flex-1 p-10 overflow-auto">{children}</main>
    </div>
  );
}
