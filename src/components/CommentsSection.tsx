"use client";

import { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Trash2,
  Clock,
  User,
  ShieldCheck,
  Tag,
} from "lucide-react";
import {
  ReportComment,
  CommentType,
  COMMENT_TYPE_TAGS,
} from "@/lib/types";
import { supabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { getUserId, getUserName, isAdmin } from "@/lib/user";
import { formatTimeAgo } from "@/lib/geo";
import { sanitizeText, checkRateLimit } from "@/lib/security";

interface CommentsSectionProps {
  reportId: string;
  reporterId?: string;
}

export default function CommentsSection({
  reportId,
  reporterId,
}: CommentsSectionProps) {
  const [comments, setComments] = useState<ReportComment[]>([]);
  const [content, setContent] = useState<string>("");
  const [selectedType, setSelectedType] = useState<CommentType>("GENERAL");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState<boolean>(false);

  const currentUserId = getUserId();
  const currentUserName = getUserName();

  useEffect(() => {
    setIsSuperAdmin(isAdmin());
  }, []);

  // Fetch comments
  const fetchComments = async () => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("comments")
          .select("*")
          .eq("report_id", reportId)
          .order("created_at", { ascending: true });

        if (!error && data) {
          setComments(data as ReportComment[]);
        }
      }
    } catch (e) {
      console.warn("Could not load comments", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!reportId) return;
    fetchComments();

    if (isSupabaseConfigured && supabase) {
      const channel = supabase
        .channel(`comments-${reportId}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "comments",
            filter: `report_id=eq.${reportId}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              setComments((prev) => [...prev, payload.new as ReportComment]);
            } else if (payload.eventType === "DELETE") {
              setComments((prev) =>
                prev.filter((c) => c.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase?.removeChannel(channel);
      };
    }
  }, [reportId]);

  const [honeypot, setHoneypot] = useState<string>("");
  const [rateLimitError, setRateLimitError] = useState<string>("");

  // Post comment
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check
    if (honeypot.trim().length > 0) {
      setContent("");
      return;
    }

    // Rate limit check: 4s cooldown
    const rateCheck = checkRateLimit("comment_post", 4000);
    if (!rateCheck.allowed) {
      setRateLimitError(`Please wait ${rateCheck.remainingSec}s before posting another update.`);
      setTimeout(() => setRateLimitError(""), 3000);
      return;
    }

    if (!content.trim()) return;

    setIsSubmitting(true);
    setRateLimitError("");

    const sanitizedContent = sanitizeText(content, 500);

    const newComment: ReportComment = {
      id: `local-${Date.now()}`,
      report_id: reportId,
      author_id: currentUserId,
      author_name: sanitizeText(currentUserName, 60),
      content: sanitizedContent,
      comment_type: selectedType,
      created_at: new Date().toISOString(),
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from("comments")
          .insert([
            {
              report_id: reportId,
              author_id: currentUserId,
              author_name: sanitizeText(currentUserName, 60),
              content: sanitizedContent,
              comment_type: selectedType,
            },
          ])
          .select();

        if (error) throw error;
        if (data && data[0]) {
          setComments((prev) => [...prev, data[0] as ReportComment]);
        }
      } else {
        setComments((prev) => [...prev, newComment]);
      }

      setContent("");
      setSelectedType("GENERAL");
    } catch (e) {
      console.error("Failed to post comment", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete own comment
  const handleDeleteComment = async (commentId: string) => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from("comments").delete().eq("id", commentId);
      }
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      console.error("Failed to delete comment", e);
    }
  };

  return (
    <div className="bg-darkBg border border-darkBorder rounded-2xl p-5 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-pawAmber" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Live Rescue Updates & Coordination
          </h3>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-pawAmber/15 text-pawAmber border border-pawAmber/30">
          {comments.length} {comments.length === 1 ? "Update" : "Updates"}
        </span>
      </div>

      {/* Quick Tag Chips */}
      <div className="space-y-2">
        <label className="block text-[11px] font-bold text-neutral-400">
          Quick Action Tag:
        </label>
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {(Object.keys(COMMENT_TYPE_TAGS) as CommentType[]).map((type) => {
            const tag = COMMENT_TYPE_TAGS[type];
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedType(type)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border flex items-center space-x-1.5 ${
                  isSelected
                    ? "bg-pawAmber text-white border-pawAmber shadow-md shadow-pawAmber/20"
                    : "bg-darkCard text-neutral-300 border-darkBorder hover:border-neutral-600"
                }`}
              >
                <span>{tag.icon}</span>
                <span>{tag.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Post Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Anti-Bot Honeypot */}
        <input
          type="text"
          name="hp_comment_trap"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
          tabIndex={-1}
          autoComplete="off"
          className="opacity-0 absolute -z-50 w-0 h-0 pointer-events-none select-none"
          aria-hidden="true"
        />

        {rateLimitError && (
          <p className="text-xs font-bold text-amber-400 animate-pulse">
            ⚠️ {rateLimitError}
          </p>
        )}

        <div className="relative">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={`Post an update as ${currentUserName}... (e.g. "On my way with bandages", "Dog is near the blue gate")`}
            rows={2}
            className="w-full bg-darkCard border border-darkBorder rounded-2xl p-3.5 pr-24 text-xs sm:text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-pawAmber resize-none"
          />
          <button
            type="submit"
            disabled={!content.trim() || isSubmitting}
            className="absolute bottom-3 right-3 px-3.5 py-1.5 rounded-xl bg-pawAmber hover:bg-pawAmber-hover text-white text-xs font-bold shadow-md shadow-pawAmber/20 transition-all flex items-center space-x-1.5 disabled:opacity-40"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? "Posting..." : "Post"}</span>
          </button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 pt-2 border-t border-darkBorder/60">
        {comments.length === 0 ? (
          <div className="text-center py-6 text-neutral-500 text-xs space-y-1">
            <p>No community updates yet.</p>
            <p className="text-[11px] text-neutral-600">
              Be the first to post if you are heading there with food or medical help!
            </p>
          </div>
        ) : (
          comments.map((comment) => {
            const isMyComment = comment.author_id === currentUserId;
            const isAuthorOfReport = comment.author_id === reporterId;
            const tag = COMMENT_TYPE_TAGS[comment.comment_type] || COMMENT_TYPE_TAGS.GENERAL;

            return (
              <div
                key={comment.id}
                className="p-3.5 rounded-2xl bg-darkCard border border-darkBorder/80 space-y-2 text-xs transition-all hover:border-darkBorder"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-lg bg-pawAmber/20 flex items-center justify-center text-pawAmber text-[11px] font-bold">
                      {comment.author_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-bold text-white">
                      {comment.author_name}
                    </span>
                    {isAuthorOfReport && (
                      <span className="px-1.5 py-0.5 rounded bg-pawAmber/20 text-pawAmber text-[10px] font-bold">
                        Reporter
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${tag.bg}`}
                    >
                      {tag.icon} {tag.label}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 text-neutral-500 text-[11px]">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(comment.created_at)}</span>
                    </span>
                    {(isMyComment || isSuperAdmin) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        className={`transition-colors p-1 ${
                          isSuperAdmin && !isMyComment
                            ? "text-red-400 hover:text-red-300"
                            : "text-neutral-500 hover:text-red-400"
                        }`}
                        title={
                          isSuperAdmin && !isMyComment
                            ? "👑 Founder Admin: Delete spam comment"
                            : "Delete your update"
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-neutral-200 text-xs sm:text-sm pl-8 leading-relaxed whitespace-pre-wrap">
                  {comment.content}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
