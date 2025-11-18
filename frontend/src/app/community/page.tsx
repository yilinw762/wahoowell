"use client";
import CommunityFeed from "@/src/components/CommunityFeed";
import Leaderboard from "@/src/components/Leaderboard";
import SuggestedFollowers from "@/src/components/SuggestedFollowers";

export default function CommunityPage() {
  return (
    <>
      <h1 style={{ marginTop: 0 }}>Community</h1>
      <div className="row">
        <div className="col-8">
          <div className="card">
            <h3 style={{ marginTop: 0 }}>Feed</h3>
            <hr className="sep" />
            <CommunityFeed />
          </div>
        </div>
        <div className="col-4">
          <Leaderboard />
          <SuggestedFollowers />
        </div>
      </div>
    </>
  );
}