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

export default function FollowersPage() {
  const { data: session } = useSession();
  const userId = (session?.user as any)?.user_id ?? (session?.user as any)?.id;
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