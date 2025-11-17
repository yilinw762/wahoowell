"use client";

import { use as usePromise, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import api from "@/libs/api";
import {
  FeedPost,
  REACTION_OPTIONS,
  formatFullDate,
  fetchPostWithDetails,
  PostComment,
} from "@/src/components/community/helpers";

interface PostDetailPageProps {
  params: Promise<{
    postId: string;
  }>;
}

export default function PostDetailPage({ params }: PostDetailPageProps) {
  const resolvedParams = usePromise(params);
  const { data: session, status } = useSession();
  const router = useRouter();
  const rawUserId = (session?.user as { id?: number | string } | undefined)?.id;
  const userId = typeof rawUserId === "string" ? Number(rawUserId) : rawUserId;
  const isAuthenticated =
    status === "authenticated" && typeof userId === "number" && !Number.isNaN(userId);

  const sessionIdentity = useMemo(() => {
    const sessionUser = session?.user as { name?: string | null; email?: string | null } | undefined;
    const name = sessionUser?.name?.trim();
    if (name) return name;
    const email = sessionUser?.email;
    if (email && email.includes("@")) {
      return email.split("@")[0];
    }
    return undefined;
  }, [session]);

  const resolveDisplayName = useCallback(
    (ownerId: number, username?: string | null) => {
      const trimmed = username?.trim();
      if (trimmed) return trimmed;
      if (isAuthenticated && ownerId === userId && sessionIdentity) {
        return sessionIdentity;
      }
      return `Member #${ownerId}`;
    },
    [isAuthenticated, sessionIdentity, userId]
  );

  const postId = Number(resolvedParams.postId);

  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [pendingReaction, setPendingReaction] = useState<string | null>(null);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deletingComments, setDeletingComments] = useState<Record<number, boolean>>({});

  const loadPost = useCallback(async () => {
    if (!Number.isFinite(postId)) {
      setError("Invalid post id");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const hydrated = await fetchPostWithDetails(
        postId,
        isAuthenticated ? userId : undefined
      );
      setPost(hydrated);
    } catch (err) {
      console.error("Failed to load post", err);
      setError("We couldn't find that post.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, postId, userId]);

  useEffect(() => {
    loadPost();
  }, [loadPost]);

  const handleReaction = async (reactionType: string) => {
    if (!isAuthenticated || !userId || !post) {
      setError("Sign in to react to posts.");
      return;
    }

    const isRemoving = post.viewerReaction === reactionType;

    setPendingReaction(reactionType);
    setPost((prev) => {
      if (!prev) return prev;
      const updatedCounts = { ...prev.reactions };

      if (isRemoving) {
        updatedCounts[reactionType] = Math.max(
          0,
          (updatedCounts[reactionType] ?? 0) - 1
        );
        return {
          ...prev,
          reactions: updatedCounts,
          viewerReaction: null,
        };
      }

      updatedCounts[reactionType] = (updatedCounts[reactionType] ?? 0) + 1;

      if (prev.viewerReaction && prev.viewerReaction !== reactionType) {
        updatedCounts[prev.viewerReaction] = Math.max(
          0,
          (updatedCounts[prev.viewerReaction] ?? 0) - 1
        );
      }

      return {
        ...prev,
        reactions: updatedCounts,
        viewerReaction: reactionType,
      };
    });

    try {
      if (isRemoving) {
        await api.delete(`/api/community/posts/${post.post_id}/reactions`, {
          params: { user_id: userId },
        });
      } else {
        await api.post(`/api/community/posts/${post.post_id}/reactions`, {
          post_id: post.post_id,
          user_id: userId,
          reaction_type: reactionType,
        });
      }
    } catch (err) {
      console.error("Failed to react", err);
      setError("Reaction failed. Please try again.");

      try {
        const fresh = await fetchPostWithDetails(post.post_id, userId);
        setPost(fresh);
      } catch (refreshErr) {
        console.error("Failed to refresh post after reaction error", refreshErr);
      }
    } finally {
      setPendingReaction(null);
    }
  };
 
  const handleDeletePost = async () => {
    if (!post) return;
    if (!isAuthenticated || !userId) {
      setError("Sign in to manage posts.");
      return;
    }

    const confirmed = typeof window === "undefined" || window.confirm("Delete this post?");
    if (!confirmed) return;

    setDeletingPost(true);
    try {
      await api.delete(`/api/community/posts/${post.post_id}`, {
        params: { user_id: userId },
      });
      setPost(null);
      router.push("/community");
    } catch (err) {
      console.error("Failed to delete post", err);
      setError("We couldn't delete that post. Try again.");
    } finally {
      setDeletingPost(false);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!post) return;
    if (!isAuthenticated || !userId) {
      setError("Sign in to manage comments.");
      return;
    }

    const confirmed = typeof window === "undefined" || window.confirm("Delete this comment?");
    if (!confirmed) return;

    setDeletingComments((prev) => ({ ...prev, [commentId]: true }));
    const previousComments = post.comments;
    setPost((prev) =>
      prev
        ? {
            ...prev,
            comments: prev.comments.filter((comment) => comment.comment_id !== commentId),
          }
        : prev
    );

    try {
      await api.delete(`/api/community/posts/${post.post_id}/comments/${commentId}`, {
        params: { user_id: userId },
      });
    } catch (err) {
      console.error("Failed to delete comment", err);
      setError("We couldn't delete that comment. Try again.");
      setPost((prev) => (prev ? { ...prev, comments: previousComments } : prev));
    } finally {
      setDeletingComments((prev) => ({ ...prev, [commentId]: false }));
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
              <strong>{resolveDisplayName(post.user_id, post.username)}</strong>
              <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 12 }}>
                {formatFullDate(post.created_at)}
               </span>
             </div>
             <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
             <span style={{ fontSize: 12, color: "var(--muted)", textTransform: "capitalize" }}>
               {post.visibility}
             </span>
             {isAuthenticated && userId === post.user_id && (
               <button
                 type="button"
                 onClick={handleDeletePost}
                 disabled={deletingPost}
                 style={{
                   fontSize: 12,
                   color: "#fca5a5",
                   background: "transparent",
                   border: "none",
                   cursor: deletingPost ? "progress" : "pointer",
                 }}
               >
                 {deletingPost ? "Deleting..." : "Delete"}
               </button>
             )}
             </div>
           </div>
           <p style={{ margin: "6px 0 12px", lineHeight: 1.5 }}>{post.content}</p>
 
           <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
             {REACTION_OPTIONS.map((reaction) => {
               const isSelected = post?.viewerReaction === reaction.type;
               const isDisabled = pendingReaction !== null || !isAuthenticated;

               return (
                 <button
                   key={reaction.type}
                   onClick={() => handleReaction(reaction.type)}
                   disabled={isDisabled}
                   style={{
                     display: "flex",
                     gap: 6,
                     alignItems: "center",
                     borderRadius: 999,
                     border: isSelected ? "1px solid #2563eb" : "1px solid #1f2937",
                     padding: "4px 10px",
                     background: isSelected ? "#1d4ed8" : "#0f172a",
                     color: isSelected ? "#f8fafc" : "#f1f5f9",
                     fontSize: 13,
                     cursor: isAuthenticated ? "pointer" : "not-allowed",
                     opacity: isAuthenticated ? 1 : 0.6,
                     boxShadow: isSelected ? "0 0 10px rgba(37, 99, 235, 0.4)" : "none",
                   }}
                   title={isAuthenticated ? reaction.label : "Sign in to react"}
                 >
                   <span>{reaction.emoji}</span>
                   <span>{post?.reactions[reaction.type] ?? 0}</span>
                 </button>
               );
             })}
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
               {post.comments.map((comment) => {
                const commenterName = resolveDisplayName(comment.user_id, comment.username);
                 const canDeleteComment = isAuthenticated && comment.user_id === userId;
                 return (
                   <div key={comment.comment_id} style={{ borderRadius: 8, background: "#0f172a", padding: 10 }}>
                     <div style={{ fontSize: 13, color: "#c4cadb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                       <div>
                         <strong>{commenterName}</strong>
                         <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 11 }}>
                           {formatFullDate(comment.created_at)}
                         </span>
                       </div>
                       {canDeleteComment && (
                         <button
                           type="button"
                           onClick={() => handleDeleteComment(comment.comment_id)}
                           disabled={deletingComments[comment.comment_id]}
                           style={{
                             fontSize: 11,
                             color: "#fca5a5",
                             background: "transparent",
                             border: "none",
                             cursor: deletingComments[comment.comment_id] ? "progress" : "pointer",
                           }}
                         >
                           {deletingComments[comment.comment_id] ? "Deleting..." : "Delete"}
                         </button>
                       )}
                     </div>
                     <p style={{ margin: "4px 0 0", fontSize: 14 }}>{comment.content}</p>
                   </div>
                 );
               })}
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
