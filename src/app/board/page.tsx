"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import AppLayout from "@/components/app-layout";
import LockGuard from "@/components/lock-guard";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const CARD_SHADOW = "0 4px 24px rgba(0,0,0,0.4)";
const INPUT_STYLE = { background: "#162030", border: "1px solid #2A4060", color: "#E8DCBC", caretColor: "#C8952A" } as React.CSSProperties;

interface PostWithAuthor {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  status: string;
  created_at: string;
  students: { name: string; team_id: string | null } | null;
  interest_count: number;
  team_name?: string;
}

export default function BoardPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"hiring" | "looking">("hiring");
  const [posting, setPosting] = useState(false);
  const [myPostInterests, setMyPostInterests] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<"" | "hiring" | "looking">("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editStatus, setEditStatus] = useState<"open" | "closed">("open");
  const [search, setSearch] = useState("");

  useEffect(() => { loadPosts(); if (user) loadMyPostInterests(); }, [user]);

  async function loadPosts() {
    const { data: postsData } = await supabase.from("posts").select("*, students(name, team_id)").order("created_at", { ascending: false });
    if (postsData) {
      const withCounts = await Promise.all(
        postsData.map(async (p) => {
          const { count } = await supabase.from("interests").select("*", { count: "exact", head: true }).eq("to_post_id", p.id);
          let team_name = "";
          if (p.students?.team_id) {
            const { data: team } = await supabase.from("teams").select("name").eq("id", p.students.team_id).single();
            if (team) team_name = team.name;
          }
          return { ...p, interest_count: count || 0, team_name };
        })
      );
      setPosts(withCounts);
    }
  }

  async function loadMyPostInterests() {
    if (!user) return;
    const { data } = await supabase.from("interests").select("to_post_id").eq("from_student_id", user.id).not("to_post_id", "is", null);
    if (data) setMyPostInterests(new Set(data.map((d) => d.to_post_id!)));
  }

  async function togglePostInterest(postId: string) {
    if (!user) return;
    if (myPostInterests.has(postId)) {
      await supabase.from("interests").delete().eq("from_student_id", user.id).eq("to_post_id", postId);
    } else {
      await supabase.from("interests").insert({ from_student_id: user.id, to_post_id: postId });
    }
    await loadMyPostInterests();
    await loadPosts();
  }

  async function handlePost() {
    if (!user || !title.trim()) return;
    setPosting(true);
    await supabase.from("posts").insert({ title, content, category, author_id: user.id });
    setTitle(""); setContent(""); setCategory("hiring"); setShowForm(false);
    await loadPosts();
    setPosting(false);
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    return `${Math.floor(hours / 24)}일 전`;
  }

  const statusLabel: Record<string, { text: string; bg: string; color: string; border: string }> = {
    open:   { text: "모집중", bg: "#0A1810", color: "#38C870", border: "#1A4030" },
    closed: { text: "마감",   bg: "#162030", color: "#4A6A8A", border: "#2A4060" },
  };

  const categoryLabel: Record<string, { text: string; bg: string; color: string; border: string }> = {
    hiring:  { text: "파티원 모집", bg: "#0E1A2E", color: "#5090D8", border: "#2A3A5A" },
    looking: { text: "파티 구인",   bg: "#1E1028", color: "#B060E8", border: "#4A2070" },
  };

  const filteredPosts = posts.filter((p) => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !(p.content || "").toLowerCase().includes(q) && !(p.students?.name || "").toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <AppLayout>
      <LockGuard>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] font-bold" style={{ color: "#E0B847", fontFamily: "'Playfair Display', serif" }}>모험 게시판</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="h-10 px-5 text-[14px] font-semibold rounded-[10px] transition-colors"
            style={{ background: "#C8952A", color: "#0D1520" }}
          >
            {showForm ? "취소" : "글 작성"}
          </button>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목, 내용, 글쓴이로 검색"
          className="w-full h-11 rounded-[10px] px-4 text-[14px] outline-none mb-4"
          style={INPUT_STYLE}
        />

        <div className="flex gap-2 mb-6">
          {[
            { value: "", label: "전체" },
            { value: "hiring", label: "파티원 모집" },
            { value: "looking", label: "파티 구인" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterCategory(f.value as "" | "hiring" | "looking")}
              className="h-[34px] px-4 rounded-[17px] text-[13px] font-medium transition-colors"
              style={filterCategory === f.value ? { background: "#C8952A", color: "#0D1520" } : { background: "#111E30", color: "#4A6A8A", border: "1px solid #2A4060" }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {showForm && (
          <div className="rounded-2xl p-6 mb-6 flex flex-col gap-4" style={{ background: "#111E30", border: "1px solid #2A4060", boxShadow: CARD_SHADOW }}>
            <div className="flex gap-2">
              <button
                onClick={() => setCategory("hiring")}
                className="h-[34px] px-4 rounded-[17px] text-[13px] font-medium transition-colors"
                style={category === "hiring" ? { background: "#0E1A2E", color: "#5090D8", border: "1px solid #2A3A5A" } : { background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}
              >
                파티원 모집
              </button>
              <button
                onClick={() => setCategory("looking")}
                className="h-[34px] px-4 rounded-[17px] text-[13px] font-medium transition-colors"
                style={category === "looking" ? { background: "#1E1028", color: "#B060E8", border: "1px solid #4A2070" } : { background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}
              >
                파티 구인
              </button>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="제목을 입력하세요" className="h-11 rounded-[10px] px-4 text-[14px] outline-none" style={INPUT_STYLE} />
            <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="내용을 입력하세요 (파티 소개, 구하는 인원 등)" rows={4} className="rounded-[10px] px-4 py-3 text-[14px] outline-none resize-none" style={INPUT_STYLE} />
            <button onClick={handlePost} disabled={posting || !title.trim()} className="self-end h-10 px-6 text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-50" style={{ background: "#C8952A", color: "#0D1520" }}>
              {posting ? "등록 중..." : "등록"}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {filteredPosts.map((p) => {
            const st = statusLabel[p.status] || statusLabel.open;
            const cat = categoryLabel[p.category] || categoryLabel.hiring;
            return (
              <div key={p.id} className="rounded-2xl p-6 flex flex-col gap-3" style={{ background: "#111E30", border: "1px solid #2A4060", boxShadow: CARD_SHADOW }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="h-[26px] px-3 rounded-[4px] text-[11px] font-semibold flex items-center shrink-0" style={{ background: cat.bg, color: cat.color, border: `1px solid ${cat.border}` }}>{cat.text}</span>
                  <span className="h-[26px] px-3 rounded-[4px] text-[11px] font-semibold flex items-center shrink-0" style={{ background: st.bg, color: st.color, border: `1px solid ${st.border}` }}>{st.text}</span>
                  <p className="text-[16px] font-semibold flex-1" style={{ color: "#E8DCBC" }}>{p.title}</p>
                  <span className="text-[14px] font-semibold shrink-0" style={{ color: "#E8DCBC" }}>{p.students?.name || "알 수 없음"}</span>
                  <button
                    onClick={() => {
                      if (p.category === "looking") router.push(`/browse?search=${encodeURIComponent(p.students?.name || "")}`);
                      else router.push(`/teams?search=${encodeURIComponent(p.team_name || "")}`);
                    }}
                    className="h-[28px] px-3.5 rounded-[6px] text-[12px] font-medium transition-colors shrink-0"
                    style={{ background: "#1A2E48", color: "#C8952A", border: "1px solid #C8952A" }}
                  >
                    {p.category === "looking" ? "프로필 보기" : "파티 보기"}
                  </button>
                </div>

                {p.content && <p className="text-[13px]" style={{ color: "#4A6A8A" }}>{p.content}</p>}

                <div className="flex items-center gap-3">
                  <span className="text-[12px]" style={{ color: "#3A5A78" }}>{timeAgo(p.created_at)}</span>
                  <button
                    onClick={() => togglePostInterest(p.id)}
                    className="text-[12px] font-medium rounded-full px-3 py-1 transition-colors"
                    style={myPostInterests.has(p.id) ? { background: "#C8952A", color: "#0D1520" } : { color: "#C8952A" }}
                  >
                    관심 {p.interest_count}
                  </button>
                  <div className="flex gap-3 ml-auto">
                    {user && p.author_id === user.id && editingId !== p.id && (
                      <>
                        <button onClick={() => { setEditingId(p.id); setEditTitle(p.title); setEditContent(p.content || ""); setEditStatus(p.status as "open" | "closed"); }} className="text-[12px] hover:underline" style={{ color: "#C8952A" }}>수정</button>
                        <button onClick={async () => { if (!confirm("정말 삭제하시겠습니까?")) return; await supabase.from("interests").delete().eq("to_post_id", p.id); await supabase.from("posts").delete().eq("id", p.id); loadPosts(); }} className="text-[12px] hover:underline" style={{ color: "#E05050" }}>삭제</button>
                      </>
                    )}
                    {isAdmin && !(user && p.author_id === user.id) && (
                      <button onClick={async () => { if (!confirm("길드마스터 권한으로 이 글을 삭제하시겠습니까?")) return; await supabase.from("interests").delete().eq("to_post_id", p.id); await supabase.from("posts").delete().eq("id", p.id); loadPosts(); }} className="text-[12px] hover:underline" style={{ color: "#E05050" }}>삭제 (길드마스터)</button>
                    )}
                  </div>
                </div>

                {user && p.author_id === user.id && editingId === p.id && (
                  <div className="flex flex-col gap-3 pt-2" style={{ borderTop: "1px solid #2A4060" }}>
                    <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="h-10 rounded-[10px] px-4 text-[14px] outline-none" style={INPUT_STYLE} />
                    <textarea value={editContent} onChange={(e) => setEditContent(e.target.value)} rows={3} className="rounded-[10px] px-4 py-3 text-[14px] outline-none resize-none" style={INPUT_STYLE} />
                    <div className="flex items-center gap-2">
                      <span className="text-[13px]" style={{ color: "#4A6A8A" }}>상태:</span>
                      <button onClick={() => setEditStatus("open")} className="h-[30px] px-3 rounded-[17px] text-[12px] font-medium transition-colors" style={editStatus === "open" ? { background: "#0A1810", color: "#38C870", border: "1px solid #1A4030" } : { background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}>모집중</button>
                      <button onClick={() => setEditStatus("closed")} className="h-[30px] px-3 rounded-[17px] text-[12px] font-medium transition-colors" style={editStatus === "closed" ? { background: "#162030", color: "#4A6A8A", border: "1px solid #4A6A8A" } : { background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}>마감</button>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="h-9 px-4 text-[13px] font-medium rounded-[10px] transition-colors" style={{ background: "#162030", color: "#4A6A8A", border: "1px solid #2A4060" }}>취소</button>
                      <button onClick={async () => { await supabase.from("posts").update({ title: editTitle, content: editContent, status: editStatus }).eq("id", p.id); setEditingId(null); loadPosts(); }} disabled={!editTitle.trim()} className="h-9 px-4 text-[13px] font-semibold rounded-[10px] transition-colors disabled:opacity-50" style={{ background: "#C8952A", color: "#0D1520" }}>저장</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {filteredPosts.length === 0 && (
            <p className="text-[14px] text-center py-12" style={{ color: "#4A6A8A" }}>아직 게시글이 없습니다.</p>
          )}
        </div>
      </LockGuard>
    </AppLayout>
  );
}
