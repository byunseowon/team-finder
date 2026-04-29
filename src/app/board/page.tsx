"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  students: { name: string; team_id: string | null } | null;
  interest_count: number;
  comment_count: number;
  team_name?: string;
}

interface Comment {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
  students: { name: string } | null;
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

  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPosts();
    if (user) loadMyPostInterests();
  }, [user]);

  async function loadPosts() {
    const { data: postsData } = await supabase
      .from("posts")
      .select("*, students(name, team_id)")
      .order("created_at", { ascending: false });
    if (postsData) {
      const withCounts = await Promise.all(
        postsData.map(async (p) => {
          const { count: interestCount } = await supabase
            .from("interests")
            .select("*", { count: "exact", head: true })
            .eq("to_post_id", p.id);
          const { count: commentCount } = await supabase
            .from("post_comments")
            .select("*", { count: "exact", head: true })
            .eq("post_id", p.id);
          let team_name = "";
          if (p.students?.team_id) {
            const { data: team } = await supabase.from("teams").select("name").eq("id", p.students.team_id).single();
            if (team) team_name = team.name;
          }
          return { ...p, interest_count: interestCount || 0, comment_count: commentCount || 0, team_name };
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

  async function loadComments(postId: string) {
    const { data } = await supabase
      .from("post_comments")
      .select("*, students(name)")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });
    if (data) setComments((prev) => ({ ...prev, [postId]: data }));
  }

  async function toggleComments(postId: string) {
    if (expandedComments.has(postId)) {
      setExpandedComments((prev) => { const s = new Set(prev); s.delete(postId); return s; });
    } else {
      setExpandedComments((prev) => new Set(prev).add(postId));
      await loadComments(postId);
    }
  }

  async function submitComment(postId: string) {
    if (!user) return;
    const content = (commentInputs[postId] || "").trim();
    if (!content) return;
    setSubmittingComment((prev) => new Set(prev).add(postId));
    await supabase.from("post_comments").insert({ post_id: postId, author_id: user.id, content });
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    await loadComments(postId);
    await loadPosts();
    setSubmittingComment((prev) => { const s = new Set(prev); s.delete(postId); return s; });
  }

  async function deleteComment(commentId: string, postId: string) {
    await supabase.from("post_comments").delete().eq("id", commentId);
    await loadComments(postId);
    await loadPosts();
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
    closed: { text: "마감", bg: "#F5F5F7", color: "#86868B" },
  };

  const categoryLabel: Record<string, { text: string; bg: string; color: string }> = {
    hiring: { text: "구인", bg: "#E3F2FD", color: "#1565C0" },
    looking: { text: "구직", bg: "#F3E5F5", color: "#7B1FA2" },
  };

  const filteredPosts = posts.filter((p) => {
    if (filterCategory && p.category !== filterCategory) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchContent = (p.content || "").toLowerCase().includes(q);
      const matchAuthor = (p.students?.name || "").toLowerCase().includes(q);
      if (!matchTitle && !matchContent && !matchAuthor) return false;
    }
    return true;
  });

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

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="제목, 내용, 글쓴이로 검색"
          className="w-full h-11 bg-white rounded-[10px] px-4 text-[14px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:ring-2 focus:ring-[#007AFF]/30 mb-4"
          style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
        />

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
            const postComments = comments[p.id] || [];
            const isExpanded = expandedComments.has(p.id);
            return (
              <div
                key={p.id}
                className="bg-white rounded-2xl p-6 flex flex-col gap-3"
                style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.03)" }}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="h-[26px] px-3 rounded-[17px] text-[11px] font-semibold flex items-center shrink-0"
                    style={{ backgroundColor: cat.bg, color: cat.color }}
                  >
                    {cat.text}
                  </span>
                  <span
                    className="h-[26px] px-3 rounded-[17px] text-[11px] font-semibold flex items-center shrink-0"
                    style={{ backgroundColor: st.bg, color: st.color }}
                  >
                    {st.text}
                  </span>
                  <p className="text-[16px] font-semibold text-[#1D1D1F] flex-1">{p.title}</p>
                  <span className="text-[14px] font-semibold text-[#1D1D1F] shrink-0">
                    {p.students?.name || "알 수 없음"}
                  </span>
                  <button
                    onClick={() => {
                      if (p.category === "looking") {
                        router.push(`/browse?search=${encodeURIComponent(p.students?.name || "")}`);
                      } else {
                        router.push(`/teams?search=${encodeURIComponent(p.team_name || "")}`);
                      }
                    }}
                    className="h-[28px] px-3.5 rounded-[8px] text-[12px] font-medium text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 transition-colors shrink-0"
                  >
                    {p.category === "looking" ? "프로필 보기" : "팀 보기"}
                  </button>
                </div>

                {p.content && <p className="text-[13px] text-[#86868B]">{p.content}</p>}

                <div className="flex items-center gap-3">
                  <span className="text-[12px] text-[#AEAEB2]">{timeAgo(p.created_at)}</span>
                  <button
                    onClick={() => togglePostInterest(p.id)}
                    className={`text-[12px] font-medium ${
                      myPostInterests.has(p.id) ? "text-white bg-[#007AFF] px-3 py-1 rounded-full" : "text-[#007AFF]"
                    }`}
                  >
                    관심 {p.interest_count}
                  </button>
                  <button
                    onClick={() => toggleComments(p.id)}
                    className={`text-[12px] font-medium transition-colors ${
                      isExpanded ? "text-white bg-[#86868B] px-3 py-1 rounded-full" : "text-[#86868B] hover:text-[#1D1D1F]"
                    }`}
                  >
                    댓글 {p.comment_count}
                  </button>
                  <div className="flex gap-3 ml-auto">
                    {user && p.author_id === user.id && editingId !== p.id && (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(p.id);
                            setEditTitle(p.title);
                            setEditContent(p.content || "");
                            setEditStatus(p.status as "open" | "closed");
                          }}
                          className="text-[12px] text-[#007AFF] hover:underline"
                        >
                          수정
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm("정말 삭제하시겠습니까?")) return;
                            await supabase.from("interests").delete().eq("to_post_id", p.id);
                            await supabase.from("post_comments").delete().eq("post_id", p.id);
                            await supabase.from("posts").delete().eq("id", p.id);
                            loadPosts();
                          }}
                          className="text-[12px] text-[#FF3B30] hover:underline"
                        >
                          삭제
                        </button>
                      </>
                    )}
                    {isAdmin && !(user && p.author_id === user.id) && (
                      <button
                        onClick={async () => {
                          if (!confirm("관리자 권한으로 이 글을 삭제하시겠습니까?")) return;
                          await supabase.from("interests").delete().eq("to_post_id", p.id);
                          await supabase.from("post_comments").delete().eq("post_id", p.id);
                          await supabase.from("posts").delete().eq("id", p.id);
                          loadPosts();
                        }}
                        className="text-[12px] text-[#FF3B30] hover:underline"
                      >
                        삭제 (관리자)
                      </button>
                    )}
                  </div>
                </div>

                {user && p.author_id === user.id && editingId === p.id && (
                  <div className="flex flex-col gap-3 pt-2 border-t border-[#F5F5F7]">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="h-10 bg-[#F5F5F7] rounded-[10px] px-4 text-[14px] text-[#1D1D1F] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={3}
                      className="bg-[#F5F5F7] rounded-[10px] px-4 py-3 text-[14px] text-[#1D1D1F] outline-none resize-none focus:ring-2 focus:ring-[#007AFF]/30"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] text-[#86868B]">상태:</span>
                      <button
                        onClick={() => setEditStatus("open")}
                        className={`h-[30px] px-3 rounded-[17px] text-[12px] font-medium transition-colors ${
                          editStatus === "open" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#F5F5F7] text-[#86868B]"
                        }`}
                      >
                        모집중
                      </button>
                      <button
                        onClick={() => setEditStatus("closed")}
                        className={`h-[30px] px-3 rounded-[17px] text-[12px] font-medium transition-colors ${
                          editStatus === "closed" ? "bg-[#F5F5F7] text-[#86868B] ring-1 ring-[#86868B]" : "bg-[#F5F5F7] text-[#86868B]"
                        }`}
                      >
                        마감
                      </button>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="h-9 px-4 bg-[#F5F5F7] text-[#1D1D1F] text-[13px] font-medium rounded-[10px] hover:bg-[#ECECEE] transition-colors"
                      >
                        취소
                      </button>
                      <button
                        onClick={async () => {
                          await supabase.from("posts").update({ title: editTitle, content: editContent, status: editStatus }).eq("id", p.id);
                          setEditingId(null);
                          loadPosts();
                        }}
                        disabled={!editTitle.trim()}
                        className="h-9 px-4 bg-[#007AFF] text-white text-[13px] font-semibold rounded-[10px] hover:bg-[#0066DD] transition-colors disabled:opacity-50"
                      >
                        저장
                      </button>
                    </div>
                  </div>
                )}

                {isExpanded && (
                  <div className="flex flex-col gap-2 pt-3 border-t border-[#F5F5F7]">
                    {postComments.length === 0 && (
                      <p className="text-[12px] text-[#AEAEB2] text-center py-1">아직 댓글이 없습니다.</p>
                    )}
                    {postComments.map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#F5F5F7] flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-[10px] font-semibold text-[#86868B]">
                            {(c.students?.name || "?")[0]}
                          </span>
                        </div>
                        <div className="flex-1 bg-[#F5F5F7] rounded-[10px] px-3 py-2">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[12px] font-semibold text-[#1D1D1F]">{c.students?.name || "알 수 없음"}</span>
                            <span className="text-[11px] text-[#AEAEB2]">{timeAgo(c.created_at)}</span>
                            {(user && c.author_id === user.id) || isAdmin ? (
                              <button
                                onClick={() => deleteComment(c.id, p.id)}
                                className="ml-auto text-[11px] text-[#FF3B30] hover:underline"
                              >
                                삭제
                              </button>
                            ) : null}
                          </div>
                          <p className="text-[13px] text-[#1D1D1F]">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    {user && (
                      <div className="flex gap-2 mt-1">
                        <input
                          value={commentInputs[p.id] || ""}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [p.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              submitComment(p.id);
                            }
                          }}
                          placeholder="댓글을 입력하세요 (Enter로 등록)"
                          className="flex-1 h-9 bg-[#F5F5F7] rounded-[10px] px-3 text-[13px] text-[#1D1D1F] placeholder-[#AEAEB2] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                        />
                        <button
                          onClick={() => submitComment(p.id)}
                          disabled={!(commentInputs[p.id] || "").trim() || submittingComment.has(p.id)}
                          className="h-9 px-4 bg-[#007AFF] text-white text-[13px] font-semibold rounded-[10px] hover:bg-[#0066DD] transition-colors disabled:opacity-50"
                        >
                          등록
                        </button>
                      </div>
                    )}
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
