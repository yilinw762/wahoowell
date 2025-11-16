"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

type Follower = {
  follower_id: number;
  user_id: number;
  follower_user_id: number;
  since: string;
};

export default function FollowersPage() {
  const { data: session } = useSession();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [followerUserId, setFollowerUserId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/followers/list/${session.user.id}`)
        .then(res => res.json())
        .then(setFollowers);
    }
  }, [session?.user?.id]);

  const addFollower = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/followers/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: session?.user?.id,
        follower_user_id: Number(followerUserId),
      }),
    });
    if (res.ok) {
      setFollowerUserId("");
      fetch(`/api/followers/list/${session?.user?.id}`)
        .then(res => res.json())
        .then(setFollowers);
    } else {
      const data = await res.json();
      setError(data.detail || "Failed to add follower");
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <h2>Your Followers</h2>
      <ul>
        {followers.map(f => (
            <li key={f.follower_id}>
  Follower User ID: {f.follower_user_id} (since {f.since})
</li>        ))}
      </ul>
      <form onSubmit={addFollower}>
        <input
          type="number"
          placeholder="Follower's User ID"
          value={followerUserId}
          onChange={e => setFollowerUserId(e.target.value)}
          required
        />
        <button type="submit">Add Follower</button>
      </form>
      {error && <div style={{ color: "red" }}>{error}</div>}
    </div>
  );
}