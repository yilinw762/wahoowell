"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type ProfileWithFollowStatus = {
  user_id: number;
  username?: string;
  email: string;
  age?: number;
  gender?: string;
  height_cm?: number;
  weight_kg?: number;
  bio?: string;
  timezone?: string;
  is_following: boolean;
};

function getInitials(name?: string, email?: string) {
  if (name && name.trim()) {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

export default function SuggestedFollowers() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.user_id ?? (session?.user as any)?.id;

  const [profiles, setProfiles] = useState<ProfileWithFollowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const BACKEND_URL = "http://localhost:8000"; // adjust if your FastAPI runs elsewhere

  const fetchSuggestions = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${BACKEND_URL}/api/followers/suggestions/${userId}`);

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Failed to fetch: ${text}`);
      }

      const data: ProfileWithFollowStatus[] = await res.json();
      setProfiles(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Unknown error fetching suggestions.");
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetId: number, follow: boolean) => {
    const url = follow ? `${BACKEND_URL}/api/followers/add` : `${BACKEND_URL}/api/followers/unfollow`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, follower_user_id: targetId }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Follow/unfollow failed: ${text}`);
      }

      // Refresh suggestions after follow/unfollow
      fetchSuggestions();
    } catch (err: any) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (!userId) return <p>Please log in to see suggestions.</p>;

  return (
    <div className="card mt-4" style={{ padding: 24 }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>Suggested Follows</h3>
      <hr className="sep" />
      {loading && <p>Loading suggestions...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && profiles.length === 0 && !error && <p>No suggested users available.</p>}
      {!loading && profiles.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {profiles.map((u) => (
            <li
              key={u.user_id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 0",
                borderBottom: "1px solid #f0f0f0",
                transition: "background 0.2s",
                gap: 12,
              }}
              className="suggested-follower-row"
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg, #b2e4ff 0%, #e0c3fc 100%)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700,
                    fontSize: 20,
                    color: "#333",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                  }}
                >
                  {getInitials(u.username, u.email)}
                </div>
                <div>
                  <Link href={`/profiles/${u.user_id}`}>
                    <span style={{ fontWeight: 600, fontSize: 16, color: "#fff", cursor: "pointer" }}>
                      {u.username ?? u.email}
                    </span>
                  </Link>
                  {u.bio && (
                    <div style={{ fontSize: "0.92em", color: "#ccc", marginTop: 2, maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {u.bio}
                    </div>
                  )}
                </div>
              </div>
              <button
                className="btn btn-primary btn-sm"
                style={{
                  background: u.is_following ? "#f3f3f3" : "linear-gradient(90deg,#6ee7b7,#3b82f6)",
                  color: u.is_following ? "#333" : "#fff",
                  fontWeight: 600,
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 22px",
                  cursor: "pointer",
                  boxShadow: u.is_following ? "none" : "0 2px 8px rgba(59,130,246,0.08)",
                  transition: "all 0.18s",
                  outline: "none",
                }}
                onClick={() => handleFollow(u.user_id, !u.is_following)}
                onMouseOver={e => {
                  if (u.is_following) (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2";
                }}
                onMouseOut={e => {
                  if (u.is_following) (e.currentTarget as HTMLButtonElement).style.background = "#f3f3f3";
                }}
              >
                {u.is_following ? "Unfollow" : "Follow"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}