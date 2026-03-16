"use client";

import { useState, useEffect } from "react";
import AppLayout from "@/components/app-layout";
import LockGuard from "@/components/lock-guard";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

interface PostWithAuthor {
  id: string;
  title: string;
  content: string;
  category: string;
  author_id: string;
  status: string;
  created_at: string;
  students: { name: string } | null;
  interest_count: number;
}

export default function BoardPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<"hiring" | "looking">("hiring");
  const [posting, setPosting] = useState(false);
  const [myPostInterests, setMyPostInterests] = useState<Set<string>>(new Set());
  const [filterCategory, setFilterCategory] = useState<"" | "hiring" | "looking">("");

  useEffect(() => {
    loadPosts();
    if (user) loadMyPostInterests();
  }, [user]);

  async function loadPosts() {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*, students(name)")
      .order("created_at", { ascending: false });
    if (postsData) {
      const withCounts = await Promise.all(
        postsData.map(async (p) => {
          const { count } = await supabase
            .from("interests")
            .select("*", { count: "exact", head: true })
            .eq("to_post_id", p.id);
          return { ...p, interest_count: count || 0 };
        })
      );
      setPosts(withCounts);
    }
  }

  async function loadMyPostInterests() {
    if (!user) return;
    const { data } = await supabase
      .from("interests")
      .select("to_post_id")
      .eq("from_student_id", user.id)
      .not("to_post_id", "is", null);
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
    setTitle("");
    setContent("");
    setCategory("hiring");
    setShowForm(false);
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

  const statusLabel: Record<string, { text: string; bg: string; color: string }> = {
    open: { text: "모집중", bg: "#E8F5E9", color: "#2E7D32" },
    closing: { text: "마감임박", bg: "#FFF3E0", color: "#E65100" },
    closed: { text: "마감", bg: "#F5F5F7", color: "#86868B" },
  };

  const categoryLabel: Record<string, { text: string; bg: string; color: string }> = {
    hiring: { text: "구인", bg: "#E3F2FD", color: "#1565C0" },
    looking: { text: "구직", bg: "#F3E5F5", color: "#7B1FA2" },
  };

  const filteredPosts = filterCategory
    ? posts.filter((p) => p.category === filterCategory)
    : posts;

  return (
    <AppLayout>
      <LockGuard>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-[28px] font-bold text-[#1D1D1F]">구인구직 보드</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="h-10 px-5 bg-[#007AFF] hover:bg-[#0066DD] text-white text-[14px] font-semibold rounded-[10px] transition-colors"
          >
            {showForm ? "취소" : "글 작성"}
          </button>
        </div>

        {/* Category filter */}
        <div className="flex gap-2 mb-6">
          {[
            { value: "", label: "전체" },
            { value: "hiring", label: "구인" },
            { value: "looking", label: "구직" },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterCategory(f.value as "" | "hiring" | "looking")}
              className={`h-[34px] px-4 rounded-[17px] text-[13px] font-medium transition-colors ${
                filterCategory === f.value
                  ? "bg-[#007AFF] text-white"
                  : "bg-white text-[#86868B] hover:bg-[#ECECEE]"
              }`}
              style={filterCategory !== f.value ? { boxShadow: "0 2px 20px rgba(0,0,0,0.03)" } : {}}
            >
              {f.label}
            </button>
          ))}
        </div>

        {showForm && (
          <div
            className="bg-white rounded-2xl p-6 mb-6 flex flex-col gap-4"
            style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
          >
            <div className="flex gap-2">
              <button
                onClick={() => setCategory("hiring")}
                className={`h-[34px] px-4 rounded-[17px] text-[13px] font-medium transition-colors ${
                  category === "hiring"
                    ? "bg-[#1565C0] text-white"
                    : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#ECECEE]"
                }`}
              >
                구인 (팀원을 찾아요)
              </button>
              <button
                onClick={() => setCategory("looking")}
                className={`h-[34px] px-4 rounded-[17px] text-[13px] font-medium transition-colors ${
                  category === "looking"
                    ? "bg-[#7B1FA2] text-white"
                    : "bg-[#F5F5F7] text-[#86868B] hover:bg-[#ECECEE]"
                }`}
              >
                구직 (팀을 찾아요)
              </button>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요"
              className="h-11 bg-[#F5F5F7] rounded-[10px] px-4 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="내용을 입력하세요 (팀 소개, 구하는 인원 등)"
              rows={4}
              className="bg-[#F5F5F7] rounded-[10px] px-4 py-3 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none resize-none focus:ring-2 focus:ring-[#007AFF]/30"
            />
            <button
              onClick={handlePost}
              disabled={posting || !title.trim()}
              className="self-end h-10 px-6 bg-[#007AFF] hover:bg-[#0066DD] text-white text-[14px] font-semibold rounded-[10px] transition-colors disabled:opacity-50"
            >
              {posting ? "등록 중..." : "등록"}
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {filteredPosts.map((p) => {
            const st = statusLabel[p.status] || statusLabel.open;
            const cat = categoryLabel[p.category] || categoryLabel.hiring;
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-6 flex flex-col gap-3"
                style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-[26px] px-3 rounded-[17px] text-[11px] font-semibold flex items-center"
                    style={{ backgroundColor: cat.bg, color: cat.color }}
                  >
                    {cat.text}
                  </span>
                  <p className="text-[16px] font-semibold text-[#1D1D1F] flex-1">{p.title}</p>
                  <span
                    className="h-[26px] px-3 rounded-[17px] text-[11px] font-semibold flex items-center"
                    style={{ backgroundColor: st.bg, color: st.color }}
                  >
                    {st.text}
                  </span>
                </div>
                {p.content && <p className="text-[13px] text-[#86868B]">{p.content}</p>}
                <div className="flex items-center gap-3">
                  <span className="text-[12px] font-medium text-[#AEAEB2]">
                    {p.students?.name || "알 수 없음"}
                  </span>
                  <span className="text-[12px] text-[#AEAEB2]">{timeAgo(p.created_at)}</span>
                  <button
                    onClick={() => togglePostInterest(p.id)}
                    className={`text-[12px] font-medium ml-auto ${
                      myPostInterests.has(p.id) ? "text-white bg-[#007AFF] px-3 py-1 rounded-full" : "text-[#007AFF]"
                    }`}
                  >
                    관심 {p.interest_count}
                  </button>
                </div>
                {user && p.author_id === user.id && p.status === "open" && (
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={async () => {
                        await supabase.from("posts").update({ status: "closing" }).eq("id", p.id);
                        loadPosts();
                      }}
                      className="text-[12px] text-[#FF9500] hover:underline"
                    >
                      마감임박으로 변경
                    </button>
                    <button
                      onClick={async () => {
                        await supabase.from("posts").update({ status: "closed" }).eq("id", p.id);
                        loadPosts();
                      }}
                      className="text-[12px] text-[#FF3B30] hover:underline"
                    >
                      마감
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {filteredPosts.length === 0 && (
            <p className="text-[14px] text-[#86868B] text-center py-12">아직 게시글이 없습니다.</p>
          )}
        </div>
      </LockGuard>
    </AppLayout>
  );
}
