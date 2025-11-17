"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

type Profile = {
  age?: number | "";
  gender?: string;
  height_cm?: number | "";
  weight_kg?: number | "";
  timezone?: string;
  bio?: string;
};

type SessionUser = {
  id?: number | string;
  user_id?: number | string;
  sub?: number | string;
};

const deriveUserId = (user?: SessionUser | null): number | undefined => {
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

export default function ProfileForm() {
  const { data: session } = useSession();

  const userId = deriveUserId(session?.user as SessionUser | undefined);

  const [form, setForm] = useState<Profile>({
    age: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    timezone: "",
    bio: "",
  });

  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    fetch(`http://127.0.0.1:8000/api/profiles/${userId}`)
      .then(res => res.json())
      .then((data: Profile) => {
        setForm({
          age: data.age ?? "",
          gender: data.gender ?? "",
          height_cm: data.height_cm ?? "",
          weight_kg: data.weight_kg ?? "",
          timezone: data.timezone ?? "",
          bio: data.bio ?? "",
        });
      });
  }, [userId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      alert("You must be logged in to update your profile.");
      return;
    }
    const payload = {
      ...form,
      age: form.age === "" ? null : Number(form.age),
      height_cm: form.height_cm === "" ? null : Number(form.height_cm),
      weight_kg: form.weight_kg === "" ? null : Number(form.weight_kg),
    };
    const res = await fetch(`http://127.0.0.1:8000/api/profiles/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

  const data = await res.json();
  setResult(data as Record<string, unknown>);
    setMessage("Profile updated!");
  };

  if (!userId) return <div>You must be logged in to update your profile.</div>;

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
      <h2 style={{ marginTop: 0, marginBottom: 8, fontSize: 32 }}>
        Profile
      </h2>
      <p style={{ color: "#8b92a7", marginBottom: 24, fontSize: 15 }}>
        Update your profile information.
      </p>
      <div className="card" style={{ padding: 32 }}>
        <form onSubmit={handleSubmit}>
          <div style={rowStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>Age</label>
              <input
                className="input"
                name="age"
                type="number"
                placeholder="Age"
                value={form.age}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Gender</label>
              <select
                className="input"
                name="gender"
                value={form.gender}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
              >
                <option value="">Select</option>
                <option value="M">Male</option>
                <option value="F">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>Height (cm)</label>
              <input
                className="input"
                name="height_cm"
                type="number"
                placeholder="Height (cm)"
                value={form.height_cm}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Weight (kg)</label>
              <input
                className="input"
                name="weight_kg"
                type="number"
                placeholder="Weight (kg)"
                value={form.weight_kg}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
              />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={groupStyle}>
              <label style={labelStyle}>Timezone</label>
              <input
                className="input"
                name="timezone"
                placeholder="Timezone"
                value={form.timezone}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15 }}
              />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Bio</label>
              <textarea
                className="input"
                name="bio"
                placeholder="Bio"
                value={form.bio}
                onChange={handleChange}
                style={{ width: "100%", padding: "12px 16px", fontSize: 15, minHeight: 60 }}
              />
            </div>
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
                transition: "all 0.2s",
              }}
            >
              Save
            </button>
          </div>
          {message && (
            <div
              style={{
                marginTop: 16,
                fontSize: 14,
                color: "#7dd97c",
              }}
            >
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}