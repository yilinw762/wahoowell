"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import api from "@/libs/api";
import {
  FeedPost,
  CommunityPost,
  PostComment,
  REACTION_OPTIONS,
  VISIBILITY_OPTIONS,
  formatRelative,
  hydratePosts,
  fetchPostWithDetails,
} from "@/src/components/community/helpers";

export default function CommunityFeed() {
  const { data: session, status } = useSession();
  const rawUserId = (session?.user as { id?: number | string } | undefined)?.id;
  const userId = typeof rawUserId === "string" ? Number(rawUserId) : rawUserId;

  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<number, boolean>>({});
  const [pendingReaction, setPendingReaction] = useState<Record<number, string | null>>({});
  const [deletingPosts, setDeletingPosts] = useState<Record<number, boolean>>({});
  const [deletingComments, setDeletingComments] = useState<Record<number, boolean>>({});
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostVisibility, setNewPostVisibility] = useState(
    VISIBILITY_OPTIONS[0]?.value ?? "public"
  );
  const [creatingPost, setCreatingPost] = useState(false);

  const isAuthenticated =
    status === "authenticated" && typeof userId === "number" && !Number.isNaN(userId);

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: rawPosts } = await api.get<CommunityPost[]>(
        "/api/community/posts"
      );
      const hydrated = await hydratePosts(
        rawPosts,
        isAuthenticated ? userId : undefined
      );
      setPosts(hydrated);
    } catch (err) {
      console.error("Failed to load community feed", err);
      setError("We couldn't load the community feed. Try refreshing.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, userId]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const refreshFeed = () => {
    setCommentDrafts({});
    setPendingReaction({});
    setSubmittingComment({});
    loadFeed();
  };

  const handleCreatePost = async (event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault();
    const content = newPostContent.trim();
    if (!content) return;
    if (!isAuthenticated || !userId) {
      setError("Sign in to share a post.");
      return;
    }

    setCreatingPost(true);
    setError(null);
    try {
      const payload = {
        user_id: userId,
        content,
        visibility: newPostVisibility,
      };
      const { data: createdPost } = await api.post<CommunityPost>(
        "/api/community/posts",
        payload
      );
      const [hydrated] = await hydratePosts(
        [createdPost],
        isAuthenticated ? userId : undefined
      );
      setPosts((prev) => [hydrated, ...prev]);
      setNewPostContent("");
    } catch (err) {
      console.error("Failed to create post", err);
      setError("We couldn't create that post. Please try again.");
    } finally {
      setCreatingPost(false);
    }
  };

  const handleReaction = async (postId: number, reactionType: string) => {
    if (!isAuthenticated || !userId) {
      setError("Sign in to react to posts.");
      return;
    }

    const targetPost = posts.find((p) => p.post_id === postId);
    if (!targetPost) return;

    const isRemoving = targetPost.viewerReaction === reactionType;

    setPendingReaction((prev) => ({ ...prev, [postId]: reactionType }));
    setPosts((prev) =>
      prev.map((post) => {
        if (post.post_id !== postId) return post;

        const updatedCounts = { ...post.reactions };

        if (isRemoving) {
          updatedCounts[reactionType] = Math.max(
            0,
            (updatedCounts[reactionType] ?? 0) - 1
          );

          return {
            ...post,
            reactions: updatedCounts,
            viewerReaction: null,
          };
        }

        updatedCounts[reactionType] = (updatedCounts[reactionType] ?? 0) + 1;

        if (post.viewerReaction && post.viewerReaction !== reactionType) {
          updatedCounts[post.viewerReaction] = Math.max(
            0,
            (updatedCounts[post.viewerReaction] ?? 0) - 1
          );
        }

        return {
          ...post,
          reactions: updatedCounts,
          viewerReaction: reactionType,
        };
      })
    );

    try {
      if (isRemoving) {
        await api.delete(`/api/community/posts/${postId}/reactions`, {
          params: { user_id: userId },
        });
      } else {
        await api.post(`/api/community/posts/${postId}/reactions`, {
          post_id: postId,
          user_id: userId,
          reaction_type: reactionType,
        });
      }
    } catch (err) {
      console.error("Failed to react", err);
      setError("We couldn't update that reaction. Please try again.");

      try {
        const fresh = await fetchPostWithDetails(postId, userId);
        setPosts((prev) =>
          prev.map((post) => (post.post_id === postId ? fresh : post))
        );
      } catch (refreshErr) {
        console.error(
          "Failed to refresh post after reaction error",
          refreshErr
        );
      }
    } finally {
      setPendingReaction((prev) => ({ ...prev, [postId]: null }));
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!isAuthenticated || !userId) {
      setError("Sign in to manage posts.");
      return;
    }

    const confirmed = typeof window === "undefined" || window.confirm("Delete this post?");
    if (!confirmed) return;

    setDeletingPosts((prev) => ({ ...prev, [postId]: true }));
    const snapshot = posts;
    setPosts((prev) => prev.filter((post) => post.post_id !== postId));

    try {
      await api.delete(`/api/community/posts/${postId}`, {
        params: { user_id: userId },
      });
    } catch (err) {
      console.error("Failed to delete post", err);
      setError("We couldn't delete that post. Try again.");
      setPosts(snapshot);
    } finally {
      setDeletingPosts((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleDeleteComment = async (postId: number, commentId: number) => {
    if (!isAuthenticated || !userId) {
      setError("Sign in to manage comments.");
      return;
    }

    const confirmed = typeof window === "undefined" || window.confirm("Delete this comment?");
    if (!confirmed) return;

    setDeletingComments((prev) => ({ ...prev, [commentId]: true }));
    const snapshot = posts;
    setPosts((prev) =>
      prev.map((post) =>
        post.post_id === postId
          ? {
              ...post,
              comments: post.comments.filter(
                (comment) => comment.comment_id !== commentId
              ),
            }
          : post
      )
    );

    try {
      await api.delete(`/api/community/posts/${postId}/comments/${commentId}`, {
        params: { user_id: userId },
      });
    } catch (err) {
      console.error("Failed to delete comment", err);
      setError("We couldn't delete that comment. Try again.");
      setPosts(snapshot);
    } finally {
      setDeletingComments((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleCommentChange = (postId: number, value: string) => {
    setCommentDrafts((prev) => ({ ...prev, [postId]: value }));
  };

  const handleCommentSubmit = async (postId: number) => {
    const draft = commentDrafts[postId]?.trim();
    if (!draft) return;
    if (!isAuthenticated || !userId) {
      setError("Sign in to leave a comment.");
      return;
    }

    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    try {
      const { data: comment } = await api.post<PostComment>(
        `/api/community/posts/${postId}/comments`,
        {
          post_id: postId,
          user_id: userId,
          content: draft,
        }
      );

      setPosts((prev) =>
        prev.map((post) =>
          post.post_id === postId
            ? { ...post, comments: [...post.comments, comment] }
            : post
        )
      );
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    } catch (err) {
      console.error("Failed to submit comment", err);
      setError("We couldn't post that comment. Try again.");
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const totalPosts = posts.length;
  const showEmptyState = !loading && totalPosts === 0;

  const feedHeaderMessage = useMemo(() => {
    if (loading) return "Loading the latest wins...";
    if (error) return error;
    if (showEmptyState)
      return "No posts yet. Start the conversation with your first update!";
    return null;
  }, [loading, error, showEmptyState]);

  return (
    <div className="feed" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 13,
          color: "var(--muted)",
          marginBottom: 4,
        }}
      >
        <span>
          {isAuthenticated
            ? "Share encouragement with your community."
            : "Sign in to react and add comments."}
        </span>
        <button
          type="button"
          onClick={refreshFeed}
          style={{
            fontSize: 13,
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #1f2937",
            background: "#111827",
            color: "#e2e8f0",
            cursor: "pointer",
          }}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {feedHeaderMessage && (
        <div
          style={{
            padding: "12px 16px",
            borderRadius: 10,
            background: "#0f1520",
            border: "1px solid #1e2533",
            color: error ? "#ff6b81" : "#c4cadb",
            fontSize: 14,
          }}
        >
          {feedHeaderMessage}
        </div>
      )}

      {isAuthenticated && (
        <form
          onSubmit={handleCreatePost}
          style={{
            border: "1px solid #1c2535",
            borderRadius: 12,
            padding: 16,
            background: "#0b111b",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div>
            <label style={{ display: "block", fontSize: 13, color: "var(--muted)", marginBottom: 6 }}>
              What’s on your mind?
            </label>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              rows={3}
              placeholder="Share a win, tip, or question..."
              style={{
                width: "100%",
                background: "#0b1220",
                border: "1px solid #1f2937",
                borderRadius: 12,
                padding: "10px 14px",
                color: "#f8fafc",
                resize: "vertical",
              }}
            />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ fontSize: 13 }}>Visibility:</label>
            <select
              value={newPostVisibility}
              onChange={(e) => setNewPostVisibility(e.target.value)}
              style={{
                background: "#0b1220",
                border: "1px solid #1f2937",
                borderRadius: 8,
                padding: "6px 10px",
                color: "#f8fafc",
              }}
            >
              {VISIBILITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <div style={{ flex: 1 }} />
            <button
              type="submit"
              disabled={creatingPost || newPostContent.trim().length === 0}
              style={{
                padding: "8px 18px",
                borderRadius: 999,
                border: "none",
                background: creatingPost ? "#1d4ed8" : "#2563eb",
                color: "white",
                fontWeight: 600,
                cursor: creatingPost ? "progress" : "pointer",
                opacity: newPostContent.trim().length === 0 ? 0.6 : 1,
              }}
            >
              {creatingPost ? "Posting..." : "Share"}
            </button>
          </div>
        </form>
      )}

      {posts.map((post) => {
        const displayName = post.username?.trim() || "Community member";
        const canDeletePost = isAuthenticated && post.user_id === userId;

        return (
          <div key={post.post_id} className="post" style={{
          border: "1px solid #1c2535",
          borderRadius: 12,
          padding: 16,
          background: "#0b111b",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <div>
              <strong>{displayName}</strong>
              <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 12 }}>
                {formatRelative(post.created_at)}
              </span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--muted)", textTransform: "capitalize" }}>
                {post.visibility}
              </span>
              {canDeletePost && (
                <button
                  type="button"
                  onClick={() => handleDeletePost(post.post_id)}
                  disabled={deletingPosts[post.post_id]}
                  style={{
                    fontSize: 12,
                    color: "#fca5a5",
                    background: "transparent",
                    border: "none",
                    cursor: deletingPosts[post.post_id] ? "progress" : "pointer",
                  }}
                >
                  {deletingPosts[post.post_id] ? "Deleting..." : "Delete"}
                </button>
              )}
              <Link
                href={`/community/${post.post_id}`}
                style={{
                  fontSize: 12,
                  color: "#60a5fa",
                  textDecoration: "none",
                }}
              >
                Open ↗
              </Link>
            </div>
          </div>
          <p style={{ margin: "6px 0 12px", lineHeight: 1.5 }}>{post.content}</p>

          <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
            {REACTION_OPTIONS.map((reaction) => {
              const isSelected = post.viewerReaction === reaction.type;
              const isDisabled =
                pendingReaction[post.post_id] != null || !isAuthenticated;

              return (
                <button
                  key={reaction.type}
                  onClick={() => handleReaction(post.post_id, reaction.type)}
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
                  <span>{post.reactions[reaction.type] ?? 0}</span>
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
                const commenterName = comment.username?.trim() || "Community member";
                const canDeleteComment =
                  isAuthenticated && comment.user_id === userId;
                return (
                  <div key={comment.comment_id} style={{ borderRadius: 8, background: "#0f172a", padding: 10 }}>
                  <div style={{ fontSize: 13, color: "#c4cadb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <strong>{commenterName}</strong>
                      <span style={{ marginLeft: 8, color: "var(--muted)", fontSize: 11 }}>
                        {formatRelative(comment.created_at)}
                      </span>
                    </div>
                    {canDeleteComment && (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(post.post_id, comment.comment_id)}
                        disabled={deletingComments[comment.comment_id]}
                        style={{
                          fontSize: 11,
                          color: "#fca5a5",
                          background: "transparent",
                          border: "none",
                          cursor: deletingComments[comment.comment_id]
                            ? "progress"
                            : "pointer",
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
                value={commentDrafts[post.post_id] ?? ""}
                onChange={(e) => handleCommentChange(post.post_id, e.target.value)}
                disabled={!isAuthenticated || submittingComment[post.post_id]}
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
                onClick={() => handleCommentSubmit(post.post_id)}
                disabled={!isAuthenticated || submittingComment[post.post_id]}
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
                {submittingComment[post.post_id] ? "Posting..." : "Post"}
              </button>
            </div>
          </div>
        </div>
        );
      })}
    </div>
  );
}
