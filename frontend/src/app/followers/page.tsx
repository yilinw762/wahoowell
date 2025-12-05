"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

const API_BASE = "http://localhost:8000";

type Follower = {
  follower_id: number;
  user_id: number;
  follower_user_id: number;
  since: string;
  username?: string;
  email?: string;
  bio?: string;
  is_following?: boolean; // Whether YOU follow THEM
  they_follow_you?: boolean; // Whether THEY follow YOU
};

type SessionUser = {
  user_id?: number | string;
  id?: number | string;
  sub?: number | string;
};

const deriveUserId = (user?: SessionUser): number | undefined => {
  if (!user) return undefined;
  const candidates = [user.user_id, user.id, user.sub];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c)) return c;
    if (typeof c === "string" && c.trim()) {
      const parsed = Number(c);
      if (!Number.isNaN(parsed)) return parsed;
    }
  }
  return undefined;
};

const getInitials = (name?: string) => {
  if (!name) return "?";
  return name.slice(0, 2).toUpperCase();
};

export default function FollowersPage() {
  const { data: session } = useSession();
  const userId = deriveUserId(session?.user as SessionUser);

  const [tab, setTab] = useState<"following" | "followers">("following");
  const [following, setFollowing] = useState<Follower[]>([]);
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<{ [key: number]: boolean }>({});

  const refreshLists = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const [followingRes, followersRes] = await Promise.all([
        fetch(`${API_BASE}/api/followers/following/${userId}`),
        fetch(`${API_BASE}/api/followers/followers/${userId}`)
      ]);

      const followingData = await followingRes.json();
      const followersData = await followersRes.json();

      // Process following data - you follow them, need to check if they follow you back
      const followingWithStatus = Array.isArray(followingData) ? 
        followingData.map((user: Follower) => ({
          ...user,
          is_following: true, // By definition in following tab
          they_follow_you: followersData.some((f: Follower) => f.user_id === user.follower_user_id)
        })) : [];

      // Process followers data - they follow you, need to check if you follow them back
      const followersWithStatus = Array.isArray(followersData) ? 
        followersData.map((user: Follower) => ({
          ...user,
          is_following: followingData.some((f: Follower) => f.follower_user_id === user.user_id),
          they_follow_you: true // By definition in followers tab
        })) : [];

      setFollowing(followingWithStatus);
      setFollowers(followersWithStatus);
    } catch (error) {
      console.error("Error refreshing lists:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLists();
  }, [userId]);

  // Follow/unfollow handler
  const toggleFollow = async (targetUserId: number, follow: boolean) => {
    setPending(prev => ({ ...prev, [targetUserId]: true }));

    const url = follow
      ? `${API_BASE}/api/followers/add`
      : `${API_BASE}/api/followers/unfollow`;

    try {
      await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          follower_user_id: targetUserId
        }),
      });

      // Update local state optimistically before refresh
      if (tab === "followers") {
        setFollowers(prev => 
          prev.map(user => 
            user.user_id === targetUserId 
              ? { ...user, is_following: follow }
              : user
          )
        );
      } else {
        // In following tab, if unfollowing, remove from list
        if (!follow) {
          setFollowing(prev => 
            prev.filter(user => user.follower_user_id !== targetUserId)
          );
        } else {
          // If following someone new (shouldn't happen in following tab but just in case)
          setFollowing(prev => 
            prev.map(user => 
              user.follower_user_id === targetUserId 
                ? { ...user, is_following: follow }
                : user
            )
          );
        }
      }

      // Full refresh to get accurate they_follow_you status
      await refreshLists();
    } catch (error) {
      console.error("Error toggling follow:", error);
      // Revert optimistic update on error
      await refreshLists();
    } finally {
      setPending(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  // Determine button state based on Instagram logic
  const getButtonConfig = (user: Follower, isFollowingTab: boolean) => {
    const targetUserId = isFollowingTab ? user.follower_user_id : user.user_id;
    const youFollowThem = user.is_following || false;
    const theyFollowYou = user.they_follow_you || false;

    let buttonLabel = "";
    let buttonAction: (() => void) | null = null;
    let isActive = false;

    // Instagram logic
    if (youFollowThem) {
      // Case C: You already follow them
      buttonLabel = "Following";
      buttonAction = () => toggleFollow(targetUserId, false); // Unfollow
      isActive = true;
    } else if (theyFollowYou) {
      // Case B: They follow you, but you don't follow back
      buttonLabel = "Follow Back";
      buttonAction = () => toggleFollow(targetUserId, true); // Follow
      isActive = false;
    } else {
      // Case A: No relationship
      buttonLabel = "Follow";
      buttonAction = () => toggleFollow(targetUserId, true); // Follow
      isActive = false;
    }

    return { buttonLabel, buttonAction, isActive };
  };

  if (!userId) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0f172a"
      }}>
        <div style={{ textAlign: "center", color: "#94a3b8", fontSize: 22 }}>
          Please log in to see your followers
        </div>
      </div>
    );
  }

  const activeList = tab === "following" ? following : followers;
  const isFollowingTab = tab === "following";

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--global-background)",
      color: "#fff"
    }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>

        {/* HEADER */}
        <div style={{
          position: "sticky",
          top: 0,
          background: "rgba(15, 23, 42, 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #1e293b",
          zIndex: 10
        }}>
          <div style={{ padding: "18px 24px" }}>
            <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", margin: 0 }}>
              Connections
            </h1>
          </div>

          {/* TAB BAR */}
          <div style={{ display: "flex" }}>
            <button
              onClick={() => setTab("following")}
              style={{
                flex: 1,
                padding: "18px 0",
                fontSize: 18,
                fontWeight: 700,
                color: tab === "following" ? "#fff" : "#94a3b8",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                position: "relative"
              }}
            >
              {following.length} Following
              {tab === "following" && (
                <div style={{
                  position: "absolute",
                  bottom: 0, left: 0, right: 0,
                  height: 3,
                  background: "#3b82f6"
                }} />
              )}
            </button>

            <button
              onClick={() => setTab("followers")}
              style={{
                flex: 1,
                padding: "18px 0",
                fontSize: 18,
                fontWeight: 700,
                color: tab === "followers" ? "#fff" : "#94a3b8",
                background: "transparent",
                border: "none",
                cursor: "pointer",
                position: "relative"
              }}
            >
              {followers.length} Followers
              {tab === "followers" && (
                <div style={{
                  position: "absolute",
                  bottom: 0, left: 0, right: 0,
                  height: 3,
                  background: "#3b82f6"
                }} />
              )}
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ padding: "16px 24px" }}>
          {loading && (
            <div style={{ textAlign: "center", padding: 40 }}>Loading...</div>
          )}

          {!loading && activeList.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#94a3b8" }}>
              {tab === "following"
                ? "You're not following anyone yet"
                : "No followers yet"}
            </div>
          )}

          <div>
            {activeList.map(user => {
              const targetUserId = isFollowingTab ? user.follower_user_id : user.user_id;
              const name = user.username ?? user.email;
              
              const { buttonLabel, buttonAction, isActive } = getButtonConfig(user, isFollowingTab);

              return (
                <div key={user.follower_id} style={{
                  padding: "20px 16px",
                  display: "flex",
                  alignItems: "center",
                  borderBottom: "1px solid #1e293b",
                  gap: 20
                }}>
                  <Link href={`/profiles/${targetUserId}`}>
                    <div style={{
                      width: 56, height: 56,
                      borderRadius: "50%",
                      background: "#e0c3fc",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 700,
                      fontSize: 20,
                      color: "#0f172a"
                    }}>{getInitials(name)}</div>
                  </Link>

                  <div style={{ flex: 1 }}>
                    <Link href={`/profiles/${targetUserId}`}>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>
                        {name}
                      </div>
                    </Link>
                    {user.bio && (
                      <div style={{ color: "#cbd5e1", fontSize: 14 }}>
                        {user.bio}
                      </div>
                    )}
                  </div>

                  {/* BUTTON */}
                  {buttonAction && (
                    <button
                      onClick={buttonAction}
                      disabled={pending[targetUserId]}
                      style={{
                        padding: "10px 18px",
                        borderRadius: 10,
                        border: isActive ? "1px solid #374151" : "1px solid #3b82f6",
                        background: isActive ? "transparent" : "#3b82f6",
                        color: isActive ? "#fff" : "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                        minWidth: 110,
                        opacity: pending[targetUserId] ? 0.7 : 1
                      }}
                    >
                      {pending[targetUserId] ? "..." : buttonLabel}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}