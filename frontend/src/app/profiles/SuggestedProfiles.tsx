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

async function getInternalUserId(email: string): Promise<number | null> {
  const res = await fetch(`http://localhost:8000/api/users/by-email?email=${encodeURIComponent(email)}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.user_id;
}

export default function SuggestedProfiles() {
  const { data: session } = useSession();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [followed, setFollowed] = useState<number[]>([]);
  const [error, setError] = useState("");
  const [internalUserId, setInternalUserId] = useState<number | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      getInternalUserId(session.user.email).then(setInternalUserId);
    }
  }, [session?.user?.email]);

  useEffect(() => {
    if (internalUserId) {
      fetch(`http://localhost:8000/api/profiles/suggested/${internalUserId}`)
        .then(res => res.json())
        .then(setProfiles);
    }
  }, [internalUserId]);

  const handleFollow = async (profileUserId: number) => {
    setError("");
    if (!internalUserId) return;
    const res = await fetch("http://localhost:8000/api/followers/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: internalUserId,
        follower_user_id: profileUserId,
      }),
    });
    if (res.ok) {
      setFollowed(prev => [...prev, profileUserId]);
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