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

const initialData: DashboardData = {
  steps_today: 0,
  calories_today: 0,
  sleep_hours_today: 0,
  weekly_steps: [0, 0, 0, 0, 0, 0, 0],
  latest_goal_description: null,
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id as number | undefined;

  const [data, setData] = useState<DashboardData>(initialData);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const res = await fetch(`http://127.0.0.1:8000/api/dashboard/${userId}`);
        if (!res.ok) throw new Error("Failed to fetch dashboard");
        const json = await res.json();
        setData(json);
      } catch (err) {
        console.error(err);
        // keep default zeros if it fails
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [userId]);

  return (
    <>
      <h1 style={{ marginTop: 0 }}>Dashboard</h1>

      <TopPanel
        stepsToday={data.steps_today}
        caloriesToday={data.calories_today}
        sleepHoursToday={data.sleep_hours_today}
      />

      <div className="row" style={{ marginTop: 16 }}>
        <div className="col-8">
          <div className="card">
            <StepsChart weeklySteps={data.weekly_steps} />
            {loading && (
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

        <div className="col-4">
          <div className="card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 8 }}>Recent goal</h3>
            <hr className="sep" />
            <p style={{ fontSize: 14, color: "#c4cadb", marginTop: 12 }}>
              {data.latest_goal_description
                ? data.latest_goal_description
                : "No goal set yet. Create one on the data entry page!"}
            </p>
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
