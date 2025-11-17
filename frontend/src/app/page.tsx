// src/app/dashboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import TopPanel from "@/src/components/TopPanel";
import StepsChart from "@/src/components/StepsChart";

type DashboardData = {
  steps_today: number;
  calories_today: number;
  sleep_hours_today: number;
  weekly_steps: number[];
  latest_goal_description: string | null;
};

const initialDashboard: DashboardData = {
  steps_today: 0,
  calories_today: 0,
  sleep_hours_today: 0,
  weekly_steps: [0, 0, 0, 0, 0, 0, 0],
  latest_goal_description: null,
};

// ---- Leaderboard types (match backend JSON) ----
type LeaderboardEntry = {
  user_id: number;
  username: string;
  steps: number;
  rank: number;
};

type LeaderboardResponse = {
  entries: LeaderboardEntry[];
  current_user_entry: LeaderboardEntry | null;
};

type SessionUser = {
  id?: number | string;
  user_id?: number | string;
  sub?: number | string;
};

const extractUserId = (user?: SessionUser | null): number | undefined => {
  if (!user) return undefined;

  const candidates = [user.id, user.user_id, user.sub];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const userId = extractUserId(session?.user as SessionUser | undefined);

  const [dashboard, setDashboard] = useState<DashboardData>(initialDashboard);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(
    null
  );
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState<string | null>(null);

  // ---- Fetch dashboard summary ----
  useEffect(() => {
    if (!userId) return;

    const fetchDashboard = async () => {
      setLoadingDashboard(true);
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/dashboard/${userId}`
        );
        if (!res.ok) throw new Error("Failed to fetch dashboard");
        const json = (await res.json()) as DashboardData;
        setDashboard(json);
      } catch (err) {
        console.error(err);
        // keep default zeros
      } finally {
        setLoadingDashboard(false);
      }
    };

    fetchDashboard();
  }, [userId]);

  // ---- Fetch leaderboard ----
  useEffect(() => {
    if (!userId) return;

    const fetchLeaderboard = async () => {
      setLoadingLeaderboard(true);
      setLeaderboardError(null);
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/api/leaderboard/${userId}`
        );
        if (!res.ok) {
          throw new Error("Failed to fetch leaderboard");
        }
        const json = (await res.json()) as LeaderboardResponse;
        setLeaderboard(json);
      } catch (err) {
        console.error(err);
        setLeaderboardError("Could not load leaderboard.");
      } finally {
        setLoadingLeaderboard(false);
      }
    };

    fetchLeaderboard();
  }, [userId]);

  // ---- Prepare leaderboard rows ----
  const topEntries = leaderboard?.entries ?? [];
  const me = leaderboard?.current_user_entry ?? null;

  const topTen = topEntries.slice(0, 10);

  const userInTopTen = me
    ? topTen.some((e) => e.user_id === me.user_id)
    : false;

  const showMyRowSeparately = me && !userInTopTen;

  const highlightStyle: React.CSSProperties = {
    background: "rgba(72, 115, 255, 0.12)",
  };

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>

      <TopPanel
        stepsToday={dashboard.steps_today}
        caloriesToday={dashboard.calories_today}
        sleepHoursToday={dashboard.sleep_hours_today}
      />

      <div className="row" style={{ marginTop: 16 }}>
        {/* Left side: Weekly steps chart */}
        <div className="col-8">
          <div className="card">
            <StepsChart weeklySteps={dashboard.weekly_steps} />
            {loadingDashboard && (
              <div
                style={{
                  marginTop: 8,
                  fontSize: 13,
                  color: "#9aa3c0",
                  padding: "0 24px 16px",
                }}
              >
                Loading dashboard data...
              </div>
            )}
          </div>
        </div>

        {/* Right side: Goal + Leaderboard */}
        <div
          className="col-4"
          style={{ display: "flex", flexDirection: "column", gap: 16 }}
        >
          {/* Recent goal card */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Recent goal</h3>
            <hr className="sep" />
            <p style={{ fontSize: 14, color: "#c4cadb", marginTop: 12 }}>
              {dashboard.latest_goal_description
                ? dashboard.latest_goal_description
                : "No goal set yet. Create one on the data entry page!"}
            </p>
          </div>

          {/* Leaderboard card */}
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Leaderboard</h3>
            <hr className="sep" />

            {loadingLeaderboard && (
              <p style={{ fontSize: 14, color: "#9aa3c0", marginTop: 12 }}>
                Loading leaderboard...
              </p>
            )}

            {!loadingLeaderboard && leaderboardError && (
              <p style={{ fontSize: 14, color: "#ff6b81", marginTop: 12 }}>
                {leaderboardError}
              </p>
            )}

            {!loadingLeaderboard &&
              !leaderboardError &&
              (!leaderboard || topEntries.length === 0) && (
                <p style={{ fontSize: 14, color: "#c4cadb", marginTop: 12 }}>
                  No friends yet. Follow someone to see today&apos;s rankings.
                </p>
              )}

            {!loadingLeaderboard &&
              !leaderboardError &&
              leaderboard &&
              topEntries.length > 0 && (
                <div
                  style={{
                    marginTop: 8,
                    maxHeight: 260,
                    overflowY: "auto",
                  }}
                >
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: 14,
                    }}
                  >
                    <thead>
                      <tr style={{ color: "#9aa3c0" }}>
                        <th
                          style={{
                            textAlign: "left",
                            paddingBottom: 8,
                            fontWeight: 500,
                          }}
                        >
                          Rank
                        </th>
                        <th
                          style={{
                            textAlign: "left",
                            paddingBottom: 8,
                            fontWeight: 500,
                          }}
                        >
                          Friend
                        </th>
                        <th
                          style={{
                            textAlign: "right",
                            paddingBottom: 8,
                            fontWeight: 500,
                          }}
                        >
                          Steps (today)
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {topTen.map((entry) => (
                        <tr
                          key={entry.user_id}
                          style={
                            me && entry.user_id === me.user_id
                              ? highlightStyle
                              : {}
                          }
                        >
                          <td style={{ padding: "4px 0" }}>#{entry.rank}</td>
                          <td style={{ padding: "4px 0" }}>
                            {entry.username}
                          </td>
                          <td
                            style={{
                              padding: "4px 0",
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {entry.steps.toLocaleString()}
                          </td>
                        </tr>
                      ))}

                      {showMyRowSeparately && me && (
                        <>
                          {/* separator row */}
                          <tr>
                            <td colSpan={3} style={{ padding: "6px 0" }}>
                              <div
                                style={{
                                  borderTop: "1px dashed #2d3448",
                                  margin: "4px 0",
                                }}
                              />
                            </td>
                          </tr>

                          {/* current user row */}
                          <tr key={me.user_id} style={highlightStyle}>
                            <td style={{ padding: "4px 0" }}>#{me.rank}</td>
                            <td style={{ padding: "4px 0" }}>
                              {me.username || "You"}
                            </td>
                            <td
                              style={{
                                padding: "4px 0",
                                textAlign: "right",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {me.steps.toLocaleString()}
                            </td>
                          </tr>
                        </>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>
      </div>

      {!userId && status !== "loading" && (
        <div style={{ marginTop: 16, fontSize: 14, color: "#ff6b81" }}>
          You must be logged in to see your dashboard.
        </div>
      )}
    </>
  );
}
