"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Profile = {
  user_id: number;
  age?: number;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  timezone?: string;
  bio?: string;
};

export default function SuggestedProfiles() {
  const { data: session } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [followed, setFollowed] = useState<number[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<Profile[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user?.id) {
      // Fetch suggested profiles
      fetch(`http://localhost:8000/api/profiles/suggested/${session.user.id}`)
        .then(res => res.json())
        .then(setProfiles);
      // Fetch currently followed profiles
      fetch(`http://localhost:8000/api/followers/following_profiles/${session.user.id}`)
        .then(res => res.json())
        .then(setFollowingProfiles);
    }
  }, [session?.user?.id]);

  const handleFollow = async (profileUserId: number) => {
    setError("");
    const res = await fetch("http://localhost:8000/api/followers/page", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: session?.user?.id,
        follower_user_id: profileUserId,
      }),
    });
    if (res.ok) {
      setFollowed(prev => [...prev, profileUserId]);
      // Optionally refresh followingProfiles
      fetch(`http://localhost:8000/api/followers/following_profiles/${session.user.id}`)
        .then(res => res.json())
        .then(setFollowingProfiles);
    } else {
      const data = await res.json();
      setError(data.detail || "Failed to follow user");
    }
  };

  if (!session?.user) return null;

  return (
    <div style={{
      background: "#181c24",
      borderRadius: 18,
      boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
      padding: 24,
      color: "#fff",
      fontFamily: "Inter, sans-serif",
      margin: "32px 0"
    }}>
      {/* Currently Following Bar */}
      {followingProfiles.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{
            background: "#232b3a",
            color: "#fff",
            borderRadius: 8,
            padding: "6px 16px",
            fontWeight: 700,
            fontSize: 15,
            letterSpacing: 1,
            marginBottom: 8,
            display: "inline-block"
          }}>
            You're Following
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {followingProfiles.map(fp => (
              <li key={fp.user_id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "8px 0", borderBottom: "1px solid #232b3a"
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "#6c47ff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: 14, color: "#fff"
                }}>
                  {fp.user_id}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    User #{fp.user_id}
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa" }}>
                    {fp.bio || <span style={{ color: "#444" }}>No bio yet.</span>}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Suggested Followers Bar */}
      <div style={{
        background: "var(--accent, #6c47ff)",
        color: "#fff",
        borderRadius: 8,
        padding: "6px 16px",
        fontWeight: 700,
        fontSize: 15,
        letterSpacing: 1,
        marginBottom: 18,
        display: "inline-block"
      }}>
        Suggested Followers
      </div>
      <h3 style={{ fontWeight: 700, fontSize: 22, marginBottom: 16, letterSpacing: 1 }}>
        Suggested Profiles to Follow
      </h3>
      {profiles.length === 0 ? (
        <div style={{ color: "#aaa" }}>No suggestions right now.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {profiles.map(p => (
            <li key={p.user_id} style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: "14px 0", borderBottom: "1px solid #232b3a"
            }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "linear-gradient(135deg, #6c47ff 60%, #2e335a 100%)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: 20, color: "#fff"
              }}>
                {p.user_id}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 16 }}>
                  User #{p.user_id}
                </div>
                <div style={{ fontSize: 14, color: "#aaa" }}>
                  {p.bio || <span style={{ color: "#444" }}>No bio yet.</span>}
                </div>
              </div>
              <button
                disabled={followed.includes(p.user_id)}
                onClick={() => handleFollow(p.user_id)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: followed.includes(p.user_id) ? "#444" : "var(--accent, #6c47ff)",
                  color: "#fff",
                  fontWeight: 600,
                  cursor: followed.includes(p.user_id) ? "not-allowed" : "pointer"
                }}
              >
                {followed.includes(p.user_id) ? "Following" : "Follow"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <div style={{ color: "#ff6b6b", marginTop: 10, fontSize: 14 }}>{error}</div>}
    </div>
  );
}