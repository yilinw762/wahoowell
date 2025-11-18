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
  }, [userId]);

  if (!userId) return <p>Please log in to see suggestions.</p>;

  return (
    <div className="card mt-4">
      <h3 style={{ marginTop: 0 }}>Suggested Follows</h3>
      <hr className="sep" />
      {loading && <p>Loading suggestions...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}
      {!loading && profiles.length === 0 && !error && <p>No suggested users available.</p>}
      {!loading &&
        profiles.map((u) => (
          <div
            key={u.user_id}
            className="d-flex justify-content-between align-items-center mb-3"
          >
            <div>
              <Link href={`/profiles/${u.user_id}`}>
                <strong>{u.username ?? u.email}</strong>
              </Link>
              <div style={{ fontSize: "0.85em", color: "#888" }}>
                Age: {u.age ?? "-"} | Gender: {u.gender ?? "-"} | Height: {u.height_cm ?? "-"}cm | Weight: {u.weight_kg ?? "-"}kg
                {u.bio && <div>Bio: {u.bio}</div>}
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              style={{
                background: u.is_following ? "#eee" : "var(--accent)",
                color: u.is_following ? "#333" : "#fff",
                fontWeight: 600,
                border: "none",
                borderRadius: 8,
                padding: "6px 16px",
                cursor: "pointer"
              }}
              onClick={() => handleFollow(u.user_id, !u.is_following)}
            >
              {u.is_following ? "Unfollow" : "Follow"}
            </button>
          </div>
        ))}
    </div>
  );
}
