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
  const [pendingFollows, setPendingFollows] = useState<{[key: number]: boolean}>({});

  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    Promise.all([
      fetch(`${API_BASE}/api/followers/following/${userId}`).then(res => res.json()),
      fetch(`${API_BASE}/api/followers/followers/${userId}`).then(res => res.json())
    ])
      .then(([followingData, followersData]) => {
        setFollowing(Array.isArray(followingData) ? followingData : []);
        setFollowers(Array.isArray(followersData) ? followersData : []);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  const handleFollowToggle = async (targetUserId: number, follow: boolean) => {
    setPendingFollows(prev => ({ ...prev, [targetUserId]: true }));

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

      // Refresh both lists
      const [followingRes, followersRes] = await Promise.all([
        fetch(`${API_BASE}/api/followers/following/${userId}`),
        fetch(`${API_BASE}/api/followers/followers/${userId}`)
      ]);

      const followingData = await followingRes.json();
      const followersData = await followersRes.json();

      setFollowing(Array.isArray(followingData) ? followingData : []);
      setFollowers(Array.isArray(followersData) ? followersData : []);
    } catch (error) {
      console.error("Error toggling follow:", error);
    } finally {
      setPendingFollows(prev => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleRemoveFollower = async (followerUserId: number) => {
    setPendingFollows(prev => ({ ...prev, [followerUserId]: true }));

    try {
      await fetch(`${API_BASE}/api/followers/remove`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          user_id: userId, 
          follower_user_id: followerUserId 
        }),
      });

      // Refresh both lists
      const [followingRes, followersRes] = await Promise.all([
        fetch(`${API_BASE}/api/followers/following/${userId}`),
        fetch(`${API_BASE}/api/followers/followers/${userId}`)
      ]);

      const followingData = await followingRes.json();
      const followersData = await followersRes.json();

      setFollowing(Array.isArray(followingData) ? followingData : []);
      setFollowers(Array.isArray(followersData) ? followersData : []);
    } catch (error) {
      console.error("Error removing follower:", error);
    } finally {
      setPendingFollows(prev => ({ ...prev, [followerUserId]: false }));
    }
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

  return (
    <div style={{ 
      minHeight: "100vh", 
      background: "var(--global-background)", 
      color: "#fff" 
    }}>
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        {/* Header */}
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
          {/* Tab Bar */}
          <div style={{ display: "flex", borderBottom: "1px solid #1e293b" }}>
            <button
              onClick={() => setTab("following")}
              style={{
                flex: 1,
                padding: "18px 0",
                fontSize: 18,
                fontWeight: 700,
                position: "relative",
                background: "transparent",
                border: "none",
                color: tab === "following" ? "#fff" : "#94a3b8",
                cursor: "pointer",
                transition: "color 0.2s"
              }}
            >
              <span>{following.length} Following</span>
              {tab === "following" && (
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
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
                position: "relative",
                background: "transparent",
                border: "none",
                color: tab === "followers" ? "#fff" : "#94a3b8",
                cursor: "pointer",
                transition: "color 0.2s"
              }}
            >
              <span>{followers.length} Followers</span>
              {tab === "followers" && (
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: "#3b82f6"
                }} />
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: "16px 24px" }}>
          {loading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "48px 0" }}>
              <div style={{
                width: 40,
                height: 40,
                border: "3px solid #334155",
                borderTopColor: "#3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite"
              }} />
            </div>
          )}
          
          {!loading && activeList.length === 0 && (
            <div style={{ textAlign: "center", padding: "64px 0" }}>
              <div style={{ color: "#94a3b8", fontSize: 18 }}>
                {tab === "following" 
                  ? "You're not following anyone yet" 
                  : "No followers yet"}
              </div>
            </div>
          )}

          <div>
            {activeList.map(f => {
              // Get the profile user ID based on current tab
              const profileUserId = tab === "following" ? f.user_id : f.follower_user_id;
              const displayName = f.username ?? f.email;
              
              return (
                <div
                  key={f.follower_id}
                  style={{
                    padding: "20px 16px",
                    display: "flex",
                    alignItems: "center",
                    gap: 24,
                    borderBottom: "1px solid #1e293b",
                    transition: "background 0.2s",
                    fontSize: 18,
                    borderRadius: "12px",
                    marginBottom: "8px",
                    background: "rgba(30, 41, 59, 0.5)"
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(30, 41, 59, 0.8)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(30, 41, 59, 0.5)"}
                >
                  {/* Avatar */}
                  <Link href={`/profiles/${profileUserId}`} style={{ textDecoration: "none" }}>
                    <div style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "linear-gradient(135deg, #b2e4ff 0%, #e0c3fc 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0f172a",
                      fontWeight: 700,
                      fontSize: 24,
                      flexShrink: 0,
                      cursor: "pointer",
                      transition: "transform 0.2s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                    >
                      {getInitials(displayName)}
                    </div>
                  </Link>

                  {/* User Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/profiles/${profileUserId}`} style={{ textDecoration: "none" }}>
                      <div style={{
                        fontWeight: 700,
                        fontSize: 20,
                        color: "#fff",
                        transition: "color 0.2s",
                        cursor: "pointer"
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = "#60a5fa"}
                      onMouseLeave={e => e.currentTarget.style.color = "#fff"}
                      >
                        {displayName}
                      </div>
                    </Link>
                    {f.bio && (
                      <div style={{
                        color: "#cbd5e1",
                        fontSize: 16,
                        marginTop: 4,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap"
                      }}>
                        {f.bio}
                      </div>
                    )}
                    <div style={{ color: "#94a3b8", fontSize: 14, marginTop: 2 }}>
                      Since {new Date(f.since).toLocaleDateString('en-US', { 
                        month: 'short', 
                        year: 'numeric' 
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        a {
          text-decoration: none;
        }
        
        button:disabled {
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}