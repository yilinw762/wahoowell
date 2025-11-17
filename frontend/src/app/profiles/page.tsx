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

export default function ProfileForm() {
  const { data: session } = useSession();

  // Try all possible fields
  const userId =
    (session?.user as any)?.user_id ??
    (session?.user as any)?.id ??
    Number((session?.user as any)?.sub) ??
    undefined;

  console.log("SESSION:", session);
  console.log("userId:", userId);

  const [form, setForm] = useState<Profile>({
    age: "",
    gender: "",
    height_cm: "",
    weight_kg: "",
    timezone: "",
    bio: "",
  });

  const [result, setResult] = useState<any>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Fetch existing profile data
  useEffect(() => {
    if (!userId) return;
    fetch(`http://127.0.0.1:8000/api/profiles/${userId}`)
      .then(res => res.json())
      .then(data => {
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

    // Convert "" to null or numbers before sending
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
    setResult(data);
    setMessage("Profile updated!");
  };

  if (!userId) return <div>You must be logged in to update your profile.</div>;

  return (
    <div>
      <h2>Update Profile</h2>
      <form onSubmit={handleSubmit}>
        <input name="age" type="number" value={form.age} onChange={handleChange} placeholder="Age" /><br />
        <select name="gender" value={form.gender} onChange={handleChange}>
          <option value="">Gender</option>
          <option value="M">Male</option>
          <option value="F">Female</option>
          <option value="Other">Other</option>
        </select><br />
        <input name="height_cm" type="number" value={form.height_cm} onChange={handleChange} placeholder="Height (cm)" /><br />
        <input name="weight_kg" type="number" value={form.weight_kg} onChange={handleChange} placeholder="Weight (kg)" /><br />
        <input name="timezone" value={form.timezone} onChange={handleChange} placeholder="Timezone" /><br />
        <textarea name="bio" value={form.bio} onChange={handleChange} placeholder="Bio"></textarea><br />
        <button type="submit">Save</button>
      </form>
      {message && <div style={{ color: "green" }}>{message}</div>}
      {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
    </div>
  );
}
