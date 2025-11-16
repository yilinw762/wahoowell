"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");

  const onGoogle = () => void signIn("google", { callbackUrl: "/" });

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.ok) {
      router.push("/"); // logged in, session cookie set
    } else {
      setError(res?.error || "Invalid credentials");
    }
  };

  return (
    <div className="row">
      <div className="col-12">
        <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
          <h1 style={{ marginTop: 0 }}>Login</h1>

          <button
            className="button"
            onClick={onGoogle}
            style={{ marginBottom: 12 }}
          >
            Continue with Google
          </button>

          <div
            style={{
              textAlign: "center",
              color: "var(--muted)",
              fontSize: 13,
              margin: "8px 0",
            }}
          >
            or
          </div>

          <form onSubmit={onSubmit}>
            <label className="label">Email</label>
            <input
              className="input"
              type="email"
              name="email"
              placeholder="you@example.com"
              required
            />
            <div style={{ height: 12 }} />
            <label className="label">Password</label>
            <input
              className="input"
              type="password"
              name="password"
              placeholder="••••••••"
              required
            />
            <div style={{ height: 16 }} />
            <button className="button" type="submit">
              Login
            </button>
            {error && (
              <div style={{ color: "red", marginTop: 12, fontSize: 14 }}>
                {error}
              </div>
            )}
          </form>

          <p style={{ marginTop: 12, fontSize: 14 }}>
            New here? <Link href="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
