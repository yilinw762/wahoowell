"use client";

import { useState } from "react";

type Gender = "Male" | "Female" | "Non-binary" | "Prefer not to say";

export default function DataEntryPage() {
  const [age, setAge] = useState<number | "">("");
  const [gender, setGender] = useState<Gender>("Prefer not to say");
  const [weight, setWeight] = useState<number | "">("");
  const [height, setHeight] = useState<number | "">("");
  const [goal, setGoal] = useState("Maintain health");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { age, gender, weight, height, goal };
    alert("Submitted profile:\n" + JSON.stringify(payload, null, 2));
  };

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "32px 16px" }}>
      <h1 style={{ marginTop: 0, marginBottom: 8, fontSize: 32 }}>Data Entry</h1>
      <p style={{ color: "#8b92a7", marginBottom: 32, fontSize: 15 }}>
        Update your health profile information
      </p>

      <div className="card" style={{ padding: 32 }}>
        <form onSubmit={onSubmit}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, color: "var(--accent)" }}>
              Personal Information
            </h3>
            <div className="row" style={{ gap: 20 }}>
              <div className="col-6">
                <label className="label" style={{ marginBottom: 8, display: "block", fontWeight: 500 }}>
                  Age
                </label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={age}
                  onChange={e => setAge(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Enter your age"
                  style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
                />
              </div>
              <div className="col-6">
                <label className="label" style={{ marginBottom: 8, display: "block", fontWeight: 500 }}>
                  Gender
                </label>
                <select
                  className="select"
                  value={gender}
                  onChange={e => setGender(e.target.value as Gender)}
                  style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Non-binary</option>
                  <option>Prefer not to say</option>
                </select>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, color: "var(--accent)" }}>
              Body Metrics
            </h3>
            <div className="row" style={{ gap: 20 }}>
              <div className="col-6">
                <label className="label" style={{ marginBottom: 8, display: "block", fontWeight: 500 }}>
                  Weight (kg)
                </label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.1"
                  value={weight}
                  onChange={e => setWeight(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Enter your weight"
                  style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
                />
              </div>
              <div className="col-6">
                <label className="label" style={{ marginBottom: 8, display: "block", fontWeight: 500 }}>
                  Height (cm)
                </label>
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.1"
                  value={height}
                  onChange={e => setHeight(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Enter your height"
                  style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
                />
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 32 }}>
            <h3 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, color: "var(--accent)" }}>
              Health Goals
            </h3>
            <label className="label" style={{ marginBottom: 8, display: "block", fontWeight: 500 }}>
              Your Goal
            </label>
            <input
              className="input"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              placeholder="e.g., Lose weight, build endurance, improve flexibility"
              style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
            />
          </div>

          <div style={{ display: "flex", gap: 12, paddingTop: 8 }}>
            <button
              className="button"
              type="submit"
              style={{
                flex: 1,
                padding: "14px 24px",
                fontSize: 15,
                fontWeight: 600,
                background: "var(--accent)",
                border: "none",
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Save Profile
            </button>
            <button
              type="button"
              className="button ghost"
              onClick={() => {
                setAge("");
                setGender("Prefer not to say");
                setWeight("");
                setHeight("");
                setGoal("Maintain health");
              }}
              style={{
                padding: "14px 24px",
                fontSize: 15,
                fontWeight: 600,
                borderRadius: 8,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}