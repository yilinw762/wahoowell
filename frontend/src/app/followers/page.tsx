"use client";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import Link from "next/link";

type Follower = {
  follower_id: number;
  user_id: number;
  follower_user_id: number;
  since: string;
};

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

export default function FollowersPage() {
  const { data: session } = useSession();
  const userId = deriveUserId(session?.user as SessionUser | undefined);
  const [followers, setFollowers] = useState<Follower[]>([]);

  useEffect(() => {
    if (userId) {
      fetch(`/api/followers/list/${userId}`)
        .then(res => res.json())
        .then(setFollowers);
    }
  }, [userId]);

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <h2>People You Follow</h2>
      <ul>
        {followers.map(f => (
          <li key={f.follower_id}>
            <Link href={`/profiles/${f.follower_user_id}`}>
              User ID: {f.follower_user_id}
            </Link> (since {f.since})
          </li>
        ))}
      </ul>
    </div>
  );
}