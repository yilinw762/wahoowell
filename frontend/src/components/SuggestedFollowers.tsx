"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/libs/api";

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

type SessionUser = {
  user_id?: number | string;
  id?: number | string;
  sub?: number | string;
};

const deriveUserId = (user?: SessionUser): number | undefined => {
  if (!user) return undefined;
  const candidates = [user.user_id, user.id, user.sub];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string" && candidate.trim()) {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
};

const toErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message;
  return fallback;
};

export default function SuggestedFollowers() {
  const { data: session } = useSession();
  const userId = deriveUserId(session?.user as SessionUser | undefined);

  const [profiles, setProfiles] = useState<ProfileWithFollowStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestions = async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data } = await api.get<ProfileWithFollowStatus[]>(
        `/api/followers/suggestions/${userId}`
      );
      setProfiles(data);
    } catch (err: unknown) {
      console.error(err);
      setError(toErrorMessage(err, "Unknown error fetching suggestions."));
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetId: number, follow: boolean) => {
    const url = follow ? "/api/followers/add" : "/api/followers/unfollow";

    try {
      await api.post(url, {
        user_id: userId,
        follower_user_id: targetId,
      });

      // Refresh suggestions after follow/unfollow
      fetchSuggestions();
    } catch (err: unknown) {
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