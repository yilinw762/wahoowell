"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

type DataEntryForm = {
  date: string;              // YYYY-MM-DD
  steps: string;
  heart_rate_avg: string;
  sleep_hours: string;
  calories_burned: string;
  exercise_minutes: string;
  main_exercise: string;
  goal: string;
};

const emptyForm: DataEntryForm = {
  date: "",
  steps: "",
  heart_rate_avg: "",
  sleep_hours: "",
  calories_burned: "",
  exercise_minutes: "",
  main_exercise: "",
  goal: "",
};

export default function DataEntryPage() {
  const { data: session, status } = useSession();
  const userId = (session?.user as any)?.id as number | undefined;

  const [form, setForm] = useState<DataEntryForm>(emptyForm);
  const [loadingDay, setLoadingDay] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Set default date to today on first render
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;

    setForm((prev) => ({
      ...prev,
      date: prev.date || todayStr,
    }));
  }, []);

  // Fetch existing entry whenever user + date are ready
  useEffect(() => {
    if (status !== "authenticated" || !userId || !form.date) return;

    const fetchExisting = async () => {
      setLoadingDay(true);
      setMessage(null);

      try {
        const params = new URLSearchParams({
          user_id: String(userId),
          date: form.date,
        });

        const res = await fetch(
          `http://127.0.0.1:8000/api/healthlogs?${params.toString()}`
        );
        if (!res.ok) throw new Error("Failed to fetch day data");

        const data = await res.json();

        if (data === null) {
          // No entry yet for that day – clear fields but keep date
          setForm((prev) => ({
            ...emptyForm,
            date: prev.date,
          }));
        } else {
          setForm({
            date: data.date,
            steps: data.steps != null ? String(data.steps) : "",
            heart_rate_avg:
              data.heart_rate_avg != null ? String(data.heart_rate_avg) : "",
            sleep_hours:
              data.sleep_hours != null ? String(data.sleep_hours) : "",
            calories_burned:
              data.calories_burned != null
                ? String(data.calories_burned)
                : "",
            exercise_minutes:
              data.exercise_minutes != null
                ? String(data.exercise_minutes)
                : "",
            main_exercise: data.main_exercise ?? "",
            goal: data.goal ?? "",
          });
        }
      } catch (err) {
        console.error(err);
        setMessage("Could not load data for this day.");
      } finally {
        setLoadingDay(false);
      }
    };

    fetchExisting();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, userId, form.date]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setForm((prev) => ({ ...prev, date: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      setMessage("You must be logged in to submit data.");
      return;
    }

    setSaving(true);
    setMessage(null);

    const payload = {
      user_id: userId,
      date: form.date,
      steps: form.steps ? Number(form.steps) : null,
      heart_rate_avg: form.heart_rate_avg
        ? Number(form.heart_rate_avg)
        : null,
      sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
      calories_burned: form.calories_burned
        ? Number(form.calories_burned)
        : null,
      exercise_minutes: form.exercise_minutes
        ? Number(form.exercise_minutes)
        : null,
      main_exercise: form.main_exercise || null,
      goal: form.goal || null,
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/api/healthlogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to save");

      await res.json();
      setMessage("Saved successfully!");
    } catch (err) {
      console.error(err);
      setMessage("Error saving data.");
    } finally {
      setSaving(false);
    }
  };

  const labelStyle = {
    marginBottom: 8,
    display: "block",
    fontWeight: 500,
  };

  const groupStyle = {
    display: "flex",
    flexDirection: "column" as const,
    flex: 1,
    minWidth: 0,
    marginBottom: 0,
  };

  const rowStyle = {
    display: "flex",
    gap: 24,
    marginBottom: 24,
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 32 }}>
        Data Entry
      </h1>
      <p style={{ color: "#8b92a7", marginBottom: 24, fontSize: 15 }}>
        Select a day and update your health log, main exercise, and goal.
      </p>

      <div className="card" style={{ padding: 32 }}>
        {/* Date selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={labelStyle}>Select date</label>
          <input
            className="input"
            type="date"
            name="date"
            value={form.date}
            onChange={handleDateChange}
            style={{ width: "220px", padding: "10px 14px", fontSize: 15 }}
          />
          {loadingDay && (
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "#9aa3c0",
              }}
            >
              Loading data for this day...
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div style={rowStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>Steps</label>
              <input
                className="input"
                name="steps"
                placeholder="Steps"
                value={form.steps}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Heart rate avg (bpm)</label>
              <input
                className="input"
                name="heart_rate_avg"
                placeholder="Heart rate avg"
                value={form.heart_rate_avg}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
              />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>Sleep hours</label>
              <input
                className="input"
                name="sleep_hours"
                placeholder="Sleep hours"
                value={form.sleep_hours}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Calories burned</label>
              <input
                className="input"
                name="calories_burned"
                placeholder="Calories burned"
                value={form.calories_burned}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
              />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>Main exercise</label>
              <input
                className="input"
                name="main_exercise"
                placeholder="e.g., Running, Yoga, Weightlifting"
                value={form.main_exercise}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Exercise time (minutes)</label>
              <input
                className="input"
                name="exercise_minutes"
                placeholder="Exercise minutes"
                value={form.exercise_minutes}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
              />
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Goal for this day</label>
            <input
              className="input"
              name="goal"
              placeholder="e.g., Maintain health, run 5k, stretch 10 minutes..."
              value={form.goal}
              onChange={handleChange}
              style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
            <button
              className="button"
              type="submit"
              disabled={saving || !userId}
              style={{
                flex: 1,
                padding: "14px 24px",
                fontSize: 15,
                fontWeight: 600,
                background: "var(--accent)",
                border: "none",
                borderRadius: 8,
                cursor: saving || !userId ? "not-allowed" : "pointer",
                opacity: saving || !userId ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {saving ? "Saving..." : "Save Day"}
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() =>
                setForm((prev) => ({
                  ...emptyForm,
                  date: prev.date,
                }))
              }
              style={{
                padding: "14px 24px",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Clear Fields
            </button>
          </div>

          {message && (
            <div
              style={{
                marginTop: 16,
                fontSize: 14,
                color:
                  message.toLowerCase().includes("error") ||
                  message.toLowerCase().includes("fail")
                    ? "#ff6b81"
                    : "#7dd97c",
              }}
            >
              {message}
            </div>
          )}

          {!userId && status !== "loading" && (
            <div
              style={{
                marginTop: 8,
                fontSize: 13,
                color: "#7dd97c",
              }}
            >
              You must be logged in to submit data.
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
