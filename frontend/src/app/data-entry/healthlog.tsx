"use client";
import { useState } from "react";

export default function HealthLogForm() {
  const [form, setForm] = useState({
    user_id: "",
    log_date: "",
    steps: "",
    heart_rate_avg: "",
    sleep_hours: "",
    calories_burned: "",
    exercise_minutes: "",
    stress_level: "",
    notes: "",
  });
  const [result, setResult] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prepare payload, convert types as needed
    const payload = {
      user_id: Number(form.user_id),
      log_date: form.log_date,
      steps: form.steps ? Number(form.steps) : null,
      heart_rate_avg: form.heart_rate_avg ? Number(form.heart_rate_avg) : null,
      sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
      calories_burned: form.calories_burned ? Number(form.calories_burned) : null,
      exercise_minutes: form.exercise_minutes ? Number(form.exercise_minutes) : null,
      stress_level: form.stress_level ? Number(form.stress_level) : null,
      notes: form.notes || null,
    };
    const res = await fetch("http://127.0.0.1:8000/api/healthlogs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setResult(await res.json());
  };

  return (
    <div>
      <h2>Anonymous Health Log Entry</h2>
      <form onSubmit={handleSubmit}>
        <input name="user_id" placeholder="User ID" value={form.user_id} onChange={handleChange} required /><br />
        <input name="log_date" type="date" value={form.log_date} onChange={handleChange} required /><br />
        <input name="steps" placeholder="Steps" value={form.steps} onChange={handleChange} /><br />
        <input name="heart_rate_avg" placeholder="Heart Rate Avg" value={form.heart_rate_avg} onChange={handleChange} /><br />
        <input name="sleep_hours" placeholder="Sleep Hours" value={form.sleep_hours} onChange={handleChange} /><br />
        <input name="calories_burned" placeholder="Calories Burned" value={form.calories_burned} onChange={handleChange} /><br />
        <input name="exercise_minutes" placeholder="Exercise Minutes" value={form.exercise_minutes} onChange={handleChange} /><br />
        <input name="stress_level" placeholder="Stress Level (1-10)" value={form.stress_level} onChange={handleChange} /><br />
        <input name="notes" placeholder="Notes" value={form.notes} onChange={handleChange} /><br />
        <button type="submit">Submit</button>
      </form>
      {result && (
        <pre>{JSON.stringify(result, null, 2)}</pre>
      )}
    </div>
  );
}