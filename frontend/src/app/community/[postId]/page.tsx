"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import api from "@/libs/api";
import {
  FeedPost,
  REACTION_OPTIONS,
  formatRelative,
  fetchPostWithDetails,
  PostComment,
} from "@/src/components/community/helpers";

interface PostDetailPageProps {
  params: {
    postId: string;
  };
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const { data: session, status } = useSession();
  const rawUserId = (session?.user as { id?: number | string } | undefined)?.id;
  const userId = typeof rawUserId === "string" ? Number(rawUserId) : rawUserId;
  const isAuthenticated =
    status === "authenticated" && typeof userId === "number" && !Number.isNaN(userId);

  const postId = Number(params.postId);

  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [pendingReaction, setPendingReaction] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (!Number.isFinite(postId)) {
      setError("Invalid post id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const hydrated = await fetchPostWithDetails(postId);
      setPost(hydrated);
    } catch (err) {
      console.error("Failed to load post", err);
      setError("We couldn't find that post.");
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleReaction = async (reactionType: string) => {
    if (!isAuthenticated || !userId || !post) {
      setError("Sign in to react to posts.");
      return;
    }

    setPendingReaction(reactionType);
    setPost((prev) =>
      prev
        ? {
            ...prev,
            reactions: {
              ...prev.reactions,
              [reactionType]: (prev.reactions[reactionType] ?? 0) + 1,
            },
          }
        : prev
    );

    try {
      await api.post(`/api/community/posts/${post.post_id}/reactions`, {
        post_id: post.post_id,
        user_id: userId,
        reaction_type: reactionType,
      });
    } catch (err) {
      console.error("Failed to react", err);
      setError("Reaction failed. Please try again.");
      setPost((prev) =>
        prev
          ? {
              ...prev,
              reactions: {
                ...prev.reactions,
                [reactionType]: Math.max(0, (prev.reactions[reactionType] ?? 1) - 1),
              },
            }
          : prev
      );
    } finally {
      setPendingReaction(null);
    }
  };
 
   const handleCommentSubmit = async () => {
     const draft = commentDraft.trim();
     if (!draft || !post) return;
     if (!isAuthenticated || !userId) {
       setError("Sign in to leave a comment.");
       return;
     }
 
     setSubmittingComment(true);
     try {
       const { data: comment } = await api.post<PostComment>(
         `/api/community/posts/${post.post_id}/comments`,
         {
           post_id: post.post_id,
           user_id: userId,
           content: draft,
         }
       );
 
       setPost((prev) =>
         prev ? { ...prev, comments: [...prev.comments, comment] } : prev
       );
       setCommentDraft("");
     } catch (err) {
       console.error("Failed to submit comment", err);
       setError("We couldn't post that comment. Try again.");
     } finally {
       setSubmittingComment(false);
     }
   };
 
   return (
     <div className="card" style={{ padding: 24 }}>
       <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
         <h2 style={{ margin: 0 }}>Post detail</h2>
         <div style={{ display: "flex", gap: 12 }}>
           <button
             type="button"
             onClick={loadPost}
             disabled={loading}
             style={{
               fontSize: 13,
               padding: "6px 12px",
               borderRadius: 8,
               border: "1px solid #1f2937",
               background: "#111827",
               color: "#e2e8f0",
               cursor: loading ? "progress" : "pointer",
             }}
           >
             Refresh
           </button>
           <Link
             href="/community"
             style={{
               fontSize: 13,
               color: "#60a5fa",
               textDecoration: "none",
               alignSelf: "center",
             }}
           >
             ← Back to feed
           </Link>
         </div>
       </div>
 
       {loading && <p style={{ color: "var(--muted)" }}>Loading post...</p>}
       {error && (
         <p style={{ color: "#ff6b81" }}>{error}</p>
       )}
       {!loading && !error && post && (
         <div style={{ border: "1px solid #1c2535", borderRadius: 12, padding: 16 }}>
           <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
             <div>
               <strong>{post.username ?? `User ${post.user_id}`}</strong>
               <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 12 }}>
                 {formatRelative(post.created_at)}
               </span>
             </div>
             <span style={{ fontSize: 12, color: "var(--muted)", textTransform: "capitalize" }}>
               {post.visibility}
             </span>
           </div>
           <p style={{ margin: "6px 0 12px", lineHeight: 1.5 }}>{post.content}</p>
 
           <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
             {REACTION_OPTIONS.map((reaction) => (
               <button
                 key={reaction.type}
                 onClick={() => handleReaction(reaction.type)}
                 disabled={pendingReaction !== null || !isAuthenticated}
                 style={{
                   display: "flex",
                   gap: 6,
                   alignItems: "center",
                   borderRadius: 999,
                   border: "1px solid #1f2937",
                   padding: "4px 10px",
                   background: "#0f172a",
                   color: "#f1f5f9",
                   fontSize: 13,
                   cursor: isAuthenticated ? "pointer" : "not-allowed",
                   opacity: isAuthenticated ? 1 : 0.6,
                 }}
                 title={isAuthenticated ? reaction.label : "Sign in to react"}
               >
                 <span>{reaction.emoji}</span>
                 <span>{post.reactions[reaction.type] ?? 0}</span>
               </button>
             ))}
           </div>
 
           <div
             style={{
               borderTop: "1px solid #1c2535",
               paddingTop: 12,
               display: "flex",
               flexDirection: "column",
               gap: 12,
             }}
           >
             <div style={{ fontSize: 13, color: "var(--muted)" }}>
               {post.comments.length === 0
                 ? "No comments yet"
                 : `${post.comments.length} comment${post.comments.length > 1 ? "s" : ""}`}
             </div>
 
             <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
               {post.comments.map((comment) => (
                 <div key={comment.comment_id} style={{ borderRadius: 8, background: "#0f172a", padding: 10 }}>
                   <div style={{ fontSize: 13, color: "#c4cadb" }}>
                     <strong>{comment.username ?? `User ${comment.user_id}`}</strong>
                     <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 11 }}>
                       {formatRelative(comment.created_at)}
                     </span>
                   </div>
                   <p style={{ margin: "4px 0 0", fontSize: 14 }}>{comment.content}</p>
                 </div>
               ))}
             </div>
 
             <div style={{ display: "flex", gap: 8 }}>
               <input
                 type="text"
                 placeholder={isAuthenticated ? "Add a comment" : "Sign in to comment"}
                 value={commentDraft}
                 onChange={(e) => setCommentDraft(e.target.value)}
                 disabled={!isAuthenticated || submittingComment}
                 style={{
                   flex: 1,
                   background: "#0b1220",
                   border: "1px solid #1f2937",
                   borderRadius: 999,
                   padding: "8px 16px",
                   color: "#f8fafc",
                 }}
               />
               <button
                 type="button"
                 onClick={handleCommentSubmit}
                 disabled={!isAuthenticated || submittingComment}
                 style={{
                   padding: "8px 18px",
                   borderRadius: 999,
                   border: "none",
                   background: "#2563eb",
                   color: "white",
                   fontWeight: 600,
                   cursor: !isAuthenticated ? "not-allowed" : "pointer",
                   opacity: !isAuthenticated ? 0.6 : 1,
                 }}
               >
                 {submittingComment ? "Posting..." : "Post"}
               </button>
             </div>
           </div>
         </div>
       )}
     </div>
   );
 }
