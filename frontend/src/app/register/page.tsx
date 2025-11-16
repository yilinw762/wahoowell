"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // 1) Register in FastAPI
    const res = await fetch("http://localhost:8000/api/users/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: form.email,
        username: form.username || form.email.split("@")[0],
        password: form.password,
      }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.detail || "Registration failed");
      return;
    }

    // 2) Immediately log in via NextAuth (creates session cookie)
    const loginRes = await signIn("credentials", {
      redirect: false,
      email: form.email,
      password: form.password,
    });

    if (loginRes?.ok) {
      router.push("/"); // or "/data-entry"
    } else {
      // fallback: redirect to login page
      router.push("/login");
    }
  };

  return (
    <div className="row">
      <div className="col-12">
        <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <h1 style={{ marginTop: 0 }}>Create Account</h1>
          <form onSubmit={onSubmit}>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <div style={{ height: 12 }} />
            <label className="label">Username</label>
            <input
              className="input"
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Optional"
            />
            <div style={{ height: 12 }} />
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
            />
            <div style={{ height: 12 }} />
            <label className="label">Confirm Password</label>
            <input
              className="input"
              type="password"
              name="confirmPassword"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
            <div style={{ height: 16 }} />
            <button className="button" type="submit">
              Register
            </button>
            {error && (
              <div style={{ color: "red", marginTop: 12, fontSize: 14 }}>
                {error}
              </div>
            )}
          </form>
          <p style={{ marginTop: 12, fontSize: 14 }}>
            Already have an account? <Link href="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
